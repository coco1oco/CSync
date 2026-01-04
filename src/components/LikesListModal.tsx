import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, X } from "lucide-react";
import FailedImageIcon from "@/assets/FailedImage.svg";
import { toast } from "sonner";

interface Liker {
  id: string;
  username: string;
  avatar_url: string | null;
  first_name: string | null;
  last_name: string | null;
}

interface LikesListModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  type: "post" | "comment";
}

export function LikesListModal({ isOpen, onClose, targetId, type }: LikesListModalProps) {
  const [likers, setLikers] = useState<Liker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchLikers();
    }
  }, [isOpen, targetId, type]);

  const fetchLikers = async () => {
    setLoading(true);
    try {
      const tableName = type === "post" ? "likes" : "comment_likes";
      const idField = type === "post" ? "event_id" : "comment_id";

      // 1. Try fetching with standard implicit join
      let { data, error } = await supabase
        .from(tableName)
        .select(`
          user:profiles (
            id,
            username,
            avatar_url,
            first_name,
            last_name
          )
        `)
        .eq(idField, targetId);

      // 2. Fallback if join fails
      if (error) {
        console.warn("Standard join failed, trying fallback...", error);
        
        const { data: likeIds, error: idError } = await supabase
            .from(tableName)
            .select('user_id')
            .eq(idField, targetId);
            
        if (idError) throw idError;
        
        if (likeIds && likeIds.length > 0) {
            const userIds = likeIds.map((l: any) => l.user_id);
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('id, username, avatar_url, first_name, last_name')
                .in('id', userIds);
                
            if (profileError) throw profileError;
            
            setLikers(profiles || []);
            setLoading(false);
            return;
        } else {
            setLikers([]);
            setLoading(false);
            return;
        }
      }

      const users = data?.map((item: any) => item.user).filter(Boolean) || [];
      setLikers(users);

    } catch (err) {
      console.error("Failed to fetch likers:", err);
      toast.error("Failed to load likes.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    // Container: Aligns to bottom on mobile (items-end), center on desktop (md:items-center)
    <div className="fixed inset-0 z-[100] flex items-end justify-center md:items-center">
      
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Modal Content - Instagram Style Bottom Sheet */}
      <div className="relative w-full md:w-[480px] bg-white rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col max-h-[85vh] md:max-h-[80vh] animate-in slide-in-from-bottom-10 fade-in duration-300">
        
        {/* Mobile Drag Handle (Visual Only) */}
        <div className="md:hidden w-full flex justify-center pt-3 pb-1" onClick={onClose}>
            <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-center p-4 border-b border-gray-100 relative shrink-0">
          <h3 className="font-bold text-gray-900 text-lg">Likes</h3>
          <button
            onClick={onClose}
            className="absolute right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-900" />
          </button>
        </div>
        
        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : likers.length === 0 ? (
            <div className="text-center py-12">
               <p className="text-gray-500 text-sm">No likes yet.</p>
            </div>
          ) : (
            likers.map((liker) => (
              <div key={liker.id} className="flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-3">
                    <img
                    src={liker.avatar_url || FailedImageIcon}
                    alt={liker.username}
                    className="w-12 h-12 rounded-full object-cover border border-gray-100"
                    />
                    <div className="flex flex-col">
                    <span className="font-bold text-sm text-gray-900 leading-tight">
                        {liker.username}
                    </span>
                    <span className="text-sm text-gray-500 leading-tight">
                        {liker.first_name && liker.last_name 
                        ? `${liker.first_name} ${liker.last_name}`
                        : "PawPal User"}
                    </span>
                    </div>
                </div>
                {/* Optional: Add a 'Follow' button here in the future */}
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}