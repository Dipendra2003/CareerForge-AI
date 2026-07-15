import { useState, useEffect } from "react";
import apiClient from "../../lib/apiClient";
import { Plus, Edit2, Trash2, X } from "lucide-react";

export default function AdminFeatures() {
  const [features, setFeatures] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingFeature, setEditingFeature] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: "",
    key: "",
    description: "",
    category: "",
    isActive: true,
    assignedPlans: [] as { planId: string, enabled: boolean }[]
  });

  useEffect(() => {
    fetchFeatures();
    fetchPlans();
  }, []);

  const fetchFeatures = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await apiClient.get('/admin/features');
      setFeatures(res.data.features);
    } catch (err: any) {
      if (err?.response?.status !== 401) console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await apiClient.get('/admin/plans');
      setPlans(res.data.plans);
    } catch (err: any) {
      if (err?.response?.status !== 401) console.error(err);
    }
  };

  const handleOpenModal = (feature?: any) => {
    if (feature) {
      setEditingFeature(feature);
      
      const featurePlans = feature.plans || [];
      const initializedPlans = plans.map(p => ({
        planId: p.id,
        enabled: featurePlans.some((fp: any) => fp.planId === p.id && fp.enabled)
      }));

      setFormData({
        name: feature.name || "",
        key: feature.key || "",
        description: feature.description || "",
        category: feature.category || "",
        isActive: feature.isActive ?? true,
        assignedPlans: initializedPlans
      });
    } else {
      setEditingFeature(null);
      setFormData({
        name: "", key: "", description: "", category: "", isActive: true,
        assignedPlans: plans.map(p => ({ planId: p.id, enabled: false }))
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingFeature(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let finalValue: any = value;
    if (type === 'checkbox') finalValue = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handlePlanToggle = (planId: string, enabled: boolean) => {
    setFormData(prev => ({
      ...prev,
      assignedPlans: prev.assignedPlans.map(p => p.planId === planId ? { ...p, enabled } : p)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingFeature) {
        // Optimistic update
        setFeatures(prev => prev.map(f => f.id === editingFeature.id ? { ...f, ...formData } : f));
        await apiClient.put(`/admin/features/${editingFeature.id}`, formData);
      } else {
        // Optimistic update
        setFeatures(prev => [...prev, { id: 'temp-id-' + Date.now(), ...formData }]);
        await apiClient.post('/admin/features', formData);
      }
      handleCloseModal();
      fetchFeatures(true);
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to save feature");
      fetchFeatures(true); // Revert optimistic updates
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this feature?")) return;
    try {
      // Optimistic update
      setFeatures(prev => prev.filter(f => f.id !== id));
      await apiClient.delete(`/admin/features/${id}`);
      fetchFeatures(true);
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to delete feature");
      fetchFeatures(true); // Revert optimistic updates
    }
  };

  if (loading) return <div className="p-8">Loading features...</div>;

  return (
    <>
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Feature Toggles</h1>
        <button onClick={() => handleOpenModal()} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-indigo-700">
          <Plus className="w-4 h-4" /> New Feature
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-left whitespace-nowrap">
          <thead className="bg-slate-50 border-b border-slate-200 text-sm font-medium text-slate-500">
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Key</th>
              <th className="px-6 py-4">Category</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm">
            {features.map((feat) => (
              <tr key={feat.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-900">{feat.name}</td>
                <td className="px-6 py-4 text-slate-600 font-mono text-xs">{feat.key}</td>
                <td className="px-6 py-4 text-slate-600">{feat.category}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${feat.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                    {feat.isActive ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={() => handleOpenModal(feat)} className="text-indigo-600 hover:text-indigo-900 p-1">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(feat.id)} className="text-red-600 hover:text-red-900 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {features.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  No features configured.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-slate-900">{editingFeature ? "Edit Feature" : "Create Feature"}</h2>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Unique Key</label>
                <input required type="text" name="key" value={formData.key} onChange={handleChange} disabled={!!editingFeature} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category (Optional)</label>
                <input type="text" name="category" value={formData.category} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea name="description" value={formData.description} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" rows={3} />
              </div>
              <div className="flex items-center pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} className="w-5 h-5 text-indigo-600 rounded" />
                  <span className="text-sm font-medium text-slate-700">Feature is globally active</span>
                </label>
              </div>

              <div className="pt-4 border-t">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Assign to Plans</h3>
                <div className="space-y-2">
                  {plans.map(plan => {
                    const assigned = formData.assignedPlans.find(p => p.planId === plan.id);
                    return (
                      <label key={plan.id} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded border border-transparent hover:border-slate-200">
                        <input 
                          type="checkbox" 
                          checked={assigned?.enabled || false} 
                          onChange={(e) => handlePlanToggle(plan.id, e.target.checked)} 
                          className="w-4 h-4 text-indigo-600 rounded" 
                        />
                        <span className="text-sm font-medium text-slate-700">{plan.name}</span>
                        <span className="text-xs text-slate-500 ml-auto bg-slate-100 px-2 py-0.5 rounded-full">{plan.slug}</span>
                      </label>
                    )
                  })}
                  {plans.length === 0 && <p className="text-sm text-slate-500">No plans created yet.</p>}
                </div>
              </div>
              
              <div className="pt-4 border-t flex justify-end gap-3">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
