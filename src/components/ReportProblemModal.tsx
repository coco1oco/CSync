import { X, Paperclip, AlertCircle, Loader2, Image as ImageIcon } from "lucide-react";
import { useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient"; 
import { useAuth } from "@/context/authContext"; 
import { uploadImageToCloudinary } from "@/lib/cloudinary"; // Adjust path if needed

interface ReportProblemModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReportProblemModal({ isOpen, onClose }: Readonly<ReportProblemModalProps>) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form State
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Bug");
  
  // CHANGED: Now storing an ARRAY of files
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]); 
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // CHANGED: Handle multiple file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // Convert FileList to Array and add to state
      const newFiles = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  // NEW: Helper to remove a specific file from the list
  const removeFile = (indexToRemove: number) => {
    setSelectedFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsSubmitting(true);

    try {
      // CHANGED: Upload ALL files in parallel
      const uploadPromises = selectedFiles.map((file) => 
        uploadImageToCloudinary(file, "report")
      );
      
      const imageUrls = await Promise.all(uploadPromises);

      // CHANGED: Insert into Supabase with 'image_urls' array
      const { error } = await supabase
        .from('reports')
        .insert({
          user_id: user?.id,
          category: category,
          description: description,
          status: 'pending',
          image_urls: imageUrls // Saving the array of links
        });

      if (error) throw error;

      // Success & Cleanup
      setDescription("");
      setCategory("Bug");
      setSelectedFiles([]); // Clear array
      onClose();
      
      alert("Report sent successfully!");

    } catch (error: any) {
      console.error("Error submitting report:", error);
      alert(error.message || "Failed to send report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-red-50 text-red-500 rounded-full">
                <AlertCircle size={18} />
            </div>
            <h3 className="font-bold text-gray-900">Report a problem</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 p-1 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Issue Type</label>
            <select 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
            >
              <option value="Bug">Bug Report</option>
              <option value="App Crash">App Crash</option>
              <option value="Performance Issue">Performance Issue</option>
              <option value="Feature Request">Feature Request</option>
              <option value="Spam">Spam</option>
              <option value="Inappropriate Content">Inappropriate Content</option>
              <option value="Report Account">Report Account</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Description</label>
            <textarea 
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-32 p-3 text-sm text-gray-800 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all placeholder:text-gray-400"
              placeholder="Describe what happened..."
            />
          </div>

          {/* CHANGED: File Preview Section */}
          {selectedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-lg text-xs font-medium text-gray-700">
                  <span className="max-w-[150px] truncate">{file.name}</span>
                  <button 
                    type="button" 
                    onClick={() => removeFile(index)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Attachment & Actions */}
          <div className="flex items-center justify-between pt-2">
            
            {/* CHANGED: Input accepts multiple files */}
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                className="hidden" 
                accept="image/*"
                multiple // <--- Important!
            />
            
            <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()} 
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors px-3 py-1.5 rounded-lg border border-transparent hover:bg-blue-50"
            >
                <Paperclip size={18} />
                <span className="font-medium">Attach Screenshot</span>
            </button>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-full text-sm font-semibold flex items-center gap-2 shadow-sm hover:shadow-md transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                 <>
                   <Loader2 size={16} className="animate-spin" />
                   Sending...
                 </>
              ) : (
                 "Submit"
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}