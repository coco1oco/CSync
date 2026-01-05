import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useDialog } from "@/context/DialogContext"; // ✅ Custom Dialog Hook
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import {
  FileText,
  Trash2,
  Eye,
  FileCheck,
  FileWarning,
  Pill,
  ShieldAlert,
  Loader2,
  Filter,
  Camera,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Document {
  id: string;
  file_name: string;
  file_url: string;
  category: "vaccine" | "prescription" | "lab_result" | "legal" | "other";
  file_type: string;
  created_at: string;
}

const CATEGORIES = [
  {
    id: "vaccine",
    label: "Vaccines",
    icon: <FileCheck size={14} />,
    color: "text-green-600 bg-green-50 border-green-200",
  },
  {
    id: "prescription",
    label: "Rx / Meds",
    icon: <Pill size={14} />,
    color: "text-blue-600 bg-blue-50 border-blue-200",
  },
  {
    id: "lab_result",
    label: "Labs & X-Rays",
    icon: <FileWarning size={14} />,
    color: "text-amber-600 bg-amber-50 border-amber-200",
  },
  {
    id: "legal",
    label: "Legal & ID",
    icon: <ShieldAlert size={14} />,
    color: "text-purple-600 bg-purple-50 border-purple-200",
  },
  {
    id: "other",
    label: "Misc",
    icon: <FileText size={14} />,
    color: "text-gray-600 bg-gray-50 border-gray-200",
  },
];

export default function DocumentsSection({
  petId,
  canManage,
}: {
  petId: string;
  canManage: boolean;
}) {
  const { confirm } = useDialog(); // ✅ Init Hook
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Filter state for viewing
  const [filter, setFilter] = useState("all");

  // Selected category for UPLOADING
  const [uploadCategory, setUploadCategory] = useState("other");

  useEffect(() => {
    fetchDocs();
  }, [petId]);

  useEffect(() => {
    if (filter !== "all") {
      setUploadCategory(filter);
    }
  }, [filter]);

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

    try {
      const publicUrl = await uploadImageToCloudinary(file, "document");
      const fileExt = file.name.split(".").pop() || "jpg";
      const user = (await supabase.auth.getUser()).data.user;

      const { data: newDoc, error: dbError } = await supabase
        .from("pet_documents")
        .insert([
          {
            pet_id: petId,
            uploader_id: user?.id,
            file_name: file.name,
            file_url: publicUrl,
            category: uploadCategory,
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
      event.target.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    // ✅ Custom Danger Confirm
    const isConfirmed = await confirm("Delete this file permanently?", {
      title: "Delete Document",
      variant: "danger",
      confirmText: "Delete",
    });

    if (!isConfirmed) return;

    try {
      await supabase.from("pet_documents").delete().eq("id", id);
      setDocs(docs.filter((d) => d.id !== id));
    } catch (err) {
      alert("Failed to delete");
    }
  };

  const filteredDocs =
    filter === "all" ? docs : docs.filter((d) => d.category === filter);

  if (loading)
    return (
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* 1. Header & Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              filter === "all"
                ? "bg-gray-900 text-white"
                : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
            }`}
          >
            All Files
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${
                filter === cat.id
                  ? cat.color
                  : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Upload Area with Category Selector */}
      {canManage && (
        <div className="relative bg-blue-50/50 border-2 border-dashed border-blue-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-4 transition-all hover:bg-blue-50 hover:border-blue-300">
          <div className="flex items-center gap-2 z-10 relative">
            <span className="text-xs font-medium text-blue-900/60">
              Upload as:
            </span>
            <Select value={uploadCategory} onValueChange={setUploadCategory}>
              <SelectTrigger className="h-8 w-[140px] bg-white border-blue-200 text-xs font-bold text-blue-700 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem
                    key={cat.id}
                    value={cat.id}
                    className="text-xs font-medium"
                  >
                    <div className="flex items-center gap-2">
                      {cat.icon} {cat.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="group cursor-pointer flex flex-col items-center">
            <div className="p-3 bg-white rounded-full shadow-sm text-blue-600 mb-2 group-hover:scale-110 transition-transform">
              {uploading ? (
                <Loader2 className="animate-spin" size={24} />
              ) : (
                <Camera size={24} />
              )}
            </div>
            <h3 className="text-sm font-bold text-blue-900">
              {uploading ? "Uploading..." : "Tap to Add Photo"}
            </h3>
          </div>

          <input
            type="file"
            onChange={handleUpload}
            disabled={uploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-0"
            accept="image/*"
          />

          <style>{`
                [data-radix-popper-content-wrapper] { z-index: 50 !important; }
            `}</style>
        </div>
      )}

      {/* 3. Files Grid */}
      {filteredDocs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Filter className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">
            No documents found in{" "}
            {filter === "all" ? "binder" : "this category"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredDocs.map((doc) => {
            const catInfo =
              CATEGORIES.find((c) => c.id === doc.category) || CATEGORIES[4];

            const isImage = ["jpg", "jpeg", "png", "webp", "heic"].includes(
              doc.file_type?.toLowerCase() || ""
            );

            return (
              <div
                key={doc.id}
                className="group relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col"
              >
                <div className="aspect-[4/3] bg-gray-50 relative overflow-hidden flex items-center justify-center">
                  {isImage ? (
                    <img
                      src={doc.file_url}
                      alt={doc.file_name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <FileText className="w-12 h-12 text-gray-300" />
                  )}

                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/40 transition"
                    >
                      <Eye size={16} />
                    </a>
                    {canManage && (
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-2 bg-red-500/80 backdrop-blur-sm rounded-full text-white hover:bg-red-600 transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-3">
                  <div className="flex justify-between items-start mb-1">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide border ${catInfo.color
                        .replace("text-", "border-")
                        .replace("bg-", "text-")}`}
                    >
                      {catInfo.label}
                    </span>
                  </div>
                  <h4
                    className="text-xs font-bold text-gray-900 truncate mb-0.5"
                    title={doc.file_name}
                  >
                    {doc.file_name}
                  </h4>
                  <p className="text-[10px] text-gray-400">
                    Added {new Date(doc.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
