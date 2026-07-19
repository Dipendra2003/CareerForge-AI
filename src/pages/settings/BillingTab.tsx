import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import apiClient from "../../lib/apiClient";
import { CreditCard, Download, ExternalLink, ShieldCheck, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function BillingTab() {
  const { user, refreshSession } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const { data } = await apiClient.get("/stripe/invoices");
      setInvoices(data.invoices);
    } catch (err) {
      // Securely log the error without leaking stack traces or sensitive data
      console.error('An error occurred during this operation.');
    }
  };

  const handleCustomerPortal = async () => {
    try {
      const { data } = await apiClient.post("/stripe/create-portal-session", {});
      if (data.url) window.location.href = data.url;
    } catch (error) {
      // Securely log the error without leaking stack traces or sensitive data
      console.error('An error occurred during this operation.');
    }
  };

  const isFreePlan = user?.plan?.toLowerCase() === "free";

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Subscription & Billing</h2>
        <p className="text-sm text-slate-500">Manage your plan, payment methods, and billing history.</p>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Current Plan</p>
          <div className="flex items-center gap-3">
            <h3 className="text-2xl font-black text-slate-900 capitalize">{user?.plan || "Free"}</h3>
            {!isFreePlan && <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Active</span>}
          </div>
          {user?.subscription_end && (
            <p className="text-sm text-slate-600 mt-2">
              Renews on {new Date(user.subscription_end).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          {isFreePlan ? (
            <button onClick={() => navigate("/pricing")} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition shadow-sm">
              Upgrade Plan
            </button>
          ) : (
            <>
              <button onClick={handleCustomerPortal} className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition shadow-sm flex items-center gap-2">
                Manage Billing <ExternalLink className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900">Billing History</h3>
        {invoices.length > 0 ? (
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="p-4 font-medium">Date</th>
                  <th className="p-4 font-medium">Invoice</th>
                  <th className="p-4 font-medium">Amount</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="p-4 text-slate-600">{new Date(inv.createdAt).toLocaleDateString()}</td>
                    <td className="p-4 font-mono text-xs text-slate-500">{inv.invoiceNumber}</td>
                    <td className="p-4 font-medium text-slate-900">${inv.total.toFixed(2)} {inv.currency.toUpperCase()}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${inv.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {inv.paymentStatus.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {inv.pdfUrl && (
                        <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1">
                          <Download className="w-4 h-4" /> PDF
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-8 text-center">
            <CreditCard className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-semibold text-slate-700">No Billing History</h4>
            <p className="text-xs text-slate-500 mt-1">When you make a payment, your invoices will appear here.</p>
          </div>
        )}
      </div>
      
      {!isFreePlan && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <strong>Need to cancel your subscription?</strong> You can easily cancel or change your plan at any time through the secure Stripe Customer Portal by clicking the "Manage Billing" button above.
          </div>
        </div>
      )}
    </div>
  );
}
