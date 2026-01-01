import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Upload,
  Trash2,
  Eye,
  FileCheck,
  FileWarning,
  Pill,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Document {
  id: string;
  file_name: string;
  file_url: string;
  category: "vaccine" | "prescription" | "lab_result" | "legal" | "other";
  created_at: string;
}

const CATEGORIES = [
  {
    id: "vaccine",
    label: "Vaccine Card",
    icon: <FileCheck size={16} />,
    color: "bg-green-100 text-green-700",
  },
  {
    id: "prescription",
    label: "Prescription",
    icon: <Pill size={16} />,
    color: "bg-blue-100 text-blue-700",
  },
  {
    id: "lab_result",
    label: "Lab Result",
    icon: <FileWarning size={16} />,
    color: "bg-yellow-100 text-yellow-700",
  },
  {
    id: "legal",
    label: "Legal/ID",
    icon: <ShieldAlert size={16} />,
    color: "bg-purple-100 text-purple-700",
  },
  {
    id: "other",
    label: "Other",
    icon: <FileText size={16} />,
    color: "bg-gray-100 text-gray-700",
  },
];

export default function DocumentsSection({
  petId,
  canManage,
}: {
  petId: string;
  canManage: boolean;
}) {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("vaccine");

  useEffect(() => {
    fetchDocs();
  }, [petId]);

  async function fetchDocs() {
    try {
      const { data, error } = await supabase
        .from("pet_documents")
        .select("*")
        .eq("pet_id", petId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setDocs(data || []);
    } catch (err) {
      console.error("Error loading docs:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    setUploading(true);
    const file = event.target.files[0];
    const fileExt = file.name.split(".").pop();
    const fileName = `${petId}/${Date.now()}.${fileExt}`;

    try {
      // 1. Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from("pet-docs")
        .upload(fileName, file);
      if (uploadError) throw uploadError;

      // 2. Get URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("pet-docs").getPublicUrl(fileName);

      // 3. Save Metadata to DB
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Not authenticated");

      const { data: newDoc, error: dbError } = await supabase
        .from("pet_documents")
        .insert([
          {
            pet_id: petId,
            uploader_id: user.id,
            file_name: file.name,
            file_url: publicUrl,
            category: selectedCategory,
            file_type: fileExt,
          },
        ])
        .select()
        .single();

      if (dbError) throw dbError;
      setDocs([newDoc, ...docs]);
    } catch (err: any) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this document permanently?")) return;
    try {
      const { error } = await supabase
        .from("pet_documents")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setDocs(docs.filter((d) => d.id !== id));
    } catch (err) {
      alert("Failed to delete");
    }
  };

  if (loading)
    return (
      <div className="text-center py-4 text-gray-500">Loading documents...</div>
    );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* --- UPLOAD AREA --- */}
      {canManage && (
        <div className="bg-white p-6 rounded-3xl border border-dashed border-gray-300 hover:border-blue-500 transition-colors text-center relative">
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 bg-blue-50 rounded-full text-blue-600">
              {uploading ? (
                <Loader2 className="animate-spin" size={24} />
              ) : (
                <Upload size={24} />
              )}
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Upload Document</h3>
              <p className="text-sm text-gray-500">
                Select a category and file (Max 5MB)
              </p>
            </div>

            {/* Category Pills */}
            <div className="flex gap-2 flex-wrap justify-center mt-2 z-10 relative">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                    selectedCategory === cat.id
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Hidden Input Overlay */}
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={handleUpload}
              disabled={uploading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-0"
            />
          </div>
        </div>
      )}

      {/* --- DOCUMENTS LIST --- */}
      <div className="space-y-4">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <FileText size={20} className="text-blue-500" /> Vault Content
        </h3>

        {docs.length === 0 ? (
          <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
            No documents found. Keep your records safe here!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {docs.map((doc) => {
              const catInfo =
                CATEGORIES.find((c) => c.id === doc.category) || CATEGORIES[4];
              return (
                <div
                  key={doc.id}
                  className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-3 group hover:shadow-md transition-all"
                >
                  <div className={`p-3 rounded-xl ${catInfo.color}`}>
                    {catInfo.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 pr-2">
                        <h4 className="font-bold text-sm text-gray-900 truncate">
                          {doc.file_name}
                        </h4>
                        <span className="text-[10px] text-gray-400 uppercase font-bold">
                          {new Date(doc.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] h-5 shrink-0"
                      >
                        {catInfo.label}
                      </Badge>
                    </div>

                    <div className="flex gap-2 mt-3">
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-8 text-xs rounded-lg"
                        >
                          <Eye size={12} className="mr-1" /> View
                        </Button>
                      </a>
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(doc.id)}
                          className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
