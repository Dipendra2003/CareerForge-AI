import { useState, useEffect } from "react";
import { 
  Search, Filter, Mail, Phone, Calendar, Shield, Trash2, CheckCircle2, 
  XCircle, Clock, AlertTriangle, User, ChevronRight, CornerDownRight, 
  Download, ExternalLink, RefreshCw, Send, HelpCircle, Check, Loader2 
} from "lucide-react";
import apiClient from "../../lib/apiClient";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
// @ts-ignore
import "jspdf-autotable";

interface Reply {
  id: string;
  subject: string;
  reply: string;
  createdAt: string;
  adminId: string | null;
  admin: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

interface Ticket {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  category: string | null;
  message: string;
  status: string;
  priority: string;
  assignedTo: string | null;
  repliedAt: string | null;
  closedAt: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string;
  replies: Reply[];
}

interface AdminUser {
  id: string;
  name: string | null;
  email: string;
}

export default function AdminContact() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Filters state
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [category, setCategory] = useState("all");
  const [assignedTo, setAssignedTo] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);

  // Reply state
  const [replySubject, setReplySubject] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [replySuccess, setReplySuccess] = useState(false);
  const [replyError, setReplyError] = useState("");

  // Quick Action State
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Load ticket list and admins
  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (status !== "all") params.append("status", status);
      if (priority !== "all") params.append("priority", priority);
      if (category !== "all") params.append("category", category);
      if (assignedTo !== "all") params.append("assignedTo", assignedTo);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (unreadOnly) params.append("unread", "true");

      const res = await apiClient.get(`/admin/contact?${params.toString()}`);
      setTickets(res.data.messages || []);
    } catch (error) {
      // Securely log the error without leaking stack traces or sensitive data
      console.error('An error occurred during this operation.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmins = async () => {
    try {
      const res = await apiClient.get("/admin/contact/admins");
      setAdmins(res.data.admins || []);
    } catch (error) {
      // Securely log the error without leaking stack traces or sensitive data
      console.error('An error occurred during this operation.');
    }
  };

  // Fetch ticket details when selection changes
  const fetchTicketDetails = async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await apiClient.get(`/admin/contact/${id}`);
      setSelectedTicket(res.data.message || null);
      setReplySubject(`Re: ${res.data.message?.subject || ""}`);
      setReplyBody("");
      setReplyError("");
      setReplySuccess(false);
    } catch (error) {
      // Securely log the error without leaking stack traces or sensitive data
      console.error('An error occurred during this operation.');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [search, status, priority, category, assignedTo, startDate, endDate, unreadOnly]);

  useEffect(() => {
    fetchAdmins();
  }, []);

  useEffect(() => {
    if (selectedTicketId) {
      fetchTicketDetails(selectedTicketId);
    } else {
      setSelectedTicket(null);
    }
  }, [selectedTicketId]);

  // Reply handler
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyBody.trim()) return;

    setIsSendingReply(true);
    setReplyError("");
    setReplySuccess(false);

    try {
      await apiClient.post(`/admin/contact/${selectedTicket.id}/reply`, {
        subject: replySubject,
        reply: replyBody
      });
      setReplySuccess(true);
      setReplyBody("");
      // Refresh current ticket view and main list
      await fetchTicketDetails(selectedTicket.id);
      fetchTickets();
    } catch (error: any) {
      
      setReplyError(error.response?.data?.error || "Failed to send reply email.");
    } finally {
      setIsSendingReply(false);
    }
  };

  // Status Change handler
  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedTicket) return;
    setActionLoading("status");
    try {
      await apiClient.patch(`/admin/contact/${selectedTicket.id}/status`, { status: newStatus });
      await fetchTicketDetails(selectedTicket.id);
      fetchTickets();
    } catch (error) {
      // Securely log the error without leaking stack traces or sensitive data
      console.error('An error occurred during this operation.');
    } finally {
      setActionLoading(null);
    }
  };

  // Priority Change handler
  const handleUpdatePriority = async (newPriority: string) => {
    if (!selectedTicket) return;
    setActionLoading("priority");
    try {
      await apiClient.patch(`/admin/contact/${selectedTicket.id}/priority`, { priority: newPriority });
      await fetchTicketDetails(selectedTicket.id);
      fetchTickets();
    } catch (error) {
      // Securely log the error without leaking stack traces or sensitive data
      console.error('An error occurred during this operation.');
    } finally {
      setActionLoading(null);
    }
  };

  // Assign handler
  const handleAssignTicket = async (adminIdOrName: string | null) => {
    if (!selectedTicket) return;
    setActionLoading("assign");
    try {
      await apiClient.patch(`/admin/contact/${selectedTicket.id}/assign`, { assignedTo: adminIdOrName });
      await fetchTicketDetails(selectedTicket.id);
      fetchTickets();
    } catch (error) {
      // Securely log the error without leaking stack traces or sensitive data
      console.error('An error occurred during this operation.');
    } finally {
      setActionLoading(null);
    }
  };

  // Delete handler
  const handleDeleteTicket = async (id: string) => {
    if (!window.confirm("Are you absolutely sure you want to delete this ticket? This action is irreversible.")) return;
    try {
      await apiClient.delete(`/admin/contact/${id}`);
      setSelectedTicketId(null);
      setSelectedTicket(null);
      fetchTickets();
    } catch (error) {
      // Securely log the error without leaking stack traces or sensitive data
      console.error('An error occurred during this operation.');
    }
  };

  // Get matching Admin name
  const getAdminName = (idOrName: string | null) => {
    if (!idOrName) return "Unassigned";
    const matched = admins.find(a => a.id === idOrName);
    return matched ? (matched.name || matched.email) : idOrName;
  };

  // Format browser & userAgent
  const formatUserAgent = (ua: string | null) => {
    if (!ua) return "Unknown Browser";
    if (ua.includes("Chrome")) return "Chrome Browser";
    if (ua.includes("Safari")) return "Safari Browser";
    if (ua.includes("Firefox")) return "Firefox Browser";
    if (ua.includes("Edge")) return "Microsoft Edge";
    return ua.length > 30 ? ua.slice(0, 30) + "..." : ua;
  };

  // Priority Badge colors
  const getPriorityBadge = (prio: string) => {
    switch (prio) {
      case "Urgent":
        return "bg-rose-100 text-rose-700 border-rose-200 font-bold";
      case "High":
        return "bg-amber-100 text-amber-700 border-amber-200 font-semibold";
      case "Medium":
        return "bg-sky-100 text-sky-700 border-sky-200 font-medium";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200 font-normal";
    }
  };

  // Status Badge colors
  const getStatusBadge = (stat: string) => {
    switch (stat) {
      case "New":
        return "bg-indigo-100 text-indigo-700 border-indigo-200 font-black animate-pulse";
      case "Open":
        return "bg-emerald-100 text-emerald-700 border-emerald-200 font-bold";
      case "In Progress":
        return "bg-blue-100 text-blue-700 border-blue-200 font-semibold";
      case "Waiting":
        return "bg-amber-100 text-amber-700 border-amber-200 font-medium";
      case "Resolved":
        return "bg-teal-100 text-teal-700 border-teal-200 font-medium";
      case "Closed":
        return "bg-slate-100 text-slate-700 border-slate-200 font-normal";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  // EXPORT FUNCTIONS
  const handleExportCSV = () => {
    if (tickets.length === 0) return alert("No ticket data to export.");
    const headers = ["Ticket ID", "Full Name", "Email", "Phone", "Subject", "Category", "Status", "Priority", "Assigned Admin", "Created Date", "Message"];
    const rows = tickets.map(t => [
      t.id,
      t.name,
      t.email,
      t.phone || "",
      t.subject,
      t.category || "",
      t.status,
      t.priority,
      getAdminName(t.assignedTo),
      new Date(t.createdAt).toLocaleString(),
      t.message.replace(/\r?\n|\r/g, " ")
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `support_tickets_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    if (tickets.length === 0) return alert("No ticket data to export.");
    const data = tickets.map(t => ({
      "Ticket ID": t.id,
      "Full Name": t.name,
      "Email Address": t.email,
      "Phone Number": t.phone || "",
      "Subject": t.subject,
      "Category": t.category || "General Inquiry",
      "Status": t.status,
      "Priority": t.priority,
      "Assigned To": getAdminName(t.assignedTo),
      "Created Date": new Date(t.createdAt).toLocaleString(),
      "Message Content": t.message
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tickets");
    XLSX.writeFile(workbook, `support_tickets_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportPDF = () => {
    if (tickets.length === 0) return alert("No ticket data to export.");
    const doc = new jsPDF("l", "mm", "a4") as any;
    
    doc.setFontSize(16);
    doc.text("CareerForge AI Support Tickets - Admin Export", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()} | Total Tickets: ${tickets.length}`, 14, 22);

    const tableData = tickets.map((t, idx) => [
      t.id.slice(0, 8),
      t.name,
      t.email,
      t.subject.length > 25 ? t.subject.slice(0, 25) + "..." : t.subject,
      t.category || "General",
      t.status,
      t.priority,
      getAdminName(t.assignedTo),
      new Date(t.createdAt).toLocaleDateString()
    ]);

    doc.autoTable({
      startY: 28,
      head: [["ID", "Name", "Email", "Subject", "Category", "Status", "Priority", "Assigned", "Created"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 8 },
    });

    doc.save(`support_tickets_export_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <>
    <div className="space-y-6 w-full max-w-7xl xl:max-w-360 2xl:max-w-380 mx-auto pb-12 animate-in fade-in duration-300">
      
      {/* Title & Export Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Support Tickets & Messages</h1>
          <p className="text-slate-500 text-sm">Manage incoming customer contact submissions, support requests, and send replies directly.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg hover:bg-emerald-100/50 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Excel
          </button>
          <button 
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-100 rounded-lg hover:bg-rose-100/50 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> PDF (Table)
          </button>
          <button 
            onClick={fetchTickets}
            className="p-2 text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition cursor-pointer"
            title="Refresh List"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-slate-700 font-bold border-b border-slate-100 pb-3">
          <Filter className="w-4 h-4" /> Filter Support Tickets
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          
          {/* Keyword Search */}
          <div className="space-y-1.5 col-span-1 sm:col-span-2">
            <label className="text-xs font-semibold text-slate-600">Search messages</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, subject, or body..."
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Statuses</option>
              <option value="New">New</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Waiting">Waiting</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Categories</option>
              <option value="General Inquiry">General Inquiry</option>
              <option value="Technical Support">Technical Support</option>
              <option value="Billing Question">Billing Question</option>
              <option value="Feedback & Suggestions">Feedback & Suggestions</option>
            </select>
          </div>

          {/* Assigned Admin Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Assigned Admin</label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Admins</option>
              <option value="unassigned">Unassigned</option>
              {admins.map(a => (
                <option key={a.id} value={a.id}>{a.name || a.email}</option>
              ))}
            </select>
          </div>

          {/* Date Range Start */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Date Range End */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

        </div>

        {/* Unread Switch */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
              className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
            />
            Show "New" Tickets Only (Unread)
          </label>
          <button
            onClick={() => {
              setSearch("");
              setStatus("all");
              setPriority("all");
              setCategory("all");
              setAssignedTo("all");
              setStartDate("");
              setEndDate("");
              setUnreadOnly(false);
            }}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-bold transition hover:underline"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Main Content Pane: Split master-detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Ticket List Column */}
        <div className={`col-span-1 lg:col-span-5 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col h-[700px]`}>
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
            <span className="font-bold text-slate-800 text-sm">Tickets ({tickets.length})</span>
            <span className="text-xs text-slate-400">Sorted by newest</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="h-full flex flex-col justify-center items-center text-slate-400 gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <span className="text-sm font-medium">Loading messages...</span>
              </div>
            ) : tickets.length === 0 ? (
              <div className="h-full flex flex-col justify-center items-center p-8 text-slate-400 text-center space-y-2">
                <HelpCircle className="w-10 h-10 text-slate-300" />
                <h3 className="font-bold text-slate-700">No tickets found</h3>
                <p className="text-xs max-w-xs">Try adjusting your filters or search keywords to locate specific submissions.</p>
              </div>
            ) : (
              tickets.map((t) => {
                const isSelected = selectedTicketId === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTicketId(isSelected ? null : t.id)}
                    className={`w-full text-left p-4 transition-all flex flex-col gap-2 relative ${isSelected ? "bg-indigo-50/40 border-l-4 border-l-indigo-600" : "hover:bg-slate-50 border-l-4 border-l-transparent"}`}
                  >
                    <div className="flex items-start justify-between gap-2 w-full">
                      <span className="font-bold text-slate-800 text-sm truncate max-w-[150px]">{t.name}</span>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0">{new Date(t.createdAt).toLocaleDateString()}</span>
                    </div>

                    <div className="font-semibold text-slate-900 text-xs truncate max-w-full">
                      {t.subject}
                    </div>

                    <p className="text-slate-500 text-xs line-clamp-2 max-w-full">
                      {t.message}
                    </p>

                    <div className="flex flex-wrap gap-1.5 items-center mt-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] border ${getStatusBadge(t.status)}`}>
                        {t.status}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] border ${getPriorityBadge(t.priority)}`}>
                        {t.priority}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium ml-auto">
                        {t.category || "General"}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Ticket Details Column */}
        <div className="col-span-1 lg:col-span-7 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm h-[700px] flex flex-col">
          {detailLoading ? (
            <div className="h-full flex flex-col justify-center items-center text-slate-400 gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <span className="text-sm font-medium">Loading ticket details...</span>
            </div>
          ) : !selectedTicket ? (
            <div className="h-full flex flex-col justify-center items-center p-8 text-slate-400 text-center space-y-2">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center border border-indigo-100 mb-2">
                <Mail className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-700">No ticket selected</h3>
              <p className="text-xs max-w-sm">Select a ticket from the left panel to inspect message body, send responses, change priority levels, assign admins, and manage statuses.</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              
              {/* Details Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-start justify-between gap-4 shrink-0 bg-slate-50/50">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">{selectedTicket.name}</h2>
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded border border-slate-300 font-mono">#{selectedTicket.id.slice(0, 8)}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-slate-400" /> {selectedTicket.email}</span>
                    {selectedTicket.phone && (
                      <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-slate-400" /> {selectedTicket.phone}</span>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={() => handleDeleteTicket(selectedTicket.id)}
                  className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition border border-transparent hover:border-rose-100 cursor-pointer"
                  title="Delete Ticket"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable ticket details, timelines, replies */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Meta details & control buttons */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Status</span>
                    <select
                      value={selectedTicket.status}
                      onChange={(e) => handleUpdateStatus(e.target.value)}
                      disabled={actionLoading !== null}
                      className="w-full text-xs font-bold border border-slate-200 rounded-lg py-1 px-2 bg-white focus:outline-none cursor-pointer"
                    >
                      <option value="New">New</option>
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Waiting">Waiting</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Priority</span>
                    <select
                      value={selectedTicket.priority}
                      onChange={(e) => handleUpdatePriority(e.target.value)}
                      disabled={actionLoading !== null}
                      className="w-full text-xs font-bold border border-slate-200 rounded-lg py-1 px-2 bg-white focus:outline-none cursor-pointer"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Assign Support Admin</span>
                    <select
                      value={selectedTicket.assignedTo || ""}
                      onChange={(e) => handleAssignTicket(e.target.value || null)}
                      disabled={actionLoading !== null}
                      className="w-full text-xs font-bold border border-slate-200 rounded-lg py-1 px-2 bg-white focus:outline-none cursor-pointer"
                    >
                      <option value="">Unassigned</option>
                      {admins.map(a => (
                        <option key={a.id} value={a.id}>{a.name || a.email}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Ticket Message Body */}
                <div className="space-y-2">
                  <h3 className="font-bold text-slate-800 text-sm">Subject: {selectedTicket.subject}</h3>
                  <div className="p-4 border border-slate-200 bg-slate-50/50 rounded-2xl text-slate-700 text-sm whitespace-pre-wrap leading-relaxed shadow-inner">
                    {selectedTicket.message}
                  </div>
                </div>

                {/* Metadata details (IP, user agent) */}
                <div className="flex flex-wrap gap-4 text-xs text-slate-400 border-t border-b border-slate-100 py-3 bg-slate-50/20 px-3 rounded-lg">
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Created: {new Date(selectedTicket.createdAt).toLocaleString()}</span>
                  <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> IP Address: {selectedTicket.ipAddress || "Unknown"}</span>
                  <span className="flex items-center gap-1" title={selectedTicket.userAgent || ""}><ExternalLink className="w-3.5 h-3.5" /> Client: {formatUserAgent(selectedTicket.userAgent)}</span>
                </div>

                {/* Unified Timeline & Replies */}
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-800 text-sm">Activity & Timeline</h3>
                  <div className="space-y-4 relative pl-4 border-l-2 border-slate-100 ml-2">
                    
                    {/* Creation marker */}
                    <div className="relative">
                      <div className="absolute left-[-23px] top-1.5 w-2.5 h-2.5 bg-indigo-500 rounded-full border border-white" />
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-700">Ticket Created</p>
                        <p className="text-[10px] text-slate-400">{new Date(selectedTicket.createdAt).toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Replies */}
                    {selectedTicket.replies && selectedTicket.replies.map((rep) => (
                      <div key={rep.id} className="relative">
                        <div className="absolute left-[-23px] top-1.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white" />
                        <div className="p-3 bg-emerald-50/40 border border-emerald-100 rounded-xl space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                              <CornerDownRight className="w-3 h-3" /> Reply from {rep.admin?.name || rep.admin?.email || "Support Admin"}
                            </span>
                            <span className="text-[10px] text-slate-400">{new Date(rep.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="text-xs text-slate-500 font-bold">Subj: {rep.subject}</p>
                          <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{rep.reply}</p>
                        </div>
                      </div>
                    ))}

                    {/* Status update indicators */}
                    {selectedTicket.repliedAt && (
                      <div className="relative">
                        <div className="absolute left-[-23px] top-1.5 w-2.5 h-2.5 bg-amber-500 rounded-full border border-white" />
                        <div className="space-y-0.5">
                          <p className="text-xs font-semibold text-slate-600">Last reply dispatched to user</p>
                          <p className="text-[10px] text-slate-400">{new Date(selectedTicket.repliedAt).toLocaleString()}</p>
                        </div>
                      </div>
                    )}

                    {selectedTicket.closedAt && (
                      <div className="relative">
                        <div className="absolute left-[-23px] top-1.5 w-2.5 h-2.5 bg-slate-400 rounded-full border border-white" />
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-slate-700">Ticket Closed</p>
                          <p className="text-[10px] text-slate-400">{new Date(selectedTicket.closedAt).toLocaleString()}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reply composer */}
                <div className="border-t border-slate-100 pt-6 space-y-4">
                  <h3 className="font-bold text-slate-800 text-sm">Send Reply Message</h3>
                  
                  <form onSubmit={handleSendReply} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">Email Subject Line</label>
                      <input
                        type="text"
                        required
                        value={replySubject}
                        onChange={(e) => setReplySubject(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">Reply Body</label>
                      <textarea
                        required
                        rows={4}
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                        placeholder="Write support reply email text..."
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      ></textarea>
                    </div>

                    {replyError && (
                      <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs">
                        {replyError}
                      </div>
                    )}

                    {replySuccess && (
                      <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-xs font-medium flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Reply sent and stored successfully!
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus("Resolved")}
                          className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-100 transition cursor-pointer"
                        >
                          Mark Resolved
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus("Closed")}
                          className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition cursor-pointer"
                        >
                          Close Ticket
                        </button>
                      </div>
                      
                      <button
                        type="submit"
                        disabled={isSendingReply || !replyBody.trim()}
                        className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold px-4 py-1.5 rounded-lg text-xs transition cursor-pointer"
                      >
                        {isSendingReply ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending...
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" /> Send Reply
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>

              </div>
            </div>
          )}
        </div>

      </div>

    </div>
    </>
  );
}
