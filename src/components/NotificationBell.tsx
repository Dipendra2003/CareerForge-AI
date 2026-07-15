import { useState, useRef, useEffect } from "react";
import { Bell, Check, Trash2, X, Archive, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { useNotifications } from "../contexts/NotificationContext";

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, archive } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const visibleNotifications = notifications.slice(0, 5); // Show max 5 in dropdown

  const handleNotificationClick = (id: string, actionUrl?: string) => {
    markAsRead(id);
    setIsOpen(false);
    if (actionUrl) {
      window.location.href = actionUrl;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-full transition cursor-pointer"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden flex flex-col">
          <div className="p-3 flex items-center justify-between border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-slate-800">Notifications</h3>
            <div className="flex gap-2">
              <button 
                onClick={() => markAllAsRead()}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                Mark all read
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto max-h-[60vh] divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Bell className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-sm">You have no notifications.</p>
              </div>
            ) : (
              visibleNotifications.map((n) => (
                <div 
                  key={n.id} 
                  className={`p-4 flex gap-3 hover:bg-slate-50 transition cursor-pointer ${!n.isRead ? 'bg-indigo-50/30' : ''}`}
                  onClick={() => handleNotificationClick(n.id, n.actionUrl)}
                >
                  <div className={`mt-0.5 shrink-0 w-2 h-2 rounded-full ${!n.isRead ? 'bg-indigo-600' : 'bg-transparent'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!n.isRead ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-medium tracking-wide">
                      {new Date(n.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="shrink-0 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition">
                    <button 
                      onClick={(e) => { e.stopPropagation(); archive(n.id); }}
                      className="text-slate-400 hover:text-slate-700" title="Archive"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="p-2 border-t border-slate-100 bg-slate-50">
            <Link 
              to="/notifications" 
              onClick={() => setIsOpen(false)}
              className="block w-full text-center py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
