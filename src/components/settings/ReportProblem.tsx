import { useState, useRef } from "react";
import { AlertCircle, Paperclip, Loader2, Check, X, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/lib/supabaseClient"; 
import { useAuth } from "@/context/authContext"; 
import { uploadImageToCloudinary } from "@/lib/cloudinary"; 
import emailjs from '@emailjs/browser';

export function ReportProblem() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Bug");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  // Handle File Selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  // Remove File
  const removeFile = (indexToRemove: number) => {
    setSelectedFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsSubmitting(true);

    try {
      // --- STEP 1: CHECK MONTHLY LIMIT (199/month) ---
      const date = new Date();
      // Get the first day of the current month (e.g., "2024-05-01")
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();

      // Count reports sent since the 1st of this month
      const { count, error: countError } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', firstDay);

      if (countError) throw countError;

      if (count !== null && count >= 199) {
        alert("System limit reached: The report limit for this month has been met. Please try again next month.");
        setIsSubmitting(false);
        return; // STOP HERE
      }

      // --- STEP 2: UPLOAD IMAGES TO CLOUDINARY ---
      const uploadPromises = selectedFiles.map((file) => 
        uploadImageToCloudinary(file, "report")
      );
      const imageUrls = await Promise.all(uploadPromises);

      // --- STEP 3: SAVE TO SUPABASE (Backup & Counter) ---
      const { error: dbError } = await supabase
        .from('reports')
        .insert({
          user_id: user?.id,
          category: category,
          description: description,
          // status: 'pending', // You can remove this if you deleted the 'status' column
          image_urls: imageUrls
        });

      if (dbError) {
         console.error("Backup save failed, but attempting email:", dbError);
         // We continue to email even if DB fails
      }

      // --- STEP 4: SEND EMAIL VIA EMAILJS ---
      const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
      const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
      const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

      const templateParams = {
        user_email: user?.email || "Anonymous",
        category: category,
        description: description,
        image_urls: imageUrls.length > 0 ? imageUrls.join("\n") : "No screenshots attached"
      };

      await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);

      // --- STEP 5: SUCCESS STATE ---
      setIsSent(true);
      setDescription("");
      setCategory("Bug");
      setSelectedFiles([]);

    } catch (error: any) {
      console.error("Error submitting report:", error);
      alert(error.message || "Failed to send report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Success View ---
  if (isSent) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center animate-in zoom-in-95 px-4">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
          <Check size={32} />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Report Sent</h2>
        <p className="text-gray-500 mt-2">Thanks for letting us know. We'll look into it.</p>
        <button onClick={() => setIsSent(false)} className="mt-6 text-blue-600 font-medium hover:underline">
            Send another report
        </button>
      </div>
    );
  }

  // --- Form View ---
  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in">
      
      {/* Header */}
      <div className="hidden md:flex items-center gap-3 border-b border-gray-100 pb-4">
        <div className="p-2 bg-red-50 text-red-500 rounded-full">
          <AlertCircle size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Report a problem</h2>
          <p className="text-sm text-gray-500">Let us know if something isn't working.</p>
        </div>
      </div>

      <p className="md:hidden text-sm text-gray-500">
        Please provide as much detail as possible so we can help you faster.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Category Selection */}
        <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Issue Type</label>
            <select 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-3 bg-gray-50 md:bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
            >
              <option value="Bug">Bug Report</option>
              <option value="App Crash">App Crash</option>
              <option value="Performance Issue">Performance Issue</option>
              <option value="Account Access">Account Access</option>
              <option value="Feature Request">Feature Request</option>
              <option value="Spam">Spam</option>
              <option value="Inappropriate Content">Inappropriate Content</option>
              <option value="Report Account">Report Account</option>
              <option value="Other">Other</option>
            </select>
        </div>

        {/* Description Input */}
        <div className="space-y-2">
          <label className="hidden md:block text-sm font-medium text-gray-700">What went wrong?</label>
          <textarea 
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full h-48 md:h-32 p-4 text-sm text-gray-800 bg-gray-50 md:bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all placeholder:text-gray-400"
            placeholder="Describe the issue..."
          />
        </div>

        {/* File Previews */}
        {selectedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-2 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-700">
                  <span className="max-w-[150px] truncate">{file.name}</span>
                  <button 
                    type="button" 
                    onClick={() => removeFile(index)}
                    className="text-blue-400 hover:text-red-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
        )}

        {/* Action Bar */}
        <div className="flex items-center justify-between pt-2">
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            className="hidden" 
            accept="image/*"
            multiple 
          />

          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors px-3 py-2 rounded-lg hover:bg-blue-50 bg-gray-50 md:bg-transparent border border-transparent hover:border-blue-100"
          >
            {selectedFiles.length > 0 ? <ImageIcon size={18} /> : <Paperclip size={18} />}
            <span className="font-medium">
                {selectedFiles.length > 0 ? "Add more photos" : "Add Screenshot"}
            </span>
          </button>

          <button 
            type="submit" 
            disabled={isSubmitting} 
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-8 py-2.5 rounded-full shadow-sm hover:shadow-md transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
                <>
                    <Loader2 size={16} className="animate-spin" /> 
                    Sending...
                </>
            ) : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
}