import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  FileText, CheckCircle2, ShieldCheck, HelpCircle, ArrowRight, Star,
  Brain, FileSearch, Sparkles, ChevronDown, BadgeAlert, Laptop, Users, X
} from "lucide-react";
import * as Icons from "lucide-react";
import { useSystemSettings } from "../contexts/SystemSettingsContext";
import SEOMeta from "../components/SEOMeta";

// Helper to render lucide-react icons dynamically
const getIcon = (iconName: string, className: string = "w-6 h-6") => {
  const Icon = (Icons as any)[iconName] || Icons.CheckCircle2;
  return <Icon className={className} />;
};

interface LandingPageProps {
  onNavigate: (page: string) => void;
  onUpgrade: (plan?: string, billingPeriod?: string) => void;
  userPlan: "Free" | "Pro" | string;
}

export default function LandingPage({ onNavigate, onUpgrade, userPlan }: LandingPageProps) {
  const { settings } = useSystemSettings();
  const companyName = settings.companyName || 'CareerForge AI';
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("annual");
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const steps = [
    {
      icon: <FileText className="w-6 h-6 text-indigo-600" />,
      title: "Upload Resume",
      desc: "Drag and drop your PDF or DOCX resume, or paste your raw layout block directly."
    },
    {
      icon: <Brain className="w-6 h-6 text-indigo-600" />,
      title: "Paste Job Target",
      desc: "Copy the description of the role you seek. Our AI parses keywords instantly."
    },
    {
      icon: <Sparkles className="w-6 h-6 text-indigo-600" />,
      title: "Get ATS Optimizations",
      desc: "Receive an instant score match, keyword deficits list, bullet fixes, and cover letters."
    }
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Senior Frontend Engineer",
      quote: `${companyName} completely changed how I applied for roles. By aligning my keywords directly to the ATS logic, my callback rate doubled.`,
      rating: 5,
      achievement: "Hired at Stripe"
    },
    {
      name: "Marcus Rodriguez",
      role: "Product Manager",
      quote: "The personalized cover letter generator saved me hours. The AI synthesized my exact background flawlessly.",
      rating: 5,
      achievement: "Interviews at Google"
    },
    {
      name: "Emily Watson",
      role: "Marketing Analyst",
      quote: "I didn't realize how weak my action verbs were until the Analyzer highlighted them. Fixes took less than a minute.",
      rating: 5,
      achievement: "Salary increased by 30%"
    }
  ];

  const [plans, setPlans] = useState<any[]>([]);
  const [features, setFeatures] = useState<any[]>([]);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [cms, setCms] = useState<any>(null);

  useEffect(() => {
    import("axios").then(axios => {
      axios.default.get('/api/public/config').then(res => {
        setPlans(res.data.plans || []);
        setFeatures(res.data.features || []);
      }).catch(err => { if(err?.response?.status !== 401) console.error(err); });

      axios.default.get('/api/public/faqs?isFeatured=true').then(res => {
        setFaqs(res.data.faqs || []);
      }).catch(err => { if(err?.response?.status !== 401) console.error(err); });

      axios.default.get('/api/public/landing').then(res => {
        setCms(res.data);
      }).catch(err => { if(err?.response?.status !== 401) console.error(err); });
    });
  }, []);

  const proPlanForFaq = plans.find(p => p.slug !== 'free' && p.monthlyPrice > 0);
  const faqAnnualPrice = proPlanForFaq ? proPlanForFaq.annualPrice * 12 : 0;
  const faqMonthlyPrice = proPlanForFaq ? proPlanForFaq.monthlyPrice : 0;
  const faqAnnualMonthlyEquivalent = proPlanForFaq ? proPlanForFaq.annualPrice : 0;
  const faqSavings = faqMonthlyPrice * 12 - faqAnnualPrice;

  const isSectionVisible = (name: string) => {
    return cms?.sections?.find((s: any) => s.name === name)?.isVisible !== false;
  };

  return (
    <div className="space-y-20 pb-20 w-full">
      <SEOMeta pageKey="home" />
      {/* Hero Section */}
      {isSectionVisible('hero') && (
      <section className={`text-center max-w-4xl xl:max-w-7xl 2xl:max-w-[90rem] mx-auto space-y-6 pt-10 px-4 ${cms?.hero?.background || ''}`}>
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full">
            <Sparkles className="w-3.5 h-3.5" /> {cms?.hero?.subtitle || "Empowering Career Growth with Next-Gen AI"}
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-3xl md:text-5xl font-extrabold font-display tracking-tight text-slate-900 leading-tight"
        >
          {cms?.hero?.title || (
            <>Beat the hiring filters and land your <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-800">dream job</span></>
          )}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed"
        >
          {cms?.hero?.description || "An intelligent multipage ATS resume reviewer and companion. Match keywords, rephrase achievement bullets, generate custom cover letters, and prepare for interviews in seconds."}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4"
        >
          <button
            onClick={() => cms?.hero?.primaryButtonUrl ? window.open(cms.hero.primaryButtonUrl, '_blank') : onNavigate("analyze")}
            className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 group cursor-pointer"
          >
            <FileSearch className="w-5 h-5" /> {cms?.hero?.primaryButtonText || "Analyze Your Resume Now"}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <button
            onClick={() => cms?.hero?.secondaryButtonUrl ? window.open(cms.hero.secondaryButtonUrl, '_blank') : onNavigate("tools")}
            className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-50 text-slate-800 font-medium rounded-xl border border-slate-200 shadow-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" /> {cms?.hero?.secondaryButtonText || "Explore AI Utilities"}
          </button>
        </motion.div>

        {cms?.hero?.imageUrl && (
            <motion.img 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                src={cms.hero.imageUrl} 
                alt="Hero Cover" 
                className="mx-auto rounded-2xl shadow-xl mt-8 max-w-full" 
            />
        )}
      </section>
      )}

      {/* Global Stats bar */}
      {isSectionVisible('stats') && (
      <section className="px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl xl:max-w-7xl 2xl:max-w-[90rem] mx-auto pt-10 border-t border-slate-100"
        >
          {(cms?.stats?.length ? cms.stats : [
            { title: "70%", subtitle: "Resumes Rejected by ATS" },
            { title: "10s", subtitle: "AI Analysis Duration" },
            { title: "100%", subtitle: "ATS Score Optimization Workflow" }
          ]).map((stat: any, idx: number) => (
            <div key={idx} className="text-center p-3 flex flex-col items-center justify-center">
              <h3 className="text-2xl font-bold text-slate-900">{stat.title}</h3>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{stat.subtitle}</p>
              {stat.description && <p className="text-xs text-slate-400 mt-1">{stat.description}</p>}
            </div>
          ))}
        </motion.div>
      </section>
      )}

      {/* How It Works Section */}
      <section className="bg-slate-50 py-16 px-4 sm:px-8 border-y border-slate-100">
        <div className="max-w-5xl xl:max-w-7xl 2xl:max-w-[90rem] mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-2xl md:text-3xl font-extrabold font-display text-slate-900">How It Works</h2>
            <p className="text-slate-600 max-w-md mx-auto">Optimize your application package in 3 simple, stress-free steps.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm relative space-y-4">
                <div className="absolute top-4 right-4 text-xs font-bold text-slate-300">STEP 0{idx + 1}</div>
                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl inline-block">
                  {step.icon}
                </div>
                <h3 className="text-lg font-bold text-slate-900">{step.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      {isSectionVisible('features') && (
      <section className="max-w-5xl xl:max-w-7xl 2xl:max-w-[90rem] mx-auto space-y-12 px-4 border-b border-slate-100 pb-16">
        <div className="text-center space-y-3">
          <h2 className="text-2xl md:text-3xl font-extrabold font-display text-slate-900">Why {companyName} Beats Manual Submissions</h2>
          <p className="text-slate-600 max-w-lg mx-auto">Get comprehensive system advantages over competing candidates through targeted AI transformations.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {(cms?.features?.length ? cms.features : [
            { icon: "BadgeAlert", title: "Automated Keyword Maps", description: "Cross-references missing technical definitions found in the job listing instantly." },
            { icon: "CheckCircle2", title: "Quantified Repetitions", description: "Repairs weak action-verb statements with strong algorithmic percentage metrics." },
            { icon: "FileSearch", title: "Format Normalization", description: "Aligns your uploaded text with ATS-friendly spacing logic standard algorithms." },
            { icon: "FileText", title: "Tailored Cover Letters", description: "Compiles completely unique salutations referencing exact requirements found in descriptions." },
            { icon: "Users", title: "Pre-Interview Simulations", description: "Predicts likely behavior grids and logic tests before you enter the main meeting room." },
            { icon: "Laptop", title: "LinkedIn Alignment", description: "Brings your headline and Summary into harmony with current recruitment search engines." }
          ]).map((feature: any, idx: number) => (
          <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            {getIcon(feature.icon || "CheckCircle2", "w-6 h-6 text-indigo-600 mb-4")}
            <h3 className="font-bold text-slate-900 mb-2">{feature.title}</h3>
            <p className="text-sm text-slate-600">{feature.description}</p>
          </div>
          ))}
        </div>
      </section>
      )}

      {/* Social Proof Section */}
      {isSectionVisible('testimonials') && (
      <section className="max-w-5xl xl:max-w-7xl 2xl:max-w-[90rem] mx-auto space-y-12 px-4">
        <div className="text-center space-y-3">
          <h2 className="text-2xl md:text-3xl font-extrabold font-display text-slate-900">Success Stories</h2>
          <p className="text-slate-600">Hear from job seekers who successfully bypassed industry recruiting filters.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {(cms?.testimonials?.length ? cms.testimonials : testimonials).map((test: any, idx: number) => (
            <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex gap-0.5 text-amber-400">
                  {[...Array(test.rating || 5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <p className="text-sm text-slate-600 italic">"{test.description || test.quote}"</p>
              </div>
              <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                {test.imageUrl && <img src={test.imageUrl} alt={test.title || test.name} className="w-10 h-10 rounded-full object-cover bg-slate-100" />}
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{test.title || test.name}</h4>
                  <p className="text-xs text-slate-400 h-4">{test.subtitle || test.company || test.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      )}

      {/* Pricing Section */}
      {isSectionVisible('pricing') && (
      <section id="pricing" className="max-w-5xl xl:max-w-7xl 2xl:max-w-[90rem] mx-auto space-y-12 px-4 relative">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-indigo-50/50 via-transparent to-transparent opacity-80 pointer-events-none rounded-[3rem]" />
        <div className="text-center space-y-2 relative z-10">
          <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
            Clear & Simple Pricing
          </span>
          <h2 className="text-2xl md:text-4xl font-extrabold font-display text-slate-900 tracking-tight">Flexible Plans Built for Growth</h2>
          <p className="text-slate-600 max-w-xl mx-auto text-sm md:text-base">Upgrade to unlock advanced AI-tuning tools and secure unlimited job-matching scans.</p>
          
          {/* Annual plan Toggle Discount switch */}
          <div className="inline-flex flex-col sm:flex-row items-center gap-3 p-1.5 bg-slate-100 border border-slate-200 rounded-2xl sm:rounded-full mt-4">
            <button
              onClick={() => setBillingPeriod("monthly")}
              className={`w-full sm:w-auto px-4 py-1.5 rounded-xl sm:rounded-full text-xs font-semibold transition-all cursor-pointer ${billingPeriod === "monthly" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:text-slate-800"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod("annual")}
              className={`w-full sm:w-auto relative px-4 py-1.5 rounded-xl sm:rounded-full text-xs font-semibold transition-all cursor-pointer ${billingPeriod === "annual" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-800"}`}
            >
              Annual Discount
              <span className="absolute -top-3 -right-3 sm:-top-6 sm:-right-6 px-1.5 py-0.5 bg-amber-500 text-[9px] font-extrabold text-white uppercase rounded shadow-sm tracking-wider">
                Save ${faqSavings}
              </span>
            </button>
          </div>
        </div>

        <div className={`grid grid-cols-1 md:grid-cols-${Math.min(plans.length, 3)} gap-8 max-w-${plans.length === 1 ? 'md' : plans.length === 2 ? '3xl' : '5xl'} xl:max-w-7xl 2xl:max-w-[90rem] mx-auto items-stretch`}>
          {plans.map((plan) => {
            const isActive = userPlan?.toLowerCase() === plan.slug.toLowerCase();
            const isFree = plan.monthlyPrice === 0;
            
            return (
              <div key={plan.id} className={`${!isFree ? 'bg-slate-950 text-white border-indigo-600 shadow-xl scale-102' : 'bg-white text-slate-900 border-slate-200 shadow-sm'} rounded-3xl border p-8 flex flex-col justify-between relative`}>
                {!isFree && (
                  <div className="absolute -top-3 right-6 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
                    Premium
                  </div>
                )}

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
                      onClick={() => onNavigate("dashboard")}
                      className={`w-full py-3 font-bold text-xs rounded-xl text-center cursor-pointer border ${!isFree ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'}`}
                    >
                      Go to Dashboard
                    </button>
                  ) : isFree ? (
                    <button
                      onClick={() => onNavigate("analyze")}
                      className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl text-center cursor-pointer transition border border-slate-200"
                    >
                      Start Free
                    </button>
                  ) : (
                    <button
                      onClick={() => onUpgrade(plan.slug, billingPeriod)}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl text-center cursor-pointer transition shadow-lg inline-flex items-center justify-center gap-1.5"
                    >
                      <Star className="w-4 h-4" /> Upgrade to {plan.name}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Money back badge */}
        <div className="border border-dashed border-slate-200 max-w-3xl xl:max-w-7xl 2xl:max-w-[90rem] mx-auto rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4 bg-slate-50/50 justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-full">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900">14-Day Money-Back Guarantee</h4>
              <p className="text-xs text-slate-500">Zero-risk career investment. Not satisfied? Cancel within 2 weeks for a prompt refund.</p>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full whitespace-nowrap">
            100% Risk Free
          </span>
        </div>
      </section>
      )}

      {/* Target Market Strategy Callout (Partners) */}
      {isSectionVisible('partners') && (
      <section className="bg-indigo-50 py-16 px-4 sm:px-8">
        <div className="max-w-4xl xl:max-w-7xl 2xl:max-w-[90rem] mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div className="space-y-4">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest block">Strategic Outreach</span>
            <h2 className="text-2xl md:text-3xl font-extrabold font-display text-slate-900 tracking-tight">Built for Everyone</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              We align our active product growth to directly support candidates where they collaborate online. Targeted campaigns are focused on empowering <strong className="text-slate-900">all developers, students, and employees</strong>, paired with intelligent resources and search positioning.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {(cms?.partners?.length ? cms.partners : [
                { title: 'Target Audience', websiteUrl: 'All Developers, Students, and Employees worldwide.' },
                { title: 'Search SEO Intent', websiteUrl: 'Direct indexing for career growth & optimization.' }
            ]).map((partner: any, idx: number) => (
            <div key={idx} className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm flex flex-col justify-between">
              <div>
                {partner.imageUrl ? <img src={partner.imageUrl} className="h-6 mb-2 object-contain" /> : <Users className="w-5 h-5 text-indigo-600 mb-2" />}
                <h4 className="font-bold text-slate-900 text-sm">{partner.title}</h4>
                <p className="text-xs text-slate-500 mt-1">{partner.websiteUrl}</p>
              </div>
            </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* FAQ Section */}
      {isSectionVisible('faq') && (
      <section id="faq" className="max-w-3xl xl:max-w-7xl 2xl:max-w-[90rem] mx-auto space-y-8 px-4">
        <div className="text-center space-y-3">
          <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-full inline-block">
            <HelpCircle className="w-5 h-5 text-indigo-600" />
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold font-display text-slate-900">Frequently Asked Questions</h2>
          <p className="text-sm text-slate-600">Got questions? Find simple, objective information below.</p>
        </div>

        <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-200 bg-white shadow-sm">
          {faqs.map((faq, idx) => (
            <div key={idx} className="transition-all">
              <button
                onClick={() => toggleFaq(idx)}
                className="w-full text-left py-4 px-5 flex justify-between items-center bg-white hover:bg-slate-50/50 transition-colors font-medium text-slate-800 select-none cursor-pointer"
              >
                <span className="pr-4 text-sm md:text-base font-bold text-slate-900">{faq.question}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${activeFaq === idx ? "rotate-180" : ""}`} />
              </button>
              
              <AnimatePresence initial={false}>
                {activeFaq === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="px-5 pb-5 pt-1 text-sm text-slate-600 leading-relaxed border-t border-slate-100 whitespace-pre-wrap">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>
      )}

      {/* Footer Branding CTA banner */}
      {isSectionVisible('cta') && (
      <section className="max-w-3xl xl:max-w-7xl 2xl:max-w-[90rem] mx-auto space-y-6 px-4">
        {(cms?.ctas?.length ? cms.ctas : [
            { title: "Ready to boost your interview callbacks?", description: "Get detailed keyword matching report and resume suggestions in 10 seconds.", buttonText: "Start Your First Scan", buttonUrl: "" }
        ]).map((cta: any, idx: number) => (
        <div key={idx} className={`bg-gradient-to-br from-indigo-50 to-slate-50 border-1 border-indigo-100/60 p-8 rounded-3xl text-center space-y-4 ${cta.background || ''}`}>
            <h3 className="text-2xl font-bold text-slate-900">{cta.title}</h3>
            <p className="text-slate-600 text-sm max-w-md mx-auto">{cta.description}</p>
            <button
            onClick={() => cta.buttonUrl ? window.open(cta.buttonUrl) : onNavigate("analyze")}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-sm transition-all shadow cursor-pointer inline-flex items-center gap-2"
            >
            <FileSearch className="w-4 h-4" /> {cta.buttonText}
            </button>
        </div>
        ))}
      </section>
      )}

      {/* Newsletter Section */}
      {isSectionVisible('newsletter') && cms?.newsletters && cms.newsletters.isPublished !== false && (
        <section className="max-w-xl mx-auto px-4 mt-12 text-center space-y-4">
            <h3 className="text-xl font-bold">{cms.newsletters.title || "Subscribe to our Newsletter"}</h3>
            <p className="text-sm text-slate-500">{cms.newsletters.subtitle || "Get weekly career tips."}</p>
            <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); alert('Subscribed!')}}>
                <input type="email" placeholder="Enter your email" required className="flex-1 p-3 rounded-lg border border-slate-200 shadow-sm focus:ring-2 focus:ring-indigo-600 outline-none" />
                <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-lg font-medium shadow transition-colors cursor-pointer">{cms.newsletters.buttonText || "Subscribe"}</button>
            </form>
        </section>
      )}
    </div>
  );
}
