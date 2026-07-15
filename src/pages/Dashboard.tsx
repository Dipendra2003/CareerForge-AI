import SEOMeta from '../components/SEOMeta';
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { 
  History, TrendingUp, Sparkles, 
  FileText, 
  Search, Trash2, Heart, LayoutTemplate, Briefcase, FileSignature, Share2, X,
  Filter, ChevronDown, ChevronLeft, ChevronRight, Upload, Download, Check, Square,
  CheckCircle, XCircle, AlertTriangle, Lightbulb, BarChart2
} from "lucide-react";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar 
} from "recharts";
import { Scan, User } from "../types";
import apiClient from "../lib/apiClient";
import { exportDataService } from "../utils/exportUtils";
import { useAuth } from "../contexts/AuthContext";
import ATSReport from "../components/ATSReport";

interface DashboardProps {
  currentUser: User;
  onNavigate: (page: string) => void;
  onSelectScan: (scan: Scan) => void;
  scans: Scan[];
}

export default function Dashboard({ currentUser, onNavigate, onSelectScan, scans }: DashboardProps) {
  const fetchIdRef = useRef(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("overview"); // overview, resumes, ats, ai, cover_letters, interviews
  
  const [syncingSubscription, setSyncingSubscription] = useState(searchParams.get('checkout') === 'success' && currentUser?.plan === 'free');
  const [syncTimeout, setSyncTimeout] = useState(false);
  const [workspaceData, setWorkspaceData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewModal, setViewModal] = useState<{type: string, item: any} | null>(null);
  const [deleteModal, setDeleteModal] = useState<{type: string, id: string, name: string} | null>(null);
  
  // Local state for scans to enable optimistic updates
  const [localScans, setLocalScans] = useState<Scan[]>(scans || []);
  
  // Advanced filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [filterDateRange, setFilterDateRange] = useState<"all" | "today" | "week" | "month">("all");
  const [sortBy, setSortBy] = useState<"date" | "name">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  
  // Bulk operations
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  
  // Upload modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploading, setUploading] = useState(false);

  const fetchData = async (forceLoad = false) => {
    if (!currentUser) return;
    
    const currentFetchId = ++fetchIdRef.current;
    
    // Determine if we need a blocking load
    let needsBlockingLoad = forceLoad || !workspaceData;
    if (workspaceData && !forceLoad) {
      if (activeTab === 'overview' && !workspaceData.overview) needsBlockingLoad = true;
      else if (activeTab === 'resumes' && !workspaceData.resumes) needsBlockingLoad = true;
      else if (activeTab === 'ats' && !workspaceData.scans) needsBlockingLoad = true;
      else if ((activeTab === 'bullet' || activeTab === 'linkedin') && !workspaceData.bulletRewrites) needsBlockingLoad = true;
      else if (activeTab === 'cover_letters' && !workspaceData.covers) needsBlockingLoad = true;
      else if (activeTab === 'interviews' && !workspaceData.interviews) needsBlockingLoad = true;
    }

    if (needsBlockingLoad) {
      setIsLoading(true);
    }
    
    try {
      const params = {
        search: searchQuery,
        dateRange: filterDateRange,
        sortBy,
        sortOrder,
        isFavorite: filterFavorites,
        page: currentPage,
        limit: itemsPerPage
      };

      const newState = workspaceData ? { ...workspaceData } : {};

      if (!newState.overview) {
        newState.overview = await apiClient.get("/workspace/overview").then(r => r.data).catch(() => null);
      }

      if (activeTab === 'resumes') {
        const { data } = await apiClient.get("/workspace/resumes", { params });
        newState.resumes = data;
      } else if (activeTab === 'ats') {
        const { data } = await apiClient.get("/scans", { params });
        newState.scans = { items: data.scans, total: data.total };
      } else if (activeTab === 'bullet' || activeTab === 'linkedin') {
        const { data } = await apiClient.get("/workspace/ai-outputs", { params });
        newState.bulletRewrites = { items: data.aiOutputs.filter((o:any) => o.type === 'bullet_rewriter'), total: data.total };
        newState.linkedinProfiles = { items: data.aiOutputs.filter((o:any) => o.type === 'linkedin_optimization'), total: data.total };
      } else if (activeTab === 'cover_letters') {
        const { data } = await apiClient.get("/workspace/cover-letters", { params });
        newState.covers = { items: data.coverLetters, total: data.total };
      } else if (activeTab === 'interviews') {
        const { data } = await apiClient.get("/workspace/interviews", { params });
        newState.interviews = { items: data.interviews, total: data.total };
      }
      
      if (currentFetchId === fetchIdRef.current) {
        setWorkspaceData(newState);
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (needsBlockingLoad) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    // Only debounce if we have an active search query to prevent unnecessary typing API calls.
    // Otherwise fetch instantly for fast tab switching.
    if (searchQuery.length > 0) {
      const timer = setTimeout(() => {
        fetchData(false);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      fetchData(false);
    }
  }, [currentUser, activeTab, searchQuery, filterDateRange, sortBy, sortOrder, filterFavorites, currentPage]);

  // Sync localScans with props
  useEffect(() => {
    setLocalScans(scans || []);
  }, [scans]);

  const [systemSettings, setSystemSettings] = useState<any>(null);
  
  useEffect(() => {
    import("axios").then(axios => {
      axios.default.get("/api/public/config").then(res => {
        setSystemSettings(res.data.settings);
      });
    });
  }, []);

  const { fetchUserRecord } = useAuth();

  // Handle URL parameters from notifications
  useEffect(() => {
    const scanId = searchParams.get('scanId');
    const viewType = searchParams.get('view');
    
    if (scanId && viewType === 'scan') {
      const loadScanFromUrl = async () => {
        let scan = null;
        if (localScans && localScans.length > 0) {
          scan = localScans.find(s => s.id === scanId);
        }
        
        if (!scan) {
          try {
            const { data } = await apiClient.get(`/scans/${scanId}`);
            if (data && data.scan) {
              scan = data.scan;
            }
          } catch (err) {
            console.error("Failed to load scan for view", err);
          }
        }

        if (scan) {
          setActiveTab('ats');
          setViewModal({ type: 'scan', item: scan });
          // Clear URL parameters after opening modal
          setSearchParams({});
        }
      };

      loadScanFromUrl();
    }
  }, [searchParams, localScans]);

  // Reset filters and selections when changing tabs
  useEffect(() => {
    setSearchQuery("");
    setSelectedItems(new Set());
    setBulkMode(false);
    setCurrentPage(1);
    resetFilters();
  }, [activeTab]);

  // Handle checkout success syncing
  useEffect(() => {
    if (searchParams.get('checkout') === 'success' && currentUser?.plan === 'free') {
      let attempts = 0;
      const maxAttempts = 30; // 60 seconds total (every 2s)
      
      const interval = setInterval(async () => {
        attempts++;
        try {
          const { data } = await apiClient.get('/user/me');
          if (data.user && data.user.plan !== 'free') {
             // Synced successfully!
             clearInterval(interval);
             setSyncingSubscription(false);
             setSearchParams({});
             await fetchUserRecord(); // Refresh to ensure currentUser cascades
          } else if (attempts >= maxAttempts) {
             clearInterval(interval);
             setSyncTimeout(true);
          }
        } catch (e) {
          console.error("Failed to poll user plan", e);
        }
      }, 2000);
      
      return () => clearInterval(interval);
    }
  }, [searchParams, currentUser?.plan, setSearchParams, fetchUserRecord]);

  // Delete handler
  const handleDelete = async (type: string, id: string, name: string = '') => {
    setDeleteModal({ type, id, name });
  };

  const confirmDelete = async () => {
    if (!deleteModal) return;
    
    const { type, id } = deleteModal;
    
    // Optimistic update - instantly remove from UI
    if (type === 'scans') {
      // Update local scans state for ATS History tab
      setLocalScans(prev => prev.filter(scan => scan.id !== id));
    }
    
    setWorkspaceData((prev: any) => {
      if (!prev) return prev;
      
      const typeMap: any = {
        'resumes': 'resumes',
        'scans': 'scans',
        'ai-outputs': type === 'ai-outputs' ? 'bulletRewrites' : 'linkedinProfiles',
        'cover-letters': 'covers',
        'interviews': 'interviews'
      };
      
      const key = typeMap[type] || type;
      
      if (key === 'bulletRewrites' || key === 'linkedinProfiles') {
        // Handle AI outputs
        return {
          ...prev,
          bulletRewrites: prev.bulletRewrites ? {
            ...prev.bulletRewrites,
            items: prev.bulletRewrites.items?.filter((item: any) => item.id !== id) || [],
            total: Math.max(0, (prev.bulletRewrites.total || 1) - 1)
          } : undefined,
          linkedinProfiles: prev.linkedinProfiles ? {
            ...prev.linkedinProfiles,
            items: prev.linkedinProfiles.items?.filter((item: any) => item.id !== id) || [],
            total: Math.max(0, (prev.linkedinProfiles.total || 1) - 1)
          } : undefined
        };
      }
      
      return {
        ...prev,
        [key]: prev[key] ? {
          ...prev[key],
          items: prev[key].items?.filter((item: any) => item.id !== id) || [],
          total: Math.max(0, (prev[key].total || 1) - 1)
        } : undefined
      };
    });
    
    setDeleteModal(null);
    
    try {
      await apiClient.delete(`/workspace/${deleteModal.type}/${deleteModal.id}`);
      // Success - data already updated optimistically, fetch to guarantee sync
      fetchData(false);
    } catch (error) {
      console.error(`Failed to delete ${deleteModal.type}:`, error);
      alert(`Failed to delete ${deleteModal.type}`);
      // Revert optimistic update by fetching fresh data
      if (type === 'scans') {
        setLocalScans(scans || []);
      }
      fetchData();
    }
  };

  // Toggle favorite
  const handleToggleFavorite = async (type: string, id: string, currentValue: boolean) => {
    // Optimistic update - instantly update UI
    setWorkspaceData((prev: any) => {
      if (!prev) return prev;
      
      const typeMap: any = {
        'resumes': 'resumes',
        'ai-outputs': 'bulletRewrites', // Will update both
        'cover-letters': 'covers',
        'interviews': 'interviews'
      };
      
      const key = typeMap[type] || type;
      
      // Update the specific item
      const updateItem = (item: any) => 
        item.id === id ? { ...item, isFavorite: !currentValue } : item;
      
      return {
        ...prev,
        [key]: prev[key] ? {
          ...prev[key],
          items: prev[key].items?.map(updateItem) || []
        } : undefined,
        // Also update linkedinProfiles if it's ai-outputs
        ...(type === 'ai-outputs' && prev.linkedinProfiles && {
          linkedinProfiles: {
            ...prev.linkedinProfiles,
            items: prev.linkedinProfiles.items?.map(updateItem) || []
          }
        })
      };
    });
    
    try {
      await apiClient.patch(`/workspace/${type}/${id}`, { isFavorite: !currentValue });
      // Success - data already updated optimistically, fetch to guarantee sync
      fetchData(false);
    } catch (error) {
      console.error(`Failed to toggle favorite:`, error);
      // Revert optimistic update
      fetchData();
    }
  };

  // Open view modal
  const handleView = async (type: string, item: any) => {
    if (type === 'scan' && !item.fullResult) {
      try {
        const { data } = await apiClient.get(`/scans/${item.id}`);
        if (data && data.scan) {
          setViewModal({ type, item: data.scan });
          return;
        }
      } catch (err) {
        console.error("Failed to load full scan details", err);
      }
    }
    setViewModal({ type, item });
  };

  // Filter items by date range
  const filterByDate = (items: any[]) => {
    if (filterDateRange === "all") return items;
    const now = new Date();
    const filtered = items.filter(item => {
      const itemDate = new Date(item.createdAt);
      if (filterDateRange === "today") {
        return itemDate.toDateString() === now.toDateString();
      } else if (filterDateRange === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return itemDate >= weekAgo;
      } else if (filterDateRange === "month") {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return itemDate >= monthAgo;
      }
      return true;
    });
    return filtered;
  };

  // Filter by favorites
  const filterByFavorites = (items: any[]) => {
    if (!filterFavorites) return items;
    return items.filter(item => item.isFavorite);
  };

  // Sort items
  const sortItems = (items: any[]) => {
    const sorted = [...items].sort((a, b) => {
      if (sortBy === "date") {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
      } else if (sortBy === "name") {
        const nameA = (a.name || a.jobTitle || a.type || "").toLowerCase();
        const nameB = (b.name || b.jobTitle || b.type || "").toLowerCase();
        return sortOrder === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      }
      return 0;
    });
    return sorted;
  };

  // Apply all filters and sorting
  const processItems = (items: any[]) => {
    let processed = [...items];
    processed = filterByDate(processed);
    processed = filterByFavorites(processed);
    processed = sortItems(processed);
    return processed;
  };

  // Pagination
  const paginateItems = (items: any[]) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
  };

  const getTotalPages = (items: any[]) => {
    return Math.ceil(items.length / itemsPerPage);
  };

  // Bulk operations
  const toggleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const toggleSelectAll = (items: any[]) => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map(item => item.id)));
    }
  };

  const handleBulkDelete = async (type: string, items: any[]) => {
    if (selectedItems.size === 0) return;
    if (!confirm(`Delete ${selectedItems.size} selected items?`)) return;
    
    const idsToDelete = Array.from(selectedItems);
    
    // Optimistic update - instantly remove from UI
    setWorkspaceData((prev: any) => {
      if (!prev) return prev;
      
      const typeMap: any = {
        'resumes': 'resumes',
        'ai-outputs': 'bulletRewrites',
        'cover-letters': 'covers',
        'interviews': 'interviews'
      };
      
      const key = typeMap[type] || type;
      
      return {
        ...prev,
        [key]: prev[key] ? {
          ...prev[key],
          items: prev[key].items?.filter((item: any) => !idsToDelete.includes(item.id)) || [],
          total: Math.max(0, (prev[key].total || idsToDelete.length) - idsToDelete.length)
        } : undefined,
        // Also filter linkedinProfiles if it's ai-outputs
        ...(type === 'ai-outputs' && prev.linkedinProfiles && {
          linkedinProfiles: {
            ...prev.linkedinProfiles,
            items: prev.linkedinProfiles.items?.filter((item: any) => !idsToDelete.includes(item.id)) || [],
            total: Math.max(0, (prev.linkedinProfiles.total || idsToDelete.length) - idsToDelete.length)
          }
        })
      };
    });
    
    setSelectedItems(new Set());
    setBulkMode(false);
    
    try {
      await Promise.all(
        idsToDelete.map(id => apiClient.delete(`/workspace/${type}/${id}`))
      );
      // Success - data already updated optimistically, fetch to guarantee sync
      fetchData(false);
    } catch (error) {
      console.error("Bulk delete failed:", error);
      alert("Failed to delete some items");
      // Revert by fetching fresh data
      fetchData();
    }
  };

  // Export functionality
  const handleExport = async (items: any[], filename: string, format: 'json'|'csv'|'pdf'|'docx') => {
    try {
      const typeMap: Record<string, string> = {
        resumes: 'resumes',
        scans: 'scans',
        aioutputs: 'ai-outputs',
        coverletters: 'cover_letters',
        interviews: 'interviews'
      };
      
      const typeParam = Object.keys(typeMap).find(k => typeMap[k] === filename) ? filename : 
                        filename === 'ai-outputs' ? 'ai-outputs' : 
                        filename === 'cover_letters' ? 'cover_letters' : filename;

      const filters = {
        search: searchQuery,
        dateRange: filterDateRange,
        sortBy,
        sortOrder,
        isFavorite: filterFavorites ? 'true' : undefined
      };

      const response = await apiClient.post("/workspace/export", {
        type: typeParam,
        format,
        filters
      }, { responseType: 'blob' });

      // Create a blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('href' in document.createElement('a') ? 'a' : 'span') as HTMLAnchorElement;
      link.href = url;
      link.setAttribute('download', `${typeParam}_export_${new Date().toISOString().split('T')[0]}.${format}`);
      document.body.appendChild(link);
      link.click();
      if (link.parentNode) link.parentNode.removeChild(link);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export data.");
    }
  };

  // Resume upload handler
  const handleResumeUpload = async () => {
    if (!uploadFile || !uploadName.trim()) return;
    setUploading(true);
    try {
      // Step 1: Upload file to Cloudinary via /parse endpoint
      const formData = new FormData();
      formData.append("file", uploadFile);
      
      const parseResponse = await apiClient.post("/parse", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      const { text, fileInfo } = parseResponse.data;
      
      // Step 2: Save resume to workspace with fileInfo
      const response = await apiClient.post("/workspace/resumes", {
        name: uploadName,
        content: text,
        fileUrl: fileInfo.url,
        filePublicId: fileInfo.public_id,
        fileSize: fileInfo.size,
        mimeType: fileInfo.mimetype
      });
      
      // Optimistic update - add new resume instantly
      const newResume = response.data.resume;
      setWorkspaceData((prev: any) => ({
        ...prev,
        resumes: [newResume, ...(prev.resumes || [])]
      }));
      
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadName("");
    } catch (error: any) {
      console.error("Upload failed:", error);
      const errorMsg = error.response?.data?.error || "Failed to upload resume";
      alert(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  // Reset filters
  const resetFilters = () => {
    setFilterFavorites(false);
    setFilterDateRange("all");
    setSortBy("date");
    setSortOrder("desc");
    setCurrentPage(1);
  };

  const tabs = [
    { id: "overview", label: "Home Dashboard", icon: LayoutTemplate },
    { id: "resumes", label: "Resume Library", icon: FileText },
    { id: "ats", label: "ATS History", icon: History },
    { id: "bullet", label: "Bullet Rewrites", icon: Sparkles },
    { id: "cover_letters", label: "Cover Letters", icon: FileSignature },
    { id: "linkedin", label: "LinkedIn Profiles", icon: Share2 },
    { id: "interviews", label: "Interview Prep", icon: Briefcase }
  ];

  if (isLoading || !workspaceData) {
    return (
      <div className="w-full flex items-center justify-center py-20">
         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (syncingSubscription) {
    return (
      <div className="w-full max-w-7xl mx-auto flex flex-col items-center justify-center py-32 px-4">
        {syncTimeout ? (
           <div className="text-center space-y-4 max-w-md">
             <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto" />
             <h2 className="text-2xl font-bold text-slate-800">We're still processing your payment.</h2>
             <p className="text-slate-600">It's taking a bit longer than usual to sync with Stripe. Please don't worry, your payment is secure.</p>
             <div className="flex justify-center gap-4 mt-6">
               <button onClick={() => fetchUserRecord()} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700">Refresh Status</button>
               <button onClick={() => window.location.href='mailto:support@careerforgeai.com'} className="px-6 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200">Contact Support</button>
             </div>
           </div>
        ) : (
           <div className="text-center space-y-4 max-w-md">
             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-6"></div>
             <h2 className="text-2xl font-bold text-slate-800 animate-pulse">Synchronizing subscription...</h2>
             <p className="text-slate-600">We are confirming your payment and upgrading your account. Please wait a moment.</p>
           </div>
        )}
      </div>
    );
  }

  const { overview, resumes, bulletRewrites, linkedinProfiles, covers, interviews } = workspaceData;

  // Debug logging
  console.log("Dashboard data:", { overview, resumes, bulletRewrites, linkedinProfiles, covers, interviews });
  
  // Debug resume fileUrls
  if (resumes && resumes.length > 0) {
    console.log("Resume fileUrls:", resumes.map((r: any) => ({ 
      name: r.name, 
      fileUrl: r.fileUrl,
      hasFileUrl: !!r.fileUrl 
    })));
  }

  const renderOverview = () => {
    if (overview === undefined || overview === null) {
      return <div className="text-center py-20 text-slate-500">Loading overview...</div>;
    }
    return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Resumes", count: overview?.counts?.resumes || 0, icon: FileText, bg: "bg-blue-50 text-blue-600" },
          { label: "ATS Scans", count: overview?.counts?.scans || 0, icon: History, bg: "bg-indigo-50 text-indigo-600" },
          { label: "Cover Letters", count: overview?.counts?.coverLetters || 0, icon: FileSignature, bg: "bg-purple-50 text-purple-600" },
          { label: "AI Outputs", count: overview?.counts?.aiOutputs || 0, icon: Sparkles, bg: "bg-emerald-50 text-emerald-600" },
          { label: "Interviews", count: overview?.counts?.interviews || 0, icon: Briefcase, bg: "bg-amber-50 text-amber-600" },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
            <div className={`p-3 rounded-xl mb-3 ${stat.bg}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <h4 className="text-2xl font-black text-slate-800">{stat.count}</h4>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
          </div>
        ))}
      </div>
      
      {/* User Quota Card */}
      {currentUser && (!currentUser.plan || currentUser.plan.toLowerCase() === "free") && systemSettings && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between shadow-sm animate-in fade-in slide-in-from-bottom-4">
           <div className="flex items-center gap-3 mb-4 md:mb-0">
             <div className="bg-indigo-600 p-2.5 rounded-xl text-white">
                <Sparkles className="w-5 h-5" />
             </div>
             <div>
               <h4 className="font-bold text-slate-900">Your Scan Quota</h4>
               <div className="flex flex-wrap items-center gap-2 mt-0.5">
                 <p className="text-sm text-slate-600">
                   You have used <strong className="text-slate-900">{(currentUser.scans_used_this_month || 0)}</strong> out of <strong className="text-slate-900">{(systemSettings?.freeScanLimit || 3) + (currentUser.extra_scans || 0)}</strong> scans this month.
                 </p>
                 {(currentUser.extra_scans || 0) > 0 && (
                   <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                     <Sparkles className="w-3 h-3" />
                     +{currentUser.extra_scans} bonus scans active!
                   </span>
                 )}
               </div>
             </div>
           </div>
           <div className="w-full md:w-64">
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-500">Usage</span>
                <span className="text-indigo-700">{Math.round(((currentUser.scans_used_this_month || 0) / ((systemSettings?.freeScanLimit || 3) + (currentUser.extra_scans || 0))) * 100)}%</span>
              </div>
              <div className="w-full bg-indigo-200/50 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all ${
                    ((currentUser.scans_used_this_month || 0) / ((systemSettings?.freeScanLimit || 3) + (currentUser.extra_scans || 0))) >= 0.9 
                      ? 'bg-red-500' 
                      : ((currentUser.scans_used_this_month || 0) / ((systemSettings?.freeScanLimit || 3) + (currentUser.extra_scans || 0))) >= 0.7 
                        ? 'bg-amber-500' 
                        : 'bg-indigo-500'
                  }`}
                  style={{ width: `${Math.min(100, ((currentUser.scans_used_this_month || 0) / ((systemSettings?.freeScanLimit || 3) + (currentUser.extra_scans || 0))) * 100)}%` }}
                />
              </div>
           </div>
        </div>
      )}
      
      {overview?.queueHealth && currentUser?.role === 'admin' && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
           <div className="flex items-center gap-3">
             <div className="bg-indigo-100 p-2 rounded-xl">
                <BarChart2 className="w-5 h-5 text-indigo-600" />
             </div>
             <div>
               <h4 className="font-bold text-slate-800 text-sm">Enterprise ATS Processing Queue</h4>
               <p className="text-xs text-slate-500">Live async worker statuses for asynchronous ATS analysis</p>
             </div>
           </div>
           <div className="flex gap-6">
             <div className="text-center">
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Waiting</p>
               <p className="font-black text-slate-700 text-lg">{overview.queueHealth.waiting}</p>
             </div>
             <div className="text-center">
               <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide">Active</p>
               <p className="font-black text-emerald-600 text-lg">{overview.queueHealth.active}</p>
             </div>
             <div className="text-center">
               <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wide">Completed</p>
               <p className="font-black text-blue-600 text-lg">{overview.queueHealth.completed}</p>
             </div>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-indigo-600" /> Career Progress Timeline
          </h3>
          <div className="flex gap-6 mb-2">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Avg ATS</p>
              <p className="text-xl font-black text-slate-800">{overview?.careerProgress?.avgAts || 0}%</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Highest ATS</p>
              <p className="text-xl font-black text-emerald-600">{overview?.careerProgress?.highestAts || 0}%</p>
            </div>
          </div>
          <div className="h-64">
            {(overview?.careerProgress?.chartData?.length || 0) > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={overview.careerProgress.chartData}>
                  <defs>
                    <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize="10px" tickLine={false} />
                  <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize="10px" tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#scoreColor)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-xs">No scan history recorded yet.</div>
            )}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col">
          <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2 text-sm">
            <History className="w-4 h-4 text-indigo-600" /> Recent Activity
          </h3>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {(overview?.recentActivity?.length || 0) === 0 && <p className="text-xs text-slate-500">No recent activity.</p>}
            {(overview?.recentActivity || []).map((log: any) => (
              <div key={log.id} className="flex gap-3 text-sm">
                <div className="w-2 h-2 mt-1.5 rounded-full bg-indigo-400 shrink-0"></div>
                <div>
                  <p className="font-medium text-slate-800">{log.action}</p>
                  <p className="text-xs text-slate-500">{log.description}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{new Date(log.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600" /> Rule Failures Trend
          </h3>
          <div className="h-64">
            {(overview?.careerProgress?.ruleFailuresTrend?.length || 0) > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overview.careerProgress.ruleFailuresTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize="10px" tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize="10px" tickLine={false} axisLine={false} />
                  <Tooltip cursor={{fill: '#f8fafc'}} />
                  <Bar dataKey="failures" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-xs">No failures data recorded yet.</div>
            )}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2 text-sm">
            <Lightbulb className="w-4 h-4 text-emerald-600" /> ATS Analytics
          </h3>
          <div className="flex gap-6 mb-2">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Avg Keyword Coverage</p>
              <p className="text-xl font-black text-slate-800">{overview?.careerProgress?.keywordCoverage || 0}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Latest Score</p>
              <p className="text-xl font-black text-indigo-600">{overview?.careerProgress?.latestAts || 0}%</p>
            </div>
          </div>
          <div className="h-48 mt-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center p-4 text-center">
            <div className="space-y-2">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-sm font-bold text-slate-700">Enterprise Rule Engine Active</p>
              <p className="text-xs text-slate-500">Your resume is being evaluated using 100% deterministic rules across 10 semantic engines.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )};

  const renderResumes = () => {
    if (workspaceData?.resumes === undefined) {
      return <div className="text-center py-20 text-slate-500">Loading resumes...</div>;
    }
    
    const paginatedResumes = workspaceData.resumes?.resumes || [];
    const totalItems = workspaceData.resumes?.total || 0;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const filteredResumes = paginatedResumes; // For select all
    
    return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-wrap gap-3 justify-between items-center">
          <div className="relative flex-1 min-w-[200px]">
             <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
             <input 
               type="text" 
               placeholder="Search resumes..."
               value={searchQuery}
               onChange={e => setSearchQuery(e.target.value)}
               className="w-full pl-9 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
             />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button 
              onClick={() => setShowFilters(!showFilters)} 
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium flex items-center gap-2 transition"
            >
              <Filter className="w-4 h-4" /> Filters
            </button>
            <button 
              onClick={() => setBulkMode(!bulkMode)} 
              className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${bulkMode ? 'bg-indigo-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
            >
              <Check className="w-4 h-4" /> Bulk Select
            </button>
            <div className="flex items-center bg-slate-100 rounded-lg overflow-hidden">
              <span className="px-3 py-2 text-slate-500 text-sm font-medium flex items-center gap-1 border-r border-slate-200"><Download className="w-4 h-4" /></span>
              <button onClick={() => handleExport(filteredResumes, 'resumes', 'csv')} className="px-3 py-2 text-slate-700 hover:bg-slate-200 text-sm font-medium transition border-r border-slate-200">CSV</button>
              <button onClick={() => handleExport(filteredResumes, 'resumes', 'pdf')} className="px-3 py-2 text-slate-700 hover:bg-slate-200 text-sm font-medium transition border-r border-slate-200">PDF</button>
              <button onClick={() => handleExport(filteredResumes, 'resumes', 'docx')} className="px-3 py-2 text-slate-700 hover:bg-slate-200 text-sm font-medium transition border-r border-slate-200">DOCX</button>
              <button onClick={() => handleExport(filteredResumes, 'resumes', 'json')} className="px-3 py-2 text-slate-700 hover:bg-slate-200 text-sm font-medium transition">JSON</button>
            </div>
            <button 
              onClick={() => setShowUploadModal(true)} 
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow hover:bg-indigo-700 transition flex items-center gap-2"
            >
              <Upload className="w-4 h-4" /> Upload Resume
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-3 border-t border-slate-200">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Date Range</label>
              <select value={filterDateRange} onChange={(e) => setFilterDateRange(e.target.value as any)} className="w-full p-2 text-xs border border-slate-200 rounded-lg">
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Sort By</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="w-full p-2 text-xs border border-slate-200 rounded-lg">
                <option value="date">Date</option>
                <option value="name">Name</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Order</label>
              <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as any)} className="w-full p-2 text-xs border border-slate-200 rounded-lg">
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={filterFavorites} onChange={(e) => setFilterFavorites(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" />
                <span className="text-xs font-semibold text-slate-700">Favorites Only</span>
              </label>
              <button onClick={resetFilters} className="px-3 py-1 text-xs text-slate-600 hover:text-slate-800">Reset</button>
            </div>
          </div>
        )}

        {/* Bulk Actions Bar */}
        {bulkMode && selectedItems.size > 0 && (
          <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
            <span className="text-sm font-semibold text-indigo-800">{selectedItems.size} items selected</span>
            <button 
              onClick={() => handleBulkDelete('resumes', paginatedResumes)} 
              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition"
            >
              Delete Selected
            </button>
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {bulkMode && paginatedResumes.length > 0 && (
          <div className="bg-slate-50 p-5 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center">
            <button 
              onClick={() => toggleSelectAll(filteredResumes)} 
              className="flex flex-col items-center gap-2 text-slate-600 hover:text-indigo-600"
            >
              {selectedItems.size === totalItems ? <Check className="w-8 h-8" /> : <Square className="w-8 h-8" />}
              <span className="text-sm font-semibold">Select All</span>
            </button>
          </div>
        )}
        
        {paginatedResumes.map((r: any) => (
          <div key={r.id} className={`bg-white p-5 rounded-2xl border shadow-sm space-y-3 group hover:border-indigo-300 transition ${bulkMode && selectedItems.has(r.id) ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-slate-200'}`}>
            <div className="flex justify-between items-start">
               <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 shrink-0">
                 <FileText className="w-5 h-5" />
               </div>
               <div className="flex gap-2">
                 {bulkMode && (
                   <button 
                     onClick={() => toggleSelectItem(r.id)}
                     className={`p-1.5 rounded-lg transition ${selectedItems.has(r.id) ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400 hover:text-indigo-600'}`}
                   >
                     {selectedItems.has(r.id) ? <Check className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                   </button>
                 )}
                 <button 
                   onClick={() => handleToggleFavorite('resumes', r.id, r.isFavorite)} 
                   className="text-slate-300 hover:text-red-500"
                 >
                   <Heart className="w-4 h-4" fill={r.isFavorite ? "currentColor" : "none"} />
                 </button>
               </div>
            </div>
            <div>
              <h4 className="font-bold text-slate-800 truncate">{r.name}</h4>
              <p className="text-xs text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="flex flex-wrap gap-1">
               {r.tags?.map((t: string) => <span key={t} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{t}</span>)}
            </div>
            <div className="pt-3 border-t border-slate-100 flex justify-between">
               <button 
                 onClick={() => handleView('resume', r)}
                 className="text-xs text-indigo-600 font-medium hover:underline"
               >
                 View PDF
               </button>
               {!bulkMode && (
                 <button 
                   onClick={() => handleDelete('resumes', r.id, r.name)}
                   className="text-xs text-slate-500 hover:text-red-600"
                 >
                   <Trash2 className="w-4 h-4" />
                 </button>
               )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-sm text-slate-600">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} results
          </span>
          <div className="flex gap-2">
            <button 
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 rounded-lg text-sm font-medium flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <span className="px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-bold">
              {currentPage} / {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 rounded-lg text-sm font-medium flex items-center gap-1"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )};

  const renderGenericList = (title: string, dataObj: any, icon: any, filterFn: (i: any) => boolean, targetTab?: string, apiEndpoint?: string) => {
    if (dataObj === undefined || dataObj === null) {
      return <div className="text-center py-20 text-slate-500">Loading {title.toLowerCase()}...</div>;
    }
    
    const getTargetTab = () => {
      if (targetTab) return targetTab;
      if (title.includes("Cover")) return "cover";
      if (title.includes("Interview")) return "interview";
      return "bullet";
    };

    const getEndpoint = () => {
      if (apiEndpoint) return apiEndpoint;
      if (title.includes("Bullet") || title.includes("LinkedIn")) return "ai-outputs";
      if (title.includes("Cover")) return "cover-letters";
      if (title.includes("Interview")) return "interviews";
      return "ai-outputs";
    };
    
    const paginatedItems = dataObj?.items || [];

    const totalItems = dataObj?.total || 0;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const filteredItems = paginatedItems; // For select all
    
    return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-wrap gap-3 justify-between items-center">
          <div className="relative flex-1 min-w-[200px]">
             <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
             <input 
               type="text" 
               placeholder={`Search ${title}...`}
               value={searchQuery}
               onChange={e => setSearchQuery(e.target.value)}
               className="w-full pl-9 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
             />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button 
              onClick={() => setShowFilters(!showFilters)} 
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium flex items-center gap-2 transition"
            >
              <Filter className="w-4 h-4" /> Filters
            </button>
            <button 
              onClick={() => setBulkMode(!bulkMode)} 
              className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${bulkMode ? 'bg-indigo-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
            >
              <Check className="w-4 h-4" /> Bulk
            </button>
            <div className="flex items-center bg-slate-100 rounded-lg overflow-hidden">
              <span className="px-3 py-2 text-slate-500 text-sm font-medium flex items-center gap-1 border-r border-slate-200"><Download className="w-4 h-4" /></span>
              <button onClick={() => handleExport(filteredItems, title.toLowerCase().replace(/\s+/g, '_'), 'csv')} className="px-3 py-2 text-slate-700 hover:bg-slate-200 text-sm font-medium transition border-r border-slate-200">CSV</button>
              <button onClick={() => handleExport(filteredItems, title.toLowerCase().replace(/\s+/g, '_'), 'pdf')} className="px-3 py-2 text-slate-700 hover:bg-slate-200 text-sm font-medium transition border-r border-slate-200">PDF</button>
              <button onClick={() => handleExport(filteredItems, title.toLowerCase().replace(/\s+/g, '_'), 'docx')} className="px-3 py-2 text-slate-700 hover:bg-slate-200 text-sm font-medium transition border-r border-slate-200">DOCX</button>
              <button onClick={() => handleExport(filteredItems, title.toLowerCase().replace(/\s+/g, '_'), 'json')} className="px-3 py-2 text-slate-700 hover:bg-slate-200 text-sm font-medium transition">JSON</button>
            </div>
            <button onClick={() => onNavigate(`tools?tab=${getTargetTab()}`)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow hover:bg-indigo-700 transition">
              + New {title.replace(/s$/, '')}
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-3 border-t border-slate-200">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Date Range</label>
              <select value={filterDateRange} onChange={(e) => setFilterDateRange(e.target.value as any)} className="w-full p-2 text-xs border border-slate-200 rounded-lg">
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Sort By</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="w-full p-2 text-xs border border-slate-200 rounded-lg">
                <option value="date">Date</option>
                <option value="name">Name</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Order</label>
              <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as any)} className="w-full p-2 text-xs border border-slate-200 rounded-lg">
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={filterFavorites} onChange={(e) => setFilterFavorites(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" />
                <span className="text-xs font-semibold text-slate-700">Favorites Only</span>
              </label>
              <button onClick={resetFilters} className="px-3 py-1 text-xs text-slate-600 hover:text-slate-800">Reset</button>
            </div>
          </div>
        )}

        {bulkMode && selectedItems.size > 0 && (
          <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
            <span className="text-sm font-semibold text-indigo-800">{selectedItems.size} items selected</span>
            <button 
              onClick={() => handleBulkDelete(getEndpoint(), paginatedItems)} 
              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition"
            >
              Delete Selected
            </button>
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {bulkMode && paginatedItems.length > 0 && (
          <div className="bg-slate-50 p-5 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center">
            <button 
              onClick={() => toggleSelectAll(filteredItems)} 
              className="flex flex-col items-center gap-2 text-slate-600 hover:text-indigo-600"
            >
              {selectedItems.size === totalItems ? <Check className="w-8 h-8" /> : <Square className="w-8 h-8" />}
              <span className="text-sm font-semibold">Select All</span>
            </button>
          </div>
        )}

        {paginatedItems.map((item: any) => (
          <div key={item.id} className={`bg-white p-5 rounded-2xl border shadow-sm space-y-3 group hover:border-indigo-300 transition ${bulkMode && selectedItems.has(item.id) ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-slate-200'}`}>
            <div className="flex justify-between items-start">
               <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                 {icon}
               </div>
               <div className="flex gap-2">
                 {bulkMode && (
                   <button 
                     onClick={() => toggleSelectItem(item.id)}
                     className={`p-1.5 rounded-lg transition ${selectedItems.has(item.id) ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400 hover:text-indigo-600'}`}
                   >
                     {selectedItems.has(item.id) ? <Check className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                   </button>
                 )}
                 <button 
                   onClick={() => handleToggleFavorite(getEndpoint(), item.id, item.isFavorite)}
                   className="text-slate-300 hover:text-red-500"
                 >
                   <Heart className="w-4 h-4" fill={item.isFavorite ? "currentColor" : "none"} />
                 </button>
               </div>
            </div>
            <div>
              <h4 className="font-bold text-slate-800 truncate">{item.name || item.type || "Untitled"}</h4>
              <p className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleDateString()}</p>
            </div>
            {item.prompt && (
              <p className="text-xs text-slate-600 line-clamp-2 italic">"{item.prompt}"</p>
            )}
            {item.tone && (
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{item.tone}</span>
            )}
            <div className="pt-3 border-t border-slate-100 flex justify-between">
               <button 
                 onClick={() => handleView(title.toLowerCase(), item)}
                 className="text-xs text-indigo-600 font-medium hover:underline"
               >
                 Open
               </button>
               {!bulkMode && (
                 <button 
                   onClick={() => handleDelete(getEndpoint(), item.id, item.name || item.prompt || 'item')}
                   className="text-xs text-slate-500 hover:text-red-600"
                 >
                   <Trash2 className="w-4 h-4" />
                 </button>
               )}
            </div>
          </div>
        ))}
        {paginatedItems.length === 0 && <p className="text-slate-500 text-sm py-4 col-span-full text-center">No {title.toLowerCase()} found.</p>}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-sm text-slate-600">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}
          </span>
          <div className="flex gap-2">
            <button 
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 rounded-lg text-sm font-medium flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <span className="px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-bold">
              {currentPage} / {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 rounded-lg text-sm font-medium flex items-center gap-1"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )};

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-16 px-4 xl:px-8 min-w-0">
      <SEOMeta pageKey="dashboard" />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Enterprise Workspace</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your resumes, AI generations, cover letters, and history in one place.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => onNavigate("analyze")} className="px-4 py-2 bg-slate-900 text-white font-bold rounded-lg text-sm shadow hover:bg-slate-800">
            Analyze Resume
          </button>
          <button onClick={() => onNavigate("tools")} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg text-sm shadow hover:bg-indigo-700">
            AI Optimizer Tools
          </button>
        </div>
      </div>

      <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-2">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => { setActiveTab(t.id); setSearchQuery(""); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
              activeTab === t.id ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "bg-white text-slate-600 hover:bg-slate-50 border border-transparent"
            }`}
          >
            <t.icon className={`w-4 h-4 ${activeTab === t.id ? "text-indigo-600" : "text-slate-400"}`} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="min-h-[500px]">
        {activeTab === "overview" && renderOverview()}
        {activeTab === "resumes" && renderResumes()}
        {activeTab === "ats" && (() => {
          const atsItems = ((workspaceData?.scans?.items || localScans) || []);
          const totalItems = workspaceData?.scans?.total || 0;
          const totalPages = Math.ceil(totalItems / itemsPerPage);
          return (
           <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Toolbar */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex flex-wrap gap-3 justify-between items-center">
                  <div className="relative flex-1 min-w-[200px]">
                     <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                     <input 
                       type="text" 
                       placeholder="Search scans..."
                       value={searchQuery}
                       onChange={e => setSearchQuery(e.target.value)}
                       className="w-full pl-9 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                     />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button 
                      onClick={() => setShowFilters(!showFilters)} 
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium flex items-center gap-2 transition"
                    >
                      <Filter className="w-4 h-4" /> Filters
                    </button>
                    <button 
                      onClick={() => setBulkMode(!bulkMode)} 
                      className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${bulkMode ? 'bg-indigo-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                    >
                      <Check className="w-4 h-4" /> Bulk
                    </button>
                    <div className="flex items-center bg-slate-100 rounded-lg overflow-hidden">
                      <span className="px-3 py-2 text-slate-500 text-sm font-medium flex items-center gap-1 border-r border-slate-200"><Download className="w-4 h-4" /></span>
                      <button onClick={() => handleExport(atsItems, 'scans', 'csv')} className="px-3 py-2 text-slate-700 hover:bg-slate-200 text-sm font-medium transition border-r border-slate-200">CSV</button>
                      <button onClick={() => handleExport(atsItems, 'scans', 'pdf')} className="px-3 py-2 text-slate-700 hover:bg-slate-200 text-sm font-medium transition border-r border-slate-200">PDF</button>
                      <button onClick={() => handleExport(atsItems, 'scans', 'docx')} className="px-3 py-2 text-slate-700 hover:bg-slate-200 text-sm font-medium transition border-r border-slate-200">DOCX</button>
                      <button onClick={() => handleExport(atsItems, 'scans', 'json')} className="px-3 py-2 text-slate-700 hover:bg-slate-200 text-sm font-medium transition">JSON</button>
                    </div>
                    <button onClick={() => onNavigate("analyze")} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow hover:bg-indigo-700 transition">
                      + New ATS Scan
                    </button>
                  </div>
                </div>

                {/* Filters Panel */}
                {showFilters && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-3 border-t border-slate-200">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 mb-1 block">Date Range</label>
                      <select value={filterDateRange} onChange={(e) => setFilterDateRange(e.target.value as any)} className="w-full p-2 text-xs border border-slate-200 rounded-lg">
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="week">Last 7 Days</option>
                        <option value="month">Last 30 Days</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 mb-1 block">Sort By</label>
                      <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="w-full p-2 text-xs border border-slate-200 rounded-lg">
                        <option value="date">Date</option>
                        <option value="ats_score">ATS Score</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 mb-1 block">Order</label>
                      <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as any)} className="w-full p-2 text-xs border border-slate-200 rounded-lg">
                        <option value="desc">Newest First</option>
                        <option value="asc">Oldest First</option>
                      </select>
                    </div>
                    <div className="flex items-end gap-2">
                      <button onClick={resetFilters} className="px-3 py-1 text-xs text-slate-600 hover:text-slate-800">Reset</button>
                    </div>
                  </div>
                )}

                {/* Bulk Actions Bar */}
                {bulkMode && selectedItems.size > 0 && (
                  <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <span className="text-sm font-semibold text-indigo-800">{selectedItems.size} items selected</span>
                    <button 
                      onClick={() => handleBulkDelete('scans', atsItems)} 
                      className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition"
                    >
                      Delete Selected
                    </button>
                  </div>
                )}
              </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {bulkMode && atsItems.length > 0 && (
                 <div className="bg-slate-50 p-5 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center min-h-[160px]">
                   <button 
                     onClick={() => toggleSelectAll(atsItems)} 
                     className="flex flex-col items-center gap-2 text-slate-600 hover:text-indigo-600"
                   >
                     {selectedItems.size === atsItems.length ? <Check className="w-8 h-8" /> : <Square className="w-8 h-8" />}
                     <span className="text-sm font-semibold">Select All</span>
                   </button>
                 </div>
               )}
               {atsItems.length > 0 ? atsItems.map((scan: Scan) => (
                 <div key={scan.id} className={`bg-white p-5 rounded-2xl border shadow-sm space-y-3 group hover:border-indigo-300 transition ${bulkMode && selectedItems.has(scan.id) ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-slate-200'}`}>
                   <div className="flex justify-between items-start">
                     <div className="flex items-start gap-3">
                       {bulkMode && (
                         <button onClick={() => toggleSelectItem(scan.id)} className={`mt-1 rounded w-5 h-5 flex items-center justify-center border transition-colors ${selectedItems.has(scan.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 hover:border-indigo-400'}`}>
                           {selectedItems.has(scan.id) && <Check className="w-3.5 h-3.5" />}
                         </button>
                       )}
                       <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                         <History className="w-5 h-5" />
                       </div>
                     </div>
                     <div className={`text-xs font-bold px-2 py-1 rounded-full ${
                       (scan.atsScore || 0) >= 70 ? 'bg-emerald-50 text-emerald-700' :
                       (scan.atsScore || 0) >= 50 ? 'bg-amber-50 text-amber-700' :
                       'bg-red-50 text-red-700'
                     }`}>
                       {scan.atsScore || 0}% ATS
                     </div>
                   </div>
                   <div>
                     <h4 className="font-bold text-slate-800 truncate">{scan.jobTitle || "Untitled Scan"}</h4>
                     <p className="text-xs text-slate-500">{new Date(scan.createdAt).toLocaleDateString()}</p>
                   </div>
                   {scan.company && (
                     <p className="text-xs text-slate-600">@ {scan.company}</p>
                   )}
                   {scan.optimizedPdfUrl && (
                     <div className="pt-2 border-t border-slate-100">
                       <a 
                         href={`/api/workspace/download/scan/${scan.id}/optimized`} 
                         download={scan.optimizedPdfFileName || "optimized-resume.pdf"}
                         className="flex items-center gap-2 text-xs text-emerald-600 font-medium hover:text-emerald-700 transition"
                       >
                         <Download className="w-3.5 h-3.5" />
                         Download Optimized PDF
                       </a>
                     </div>
                   )}
                   <div className="pt-3 border-t border-slate-100 flex justify-between">
                     <button onClick={() => handleView('scan', scan)} className="text-xs text-indigo-600 font-medium hover:underline">View Details</button>
                     <button 
                       onClick={() => handleDelete('scans', scan.id, scan.jobTitle || 'ATS Scan')}
                       className="text-xs text-slate-500 hover:text-red-600"
                     >
                       <Trash2 className="w-4 h-4" />
                     </button>
                   </div>
                 </div>
               )) : (
                 <div className="col-span-full text-center py-12">
                   <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                   <h3 className="text-base font-bold text-slate-800">No ATS Scans Yet</h3>
                   <p className="text-slate-500 text-sm mt-2 mb-4">Start analyzing your resume to see results here.</p>
                   <button onClick={() => onNavigate("analyze")} className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow hover:bg-indigo-700 transition">
                     Analyze Your First Resume
                   </button>
                 </div>
               )}
             </div>
             
             {/* Pagination for ATS Scans */}
             {workspaceData?.scans && Math.ceil(workspaceData.scans.total / itemsPerPage) > 1 && (
               <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 mt-6">
                 <span className="text-sm text-slate-600">
                   Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, workspaceData.scans.total)} of {workspaceData.scans.total}
                 </span>
                 <div className="flex gap-2">
                   <button 
                     onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                     disabled={currentPage === 1}
                     className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 rounded-lg text-sm font-medium flex items-center gap-1"
                   >
                     <ChevronLeft className="w-4 h-4" /> Previous
                   </button>
                   <span className="px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-bold">
                     {currentPage} / {Math.ceil(workspaceData.scans.total / itemsPerPage)}
                   </span>
                   <button 
                     onClick={() => setCurrentPage(currentPage + 1)}
                     disabled={currentPage >= Math.ceil(workspaceData.scans.total / itemsPerPage)}
                     className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 rounded-lg text-sm font-medium flex items-center gap-1"
                   >
                     Next <ChevronRight className="w-4 h-4" />
                   </button>
                 </div>
               </div>
             )}
           </div>
          );
        })()}
        {activeTab === "bullet" && renderGenericList("Bullet Rewrites", bulletRewrites, <Sparkles className="w-5 h-5"/>, (i) => ((i.prompt||"").toLowerCase().includes(searchQuery.toLowerCase()) || (i.content||"").toLowerCase().includes(searchQuery.toLowerCase())), "bullet", "ai-outputs")}
        {activeTab === "cover_letters" && renderGenericList("Cover Letters", covers, <FileSignature className="w-5 h-5"/>, (i) => ((i.content||"").toLowerCase().includes(searchQuery.toLowerCase())), "cover", "cover-letters")}
        {activeTab === "linkedin" && renderGenericList("LinkedIn Profiles", linkedinProfiles, <Share2 className="w-5 h-5"/>, (i) => ((i.prompt||"").toLowerCase().includes(searchQuery.toLowerCase()) || (i.content||"").toLowerCase().includes(searchQuery.toLowerCase())), "linkedin", "ai-outputs")}
        {activeTab === "interviews" && renderGenericList("Interview Preps", interviews, <Briefcase className="w-5 h-5"/>, (i) => ((i.name||"").toLowerCase().includes(searchQuery.toLowerCase())), "interview", "interviews")}
      </div>

      {/* View Modal */}
      {viewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 md:p-4" onClick={() => setViewModal(null)}>
          <div className={`bg-white rounded-2xl ${viewModal.type === 'scan' ? 'w-[95vw] md:w-[90vw] max-w-7xl' : 'w-full max-w-4xl'} max-h-[95vh] md:max-h-[90vh] flex flex-col overflow-hidden shadow-2xl`} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 md:p-6 border-b border-slate-200 shrink-0">
              <h2 className="text-xl font-bold text-slate-900 truncate pr-4">
                {viewModal.type === 'scan' 
                  ? (viewModal.item.jobTitle || "ATS Scan Details")
                  : (viewModal.item.name || viewModal.item.type || "View Details")}
              </h2>
              <button onClick={() => setViewModal(null)} className="text-slate-400 hover:text-slate-600 print:hidden shrink-0">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4 md:p-6 overflow-y-auto overflow-x-hidden flex-1 custom-scrollbar">
              {viewModal.type === 'scan' && (
                <div className="p-0">
                  <ATSReport scan={viewModal.item} />

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-6 pb-2 border-t border-slate-200 mt-6 sticky bottom-0 bg-white z-20 print:hidden">
                    <button 
                      onClick={() => { onSelectScan(viewModal.item); onNavigate("analyze"); setViewModal(null); }}
                      className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition flex items-center justify-center gap-2 shadow-sm"
                    >
                      <BarChart2 className="w-4 h-4" /> Open in Analyzer
                    </button>
                    <button 
                      onClick={() => setViewModal(null)}
                      className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition shadow-sm"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
              {viewModal.type === 'resume' && (
                <div className="space-y-4">
                  <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex justify-between items-center">
                    <p className="text-sm text-blue-800">
                      <strong>File:</strong> {viewModal.item.name}
                    </p>
                    <div className="flex gap-2">
                      <a 
                        href={`/api/workspace/download/resume/${viewModal.item.id}`} 
                        download={viewModal.item.name}
                        className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download Original
                      </a>
                    </div>
                  </div>
                  
                  {viewModal.item.content ? (
                    <div className="bg-white border border-slate-200 rounded-lg">
                      <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                        <h3 className="text-xs font-bold text-slate-600 uppercase">Resume Content (Extracted Text)</h3>
                      </div>
                      <div className="p-6 max-h-[600px] overflow-y-auto">
                        <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans leading-relaxed">{viewModal.item.content}</pre>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                      <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <h3 className="text-lg font-bold text-slate-700 mb-2">No Preview Available</h3>
                      <p className="text-sm text-slate-600 mb-4">
                        The extracted text content is not available for this resume.
                      </p>
                      {viewModal.item.fileUrl && (
                        <a 
                          href={`/api/workspace/download/resume/${viewModal.item.id}`} 
                          download={viewModal.item.name}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download File to View
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
              {(viewModal.type.includes('bullet') || viewModal.type.includes('linkedin') || viewModal.type.includes('cover')) && (
                <div className="space-y-4">
                  {viewModal.item.prompt && (
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Original Prompt</h3>
                      <p className="text-sm text-slate-700">{viewModal.item.prompt}</p>
                    </div>
                  )}
                  <div className="bg-white border border-slate-200 p-4 rounded-lg">
                    <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Generated Content</h3>
                    <div className="prose prose-sm max-w-none">
                      <pre className="whitespace-pre-wrap text-sm text-slate-700">{viewModal.item.content}</pre>
                    </div>
                  </div>
                </div>
              )}
              {viewModal.type.includes('interview') && (
                <div className="space-y-4">
                  {viewModal.item.questions && viewModal.item.questions.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 mb-3">Interview Questions</h3>
                      <div className="space-y-3">
                        {viewModal.item.questions.map((q: any, idx: number) => (
                          <div key={idx} className="bg-slate-50 p-4 rounded-lg">
                            <p className="font-semibold text-slate-800">{q.question}</p>
                            {q.sampleAnswer && (
                              <p className="text-sm text-slate-600 mt-2">{q.sampleAnswer}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {viewModal.item.redFlags && viewModal.item.redFlags.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-red-600 mb-3">Red Flags</h3>
                      <div className="space-y-2">
                        {viewModal.item.redFlags.map((rf: any, idx: number) => (
                          <div key={idx} className="bg-red-50 border border-red-200 p-3 rounded-lg">
                            <p className="text-sm text-red-800">{rf.warning}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowUploadModal(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Upload Resume</h2>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Resume Name</label>
                <input
                  type="text"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="e.g., My Resume 2024"
                  className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Select File</label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-indigo-400 transition cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setUploadFile(file);
                        if (!uploadName) setUploadName(file.name.replace(/\.[^/.]+$/, ""));
                      }
                    }}
                    className="hidden"
                    id="resume-upload"
                  />
                  <label htmlFor="resume-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 mx-auto text-slate-400 mb-2" />
                    <p className="text-sm font-semibold text-slate-700">
                      {uploadFile ? uploadFile.name : "Click to select file"}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">PDF, DOC, DOCX, or TXT</p>
                  </label>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResumeUpload}
                  disabled={!uploadFile || !uploadName.trim() || uploading}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" /> Upload
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteModal(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Confirm Delete</h3>
                  <p className="text-sm text-slate-500">This action cannot be undone</p>
                </div>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p className="text-sm text-slate-700">
                  Are you sure you want to delete <span className="font-bold text-slate-900">"{deleteModal.name || 'this item'}"</span>?
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setDeleteModal(null)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition shadow-md"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
