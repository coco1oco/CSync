import { useEffect, useState } from "react";
import { 
  Loader2, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Calendar,
  User as UserIcon,
  ImageIcon,
  Inbox
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient"; 

// Simple Avatar Component for UI polish
const UserAvatar = ({ url, name }: { url?: string; name: string }) => {
  if (url) {
    return <img src={url} alt={name} className="w-10 h-10 rounded-full object-cover border border-gray-200" />;
  }
  return (
    <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
      {name.charAt(0).toUpperCase()}
    </div>
  );
};

export function AdminReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          profiles:user_id (
            username,
            email,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (reportId: string, newStatus: string) => {
    setUpdatingId(reportId);
    try {
      const { error } = await supabase
        .from('reports')
        .update({ status: newStatus })
        .eq('id', reportId);

      if (error) throw error;

      setReports(prev => prev.map(r => 
        r.id === reportId ? { ...r, status: newStatus } : r
      ));
    } catch (error) {
      alert("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  // Filter Logic
  const filteredReports = reports.filter(report => {
    const matchesSearch = 
      report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.profiles?.username?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || report.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100';
      case 'reviewing': return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
      case 'dismissed': return 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200';
      default: return 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100';
    }
  };

  if (loading) return (
    <div className="h-96 flex flex-col items-center justify-center text-gray-400 gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      <p className="text-sm font-medium">Loading reports...</p>
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
      
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Admin Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and resolve user-submitted issues.</p>
        </div>
        
        <div className="flex items-center gap-3">
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
             <input 
               type="text" 
               placeholder="Search reports..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-64 transition-all shadow-sm"
             />
           </div>
           <div className="bg-white border border-gray-200 rounded-lg p-1 flex items-center shadow-sm">
              {['all', 'pending', 'resolved'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${
                    statusFilter === tab 
                    ? 'bg-gray-100 text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {tab}
                </button>
              ))}
           </div>
        </div>
      </div>
      
      {/* 2. Table Card */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50/50 border-b border-gray-100 text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-4 w-[250px]">User</th>
                <th className="px-6 py-4 w-[300px]">Issue Details</th>
                <th className="px-6 py-4">Evidence</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                        <Inbox className="w-6 h-6" />
                      </div>
                      <p className="text-gray-900 font-medium">No reports found</p>
                      <p className="text-sm">Try adjusting your filters or search terms.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-blue-50/30 transition-colors group">
                    
                    {/* User Column */}
                    <td className="px-6 py-4 align-top">
                      <div className="flex items-start gap-3">
                        <UserAvatar 
                          url={report.profiles?.avatar_url} 
                          name={report.profiles?.username || "?"} 
                        />
                        <div>
                          <div className="font-semibold text-gray-900">
                            {report.profiles?.username || "Unknown User"}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5 font-mono">
                            {report.profiles?.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Issue Details */}
                    <td className="px-6 py-4 align-top">
                       <div className="flex flex-col gap-2">
                          <span className="inline-flex w-fit items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                             {report.category}
                          </span>
                          <p className="text-gray-600 leading-relaxed line-clamp-2" title={report.description}>
                             {report.description}
                          </p>
                       </div>
                    </td>

                    {/* Evidence */}
                    <td className="px-6 py-4 align-top">
                       {report.image_urls && report.image_urls.length > 0 ? (
                         <div className="flex items-center gap-2 flex-wrap">
                            {report.image_urls.map((url: string, index: number) => (
                               <a 
                                 key={index}
                                 href={url} 
                                 target="_blank" 
                                 rel="noreferrer"
                                 className="relative group/image overflow-hidden rounded-lg border border-gray-200 w-12 h-12 flex-shrink-0"
                               >
                                 <img 
                                   src={url} 
                                   alt={`Evidence ${index + 1}`} 
                                   className="w-full h-full object-cover transition-transform duration-300 group-hover/image:scale-110" 
                                 />
                                 <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/10 transition-colors" />
                               </a>
                            ))}
                         </div>
                       ) : (
                         <div className="flex items-center gap-2 text-gray-400 text-xs">
                            <ImageIcon className="w-4 h-4" />
                            <span>No images</span>
                         </div>
                       )}
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4 align-top whitespace-nowrap">
                      <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(report.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                      <div className="text-gray-400 text-[10px] mt-1 pl-5.5">
                        {new Date(report.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </td>

                    {/* Status Action */}
                    <td className="px-6 py-4 align-top text-right">
                       <div className="relative inline-block">
                          {updatingId === report.id && (
                             <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2">
                                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                             </div>
                          )}
                          <select
                            value={report.status}
                            disabled={updatingId === report.id}
                            onChange={(e) => handleStatusChange(report.id, e.target.value)}
                            className={`
                                appearance-none cursor-pointer pl-3 pr-8 py-1.5 rounded-full text-xs font-semibold border transition-all shadow-sm focus:ring-2 focus:ring-offset-1 focus:outline-none
                                ${getStatusColor(report.status)}
                                ${updatingId === report.id ? 'opacity-70 cursor-wait' : ''}
                            `}
                          >
                            <option value="pending">Pending</option>
                            <option value="reviewing">Reviewing</option>
                            <option value="resolved">Resolved</option>
                            <option value="dismissed">Dismissed</option>
                          </select>
                          {/* Custom Arrow Icon for Select */}
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-current opacity-60">
                             <MoreHorizontal className="w-3.5 h-3.5" />
                          </div>
                       </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footer / Pagination Placeholder */}
        <div className="bg-gray-50/50 border-t border-gray-200 px-6 py-3 flex items-center justify-between">
           <p className="text-xs text-gray-500">
             Showing <span className="font-medium">{filteredReports.length}</span> results
           </p>
           {/* Add pagination buttons here if needed */}
        </div>
      </div>
    </div>
  );
}