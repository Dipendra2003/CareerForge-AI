import { useEffect, useState } from "react";
import apiClient from "../../lib/apiClient";
import { Search, ChevronLeft, ChevronRight, Shield, Trash2, CheckCircle, XCircle, User, Activity, FileText, AlertTriangle, X } from "lucide-react";

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [allFeatures, setAllFeatures] = useState<any[]>([]);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  
  // Search, Filters & Sorting
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [verifiedFilter, setVerifiedFilter] = useState("all");
  const [suspendedFilter, setSuspendedFilter] = useState("all");
  const [sortOption, setSortOption] = useState("newest");
  
  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Modals
  const [detailsUser, setDetailsUser] = useState<any>(null);
  const [deleteUser, setDeleteUser] = useState<any>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  
  const [planUser, setPlanUser] = useState<any>(null);
  const [planUserNewPlan, setPlanUserNewPlan] = useState("");
  
  const [roleUser, setRoleUser] = useState<any>(null);
  const [roleUserNewRole, setRoleUserNewRole] = useState("");
  
  const [suspendUser, setSuspendUser] = useState<any>(null);
  const [suspendReason, setSuspendReason] = useState("");
  
  const [manageQuotaUser, setManageQuotaUser] = useState<any>(null);
  const [quotaForm, setQuotaForm] = useState({ extraScans: 0, resetDate: "" });
  
  const [manageFeatureUser, setManageFeatureUser] = useState<any>(null);
  const [featureForm, setFeatureForm] = useState({ featureId: "", action: "grant", expiresAt: "" });

  const fetchUsers = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
        role: roleFilter,
        plan: planFilter,
        isEmailVerified: verifiedFilter,
        isSuspended: suspendedFilter,
        sort: sortOption
      });
      const res = await apiClient.get(`/admin/users?${params.toString()}`);
      setUsers(res.data.users);
      setTotalPages(res.data.pages);
      setTotalUsers(res.data.total);
    } catch (error) {
      // Securely log the error without leaking stack traces or sensitive data
      console.error('An error occurred during this operation.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(false);
    apiClient.get('/admin/features').then(res => setAllFeatures(res.data.features)).catch(() => {});
  }, [page, limit, search, roleFilter, planFilter, verifiedFilter, suspendedFilter, sortOption]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearch("");
    setPage(1);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === users.length) setSelectedIds([]);
    else setSelectedIds(users.map(u => u.id));
  };

  const toggleSelectUser = (id: string) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(i => i !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  const executeBulkAction = async (action: string) => {
    if (selectedIds.length === 0) return;
    try {
      if (action === 'delete') {
        if (!window.confirm("DANGER: Are you sure you want to delete selected users?")) return;
        
        // Optimistic UI update
        setUsers(prev => prev.filter(u => !selectedIds.includes(u.id)));
        setTotalUsers(prev => prev - selectedIds.length);
        
        await apiClient.post(`/admin/users/bulk/delete`, { userIds: selectedIds });
      } else if (action === 'suspend') {
        setUsers(prev => prev.map(u => selectedIds.includes(u.id) ? { ...u, isSuspended: true } : u));
        await apiClient.post(`/admin/users/bulk/suspend`, { userIds: selectedIds, isSuspended: true });
      } else if (action === 'activate') {
        setUsers(prev => prev.map(u => selectedIds.includes(u.id) ? { ...u, isSuspended: false } : u));
        await apiClient.post(`/admin/users/bulk/suspend`, { userIds: selectedIds, isSuspended: false });
      } else if (action.startsWith('plan:')) {
        const newPlan = action.split(':')[1];
        setUsers(prev => prev.map(u => selectedIds.includes(u.id) ? { ...u, plan: newPlan } : u));
        await apiClient.post(`/admin/users/bulk/plan`, { userIds: selectedIds, plan: newPlan });
      } else if (action.startsWith('role:')) {
        const newRole = action.split(':')[1];
        setUsers(prev => prev.map(u => selectedIds.includes(u.id) ? { ...u, role: newRole } : u));
        await apiClient.post(`/admin/users/bulk/role`, { userIds: selectedIds, role: newRole });
      }
      setSelectedIds([]);
      fetchUsers(true);
    } catch (error: any) {
      alert(error.response?.data?.error || "Bulk action failed");
      fetchUsers(true); // Revert optimistic updates on error
    }
  };

  const fetchUserDetails = async (id: string) => {
    try {
      const res = await apiClient.get(`/admin/users/${id}`);
      setDetailsUser(res.data.user);
    } catch (error) {
      alert("Failed to fetch user details");
    }
  };

  const confirmDelete = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    try {
      // Optimistic update
      setUsers(prev => prev.filter(u => u.id !== deleteUser.id));
      setTotalUsers(prev => prev - 1);
      
      await apiClient.delete(`/admin/users/${deleteUser.id}`);
      setDeleteUser(null);
      setDeleteConfirmText("");
      fetchUsers(true);
    } catch (error: any) {
      alert(error.response?.data?.error || "Failed to delete user");
      fetchUsers(true); // Revert
    }
  };

  const confirmPlanChange = async () => {
    try {
      // Optimistic update
      setUsers(prev => prev.map(u => u.id === planUser.id ? { ...u, plan: planUserNewPlan } : u));
      
      await apiClient.put(`/admin/users/${planUser.id}/plan`, { plan: planUserNewPlan });
      setPlanUser(null);
      fetchUsers(true);
    } catch (error: any) {
      alert(error.response?.data?.error || "Failed to update plan");
      fetchUsers(true);
    }
  };

  const confirmRoleChange = async () => {
    try {
      // Optimistic update
      setUsers(prev => prev.map(u => u.id === roleUser.id ? { ...u, role: roleUserNewRole } : u));
      
      await apiClient.put(`/admin/users/${roleUser.id}/role`, { role: roleUserNewRole });
      setRoleUser(null);
      fetchUsers(true);
    } catch (error: any) {
      alert(error.response?.data?.error || "Failed to update role");
      fetchUsers(true);
    }
  };

  const confirmSuspend = async () => {
    try {
      // Optimistic update
      setUsers(prev => prev.map(u => u.id === suspendUser.id ? { 
        ...u, 
        isSuspended: !suspendUser.isSuspended,
        suspensionReason: suspendReason
      } : u));
      
      await apiClient.put(`/admin/users/${suspendUser.id}/suspend`, { 
        isSuspended: !suspendUser.isSuspended,
        suspensionReason: suspendReason 
      });
      setSuspendUser(null);
      setSuspendReason("");
      fetchUsers(true);
    } catch (error: any) {
      alert(error.response?.data?.error || "Failed to update suspension status");
      fetchUsers(true);
    }
  };

  const handleSaveQuota = async () => {
    try {
      await apiClient.post(`/admin/users/${manageQuotaUser.id}/quota-override`, quotaForm);
      setManageQuotaUser(null);
      fetchUserDetails(manageQuotaUser.id);
    } catch (error: any) {
      alert(error.response?.data?.error || "Failed to update quota");
    }
  };

  const handleSaveFeatureOverride = async () => {
    try {
      await apiClient.post(`/admin/users/${manageFeatureUser.id}/feature-override`, featureForm);
      setManageFeatureUser(null);
      fetchUserDetails(manageFeatureUser.id);
    } catch (error: any) {
      alert(error.response?.data?.error || "Failed to update feature override");
    }
  };

  return (
    <>
      <div className="space-y-6 animate-slide-up">
        {/* Header & Search */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display tracking-tight text-slate-900">Users</h1>
            <p className="text-sm text-slate-500">Manage user accounts, roles, and subscriptions. Total: {totalUsers}</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <form onSubmit={handleSearch} className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search email or name..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              {search && (
                <button type="button" onClick={handleClearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <XCircle className="w-4 h-4" />
                </button>
              )}
            </form>
          </div>
        </div>

        {/* Filters & Sorting */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center">
          <div className="flex flex-col space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">Role</label>
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="text-sm border border-slate-200 rounded-md px-3 py-1.5 outline-none focus:border-indigo-500">
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>
          </div>
          <div className="flex flex-col space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">Plan</label>
            <select value={planFilter} onChange={e => setPlanFilter(e.target.value)} className="text-sm border border-slate-200 rounded-md px-3 py-1.5 outline-none focus:border-indigo-500">
              <option value="all">All Plans</option>
              <option value="free">Free</option>
              <option value="Pro">Pro</option>
              <option value="Annual">Annual</option>
            </select>
          </div>
          <div className="flex flex-col space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">Status</label>
            <select value={suspendedFilter} onChange={e => setSuspendedFilter(e.target.value)} className="text-sm border border-slate-200 rounded-md px-3 py-1.5 outline-none focus:border-indigo-500">
              <option value="all">Any Status</option>
              <option value="false">Active</option>
              <option value="true">Suspended</option>
            </select>
          </div>
          <div className="flex flex-col space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">Sort By</label>
            <select value={sortOption} onChange={e => setSortOption(e.target.value)} className="text-sm border border-slate-200 rounded-md px-3 py-1.5 outline-none focus:border-indigo-500">
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="alphabetical">Alphabetical</option>
              <option value="mostScans">Most Scans</option>
            </select>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedIds.length > 0 && (
          <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl flex items-center justify-between animate-fade-in">
            <span className="text-sm font-semibold text-indigo-800">{selectedIds.length} users selected</span>
            <div className="flex items-center gap-2">
              <select onChange={(e) => {
                if(e.target.value) executeBulkAction(e.target.value);
                e.target.value = "";
              }} className="text-sm border border-indigo-200 text-indigo-700 bg-white rounded-md px-3 py-1.5 outline-none">
                <option value="">Bulk Actions...</option>
                <option value="suspend">Suspend</option>
                <option value="activate">Activate</option>
                <option value="plan:Free">Set Plan: Free</option>
                <option value="plan:Pro">Set Plan: Pro</option>
                <option value="role:user">Set Role: User</option>
                <option value="delete">Delete</option>
              </select>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-500 font-medium text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 border-b border-slate-200 w-12">
                    <input type="checkbox" checked={selectedIds.length === users.length && users.length > 0} onChange={toggleSelectAll} className="rounded text-indigo-600 focus:ring-indigo-500" />
                  </th>
                  <th className="px-6 py-4 border-b border-slate-200">User</th>
                  <th className="px-6 py-4 border-b border-slate-200">Plan</th>
                  <th className="px-6 py-4 border-b border-slate-200">Role</th>
                  <th className="px-6 py-4 border-b border-slate-200">Scans</th>
                  <th className="px-6 py-4 border-b border-slate-200 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                      <p className="mt-4 text-slate-500 font-medium">Loading users...</p>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="font-medium">No users found.</p>
                      <p className="text-xs mt-1">Try adjusting your search or filters.</p>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input type="checkbox" checked={selectedIds.includes(user.id)} onChange={() => toggleSelectUser(user.id)} className="rounded text-indigo-600 focus:ring-indigo-500" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-xs cursor-pointer" onClick={() => fetchUserDetails(user.id)}>
                            {user.name?.[0] || user.email[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => fetchUserDetails(user.id)}>
                              {user.name || "Unnamed"}
                            </p>
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs text-slate-500">{user.email}</p>
                              {user.isEmailVerified && (
                                <div title="Email Verified">
                                  <CheckCircle className="w-3 h-3 text-emerald-500" />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button onClick={() => { setPlanUser(user); setPlanUserNewPlan(user.plan || "Free"); }} className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold hover:opacity-80 transition-opacity ${
                          user.plan && user.plan.toLowerCase() !== "free"
                            ? "bg-indigo-50 text-indigo-700" 
                            : "bg-slate-100 text-slate-600"
                        }`}>
                          {user.plan || "Free"}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <button onClick={() => { setRoleUser(user); setRoleUserNewRole(user.role); }} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold hover:opacity-80 transition-opacity ${
                            user.role === "admin" 
                              ? "bg-red-50 text-red-700" 
                              : "bg-slate-100 text-slate-600"
                          }`}>
                            {user.role === "admin" && <Shield className="w-3 h-3" />}
                            {user.role}
                          </button>
                          {user.isSuspended && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700">
                              Suspended
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-slate-700">{user._count?.scans || 0}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSuspendUser(user)}
                            className={`p-1.5 rounded transition-colors ${user.isSuspended ? 'text-emerald-500 hover:bg-emerald-50' : 'text-amber-500 hover:bg-amber-50'}`}
                            title={user.isSuspended ? "Activate User" : "Suspend User"}
                          >
                            {user.isSuspended ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                          </button>

                          <button 
                            onClick={() => setDeleteUser(user)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {totalPages > 0 && (
            <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <p className="text-sm text-slate-500">
                  Page <span className="font-medium text-slate-900">{page}</span> of <span className="font-medium text-slate-900">{totalPages}</span>
                </p>
                <select value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1); }} className="text-sm border border-slate-200 rounded px-2 py-1 outline-none focus:border-indigo-500">
                  <option value={10}>10 / page</option>
                  <option value={25}>25 / page</option>
                  <option value={50}>50 / page</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1 rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1 rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Modal */}
      {deleteUser && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up">
            <div className="p-6">
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold">Delete User Account</h3>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                You are about to permanently delete <strong className="text-slate-900">{deleteUser.email}</strong>. 
                This action will cascade and destroy all associated scans, cover letters, and interview preps.
              </p>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Type <strong>DELETE</strong> to confirm:
              </label>
              <input 
                type="text" 
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                placeholder="DELETE"
              />
            </div>
            <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
              <button onClick={() => { setDeleteUser(null); setDeleteConfirmText(""); }} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors">
                Cancel
              </button>
              <button onClick={confirmDelete} disabled={deleteConfirmText !== 'DELETE'} className="px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Plan Modal */}
      {planUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-slide-up">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Change User Plan</h3>
              <p className="text-sm text-slate-500 mb-4">Update the billing tier for <span className="font-semibold text-slate-700">{planUser.email}</span>.</p>
              
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="text-center">
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">Current</p>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-bold bg-slate-100 text-slate-700">{planUser.plan || "Free"}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300" />
                <div className="text-center">
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">New</p>
                  <select value={planUserNewPlan} onChange={e => setPlanUserNewPlan(e.target.value)} className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-bold border border-indigo-200 text-indigo-700 bg-indigo-50 outline-none cursor-pointer">
                    <option value="Free">Free</option>
                    <option value="Pro">Pro</option>
                    <option value="Annual">Annual</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
              <button onClick={() => setPlanUser(null)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors">Cancel</button>
              <button onClick={confirmPlanChange} className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">Confirm Update</button>
            </div>
          </div>
        </div>
      )}

      {/* Change Role Modal */}
      {roleUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-slide-up">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Change User Role</h3>
              <p className="text-sm text-slate-500 mb-4">Modify system access for <span className="font-semibold text-slate-700">{roleUser.email}</span>.</p>
              
              <div className="space-y-3 mt-4">
                <label className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${roleUserNewRole === 'user' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <input type="radio" name="role" value="user" checked={roleUserNewRole === 'user'} onChange={() => setRoleUserNewRole('user')} className="text-indigo-600 focus:ring-indigo-500" />
                  <span className="ml-3 font-medium text-slate-900">User</span>
                </label>
                <label className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${roleUserNewRole === 'admin' ? 'border-red-500 bg-red-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <input type="radio" name="role" value="admin" checked={roleUserNewRole === 'admin'} onChange={() => setRoleUserNewRole('admin')} className="text-red-600 focus:ring-red-500" />
                  <span className="ml-3 font-medium text-slate-900 flex items-center gap-2">Admin <Shield className="w-4 h-4 text-red-500" /></span>
                </label>
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
              <button onClick={() => setRoleUser(null)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors">Cancel</button>
              <button onClick={confirmRoleChange} className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">Confirm Update</button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Modal */}
      {suspendUser && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-slide-up">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                {suspendUser.isSuspended ? "Reactivate User" : "Suspend User"}
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                {suspendUser.isSuspended 
                  ? `Reactivating will restore access for ${suspendUser.email}.`
                  : `Suspending will immediately revoke all tokens and block future logins for ${suspendUser.email}.`
                }
              </p>
              
              {!suspendUser.isSuspended && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Reason (Optional)</label>
                  <textarea 
                    value={suspendReason} 
                    onChange={e => setSuspendReason(e.target.value)} 
                    className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-none h-24"
                    placeholder="Violation of terms..."
                  />
                </div>
              )}
            </div>
            <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
              <button onClick={() => { setSuspendUser(null); setSuspendReason(""); }} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors">Cancel</button>
              <button onClick={confirmSuspend} className={`px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors ${suspendUser.isSuspended ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'}`}>
                {suspendUser.isSuspended ? "Activate" : "Suspend"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {detailsUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-slate-900">User Profile</h2>
              <button onClick={() => setDetailsUser(null)} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-2xl font-bold">
                  {detailsUser.name?.[0] || detailsUser.email[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{detailsUser.name || "Unnamed User"}</h3>
                  <p className="text-slate-500">{detailsUser.email}</p>
                </div>
                <div className="ml-auto flex flex-col gap-2 items-end">
                   <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                      detailsUser.plan && detailsUser.plan.toLowerCase() !== "free"
                        ? "bg-indigo-50 text-indigo-700 border border-indigo-200" 
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}>
                      {detailsUser.plan || "Free"} Plan
                    </span>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                      detailsUser.role === "admin" 
                        ? "bg-red-50 text-red-700 border border-red-200" 
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}>
                      {detailsUser.role === "admin" && <Shield className="w-3 h-3" />}
                      {detailsUser.role === "admin" ? "Administrator" : "Standard User"}
                    </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Status & Security</h4>
                  <ul className="space-y-3">
                    <li className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">Email Verified</span>
                      {detailsUser.isEmailVerified ? <span className="flex items-center gap-1 text-sm font-semibold text-emerald-600"><CheckCircle className="w-4 h-4"/> Yes</span> : <span className="text-sm font-semibold text-slate-700">No</span>}
                    </li>
                    <li className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">Account Status</span>
                      {detailsUser.isSuspended ? <span className="text-sm font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded">Suspended</span> : <span className="text-sm font-semibold text-emerald-600">Active</span>}
                    </li>
                    {detailsUser.isSuspended && (
                      <>
                        <li className="flex items-center justify-between">
                          <span className="text-sm text-slate-500">Suspended At</span>
                          <span className="text-sm font-medium text-slate-900">{detailsUser.suspendedAt ? new Date(detailsUser.suspendedAt).toLocaleDateString() : 'N/A'}</span>
                        </li>
                        <li className="flex flex-col gap-1">
                          <span className="text-sm text-slate-500">Suspension Reason</span>
                          <span className="text-sm font-medium text-slate-900 bg-slate-50 p-2 rounded border border-slate-100">{detailsUser.suspensionReason || 'No reason provided'}</span>
                        </li>
                      </>
                    )}
                    <li className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">Joined</span>
                      <span className="text-sm font-medium text-slate-900">{new Date(detailsUser.createdAt).toLocaleDateString()}</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">Last Login</span>
                      <span className="text-sm font-medium text-slate-900">{detailsUser.lastLoginAt ? new Date(detailsUser.lastLoginAt).toLocaleDateString() : 'Never'}</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Usage Metrics</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 text-center">
                      <FileText className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
                      <div className="text-2xl font-bold text-slate-900">{detailsUser._count?.scans || 0}</div>
                      <div className="text-xs text-slate-500">ATS Scans</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 text-center">
                      <FileText className="w-5 h-5 text-teal-500 mx-auto mb-1" />
                      <div className="text-2xl font-bold text-slate-900">{detailsUser.coverLetters || 0}</div>
                      <div className="text-xs text-slate-500">Cover Letters</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 text-center">
                      <Activity className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                      <div className="text-2xl font-bold text-slate-900">{detailsUser.interviewPreps || 0}</div>
                      <div className="text-xs text-slate-500">Interview Preps</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 text-center">
                      <FileText className="w-5 h-5 text-sky-500 mx-auto mb-1" />
                      <div className="text-2xl font-bold text-slate-900">{detailsUser.cloudinaryResumes || 0}</div>
                      <div className="text-xs text-slate-500">Resumes Stored</div>
                    </div>
                  </div>
                  
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mt-6 mb-4 border-b border-slate-100 pb-2">Overrides</h4>
                  <div className="space-y-4">
                    <div className="border p-4 rounded-lg border-indigo-100 bg-indigo-50/50 space-y-3">
                        <div className="flex justify-between items-center">
                            <p className="text-sm font-bold text-slate-800">Scan Quota</p>
                            <button onClick={() => {
                                setQuotaForm({ extraScans: detailsUser.userQuotaOverride?.extraScans || 0, resetDate: detailsUser.userQuotaOverride?.resetDate ? detailsUser.userQuotaOverride.resetDate.split('T')[0] : '' });
                                setManageQuotaUser(detailsUser);
                            }} className="px-3 py-1 bg-white border border-slate-200 shadow-sm text-xs font-bold rounded hover:bg-slate-50">Edit Quota</button>
                        </div>
                        
                        {/* Usage Progress Bar */}
                        {detailsUser.quotaSummary && (
                          <>
                            <div className="w-full bg-slate-200 rounded-full h-2.5">
                              <div 
                                className={`h-2.5 rounded-full transition-all ${
                                  (detailsUser.quotaSummary.scansUsed / detailsUser.quotaSummary.totalLimit) >= 0.9 
                                    ? 'bg-red-500' 
                                    : (detailsUser.quotaSummary.scansUsed / detailsUser.quotaSummary.totalLimit) >= 0.7 
                                      ? 'bg-amber-500' 
                                      : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(100, (detailsUser.quotaSummary.scansUsed / detailsUser.quotaSummary.totalLimit) * 100)}%` }}
                              />
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center">
                              <div className="bg-white rounded-lg p-2 border border-slate-100">
                                <p className="text-lg font-black text-slate-900">{detailsUser.quotaSummary.scansUsed}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Used</p>
                              </div>
                              <div className="bg-white rounded-lg p-2 border border-slate-100">
                                <p className="text-lg font-black text-emerald-600">{detailsUser.quotaSummary.scansRemaining}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Remaining</p>
                              </div>
                              <div className="bg-white rounded-lg p-2 border border-slate-100">
                                <p className="text-lg font-black text-indigo-600">{detailsUser.quotaSummary.totalLimit}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Total Limit</p>
                              </div>
                            </div>
                            <div className="text-xs text-slate-500 space-y-1 bg-white rounded-lg p-2 border border-slate-100">
                              <div className="flex justify-between">
                                <span>Base Plan Limit ({(detailsUser.plan || 'Free')})</span>
                                <span className="font-bold text-slate-700">{detailsUser.quotaSummary.basePlanLimit}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Admin Extra Scans</span>
                                <span className={`font-bold ${detailsUser.quotaSummary.extraScans > 0 ? 'text-indigo-600' : 'text-slate-400'}`}>+{detailsUser.quotaSummary.extraScans}</span>
                              </div>
                              {detailsUser.quotaSummary.overrideExpiresAt && (
                                <div className="flex justify-between">
                                  <span>Override Expires</span>
                                  <span className={`font-bold ${detailsUser.quotaSummary.isOverrideExpired ? 'text-red-600' : 'text-slate-700'}`}>
                                    {new Date(detailsUser.quotaSummary.overrideExpiresAt).toLocaleDateString()}
                                    {detailsUser.quotaSummary.isOverrideExpired && ' (Expired)'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                    </div>
                    <div className="border p-3 rounded-lg border-slate-200">
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-sm font-bold text-slate-800">Feature Overrides</p>
                            <button onClick={() => {
                                setFeatureForm({ featureId: "", action: "grant", expiresAt: "" });
                                setManageFeatureUser(detailsUser);
                            }} className="px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded shadow hover:bg-indigo-700">Add</button>
                        </div>
                        {detailsUser.userFeatureOverrides?.length > 0 ? (
                            <ul className="space-y-2">
                                {detailsUser.userFeatureOverrides.map((fo: any) => (
                                    <li key={fo.id} className="flex justify-between items-center text-xs bg-slate-50 p-2 rounded border border-slate-100">
                                        <span>
                                            <span className="font-bold">{fo.feature?.name}</span> - <span className={fo.action === 'grant' ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>{fo.action.toUpperCase()}</span>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-xs text-slate-400">No feature overrides.</p>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end">
              <button onClick={() => setDetailsUser(null)} className="px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}

    {/* Manage Quota Modal */}
    {manageQuotaUser && (
      <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-slide-up">
          <div className="p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Edit Quota Override</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Extra Scans</label>
                <input type="number" value={quotaForm.extraScans} onChange={e => setQuotaForm({...quotaForm, extraScans: Number(e.target.value)})} className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reset Date (Optional)</label>
                <input type="date" value={quotaForm.resetDate} onChange={e => setQuotaForm({...quotaForm, resetDate: e.target.value})} className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
              </div>
            </div>
          </div>
          <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
            <button onClick={() => setManageQuotaUser(null)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors">Cancel</button>
            <button onClick={handleSaveQuota} className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">Save Quota</button>
          </div>
        </div>
      </div>
    )}

    {/* Manage Feature Modal */}
    {manageFeatureUser && (
      <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-slide-up">
          <div className="p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Add Feature Override</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Feature</label>
                <select value={featureForm.featureId} onChange={e => setFeatureForm({...featureForm, featureId: e.target.value})} className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                  <option value="">Select a feature...</option>
                  {allFeatures.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Action</label>
                <select value={featureForm.action} onChange={e => setFeatureForm({...featureForm, action: e.target.value})} className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                  <option value="grant">Grant Access</option>
                  <option value="revoke">Revoke Access</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Expires At (Optional)</label>
                <input type="date" value={featureForm.expiresAt} onChange={e => setFeatureForm({...featureForm, expiresAt: e.target.value})} className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
              </div>
            </div>
          </div>
          <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
            <button onClick={() => setManageFeatureUser(null)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors">Cancel</button>
            <button onClick={handleSaveFeatureOverride} disabled={!featureForm.featureId} className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50">Save Override</button>
          </div>
        </div>
      </div>
    )}

    </>
  );
}
