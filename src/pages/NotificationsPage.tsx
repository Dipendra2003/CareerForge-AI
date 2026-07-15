import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useNotifications } from "../contexts/NotificationContext";
import { Bell, Archive, Trash2, CheckCircle, Info, AlertTriangle, Shield, CreditCard, Cpu, Activity, Megaphone, Check, ChevronLeft, ChevronRight, Search, Filter } from "lucide-react";
import SEOMeta from "../components/SEOMeta";
import apiClient from "../lib/apiClient";
import { Notification, PaginatedNotifications } from "../types/notification";

const iconMap: Record<string, any> = {
  Success: CheckCircle,
  Warning: AlertTriangle,
  Error: AlertTriangle,
  Info: Info,
  Security: Shield,
  Billing: CreditCard,
  AI: Cpu,
  System: Activity,
  Announcement: Megaphone,
  Maintenance: Activity,
  Promotion: Megaphone,
};

export default function NotificationsPage() {
  const { markAllAsRead, refresh } = useNotifications();
  const [filter, setFilter] = useState("all"); // all, unread, archived
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [cursorHistory, setCursorHistory] = useState<Record<number, string | null>>({ 1: null });
  const [loading, setLoading] = useState(true);
  
  const [data, setData] = useState<PaginatedNotifications | null>(null);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      let isRead = undefined;
      let isArchived = "false";
      
      if (filter === "unread") {
        isRead = "false";
        isArchived = "false";
      } else if (filter === "archived") {
        isArchived = "true";
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });
      
      const currentCursor = cursorHistory[page];
      if (currentCursor) params.append("cursor", currentCursor);

      if (isRead !== undefined) params.append("isRead", isRead);
      if (isArchived !== undefined) params.append("isArchived", isArchived);
      if (search) params.append("search", search);

      const response = await apiClient.get(`/notifications?${params.toString()}`);
      setData(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [page, filter, search]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await apiClient.put(`/notifications/${id}/read`);
      setData(prev => prev ? {
        ...prev,
        data: prev.data.map(n => n.id === id ? { ...n, isRead: true } : n)
      } : null);
      refresh();
    } catch (e) {}
  };

  const handleArchive = async (id: string) => {
    try {
      await apiClient.put(`/notifications/${id}/archive`);
      setData(prev => prev ? {
        ...prev,
        data: prev.data.filter(n => n.id !== id)
      } : null);
      refresh();
    } catch (e) {}
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/notifications/${id}`);
      setData(prev => prev ? {
        ...prev,
        data: prev.data.filter(n => n.id !== id)
      } : null);
      refresh();
    } catch (e) {}
  };

  const handleMarkAllAsReadLocal = async () => {
    await markAllAsRead();
    fetchNotifications();
  };

  return (
    <div className="max-w-4xl xl:max-w-7xl 2xl:max-w-360 mx-auto py-8 px-4 xl:px-8 w-full">
      <SEOMeta pageKey="notifications" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-slate-500">Stay updated on your activity and system alerts</p>
        </div>
        <button 
          onClick={handleMarkAllAsReadLocal}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-4 py-2 rounded-lg transition"
        >
          Mark all as read
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-2 border-b border-slate-200">
          <button 
            onClick={() => { setFilter("all"); setPage(1); }} 
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition ${filter === "all" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            All
          </button>
          <button 
            onClick={() => { setFilter("unread"); setPage(1); }} 
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition ${filter === "unread" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            Unread
          </button>
          <button 
            onClick={() => { setFilter("archived"); setPage(1); }} 
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition ${filter === "archived" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            Archived
          </button>
        </div>
        
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search..." 
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white p-5 rounded-xl border border-slate-200 flex gap-4">
                <div className="w-10 h-10 bg-slate-200 rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : !data || data.data.length === 0 ? (
          <div className="text-center py-20 bg-white border border-slate-200 rounded-xl">
            <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-1">No notifications</h3>
            <p className="text-slate-500">You're all caught up!</p>
          </div>
        ) : (
          <>
            {data.data.map((n) => {
              const IconComponent = iconMap[n.type] || Bell;
              return (
                <div 
                  key={n.id} 
                  className={`bg-white border p-5 rounded-xl shadow-sm flex items-start gap-4 transition ${!n.isRead ? "border-indigo-200 bg-indigo-50/10" : "border-slate-200"}`}
                  onClick={() => !n.isRead && handleMarkAsRead(n.id)}
                >
                  <div className={`p-2 rounded-lg shrink-0 ${!n.isRead ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-500"}`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className={`text-base ${!n.isRead ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>
                          {n.title}
                        </h3>
                        <p className="text-slate-600 mt-1">{n.message}</p>
                      </div>
                      <span className="text-xs font-medium text-slate-400 shrink-0">
                        {new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    
                    {n.actionUrl && (
                      <div className="mt-4">
                        {n.actionUrl.startsWith("/") ? (
                          <Link 
                            to={n.actionUrl} 
                            className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {n.actionText || "View Details"}
                          </Link>
                        ) : (
                          <a 
                            href={n.actionUrl} 
                            className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {n.actionText || "View Details"}
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!n.isRead && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleMarkAsRead(n.id); }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        title="Mark as read"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                    )}
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleArchive(n.id); }}
                      className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                      title="Archive"
                    >
                      <Archive className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })}
            
            {/* Pagination Controls */}
            {data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <span className="text-sm text-slate-500">
                  Showing {(page - 1) * 10 + 1} to Math.min(page * 10, data.pagination.total) of {data.pagination.total} entries
                </span>
                <div className="flex gap-2">
                  <button 
                    disabled={!data.pagination.hasPrevious}
                    onClick={() => setPage(p => p - 1)}
                    className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button 
                    disabled={!data.pagination.hasNext}
                    onClick={() => {
                      if (data.pagination.nextCursor) {
                        setCursorHistory(prev => ({ ...prev, [page + 1]: data.pagination.nextCursor }));
                      }
                      setPage(p => p + 1);
                    }}
                    className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
