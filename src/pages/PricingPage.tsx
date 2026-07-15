import SEOMeta from '../components/SEOMeta';
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Check, CheckCircle2, ShieldCheck, X, Sparkles, 
  HelpCircle, ChevronDown, CreditCard, ShoppingBag
} from "lucide-react";
import axios from "axios";

interface PricingPageProps {
  currentUser: { plan: string | undefined } | null | any;
  onUpgrade: (plan?: string, billingPeriod?: string, couponCode?: string) => void;
  onDowngrade: () => void;
}

export default function PricingPage({ currentUser, onUpgrade, onDowngrade }: PricingPageProps) {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("annual");
  const [plans, setPlans] = useState<any[]>([]);
  const [features, setFeatures] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);

  useEffect(() => {
    axios.get('/api/public/config').then(res => {
      setPlans(res.data.plans || []);
      setFeatures(res.data.features || []);
      setPromotions(res.data.promotions || []);
    }).catch(err => { if(err?.response?.status !== 401) console.error(err); });
  }, []);

  const handleCheckoutClick = (planSlug: string) => {
    const applicablePromo = promotions.find(p => !p.plans || p.plans.length === 0 || p.plans.includes(planSlug));
    onUpgrade(planSlug, billingPeriod, applicablePromo?.couponId || undefined);
  };

  const proPlan = plans.find(p => p.slug !== 'free' && p.monthlyPrice > 0);
  const annualDiscount = proPlan ? (proPlan.monthlyPrice * 12) - (proPlan.annualPrice * 12) : 0;

  return (
    <div className="max-w-5xl xl:max-w-7xl 2xl:max-w-[90rem] mx-auto space-y-12 pb-16 px-4 xl:px-8">
      <SEOMeta pageKey="pricing" />
      {/* Title */}
      <div className="text-center space-y-2">
        <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
          Best Value Career Investment
        </span>
        <h1 className="text-2xl md:text-4xl font-extrabold font-display text-slate-900 tracking-tight">Flexible Plans Built for Growth</h1>
        <p className="text-slate-600 max-w-xl mx-auto text-sm md:text-base">Upgrade to unlock advanced AI-tuning tools and secure unlimited job-matching scans.</p>
        
        {promotions.length > 0 && (
          <div className="mt-4 inline-block bg-gradient-to-r from-pink-500 to-indigo-600 text-white font-bold px-4 py-2 rounded-full shadow-lg text-sm animate-pulse">
             🎉 Special Offer: {promotions[0].title}
          </div>
        )}
        
        {/* Switch billing */}
        <div className="inline-flex flex-col sm:flex-row items-center gap-3 p-1.5 bg-slate-100 border border-slate-200 rounded-2xl sm:rounded-full mt-4">
          <button
            onClick={() => setBillingPeriod("monthly")}
            className={`w-full sm:w-auto px-4 py-1.5 rounded-xl sm:rounded-full text-xs font-semibold cursor-pointer transition ${billingPeriod === "monthly" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600"}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod("annual")}
            className={`w-full sm:w-auto px-4 py-1.5 rounded-xl sm:rounded-full text-xs font-semibold cursor-pointer transition relative ${billingPeriod === "annual" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600"}`}
          >
            Annual Discount {annualDiscount > 0 ? `(Saves $${annualDiscount})` : ''}
            <span className="absolute -top-3 -right-3 sm:-top-3.5 sm:-right-3 px-1.5 py-0.5 bg-amber-500 text-[8px] font-black uppercase text-white rounded">
              SAVE
            </span>
          </button>
        </div>
      </div>

      {/* Dynamic pricing boxes */}
      <div className={`grid grid-cols-1 md:grid-cols-${Math.min(plans.length, 3)} gap-8 max-w-${plans.length === 1 ? 'md' : plans.length === 2 ? '3xl' : '5xl'} xl:max-w-7xl 2xl:max-w-[90rem] mx-auto items-stretch`}>
        {plans.map((plan) => {
          const isActive = currentUser?.plan?.toLowerCase() === plan.slug.toLowerCase();
          const isFree = plan.monthlyPrice === 0;
          
          return (
            <div key={plan.id} className={`${!isFree ? 'bg-slate-950 text-white border-indigo-600 shadow-xl' : 'bg-white text-slate-900 border-slate-200 shadow-sm'} ${plan.isRecommended ? 'scale-105 border-indigo-500 shadow-indigo-500/20' : 'scale-100'} rounded-3xl border p-8 flex flex-col justify-between relative transition-transform`}>
              {plan.isRecommended ? (
                <div className="absolute -top-3 right-6 bg-gradient-to-r from-pink-500 to-indigo-600 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
                  Recommended
                </div>
              ) : !isFree ? (
                <div className="absolute -top-3 right-6 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
                  Premium
                </div>
              ) : null}

              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className={`text-lg font-extrabold ${!isFree ? 'text-white' : 'text-slate-900'}`}>{plan.name}</h3>
                    <p className={`${!isFree ? 'text-slate-400' : 'text-slate-500'} text-xs mt-1`}>{plan.description}</p>
                  </div>
                  {isActive && (
                    <span className={`${!isFree ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200'} text-[9px] font-bold px-2 py-0.5 rounded-full uppercase`}>
                      Active
                    </span>
                  )}
                </div>

                <div>
                  <span className={`text-4xl font-black ${!isFree ? 'text-white' : 'text-slate-800'}`}>
                    ${billingPeriod === "annual" ? plan.annualPrice : plan.monthlyPrice}
                  </span>
                  <span className={`${!isFree ? 'text-slate-400' : 'text-slate-400'} text-xs`}>
                    {isFree ? " / forever" : (billingPeriod === "annual" ? " / month, billed yearly" : " / month")}
                  </span>
                </div>

                <ul className={`space-y-3 pt-4 border-t ${!isFree ? 'border-slate-800 text-slate-300' : 'border-slate-100 text-slate-600'} text-sm`}>
                  {features.map((f: any) => {
                    const hasFeature = plan.features?.some((pf: any) => pf.featureId === f.id && pf.enabled);
                    return (
                      <li key={f.id} className={`flex gap-2 items-start ${!hasFeature ? 'opacity-40' : ''}`}>
                        {hasFeature ? (
                          <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${!isFree ? 'text-indigo-400' : 'text-indigo-600'}`} />
                        ) : (
                          <X className={`w-4 h-4 mt-0.5 shrink-0 ${!isFree ? 'text-slate-500' : 'text-slate-400'}`} />
                        )}
                        <span className={!hasFeature ? 'line-through' : ''}>{f.name}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="pt-8">
                {isActive ? (
                  <button
                    disabled
                    className={`w-full py-3 font-bold text-xs rounded-xl text-center cursor-not-allowed border ${!isFree ? 'bg-indigo-600/30 text-indigo-300 border-indigo-700' : 'bg-slate-100 text-slate-400 border-slate-200'}`}
                  >
                    Current Active Plan
                  </button>
                ) : isFree ? (
                  <button
                    onClick={onDowngrade}
                    className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl text-center cursor-pointer transition border border-slate-200"
                  >
                    Change to Free
                  </button>
                ) : (
                  <button
                    onClick={() => handleCheckoutClick(plan.slug)}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl text-center cursor-pointer transition shadow-lg inline-flex items-center justify-center gap-1.5"
                  >
                    <CreditCard className="w-4 h-4" /> Buy {plan.name}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Risk warning */}
      <div className="border border-dashed border-slate-200 max-w-xl mx-auto rounded-2xl p-4 flex items-center gap-3.5 bg-slate-50/60 justify-center text-center">
        <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0" />
        <p className="text-slate-500 text-xs">
          Annual checkout billing is billed upfront. Saves {annualDiscount > 0 ? `$${annualDiscount}` : 'money'} a year. Backed by 14-day refund guarantee.
        </p>
      </div>

      {/* Comparison Matrix */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 overflow-x-auto max-w-5xl xl:max-w-7xl 2xl:max-w-[90rem] mx-auto">
        <h3 className="font-extrabold text-slate-900 border-b border-slate-100 pb-3 text-sm uppercase tracking-wider text-center flex items-center justify-center gap-1">
          <Sparkles className="w-4 h-4 text-indigo-600" /> Plan Comparison Matrix
        </h3>
        <table className="w-full text-left text-xs mt-4 min-w-[600px]">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 uppercase text-[9px] font-bold tracking-widest">
              <th className="py-2.5 pr-4">Feature</th>
              {plans.map(plan => (
                <th key={plan.id} className={`py-2.5 ${plan.monthlyPrice > 0 ? 'text-indigo-600' : ''}`}>{plan.name}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {features.map((f, i) => (
              <tr key={i} className="hover:bg-slate-50/50">
                <td className="py-3 font-semibold text-slate-800">{f.name}</td>
                {plans.map(plan => {
                  const hasFeature = plan.features?.some((pf: any) => pf.featureId === f.id && pf.enabled);
                  return (
                    <td key={plan.id} className={`py-3 ${plan.monthlyPrice > 0 ? 'text-indigo-600 font-bold' : ''}`}>
                      {hasFeature ? <CheckCircle2 className="w-4 h-4 shrink-0 text-indigo-600" /> : <X className="w-4 h-4 text-slate-400" />}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
