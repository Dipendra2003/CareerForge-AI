import { useState, useEffect } from "react";
import apiClient from "../../lib/apiClient";
import { Plus, Edit2, Trash2, X } from "lucide-react";

export default function AdminPlans() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    monthlyPrice: 0,
    annualPrice: 0,
    currency: "usd",
    durationDays: 30,
    trialDays: 0,
    stripeMonthlyPriceId: "",
    stripeAnnualPriceId: "",
    isActive: true,
    sortOrder: 0
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await apiClient.get('/admin/plans');
      setPlans(res.data.plans);
    } catch (err: any) {
      if (err?.response?.status !== 401) console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleOpenModal = (plan?: any) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({
        name: plan.name || "",
        slug: plan.slug || "",
        description: plan.description || "",
        monthlyPrice: plan.monthlyPrice || 0,
        annualPrice: plan.annualPrice || 0,
        currency: plan.currency || "usd",
        durationDays: plan.durationDays || 30,
        trialDays: plan.trialDays || 0,
        stripeMonthlyPriceId: plan.stripeMonthlyPriceId || "",
        stripeAnnualPriceId: plan.stripeAnnualPriceId || "",
        isActive: plan.isActive ?? true,
        sortOrder: plan.sortOrder || 0
      });
    } else {
      setEditingPlan(null);
      setFormData({
        name: "", slug: "", description: "", monthlyPrice: 0, annualPrice: 0, currency: "usd",
        durationDays: 30, trialDays: 0, stripeMonthlyPriceId: "", stripeAnnualPriceId: "", isActive: true, sortOrder: 0
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPlan(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let finalValue: any = value;
    if (type === 'number') finalValue = Number(value);
    if (type === 'checkbox') finalValue = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPlan) {
        // Optimistic update
        setPlans(prev => prev.map(p => p.id === editingPlan.id ? { ...p, ...formData } : p));
        await apiClient.put(`/admin/plans/${editingPlan.id}`, formData);
      } else {
        // Optimistic update for create (adds temporary id)
        setPlans(prev => [...prev, { id: 'temp-id-' + Date.now(), ...formData }]);
        await apiClient.post('/admin/plans', formData);
      }
      handleCloseModal();
      fetchPlans(true);
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to save plan");
      fetchPlans(true); // Revert optimistic updates on error
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this plan?")) return;
    try {
      // Optimistic update
      setPlans(prev => prev.filter(p => p.id !== id));
      await apiClient.delete(`/admin/plans/${id}`);
      fetchPlans(true);
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to delete plan");
      fetchPlans(true); // Revert optimistic updates on error
    }
  };

  if (loading) return <div className="p-8">Loading plans...</div>;

  return (
    <>
      <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Subscription Plans</h1>
        <button onClick={() => handleOpenModal()} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-indigo-700">
          <Plus className="w-4 h-4" /> New Plan
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-left whitespace-nowrap">
          <thead className="bg-slate-50 border-b border-slate-200 text-sm font-medium text-slate-500">
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Slug</th>
              <th className="px-6 py-4">Monthly</th>
              <th className="px-6 py-4">Annual</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm">
            {plans && plans.length > 0 ? plans.map((plan) => (
              <tr key={plan.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-900">{plan.name}</td>
                <td className="px-6 py-4 text-slate-600">{plan.slug}</td>
                <td className="px-6 py-4 text-slate-600">${plan.monthlyPrice}</td>
                <td className="px-6 py-4 text-slate-600">${plan.annualPrice}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${plan.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                    {plan.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={() => handleOpenModal(plan)} className="text-indigo-600 hover:text-indigo-900 p-1">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(plan.id)} className="text-red-600 hover:text-red-900 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  {loading ? 'Loading plans...' : 'No plans configured. Create one to get started.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-slate-900">{editingPlan ? "Edit Plan" : "Create Plan"}</h2>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                  <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Slug</label>
                  <input required type="text" name="slug" value={formData.slug} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <input type="text" name="description" value={formData.description} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Monthly Price ($)</label>
                  <input type="number" name="monthlyPrice" value={formData.monthlyPrice} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Annual Price ($)</label>
                  <input type="number" name="annualPrice" value={formData.annualPrice} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Stripe Monthly Price ID</label>
                  <input type="text" name="stripeMonthlyPriceId" value={formData.stripeMonthlyPriceId} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Stripe Annual Price ID</label>
                  <input type="text" name="stripeAnnualPriceId" value={formData.stripeAnnualPriceId} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sort Order</label>
                  <input type="number" name="sortOrder" value={formData.sortOrder} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="flex items-center mt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} className="w-5 h-5 text-indigo-600 rounded" />
                    <span className="text-sm font-medium text-slate-700">Plan is Active</span>
                  </label>
                </div>
              </div>
              
              <div className="pt-4 border-t flex justify-end gap-3">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700">Save Plan</button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
