import { useState, useEffect } from 'react';
import { CreditCard, Tag, TrendingUp, RefreshCw, FileText, Gift, Settings, Activity } from 'lucide-react';
import SEOMeta from '../../components/SEOMeta';
import apiClient from '../../lib/apiClient';

export default function AdminBilling() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [trials, setTrials] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);

  const fetchStats = async () => {
    try {
      const res = await apiClient.get('/admin/billing/stats');
      setStats(res.data);
    } catch (e) {
      // Securely log the error without leaking stack traces or sensitive data
      console.error('An error occurred during this operation.');
    }
  };

  const fetchCoupons = async () => {
    try {
      const res = await apiClient.get('/admin/billing/coupons');
      setCoupons(res.data);
    } catch (e) {
      // Securely log the error without leaking stack traces or sensitive data
      console.error('An error occurred during this operation.');
    }
  };

  const fetchPromotions = async () => {
    try {
      const res = await apiClient.get('/admin/billing/promotions');
      setPromotions(res.data);
    } catch (e) {
      // Securely log the error without leaking stack traces or sensitive data
      console.error('An error occurred during this operation.');
    }
  };
  
  const fetchInvoices = async () => {
    try {
      const res = await apiClient.get('/admin/billing/invoices');
      setInvoices(res.data);
    } catch (e) {
      // Securely log the error without leaking stack traces or sensitive data
      console.error('An error occurred during this operation.');
    }
  };

  const fetchRefunds = async () => {
    try {
      const res = await apiClient.get('/admin/billing/refunds');
      setRefunds(res.data);
    } catch (e) {
      // Securely log the error without leaking stack traces or sensitive data
      console.error('An error occurred during this operation.');
    }
  };

  useEffect(() => {
    fetchStats();
    fetchCoupons();
    fetchPromotions();
    fetchInvoices();
    fetchRefunds();
  }, []);

  const [showCouponModal, setShowCouponModal] = useState(false);
  const [couponForm, setCouponForm] = useState({ code: '', title: '', discountType: 'percentage', discountValue: 10, duration: 'once', usageLimit: '', isMonthlyOnly: false, isAnnualOnly: false, firstPurchaseOnly: false });

  const [showPromoModal, setShowPromoModal] = useState(false);
  const [promoForm, setPromoForm] = useState({ title: '', isActive: true, startDate: '', endDate: '' });

  const [showTrialModal, setShowTrialModal] = useState(false);
  const [trialForm, setTrialForm] = useState({ planId: 'pro', days: 14, enabled: true });

  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundForm, setRefundForm] = useState({ id: '', cancelSubscription: false, revokeAccess: false });

  const createCoupon = async () => setShowCouponModal(true);
  const submitCoupon = async () => {
    try {
      await apiClient.post('/admin/billing/coupons', { ...couponForm, usageLimit: couponForm.usageLimit ? Number(couponForm.usageLimit) : undefined });
      fetchCoupons();
      setShowCouponModal(false);
    } catch (e) {
      // Securely log the error without leaking stack traces or sensitive data
      console.error('An error occurred during this operation.');
    }
  };
  
  const createPromotion = async () => setShowPromoModal(true);
  const submitPromo = async () => {
    try {
      await apiClient.post('/admin/billing/promotions', promoForm);
      fetchPromotions();
      setShowPromoModal(false);
    } catch (e) {
      // Securely log the error without leaking stack traces or sensitive data
      console.error('An error occurred during this operation.');
    }
  };

  const deletePromotion = async (id: string) => {
    if (!confirm("Delete promotion?")) return;
    try {
      await apiClient.delete(`/admin/billing/promotions/${id}`);
      fetchPromotions();
    } catch (e) {
      // Securely log the error without leaking stack traces or sensitive data
      console.error('An error occurred during this operation.');
    }
  };

  const deleteCoupon = async (id: string) => {
    if (!confirm("Delete coupon?")) return;
    try {
      await apiClient.delete(`/admin/billing/coupons/${id}`);
      fetchCoupons();
    } catch (e) {
      // Securely log the error without leaking stack traces or sensitive data
      console.error('An error occurred during this operation.');
    }
  };

  const toggleTrial = async (planId: string, currentDays: number, currentEnabled: boolean) => {
    setTrialForm({ planId, days: currentDays || 14, enabled: !currentEnabled });
    setShowTrialModal(true);
  };
  
  const submitTrial = async () => {
    try {
      await apiClient.put('/admin/billing/trials', [trialForm]);
      fetchTrials();
      setShowTrialModal(false);
    } catch (e) {
      // Securely log the error without leaking stack traces or sensitive data
      console.error('An error occurred during this operation.');
    }
  };

  const fetchTrials = async () => {
    try {
      const res = await apiClient.get('/admin/billing/trials');
      setTrials(res.data);
    } catch (e) {
      // Securely log the error without leaking stack traces or sensitive data
      console.error('An error occurred during this operation.');
    }
  };
  
  useEffect(() => {
    fetchTrials();
  }, []);

  const approveRefund = async (id: string) => {
    setRefundForm({ id, cancelSubscription: false, revokeAccess: false });
    setShowRefundModal(true);
  };
  const submitRefund = async () => {
    try {
      await apiClient.put(`/admin/billing/refunds/${refundForm.id}/approve`, refundForm);
      fetchRefunds();
      fetchInvoices();
      setShowRefundModal(false);
    } catch (e) {
      // Securely log the error without leaking stack traces or sensitive data
      console.error('An error occurred during this operation.');
    }
  };

  const rejectRefund = async (id: string) => {
    if (!confirm("Reject refund?")) return;
    try {
      await apiClient.put(`/admin/billing/refunds/${id}/reject`);
      fetchRefunds();
    } catch (e) {
      // Securely log the error without leaking stack traces or sensitive data
      console.error('An error occurred during this operation.');
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'coupons', label: 'Coupons', icon: Tag },
    { id: 'promotions', label: 'Promotions', icon: Gift },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'refunds', label: 'Refunds', icon: RefreshCw },
    { id: 'trials', label: 'Trials', icon: Settings }
  ];

  return (
    <>
    <div className="space-y-6 max-w-6xl xl:max-w-360 2xl:max-w-380 mx-auto pb-20">
      <SEOMeta pageKey="admin-billing" />
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Billing Management</h1>
        <p className="text-slate-500">Manage subscriptions, coupons, invoices, and revenue.</p>
      </div>

      <div className="flex space-x-1 border-b border-slate-200 mb-6 overflow-x-auto pb-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition whitespace-nowrap ${
              activeTab === tab.id ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">MRR</h3>
            <p className="text-2xl font-black text-slate-900">${stats.mrr.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">ARR</h3>
            <p className="text-2xl font-black text-slate-900">${stats.arr.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">ARPU</h3>
            <p className="text-2xl font-black text-indigo-600">${stats.arpu.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Churn Rate</h3>
            <p className="text-2xl font-black text-rose-600">{stats.churnRate.toFixed(2)}%</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">LTV</h3>
            <p className="text-2xl font-black text-emerald-600">${stats.ltv.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Today's Revenue</h3>
            <p className="text-2xl font-black text-emerald-600">${stats.todayRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-medium text-slate-500 mb-1">Coupons Used</h3>
            <p className="text-3xl font-bold text-slate-900">{stats.couponsUsed}</p>
          </div>
        </div>
      )}

      {activeTab === 'coupons' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center">
            <h2 className="font-semibold text-slate-900">Coupons</h2>
            <button onClick={createCoupon} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">Create Coupon</button>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 font-medium text-slate-500">Code</th>
                <th className="p-4 font-medium text-slate-500">Discount</th>
                <th className="p-4 font-medium text-slate-500">Used</th>
                <th className="p-4 font-medium text-slate-500">Status</th>
                <th className="p-4 font-medium text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c, idx) => (
                <tr key={idx} className="border-b border-slate-100">
                  <td className="p-4 font-mono">{c.code}</td>
                  <td className="p-4">{c.discountValue}{c.discountType === 'percentage' ? '%' : '$'} off</td>
                  <td className="p-4">{c.usedCount}</td>
                  <td className="p-4">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => deleteCoupon(c.id)} className="text-red-500 hover:text-red-700">Delete</button>
                  </td>
                </tr>
              ))}
              {coupons.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">No coupons found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
           <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 font-medium text-slate-500">Invoice</th>
                <th className="p-4 font-medium text-slate-500">User ID</th>
                <th className="p-4 font-medium text-slate-500">Amount</th>
                <th className="p-4 font-medium text-slate-500">Status</th>
                <th className="p-4 font-medium text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv, idx) => (
                <tr key={idx} className="border-b border-slate-100">
                  <td className="p-4 font-mono">{inv.invoiceNumber || inv.id}</td>
                  <td className="p-4 text-xs text-slate-500">{inv.userId}</td>
                  <td className="p-4">${inv.total.toFixed(2)}</td>
                  <td className="p-4">
                     <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${inv.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {inv.paymentStatus}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {inv.pdfUrl && (
                      <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800">PDF</a>
                    )}
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">No invoices found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'promotions' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center">
            <h2 className="font-semibold text-slate-900">Promotions</h2>
            <button onClick={createPromotion} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">Create Promotion</button>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 font-medium text-slate-500">Title</th>
                <th className="p-4 font-medium text-slate-500">Dates</th>
                <th className="p-4 font-medium text-slate-500">Status</th>
                <th className="p-4 font-medium text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {promotions.map((p, idx) => (
                <tr key={idx} className="border-b border-slate-100">
                  <td className="p-4 font-medium text-slate-900">{p.title}</td>
                  <td className="p-4 text-slate-500">{p.startDate ? new Date(p.startDate).toLocaleDateString() : 'Always'} - {p.endDate ? new Date(p.endDate).toLocaleDateString() : 'Forever'}</td>
                  <td className="p-4">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => deletePromotion(p.id)} className="text-red-500 hover:text-red-700">Delete</button>
                  </td>
                </tr>
              ))}
              {promotions.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">No promotions found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'refunds' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
           <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 font-medium text-slate-500">Invoice ID</th>
                <th className="p-4 font-medium text-slate-500">Amount</th>
                <th className="p-4 font-medium text-slate-500">Status</th>
                <th className="p-4 font-medium text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {refunds.map((ref, idx) => (
                <tr key={idx} className="border-b border-slate-100">
                  <td className="p-4 font-mono text-xs">{ref.invoiceId}</td>
                  <td className="p-4">${ref.amount.toFixed(2)}</td>
                  <td className="p-4">
                     <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${ref.status === 'approved' || ref.status === 'completed' ? 'bg-green-100 text-green-700' : ref.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {ref.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4 text-right flex justify-end gap-2">
                    {ref.status === 'pending' && (
                      <>
                        <button onClick={() => approveRefund(ref.id)} className="text-green-600 hover:text-green-800 font-medium">Approve</button>
                        <button onClick={() => rejectRefund(ref.id)} className="text-red-600 hover:text-red-800 font-medium">Reject</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {refunds.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">No refunds found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'trials' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center">
            <h2 className="font-semibold text-slate-900">Trial Configuration</h2>
            <button onClick={() => toggleTrial('pro', 14, false)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">Add Trial Rule</button>
          </div>
           <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 font-medium text-slate-500">Plan ID</th>
                <th className="p-4 font-medium text-slate-500">Trial Days</th>
                <th className="p-4 font-medium text-slate-500">Status</th>
                <th className="p-4 font-medium text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {trials.map((trial, idx) => (
                <tr key={idx} className="border-b border-slate-100">
                  <td className="p-4 font-medium text-slate-900 uppercase">{trial.planId}</td>
                  <td className="p-4">{trial.days} Days</td>
                  <td className="p-4">
                     <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${trial.enabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                      {trial.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => toggleTrial(trial.planId, trial.days, trial.enabled)} className="text-indigo-600 hover:text-indigo-800 font-medium">Toggle</button>
                  </td>
                </tr>
              ))}
              {trials.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">No trials configured.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

    </div>
    
      {showCouponModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Create Coupon</h3>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium">Code</label><input className="w-full border p-2 rounded" value={couponForm.code} onChange={e => setCouponForm({...couponForm, code: e.target.value})} /></div>
              <div><label className="block text-sm font-medium">Title</label><input className="w-full border p-2 rounded" value={couponForm.title} onChange={e => setCouponForm({...couponForm, title: e.target.value})} /></div>
              <div><label className="block text-sm font-medium">Discount Type</label><select className="w-full border p-2 rounded" value={couponForm.discountType} onChange={e => setCouponForm({...couponForm, discountType: e.target.value})}><option value="percentage">Percentage</option><option value="fixed">Fixed</option></select></div>
              <div><label className="block text-sm font-medium">Value</label><input type="number" className="w-full border p-2 rounded" value={couponForm.discountValue} onChange={e => setCouponForm({...couponForm, discountValue: Number(e.target.value)})} /></div>
              <div><label className="block text-sm font-medium">Duration</label><select className="w-full border p-2 rounded" value={couponForm.duration} onChange={e => setCouponForm({...couponForm, duration: e.target.value})}><option value="once">Once</option><option value="repeating">Repeating</option><option value="forever">Forever</option></select></div>
              <div><label className="block text-sm font-medium">Usage Limit</label><input type="number" className="w-full border p-2 rounded" placeholder="Unlimited" value={couponForm.usageLimit} onChange={e => setCouponForm({...couponForm, usageLimit: e.target.value})} /></div>
              <div className="flex gap-2 items-center"><input type="checkbox" checked={couponForm.firstPurchaseOnly} onChange={e => setCouponForm({...couponForm, firstPurchaseOnly: e.target.checked})} /> <label className="text-sm">First Purchase Only</label></div>
              <div className="flex gap-2 items-center"><input type="checkbox" checked={couponForm.isMonthlyOnly} onChange={e => setCouponForm({...couponForm, isMonthlyOnly: e.target.checked})} /> <label className="text-sm">Monthly Plans Only</label></div>
              <div className="flex gap-2 items-center"><input type="checkbox" checked={couponForm.isAnnualOnly} onChange={e => setCouponForm({...couponForm, isAnnualOnly: e.target.checked})} /> <label className="text-sm">Annual Plans Only</label></div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setShowCouponModal(false)} className="px-4 py-2 text-slate-500">Cancel</button>
                <button onClick={submitCoupon} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Save Coupon</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPromoModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Create Promotion</h3>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium">Title</label><input className="w-full border p-2 rounded" value={promoForm.title} onChange={e => setPromoForm({...promoForm, title: e.target.value})} /></div>
              <div><label className="block text-sm font-medium">Start Date</label><input type="date" className="w-full border p-2 rounded" value={promoForm.startDate} onChange={e => setPromoForm({...promoForm, startDate: e.target.value})} /></div>
              <div><label className="block text-sm font-medium">End Date</label><input type="date" className="w-full border p-2 rounded" value={promoForm.endDate} onChange={e => setPromoForm({...promoForm, endDate: e.target.value})} /></div>
              <div className="flex gap-2 items-center"><input type="checkbox" checked={promoForm.isActive} onChange={e => setPromoForm({...promoForm, isActive: e.target.checked})} /> <label className="text-sm">Active</label></div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setShowPromoModal(false)} className="px-4 py-2 text-slate-500">Cancel</button>
                <button onClick={submitPromo} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Save Promotion</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTrialModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Configure Trial</h3>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium">Plan Slug (e.g. pro)</label><input className="w-full border p-2 rounded" value={trialForm.planId} onChange={e => setTrialForm({...trialForm, planId: e.target.value})} /></div>
              <div><label className="block text-sm font-medium">Days</label><input type="number" className="w-full border p-2 rounded" value={trialForm.days} onChange={e => setTrialForm({...trialForm, days: Number(e.target.value)})} /></div>
              <div className="flex gap-2 items-center"><input type="checkbox" checked={trialForm.enabled} onChange={e => setTrialForm({...trialForm, enabled: e.target.checked})} /> <label className="text-sm">Enabled</label></div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setShowTrialModal(false)} className="px-4 py-2 text-slate-500">Cancel</button>
                <button onClick={submitTrial} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Save Trial</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRefundModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Approve Refund</h3>
            <p className="text-sm text-slate-500 mb-4">Configure the result of this refund.</p>
            <div className="space-y-4">
              <div className="flex gap-2 items-center"><input type="checkbox" checked={refundForm.cancelSubscription} onChange={e => setRefundForm({...refundForm, cancelSubscription: e.target.checked})} /> <label className="text-sm">Cancel Stripe Subscription</label></div>
              <div className="flex gap-2 items-center"><input type="checkbox" checked={refundForm.revokeAccess} onChange={e => setRefundForm({...refundForm, revokeAccess: e.target.checked})} /> <label className="text-sm">Revoke Premium Access Immediately</label></div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setShowRefundModal(false)} className="px-4 py-2 text-slate-500">Cancel</button>
                <button onClick={submitRefund} className="px-4 py-2 bg-red-600 text-white rounded-lg">Confirm Refund</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
