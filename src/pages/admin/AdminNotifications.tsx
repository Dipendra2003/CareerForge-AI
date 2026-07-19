import { useState, useEffect } from "react";
import apiClient from "../../lib/apiClient";
import { Bell, Send, Calendar, Users, Megaphone, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import SEOMeta from "../../components/SEOMeta";
import { Notification, PaginatedNotifications } from "../../types/notification";

export default function AdminNotifications() {
  const [stats, setStats] = useState({ totalSent: 0, scheduled: 0, broadcasts: 0 });
  const [data, setData] = useState<PaginatedNotifications | null>(null);
  const [page, setPage] = useState(1);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Broadcast Form
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("Info");
  const [audience, setAudience] = useState("All Users");
  const [scheduledAt, setScheduledAt] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [cursorHistory, setCursorHistory] = useState<Record<number, string | null>>({ 1: null });

  const fetchStats = async () => {
    try {
      const { data } = await apiClient.get("/admin/notifications/stats");
      setStats(data);
    } catch (e) {
      // Securely log the error without leaking stack traces or sensitive data
      console.error('An error occurred during this operation.');
    }
  };

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const currentCursor = cursorHistory[page];
      const cursorParam = currentCursor ? `&cursor=${currentCursor}` : "";
      const { data: res } = await apiClient.get(`/admin/notifications?page=${page}&limit=20${cursorParam}`);
      setData(res);
    } catch (error: any) {
      // Securely log the error without leaking stack traces or sensitive data
      console.error('An error occurred during this operation.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [page]);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setSuccessMsg("");
    try {
      const payload: any = { title, message, type, audience };
      if (scheduledAt) {
        payload.scheduledAt = new Date(scheduledAt).toISOString();
      }
      const res = await apiClient.post("/admin/notifications/broadcast", payload);
      if (res.data.success) {
        setSuccessMsg(payload.scheduledAt ? "Notification scheduled!" : `Broadcast sent to ${res.data.count} users!`);
        setTitle("");
        setMessage("");
        setScheduledAt("");
        fetchStats();
        setPage(1);
        fetchNotifications();
      }
    } catch (error) {
      // Securely log the error without leaking stack traces or sensitive data
      console.error('An error occurred during this operation.');
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/admin/notifications/${id}`);
      setData(prev => prev ? {
        ...prev,
        data: prev.data.filter(n => n.id !== id)
      } : null);
      fetchStats();
    } catch (error) {
      // Securely log the error without leaking stack traces or sensitive data
      console.error('An error occurred during this operation.');
    }
  };

  return (
    <>
      <div className="space-y-6 max-w-6xl xl:max-w-360 2xl:max-w-380 mx-auto">
      <SEOMeta pageKey="admin-notifications" />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notification Center</h1>
          <p className="text-slate-500">Manage broadcasts, automated alerts, and system announcements.</p>
        </div>
        <button 
          onClick={() => {
            if (!data) return;
            const sanitizeCSV = (val: any) => {
              const str = String(val).replace(/"/g, '""');
              if (/^[=+\-@\t\r ]/.test(str)) {
                return `"'${str}"`;
              }
              return `"${str}"`;
            };
            const csv = ["ID,Title,Message,Type,CreatedAt"].concat(data.data.map(n => 
              `${sanitizeCSV(n.id)},${sanitizeCSV(n.title)},${sanitizeCSV(n.message)},${sanitizeCSV(n.type)},${sanitizeCSV(n.createdAt)}`
            )).join("\n");
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.setAttribute('hidden', '');
            a.setAttribute('href', url);
            a.setAttribute('download', 'notifications.csv');
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-sm font-semibold text-slate-700 transition"
        >
          Export CSV (Current Page)
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
            <Send className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Sent</p>
            <p className="text-2xl font-bold text-slate-900">{stats.totalSent}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-orange-100 text-orange-600 rounded-lg">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Scheduled</p>
            <p className="text-2xl font-bold text-slate-900">{stats.scheduled}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Broadcasts</p>
            <p className="text-2xl font-bold text-slate-900">{stats.broadcasts}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Composer */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-6 shadow-sm h-fit">
          <div className="flex items-center gap-2 mb-4">
            <Megaphone className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">New Broadcast</h2>
          </div>

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm font-medium">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleBroadcast} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Audience</label>
              <select 
                value={audience} onChange={e => setAudience(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-600"
              >
                <option>All Users</option>
                <option>All Admins</option>
                <option>Free Plan</option>
                <option>Pro Plan</option>
                <option>Annual Plan</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select 
                value={type} onChange={e => setType(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-600"
              >
                <option>Info</option>
                <option>Announcement</option>
                <option>Warning</option>
                <option>Success</option>
                <option>Maintenance</option>
                <option>Promotion</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
              <input 
                type="text" required
                value={title} onChange={e => setTitle(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-600"
                placeholder="E.g., System Update"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
              <textarea 
                required rows={3}
                value={message} onChange={e => setMessage(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-600"
                placeholder="Your notification message..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Schedule (Optional)</label>
              <input 
                type="datetime-local"
                value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-600"
              />
            </div>
            <button 
              type="submit" disabled={isSending}
              className="w-full flex items-center justify-center py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition disabled:opacity-50"
            >
              {isSending ? "Sending..." : (scheduledAt ? "Schedule Broadcast" : "Send Now")}
            </button>
          </form>
        </div>

        {/* Recent History */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <h2 className="text-lg font-bold text-slate-900">Recent Deliveries</h2>
          </div>
          
          <div className="divide-y divide-slate-100 flex-1 overflow-y-auto min-h-[300px]">
            {isLoading ? (
              <div className="p-8 text-center text-slate-500">Loading...</div>
            ) : !data || data.data.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No notifications sent yet.</div>
            ) : (
              data.data.map((n) => (
                <div key={n.id} className="p-4 flex items-start gap-4 hover:bg-slate-50 transition">
                  <div className="p-2 bg-slate-100 text-slate-600 rounded-lg shrink-0">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-slate-900">{n.title}</h3>
                      <span className="text-xs font-medium text-slate-400">
                        {new Date(n.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{n.message}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs font-medium text-slate-500">
                      <span className="bg-slate-100 px-2 py-0.5 rounded-full">{n.type}</span>
                      {n.userId ? <span>Targeted</span> : <span>Broadcast</span>}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(n.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
          
          {/* Pagination Controls */}
          {data && data.pagination.totalPages > 1 && (
            <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
              <span className="text-sm text-slate-500">
                Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, data.pagination.total)} of {data.pagination.total} entries
              </span>
              <div className="flex gap-2">
                <button 
                  disabled={!data.pagination.hasPrevious}
                  onClick={() => setPage(p => p - 1)}
                  className="p-2 border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50"
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
                  className="p-2 border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
      </div>
    </>
  );
}
