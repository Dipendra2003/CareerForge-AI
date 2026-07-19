import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  FileText, CheckCircle2, ShieldCheck, HelpCircle, ArrowRight, Star,
  Brain, FileSearch, Sparkles, ChevronDown, Laptop, Users, X,
  Target, Zap, BarChart3, PenTool, Award, TrendingUp, Mail, Lock
} from "lucide-react";
import * as Icons from "lucide-react";
import { useSystemSettings } from "../contexts/SystemSettingsContext";
import SEOMeta from "../components/SEOMeta";

// Helper to render lucide-react icons dynamically
const getIcon = (iconName: string, className: string = "w-6 h-6") => {
  const Icon = (Icons as any)[iconName] || Icons.CheckCircle2;
  return <Icon className={className} />;
};

// Standard Framer Motion Variants
const staggerContainer: any = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2
    }
  }
};

const fadeInUp: any = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 100, damping: 15 } }
};

const popIn: any = {
  hidden: { opacity: 0, scale: 0.8 },
  show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 120, damping: 12 } }
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
      title: "Upload Your Resume",
      desc: "Drop your PDF or DOCX resume into our secure analyzer. We support multi-page documents with advanced text extraction.",
      accent: "from-indigo-500 to-blue-500"
    },
    {
      icon: <Brain className="w-6 h-6 text-violet-600" />,
      title: "Add the Job Description",
      desc: "Paste the target role's description. Our AI instantly identifies critical keywords, skills, and qualification requirements.",
      accent: "from-violet-500 to-purple-500"
    },
    {
      icon: <Sparkles className="w-6 h-6 text-amber-600" />,
      title: "Get AI-Powered Results",
      desc: "Receive your ATS compatibility score, missing keyword analysis, optimized bullet rewrites, and a tailored cover letter — all in seconds.",
      accent: "from-amber-500 to-orange-500"
    }
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Senior Frontend Engineer",
      company: "Stripe",
      quote: `${companyName} completely transformed my job search. The keyword alignment feature doubled my callback rate within two weeks.`,
      rating: 5,
      achievement: "Hired at Stripe"
    },
    {
      name: "Marcus Rodriguez",
      role: "Product Manager",
      company: "Google",
      quote: "The AI-generated cover letters perfectly synthesized my experience with each role's requirements. What used to take hours now takes seconds.",
      rating: 5,
      achievement: "Interviews at Google"
    },
    {
      name: "Emily Watson",
      role: "Marketing Director",
      company: "HubSpot",
      quote: "I discovered critical gaps in my action verbs and quantified achievements. After fixing them, I received 4 interview invitations in one week.",
      rating: 5,
      achievement: "Salary increased 30%"
    }
  ];

  const [plans, setPlans] = useState<any[]>([]);
  const [features, setFeatures] = useState<any[]>([]);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [loadingFaqs, setLoadingFaqs] = useState(true);
  const [cms, setCms] = useState<any>(null);

  useEffect(() => {
    import("axios").then(axios => {
      axios.default.get('/api/public/config').then(res => {
        setPlans(res.data.plans || []);
        setFeatures(res.data.features || []);
      }).catch(err => {  });

      axios.default.get('/api/public/faqs?isFeatured=true').then(res => {
        setFaqs(res.data.faqs || []);
        setLoadingFaqs(false);
      }).catch(err => { 
        setLoadingFaqs(false);
      });

      axios.default.get('/api/public/landing').then(res => {
        setCms(res.data);
      }).catch(err => {  });
    });
  }, []);

  const proPlanForFaq = plans.find(p => p.slug !== 'free' && p.monthlyPrice > 0);
  const faqAnnualPrice = proPlanForFaq ? proPlanForFaq.annualPrice : 0;
  const faqMonthlyPrice = proPlanForFaq ? proPlanForFaq.monthlyPrice : 0;
  const faqAnnualMonthlyEquivalent = proPlanForFaq ? Math.round(proPlanForFaq.annualPrice / 12) : 0;
  const faqSavings = faqMonthlyPrice * 12 - faqAnnualPrice;

  const getSectionData = (name: string) => {
    return cms?.sections?.find((s: any) => s.name === name) || {};
  };

  const isSectionVisible = (name: string) => {
    return getSectionData(name).isVisible !== false;
  };

  return (
    <div className="space-y-0 pb-12 sm:pb-16 lg:pb-24 w-full overflow-hidden">
      <SEOMeta pageKey="home" />

      {/* ─────────────── HERO SECTION ─────────────── */}
      {isSectionVisible('hero') && (
      <section className={`relative text-center pt-16 sm:pt-20 lg:pt-24 pb-16 sm:pb-20 lg:pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden ${cms?.hero?.background || ''}`}>
        
        {/* Absolute Background Wrapper to prevent z-index clipping */}
        <div className="absolute inset-0 overflow-visible pointer-events-none z-0">
          {/* Decorative gradient orbs */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.08),transparent_70%)]" />

          {/* Soft Glowing Orbs for Modern UI */}
          <div className="absolute top-20 left-10 md:left-24 w-64 h-64 glow-orb glow-orb-primary animate-float-slow"></div>
          <div className="absolute top-40 right-10 md:right-24 w-80 h-80 glow-orb glow-orb-purple animate-float-slower"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-96 h-96 glow-orb glow-orb-cyan animate-float-slow opacity-40"></div>

          {/* 3D Pink Avatar */}
          <div className="absolute top-52 -left-8 sm:-left-4 lg:left-4 xl:left-10 2xl:left-20 flex opacity-30 sm:opacity-40 xl:opacity-100 scale-50 sm:scale-75 xl:scale-100 origin-left transition-all">
            <div className="animate-float-slow">
              <div className="w-20 h-20 md:w-28 md:h-28 rounded-full bg-rose-400 flex flex-col items-center justify-end overflow-hidden shadow-[inset_-5px_-5px_15px_rgba(0,0,0,0.2),inset_5px_5px_15px_rgba(255,255,255,0.4),0_15px_25px_rgba(0,0,0,0.15)] border border-rose-300">
                <div className="w-6 h-6 md:w-9 md:h-9 rounded-full bg-white shadow-sm mb-1.5 relative">
                  <div className="absolute inset-0 bg-linear-to-br from-white to-slate-200 rounded-full"></div>
                </div>
                <div className="w-12 h-6 md:w-20 md:h-10 bg-slate-800 rounded-t-full shadow-[inset_0_4px_10px_rgba(255,255,255,0.2)]"></div>
              </div>
            </div>
          </div>

          {/* 3D Blue Triangle Avatar */}
          <div className="absolute top-72 -right-8 sm:-right-4 lg:right-4 xl:right-10 2xl:right-20 flex -rotate-12 opacity-30 sm:opacity-40 xl:opacity-100 scale-50 sm:scale-75 xl:scale-100 origin-right transition-all">
            <div className="animate-float-slower">
              <div className="w-20 h-20 md:w-28 md:h-28 bg-cyan-400 flex flex-col items-center justify-end overflow-hidden shadow-[inset_-5px_-5px_15px_rgba(0,0,0,0.2),inset_5px_5px_15px_rgba(255,255,255,0.4),0_15px_25px_rgba(0,0,0,0.15)]" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}>
                <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-white shadow-sm mb-1.5 relative z-10">
                  <div className="absolute inset-0 bg-linear-to-br from-white to-slate-200 rounded-full"></div>
                </div>
                <div className="w-12 h-6 md:w-16 md:h-8 bg-slate-800 rounded-t-full shadow-[inset_0_4px_10px_rgba(255,255,255,0.2)] relative z-10"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Wrapper */}
        <div className="relative z-10 space-y-6 max-w-4xl xl:max-w-7xl 2xl:max-w-360 mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="badge-outline -rotate-3 inline-block mb-2 shadow-sm text-sm">
              #AI-Powered
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-6xl lg:text-7xl font-extrabold font-display tracking-tight text-slate-900 leading-[1.15]"
          >
            {cms?.hero?.title && cms.hero.title !== 'Transform your resume into an interview magnet' ? (
              cms.hero.title
            ) : (
              <>Transform your resume into an<br className="hidden sm:block" /> <span className="text-gradient-animated pb-1">interview magnet</span></>
            )}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-slate-500 max-w-3xl mx-auto font-medium leading-relaxed mt-6"
          >
            {cms?.hero?.description || "Stop getting rejected by ATS filters. Our AI analyzes your resume against any job description, identifies missing keywords, rewrites weak bullets, generates tailored cover letters, and prepares you for interviews — all in under 30 seconds."}
          </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row justify-center items-center gap-5 pt-8"
        >
          <button
            onClick={() => cms?.hero?.primaryButtonUrl ? window.open(cms.hero.primaryButtonUrl, '_blank') : onNavigate("analyze")}
            className="w-full sm:w-auto px-10 py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-full shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2 group cursor-pointer text-lg"
          >
            <FileSearch className="w-5 h-5" /> {cms?.hero?.primaryButtonText || "Analyze Your Resume — Free"}
          </button>
          <button
            onClick={() => cms?.hero?.secondaryButtonUrl ? window.open(cms.hero.secondaryButtonUrl, '_blank') : onNavigate("tools")}
            className="w-full sm:w-auto px-10 py-4 bg-white text-slate-800 font-bold rounded-full shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer text-lg border border-slate-100"
          >
            <Sparkles className="w-4 h-4 text-primary" /> {cms?.hero?.secondaryButtonText || "Explore AI Tools"}
          </button>
        </motion.div>
        </div>

        {/* Dashboard Mockup */}
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-20 mx-auto max-w-5xl relative"
        >
            {/* Small 3D elements around dashboard */}
            <div className="absolute -left-12 bottom-12 w-20 h-20 bg-amber-400 rounded-xl rotate-12 flex items-center justify-center shadow-lg animate-float-slow -z-10">
               <div className="w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center"><div className="w-2 h-2 bg-white rounded-full"></div></div>
            </div>
            <div className="absolute -right-8 -bottom-6 w-24 h-24 bg-purple-400 rounded-t-full shadow-lg animate-float-slower -z-10">
               <div className="absolute top-6 left-1/2 -translate-x-1/2 w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center"><div className="w-2 h-2 bg-white rounded-full"></div></div>
            </div>
            
            <div className="rounded-[2rem] shadow-2xl p-2 border border-slate-200/60 relative overflow-hidden backdrop-blur-3xl bg-white/70">
               {/* Inner window */}
               <div className="rounded-2xl overflow-hidden bg-white shadow-inner flex flex-col h-[480px]">
                   {/* Browser Header */}
                   <div className="bg-slate-50/80 h-12 flex items-center px-6 gap-2 border-b border-slate-200/80 shrink-0">
                      <div className="flex gap-2">
                         <div className="w-3 h-3 rounded-full bg-red-400"></div>
                         <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                         <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                      </div>
                      <div className="mx-auto bg-white shadow-sm border border-slate-200 rounded-md px-12 py-1.5 text-xs text-slate-500 font-medium flex items-center gap-2">
                         <Lock className="w-3 h-3" /> careerforge.ai/dashboard
                      </div>
                   </div>
                   {/* Mockup Body */}
                   <div className="flex flex-1 overflow-hidden">
                      {/* Sidebar Mock */}
                      <div className="w-64 hidden md:flex flex-col border-r border-slate-100 bg-slate-50/50 p-4">
                         <div className="flex items-center gap-3 px-2 mb-8 mt-2">
                            <div className="w-8 h-8 bg-linear-to-br from-indigo-500 to-purple-600 rounded-lg text-white font-black flex items-center justify-center text-xs shadow-md shadow-indigo-500/20">CF</div>
                            <div className="font-bold text-slate-900 text-lg tracking-tight">CareerForge</div>
                         </div>
                         <div className="space-y-1">
                            <div className="px-4 py-3 bg-indigo-50 text-indigo-700 font-bold rounded-xl text-sm flex items-center gap-3 shadow-sm border border-indigo-100"><Icons.LayoutDashboard className="w-4 h-4" /> Dashboard</div>
                            <div className="px-4 py-3 text-slate-500 font-medium rounded-xl text-sm flex items-center gap-3 hover:bg-slate-100 transition-colors"><FileSearch className="w-4 h-4" /> AI Analyzer</div>
                            <div className="px-4 py-3 text-slate-500 font-medium rounded-xl text-sm flex items-center gap-3 hover:bg-slate-100 transition-colors"><Sparkles className="w-4 h-4" /> Cover Letters</div>
                         </div>
                         <div className="mt-auto bg-white shadow-sm p-4 rounded-xl border border-slate-200 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/10 blur-xl"></div>
                            <div className="text-xs font-bold text-slate-900 mb-1 relative z-10">Pro Plan Active</div>
                            <div className="text-[10px] text-slate-500 relative z-10">Unlimited AI Scans</div>
                         </div>
                      </div>
                      
                      {/* Content Mock */}
                      <div className="flex-1 p-6 md:p-8 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.03),transparent_50%)] overflow-hidden flex flex-col gap-6">
                         <div className="flex justify-between items-end">
                             <div>
                                 <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Target className="w-3 h-3" /> Target Role</div>
                                 <div className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-3">
                                    Senior Frontend Engineer
                                    <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full border border-slate-200">Google</span>
                                 </div>
                             </div>
                             <div className="hidden sm:block">
                                 <div className="px-4 py-2 text-xs font-bold bg-slate-900 text-white rounded-lg shadow-lg hover:bg-slate-800 transition-colors">Update Resume</div>
                             </div>
                         </div>
                         
                         {/* Stats Grid */}
                         <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                               { label: 'ATS Score', value: '94%', color: 'from-emerald-500 to-emerald-600', fill: 'w-[94%]' },
                               { label: 'Keyword Match', value: '88%', color: 'from-indigo-500 to-purple-600', fill: 'w-[88%]' },
                               { label: 'Impact Metrics', value: '72%', color: 'from-amber-500 to-orange-500', fill: 'w-[72%]' },
                               { label: 'Readability', value: 'Excellent', color: 'from-cyan-500 to-blue-600', fill: 'w-[100%]' }
                            ].map((stat, i) => (
                               <div key={i} className="bg-white border border-slate-100 shadow-sm p-4 rounded-2xl flex flex-col justify-between hover:border-slate-200 transition-colors">
                                  <div className="text-slate-500 text-xs font-semibold">{stat.label}</div>
                                  <div className="mt-2 flex items-baseline gap-2">
                                     <div className={`text-2xl font-black text-transparent bg-clip-text bg-linear-to-br ${stat.color}`}>{stat.value}</div>
                                  </div>
                                  {stat.value.includes('%') && (
                                     <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
                                        <div className={`h-full bg-linear-to-r ${stat.color} rounded-full ${stat.fill}`}></div>
                                     </div>
                                  )}
                               </div>
                            ))}
                         </div>
                         
                         {/* AI Recommendations */}
                         <div className="flex-1 border border-indigo-100 bg-indigo-50/50 rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden shadow-inner">
                             <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-3xl rounded-full"></div>
                             <div className="flex items-center justify-between relative z-10">
                                 <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Sparkles className="w-4 h-4 text-indigo-600" /> AI Insights</h4>
                                 <span className="text-[10px] bg-white text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-200 font-bold shadow-sm">+3 Actions Available</span>
                             </div>
                             
                             <div className="space-y-3 relative z-10">
                                 <div className="bg-white border border-red-100 shadow-sm p-3 rounded-xl flex items-start gap-3">
                                     <div className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center shrink-0 mt-0.5"><Icons.AlertCircle className="w-3 h-3 text-red-500" /></div>
                                     <div>
                                         <div className="text-sm font-semibold text-slate-900">Missing Critical Skill: <span className="text-red-600">Redux Toolkit</span></div>
                                         <div className="text-xs text-slate-500 mt-1">Found in 85% of Senior Frontend roles at Google.</div>
                                     </div>
                                 </div>
                                 <div className="bg-white border border-emerald-100 shadow-sm p-3 rounded-xl flex items-start gap-3">
                                     <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5"><CheckCircle2 className="w-3 h-3 text-emerald-500" /></div>
                                     <div>
                                         <div className="text-sm font-semibold text-slate-900">Impact Metric Rewritten</div>
                                         <div className="text-xs text-slate-400 mt-1 line-through">"Improved website speed"</div>
                                         <div className="text-xs text-emerald-600 font-medium">"Decreased LCP by 45% (1.2s to 0.6s) by implementing code-splitting."</div>
                                     </div>
                                 </div>
                             </div>
                         </div>
                      </div>
                   </div>
               </div>
            </div>
        </motion.div>
      </section>
      )}

      {/* ─────────────── STATS BAR ─────────────── */}
      {isSectionVisible('stats') && (
      <section className="px-4 sm:px-6 lg:px-8 py-8 sm:py-12 border-y border-slate-200/50 relative z-10">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl xl:max-w-7xl 2xl:max-w-360 mx-auto perspective-1000"
        >
          {(cms?.stats?.length ? cms.stats : [
            { title: "75%", subtitle: "Resumes Rejected by ATS", description: "Most never reach a human reviewer", icon: "BarChart3" },
            { title: "<30s", subtitle: "AI Analysis Speed", description: "Instant comprehensive feedback", icon: "Zap" },
            { title: "2.4×", subtitle: "More Interview Callbacks", description: "Average improvement for users", icon: "TrendingUp" },
            { title: "50K+", subtitle: "Resumes Optimized", description: "Trusted by job seekers worldwide", icon: "Users" }
          ]).map((stat: any, idx: number) => (
            <motion.div
              key={idx}
              variants={fadeInUp}
              whileHover={{ scale: 1.05, rotateX: 5, rotateY: -5 }}
              className="text-center p-6 flex flex-col items-center justify-center bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-3xl shadow-lg hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-200/60 transition-all duration-300 transform-style-3d cursor-default relative overflow-hidden group"
            >
              {/* Subtle 3D background gradient that shifts on hover */}
              <div className="absolute inset-0 bg-linear-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-3xl"></div>
              
              {stat.icon && <motion.div whileHover={{ scale: 1.2, rotateZ: 10 }} className="mb-3 bg-white p-3 rounded-2xl shadow-sm z-10">{getIcon(stat.icon, "w-6 h-6 text-primary")}</motion.div>}
              <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight z-10">{stat.title}</h3>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mt-1 z-10">{stat.subtitle}</p>
              {stat.description && <p className="text-[11px] text-slate-400 mt-0.5 z-10">{stat.description}</p>}
            </motion.div>
          ))}
        </motion.div>
      </section>
      )}

      {/* ─────────────── HOW IT WORKS ─────────────── */}
      {isSectionVisible('howItWorks') && (
      <section className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-5xl xl:max-w-7xl 2xl:max-w-360 mx-auto space-y-14">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">{getSectionData('howItWorks').subtitle || 'Simple 3-Step Process'}</span>
            <h2 className="text-2xl md:text-4xl font-extrabold font-display text-slate-900 tracking-tight">{getSectionData('howItWorks').title || 'How It Works'}</h2>
            <p className="text-slate-500 max-w-lg mx-auto">{getSectionData('howItWorks').description || 'Go from uploaded resume to fully optimized application in under a minute.'}</p>
          </div>

          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 relative"
          >
            {(cms?.steps?.length ? cms.steps : steps).map((step: any, idx: number) => (
              <motion.div
                key={idx}
                variants={fadeInUp}
                whileHover={{ scale: 1.03, y: -5 }}
                className="bg-white/80 backdrop-blur-xl border border-slate-200/60 p-7 rounded-3xl relative space-y-4 shadow-xl hover:shadow-2xl hover:shadow-indigo-500/10 hover:border-indigo-200/60 transition-all duration-300 group overflow-hidden"
              >
                {/* Clean glassy watermark */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-indigo-500/5 blur-3xl rounded-full z-0 group-hover:bg-indigo-500/10 transition-colors duration-500"></div>
                <div className="absolute -right-2 -bottom-6 text-[120px] font-black text-indigo-900/5 select-none pointer-events-none group-hover:scale-110 transition-transform duration-500 z-0 leading-none">
                  {idx + 1}
                </div>
                
                <div className="absolute top-6 right-6 text-[10px] font-extrabold text-indigo-400 bg-indigo-50 px-2 py-1 rounded-full uppercase tracking-widest z-10 border border-indigo-100/50 shadow-sm">Step {idx + 1}</div>
                
                <div className={`p-3.5 bg-white border border-indigo-100 rounded-2xl inline-flex shadow-sm group-hover:scale-110 transition-transform duration-300 z-10 relative`}>
                  <div className="text-indigo-600">
                    {typeof step.icon === 'string' ? getIcon(step.icon, "w-6 h-6") : (step.icon || <CheckCircle2 className="w-6 h-6" />)}
                  </div>
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors z-10 relative pt-2">{step.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed font-medium z-10 relative">{step.description || step.desc}</p>
              </motion.div>
            ))}
          </motion.div>
          
          {/* Connector dots between steps (desktop only) */}
          <div className="hidden md:flex justify-center items-center gap-2 -mt-6">
            {[0,1,2,3,4].map(i => (
              <div key={i} className={`rounded-full ${i % 2 === 0 ? 'w-2 h-2 bg-indigo-200' : 'w-1 h-1 bg-slate-200'}`} />
            ))}
          </div>
        </div>
      </section>
      )}

      {/* ─────────────── FEATURES GRID ─────────────── */}
      {isSectionVisible('features') && (
      <section className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 border-y border-slate-200/50 relative z-10">
        <div className="max-w-5xl xl:max-w-7xl 2xl:max-w-360 mx-auto space-y-14">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">{getSectionData('features').subtitle || 'Comprehensive Toolkit'}</span>
            <h2 className="text-2xl md:text-4xl font-extrabold font-display text-slate-900 tracking-tight">{getSectionData('features').title || 'Everything You Need to Land the Interview'}</h2>
            <p className="text-slate-500 max-w-xl mx-auto">{getSectionData('features').description || 'Powerful AI-driven features designed to give you an unfair advantage in the modern job market.'}</p>
          </div>

          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 relative"
          >
            {/* Background 3D Orb for Features */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 glow-orb glow-orb-purple animate-float-slow -z-10 pointer-events-none opacity-30"></div>
            
            {(cms?.features?.length ? cms.features : [
              { icon: "Target", title: "Smart Keyword Matching", description: "Automatically identifies and maps critical keywords from job descriptions to your resume, highlighting gaps the ATS will penalize." },
              { icon: "BarChart3", title: "ATS Score Analysis", description: "Get an instant compatibility score with detailed breakdowns showing exactly what's working and what needs improvement." },
              { icon: "PenTool", title: "AI Bullet Rewrites", description: "Transform weak resume bullets into powerful, quantified achievement statements that pass ATS filters and impress recruiters." },
              { icon: "FileText", title: "Cover Letter Generator", description: "Generate personalized, role-specific cover letters that reference exact requirements from the job description." },
              { icon: "Brain", title: "Interview Preparation", description: "Receive predicted interview questions based on the role, plus AI-coached answers aligned with your experience." },
              { icon: "TrendingUp", title: "LinkedIn Optimization", description: "Align your LinkedIn headline, summary, and skills section with current recruiter search patterns and algorithms." }
            ]).map((feature: any, idx: number) => (
              <motion.div
                key={idx}
                variants={fadeInUp}
                whileHover={{ scale: 1.02, rotateY: 2, rotateX: 2 }}
                className="bg-white/80 backdrop-blur-xl border border-slate-200/60 p-6 rounded-3xl relative shadow-lg hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-200/60 transition-all duration-300 group z-10"
              >
                <div className="absolute inset-0 bg-linear-to-br from-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl pointer-events-none shadow-inner"></div>
                
                <div className="p-3 bg-white border border-slate-200/60 rounded-xl inline-flex mb-4 shadow-sm group-hover:scale-110 group-hover:shadow-indigo-500/20 group-hover:border-indigo-200 transition-all duration-300">
                  {feature.imageUrl ? (
                    <img src={feature.imageUrl} alt={feature.title} className="w-6 h-6 rounded object-cover" />
                  ) : (
                    getIcon(feature.icon || "CheckCircle2", "w-6 h-6 text-indigo-600")
                  )}
                </div>
                <h3 className="font-extrabold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors relative z-10">{feature.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed font-medium relative z-10">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
      )}

      {/* ─────────────── TESTIMONIALS ─────────────── */}
      {isSectionVisible('testimonials') && (
      <section className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-5xl xl:max-w-7xl 2xl:max-w-360 mx-auto space-y-14">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">{getSectionData('testimonials').subtitle || 'Trusted by Professionals'}</span>
            <h2 className="text-2xl md:text-4xl font-extrabold font-display text-slate-900 tracking-tight">{getSectionData('testimonials').title || 'Real Results from Real Job Seekers'}</h2>
            <p className="text-slate-500 max-w-lg mx-auto">{getSectionData('testimonials').description || `See how professionals across industries used ${companyName} to accelerate their career growth.`}</p>
          </div>

          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {(cms?.testimonials?.length ? cms.testimonials : testimonials).map((test: any, idx: number) => (
              <motion.div
                key={idx}
                variants={fadeInUp}
                whileHover={{ scale: 1.03, y: -5 }}
                className="bg-white/80 backdrop-blur-xl border border-slate-200/60 p-7 rounded-3xl space-y-5 flex flex-col justify-between shadow-lg hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-200/60 transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full z-0"></div>
                <div className="absolute -top-4 right-2 text-8xl font-serif text-slate-900/5 select-none pointer-events-none -rotate-12 group-hover:scale-110 transition-transform duration-500 z-0">"</div>
                
                <div className="space-y-4 relative z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1 text-amber-500">
                      {[...Array(test.rating || 5)].map((_, i) => (
                        <motion.div key={i} whileHover={{ scale: 1.2, rotate: 15 }}><Star className="w-4 h-4 fill-current drop-shadow-md" /></motion.div>
                      ))}
                    </div>
                    {(test.achievement) && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-white border border-emerald-100 px-2.5 py-1 rounded-full shadow-sm">{test.achievement}</span>
                    )}
                  </div>
                  <p className="text-[15px] text-slate-700 leading-relaxed font-semibold">"{test.description || test.quote}"</p>
                </div>
                <div className="pt-5 border-t border-slate-200/50 flex items-center gap-4 relative z-10">
                  {test.imageUrl ? (
                    <img src={test.imageUrl} alt={test.title || test.name} className="w-12 h-12 rounded-full object-cover bg-white p-0.5 ring-1 ring-slate-200 shadow-md" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-linear-to-br from-indigo-50 to-white text-indigo-600 border border-indigo-100 flex items-center justify-center shadow-sm">
                      <span className="font-black text-sm">{(test.title || test.name || '?')[0]}</span>
                    </div>
                  )}
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">{test.title || test.name}</h4>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{test.subtitle || test.role}{(test.company) ? ` at ${test.company}` : ''}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
      )}

      {/* ─────────────── PRICING ─────────────── */}
      {isSectionVisible('pricing') && (
      <section id="pricing" className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 border-y border-slate-200/50 relative z-10">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.06),transparent_70%)] pointer-events-none" />
        <div className="max-w-5xl xl:max-w-7xl 2xl:max-w-360 mx-auto space-y-12">
          <div className="text-center space-y-3 relative z-10">
            <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
              {getSectionData('pricing').subtitle || 'Transparent Pricing'}
            </span>
            <h2 className="text-2xl md:text-4xl font-extrabold font-display text-slate-900 tracking-tight">{getSectionData('pricing').title || 'Invest in Your Career Growth'}</h2>
            <p className="text-slate-500 max-w-xl mx-auto text-sm md:text-base">{getSectionData('pricing').description || 'Choose the plan that fits your job search stage. Upgrade or downgrade anytime.'}</p>
            
            {/* Billing Toggle */}
            <div className="inline-flex flex-col sm:flex-row items-center gap-3 p-1.5 bg-slate-100 border border-slate-200 rounded-2xl sm:rounded-full mt-4">
              <button
                onClick={() => setBillingPeriod("monthly")}
                className={`w-full sm:w-auto px-5 py-2 rounded-xl sm:rounded-full text-xs font-semibold transition-all cursor-pointer ${billingPeriod === "monthly" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:text-slate-800"}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod("annual")}
                className={`w-full sm:w-auto relative px-5 py-2 rounded-xl sm:rounded-full text-xs font-semibold transition-all cursor-pointer ${billingPeriod === "annual" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-800"}`}
              >
                Annual
                <span className="absolute -top-3 -right-3 sm:-top-6 sm:-right-6 px-1.5 py-0.5 bg-amber-500 text-[9px] font-extrabold text-white uppercase rounded shadow-sm tracking-wider">
                  Save ${faqSavings}
                </span>
              </button>
            </div>
          </div>

          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            className={`grid grid-cols-1 gap-8 ${plans.length === 1 ? 'md:grid-cols-1 max-w-md' : plans.length === 2 ? 'md:grid-cols-2 max-w-3xl' : 'md:grid-cols-3 max-w-5xl'} xl:max-w-7xl 2xl:max-w-360 mx-auto items-stretch`}
          >
            {plans.map((plan) => {
              const isActive = userPlan?.toLowerCase() === plan.slug.toLowerCase();
              const isFree = plan.monthlyPrice === 0;
              
              return (
                <motion.div
                  key={plan.id}
                  variants={fadeInUp}
                  whileHover={{ scale: !isFree ? 1.05 : 1.02, rotateY: !isFree ? -2 : 0 }}
                  className={`${!isFree ? 'bg-slate-900 text-white shadow-2xl shadow-indigo-900/40 z-20 ' : 'bg-white border-slate-200/60 text-slate-900 shadow-lg hover:shadow-xl hover:shadow-indigo-500/10'} ${plan.isRecommended ? 'scale-105 border-indigo-500 ring-4 ring-indigo-500/20' : 'scale-100 border-slate-800'} border rounded-3xl p-8 flex flex-col justify-between relative transition-all duration-300`}
                >
                  {plan.isRecommended ? (
                    <div className="absolute -top-4 right-6 bg-linear-to-r from-indigo-500 to-purple-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg border border-white/20 animate-bounce-slow">
                      Most Popular
                    </div>
                  ) : !isFree ? (
                    <div className="absolute -top-4 right-6 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg border border-indigo-500/20">
                      Premium
                    </div>
                  ) : null}

                  <div className="space-y-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className={`text-lg font-extrabold ${!isFree ? 'text-white' : 'text-slate-900'}`}>{plan.name}</h3>
                        <p className={`${!isFree ? 'text-slate-400' : 'text-slate-500'} text-xs mt-1`}>{plan.description}</p>
                      </div>
                      {isActive && (
                        <span className={`${!isFree ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'} text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm`}>
                          Active
                        </span>
                      )}
                    </div>

                    <div>
                      <span className={`text-4xl font-black ${!isFree ? 'text-white' : 'text-slate-900'}`}>
                        ${billingPeriod === "annual" ? plan.annualPrice : plan.monthlyPrice}
                      </span>
                      <span className={`${!isFree ? 'text-slate-400' : 'text-slate-500'} text-xs font-medium`}>
                        {isFree ? " / forever" : (billingPeriod === "annual" ? " / year" : " / month")}
                      </span>
                    </div>

                    <ul className={`space-y-3 pt-5 border-t ${!isFree ? 'border-slate-800 text-slate-300' : 'border-slate-100 text-slate-600'} text-sm`}>
                      {features.map((f: any) => {
                        const hasFeature = plan.features?.some((pf: any) => pf.featureId === f.id && pf.enabled);
                        return (
                          <li key={f.id} className={`flex gap-3 items-start ${!hasFeature ? 'opacity-40' : ''}`}>
                            {hasFeature ? (
                              <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${!isFree ? 'text-indigo-400' : 'text-indigo-600'}`} />
                            ) : (
                              <X className={`w-4 h-4 mt-0.5 shrink-0 ${!isFree ? 'text-slate-500' : 'text-slate-400'}`} />
                            )}
                            <span className={!hasFeature ? 'line-through font-medium' : 'font-semibold'}>{f.name}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <div className="pt-8">
                    {isActive ? (
                      <button
                        onClick={() => onNavigate("dashboard")}
                        className={`w-full py-3.5 font-bold text-xs rounded-xl text-center cursor-pointer transition-all shadow-sm ${!isFree ? 'bg-white text-slate-900 hover:bg-slate-100' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                      >
                        Go to Dashboard
                      </button>
                    ) : isFree ? (
                      <button
                        onClick={() => onNavigate("analyze")}
                        className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl text-center cursor-pointer transition-all shadow-sm"
                      >
                        Get Started Free
                      </button>
                    ) : (
                      <button
                        onClick={() => onUpgrade(plan.slug, billingPeriod)}
                        className="w-full py-3.5 bg-white text-slate-900 hover:bg-slate-100 font-black text-xs rounded-xl text-center cursor-pointer transition-all shadow-lg hover:shadow-xl inline-flex items-center justify-center gap-1.5"
                      >
                        <Star className="w-4 h-4 text-amber-500" /> Upgrade to {plan.name}
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Money-back guarantee */}
          <div className="border border-dashed border-slate-200 max-w-3xl xl:max-w-7xl 2xl:max-w-360 mx-auto rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-4 bg-white/60 justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-full">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">14-Day Money-Back Guarantee</h4>
                <p className="text-xs text-slate-500">Zero-risk career investment. Not satisfied? Full refund within 14 days, no questions asked.</p>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full whitespace-nowrap">
              100% Risk Free
            </span>
          </div>
        </div>
      </section>
      )}

      {/* ─────────────── PARTNERS / AUDIENCE ─────────────── */}
      {isSectionVisible('partners') && (
      <section className="py-10 md:py-16 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl xl:max-w-7xl 2xl:max-w-360 mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-5">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest block">{getSectionData('partners').subtitle || 'Who We Serve'}</span>
            <h2 className="text-2xl md:text-3xl font-extrabold font-display text-slate-900 tracking-tight leading-tight">{getSectionData('partners').title || 'Built for Every Career Stage'}</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              {getSectionData('partners').description || `Whether you're a fresh graduate entering the workforce, an experienced professional pivoting careers, or a senior leader seeking executive roles — ${companyName} adapts its AI analysis to your specific context and industry requirements.`}
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="text-xs font-bold bg-white text-slate-700 px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">Software Engineers</span>
              <span className="text-xs font-bold bg-white text-slate-700 px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">Product Managers</span>
              <span className="text-xs font-bold bg-white text-slate-700 px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">Data Scientists</span>
              <span className="text-xs font-bold bg-white text-slate-700 px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">Students</span>
              <span className="text-xs font-bold bg-white text-slate-700 px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">Designers</span>
              <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full border border-indigo-100 shadow-sm">+ All Industries</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(cms?.partners?.length ? cms.partners : [
                { title: 'Career Changers', websiteUrl: 'Transition confidently with AI-guided resume optimization.', icon: 'TrendingUp' },
                { title: 'Recent Graduates', websiteUrl: 'Stand out from thousands of applicants with ATS-perfect formatting.', icon: 'Award' },
                { title: 'Tech Professionals', websiteUrl: 'Match technical keywords that automated screening systems require.', icon: 'Laptop' },
                { title: 'Job Seekers Worldwide', websiteUrl: 'Optimize for global job markets and international companies.', icon: 'Users' }
            ]).map((partner: any, idx: number) => {
              const content = (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  whileHover={{ scale: 1.03, y: -4, rotateY: 2 }}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-200 transition-all duration-300 flex flex-col justify-between group"
                >
                  <div>
                    {partner.imageUrl ? (
                      <img src={partner.imageUrl} alt={partner.title} className="h-7 mb-4 object-contain group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl inline-flex mb-4 group-hover:scale-110 transition-transform shadow-sm">
                        {getIcon(partner.icon || 'Users', 'w-5 h-5 text-indigo-600')}
                      </div>
                    )}
                    <h4 className="font-extrabold text-slate-900 text-sm">{partner.title}</h4>
                    {partner.websiteUrl && <p className="text-xs text-slate-500 mt-2 leading-relaxed font-medium">{partner.websiteUrl}</p>}
                  </div>
                </motion.div>
              );
              return partner.websiteUrl?.startsWith('http') ? (
                <a key={idx} href={partner.websiteUrl} target="_blank" rel="noopener noreferrer" className="no-underline">{content}</a>
              ) : (
                <div key={idx}>{content}</div>
              );
            })}
          </div>
        </div>
      </section>
      )}

      {/* ─────────────── FAQ ─────────────── */}
      {isSectionVisible('faq') && (
      <section id="faq" className="py-10 md:py-16 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-3xl xl:max-w-7xl 2xl:max-w-360 mx-auto space-y-10">
          <div className="text-center space-y-3">
            <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-full inline-block">
              <HelpCircle className="w-5 h-5 text-indigo-600" />
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold font-display text-slate-900">{getSectionData('faq').title || 'Frequently Asked Questions'}</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">{getSectionData('faq').description || `Everything you need to know about ${companyName}. Can't find an answer? Reach out to our support team.`}</p>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {loadingFaqs ? (
              <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                <Icons.Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
                <span>Loading FAQs...</span>
              </div>
            ) : faqs.length === 0 ? (
              <div className="p-12 text-center text-slate-500 bg-white border border-slate-200 rounded-2xl shadow-sm">
                No featured FAQs available at the moment.
              </div>
            ) : faqs.map((faq, idx) => (
              <div key={idx} className={`bg-white border rounded-2xl transition-all duration-300 shadow-sm overflow-hidden ${activeFaq === idx ? "border-indigo-500 ring-4 ring-indigo-500/10 shadow-md" : "border-slate-200 hover:border-slate-300 hover:shadow-md"}`}>
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full text-left py-5 px-6 flex justify-between items-center bg-white transition-colors cursor-pointer group"
                >
                  <span className={`pr-4 text-sm md:text-base font-bold transition-colors ${activeFaq === idx ? "text-indigo-700" : "text-slate-900 group-hover:text-indigo-600"}`}>{faq.question}</span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${activeFaq === idx ? "bg-indigo-100" : "bg-slate-100 group-hover:bg-indigo-50"}`}>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${activeFaq === idx ? "rotate-180 text-indigo-600" : "text-slate-500 group-hover:text-indigo-500"}`} />
                  </div>
                </button>
                
                <AnimatePresence initial={false}>
                  {activeFaq === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="px-6 pb-6 pt-0 text-sm text-slate-500 leading-relaxed whitespace-pre-wrap">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* ─────────────── CTA BANNER ─────────────── */}
      {isSectionVisible('cta') && (
      <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl xl:max-w-7xl 2xl:max-w-360 mx-auto space-y-6">
          {(cms?.ctas?.length ? cms.ctas : [
              { title: "Ready to Land More Interviews?", description: "Join 50,000+ professionals who've already optimized their resumes with AI. Your first analysis is completely free.", buttonText: "Analyze My Resume — Free", buttonUrl: "" }
          ]).map((cta: any, idx: number) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02, rotateX: 2 }}
              className={`bg-slate-900 p-8 sm:p-12 md:p-16 rounded-[2.5rem] text-center space-y-6 relative overflow-hidden shadow-2xl shadow-indigo-900/20 transition-all duration-300 transform-style-3d border border-slate-800`}
            >
              {/* Background decoration */}
              <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-500/20 blur-[100px] rounded-full pointer-events-none" />
              
              <h3 className="text-3xl md:text-4xl font-extrabold text-white relative z-10 tracking-tight">{cta.title}</h3>
              <p className="text-indigo-100/80 text-[15px] max-w-lg mx-auto relative z-10 font-medium leading-relaxed">{cta.description}</p>
              <button
                onClick={() => cta.buttonUrl ? window.open(cta.buttonUrl) : onNavigate("analyze")}
                className="w-full sm:w-auto justify-center px-8 py-4 bg-white text-slate-900 hover:bg-indigo-50 hover:text-indigo-700 font-bold rounded-2xl text-sm transition-all shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.5)] hover:-translate-y-1 cursor-pointer inline-flex items-center gap-2 relative z-10 group"
              >
                <FileSearch className="w-4 h-4" /> {cta.buttonText}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          ))}
        </div>
      </section>
      )}

      {/* ─────────────── NEWSLETTER ─────────────── */}
      {isSectionVisible('newsletter') && cms?.newsletters?.isPublished !== false && (
        <section className="py-10 md:py-16 px-4 sm:px-6 lg:px-8 bg-slate-50 border-t border-slate-100">
          <div className="max-w-xl mx-auto text-center space-y-5">
            <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-full inline-block">
              <Mail className="w-5 h-5 text-indigo-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">{cms?.newsletters?.title || "Stay Ahead in Your Job Search"}</h3>
            <p className="text-sm text-slate-500">{cms?.newsletters?.subtitle || "Get weekly career tips, resume optimization strategies, and job market insights delivered to your inbox."}</p>
            <form className="relative flex items-center shadow-sm hover:shadow-md transition-shadow bg-white rounded-2xl border border-slate-200 p-1.5 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent" onSubmit={(e) => { e.preventDefault(); alert('Subscribed!')}}>
                <input type="email" placeholder="Enter your work email" required className="w-full pl-4 pr-32 py-3 bg-transparent border-none outline-none text-sm text-slate-900 placeholder:text-slate-400" />
                <button type="submit" className="absolute right-1.5 top-1.5 bottom-1.5 bg-slate-900 hover:bg-slate-800 text-white px-6 rounded-xl font-bold transition-all cursor-pointer text-xs flex items-center shadow-sm hover:shadow-md hover:-translate-y-0.5">{cms?.newsletters?.buttonText || "Subscribe"}</button>
            </form>
            <p className="text-[11px] text-slate-400">No spam, ever. Unsubscribe anytime. We respect your privacy.</p>
          </div>
        </section>
      )}
    </div>
  );
}
