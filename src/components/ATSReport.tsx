import React, { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle, AlertTriangle, AlertCircle, XCircle, 
  TrendingUp, BarChart2, Star, Target, Zap, Search, Layers, Sparkles, FileText, Download, Code, Briefcase, Activity, Terminal, Share2,
  Eye, ListChecks, ArrowUpRight, ChevronDown, ChevronUp, Shield, FileSearch, Hash, Type
} from 'lucide-react';
import { Scan, EngineResult, RuleFailure, BulletAnalysis, ChecklistItem, KeywordFrequency } from '../types';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface ATSReportProps {
  scan: Scan;
}

export default function ATSReport({ scan }: ATSReportProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  
  const handlePrint = useReactToPrint({
    contentRef: reportRef,
    documentTitle: scan?.jobTitle ? `${scan.jobTitle}-ATS-Report` : 'ATS-Report',
  });

  const fullResult = scan.fullResult || {};
  const auditTrace = scan.auditTrace || fullResult.auditTrace;
  const structuredResume = scan.structuredResume || fullResult.structuredResume || {};
  const structuredJD = scan.structuredJD || fullResult.structuredJD || {};
  const aiSuggestions = (scan as any).aiSuggestions || fullResult.aiSuggestions || {};
  const breakdown = scan.breakdown || fullResult.breakdown || {};
  const overallAssessment = scan.overallAssessment || fullResult.overallAssessment || {};

  const [activeTab, setActiveTab] = useState<'overview' | 'audit' | 'keywords' | 'bullets' | 'ai' | 'dev'>('overview');
  const [activeEngine, setActiveEngine] = useState<string | null>(null);
  const [checklistFilter, setChecklistFilter] = useState<'all' | 'fail' | 'pass'>('all');
  const [bulletFilter, setBulletFilter] = useState<'all' | 'Strong' | 'Needs Work' | 'Weak'>('all');
  const [expandedChecklist, setExpandedChecklist] = useState<Set<string>>(new Set());

  // Improvement Simulator State
  const [activeSimulations, setActiveSimulations] = useState<string[]>([]);

  // Extract new data with fallbacks
  const bulletAnalysis: BulletAnalysis[] = auditTrace?.bulletAnalysis || [];
  const checklistItems: ChecklistItem[] = auditTrace?.checklistItems || [];
  const keywordFrequency: KeywordFrequency[] = auditTrace?.keywordFrequency || [];
  const quantificationRate = auditTrace?.quantificationRate || { quantified: 0, total: 0, percentage: 0 };
  const parsabilityScore = auditTrace?.parsabilityScore ?? 0;
  const contentMatchScore = auditTrace?.contentMatchScore ?? 0;
  const resumeWordCount = auditTrace?.resumeWordCount || 0;
  const recommendedWordRange = auditTrace?.recommendedWordRange || [400, 800];

  // Calculate simulated engines dynamically
  const simulatedEngines = React.useMemo(() => {
    if (!auditTrace) return [];
    
    return auditTrace.engines.map((engine: any) => {
      const activeDeductions = engine.failedRules.reduce((acc: number, rule: any) => {
        const simKey = `${engine.engineName}-${rule.ruleName}-${rule.reason}`;
        if (activeSimulations.includes(simKey)) return acc; // Simulated as fixed
        return acc + rule.deduction;
      }, 0);
      
      let simulatedScore = engine.maxScore - activeDeductions;
      
      // Prevent the simulated score from being lower than the actual engine score (due to internal engine sub-floors)
      simulatedScore = Math.max(engine.score, simulatedScore);
      
      return {
        ...engine,
        score: Math.min(engine.maxScore, simulatedScore)
      };
    });
  }, [auditTrace, activeSimulations]);

  const simulatedOverallScore = React.useMemo(() => {
    if (!simulatedEngines.length) return auditTrace?.overallScore || 0;
    const totalScore = simulatedEngines.reduce((acc: number, engine: any) => acc + engine.score, 0);
    return Math.min(100, Math.max(0, Math.round(totalScore)));
  }, [simulatedEngines, auditTrace?.overallScore]);

  const simulatedBreakdown = React.useMemo(() => {
    if (!simulatedEngines.length) return breakdown;
    
    const formatEngine = simulatedEngines.find((e: any) => e.engineName === "Formatting") || { score: 0, maxScore: 15 };
    const keywordEngine = simulatedEngines.find((e: any) => e.engineName === "Keywords & JD Match") || { score: 0, maxScore: 40 };
    const expEngine = simulatedEngines.find((e: any) => e.engineName === "Experience") || { score: 0, maxScore: 20 };
    
    return {
      keywords: keywordEngine.maxScore ? Math.round((keywordEngine.score / keywordEngine.maxScore) * 100) : 0,
      format: formatEngine.maxScore ? Math.round((formatEngine.score / formatEngine.maxScore) * 100) : 0,
      experience: expEngine.maxScore ? Math.round((expEngine.score / expEngine.maxScore) * 100) : 0
    };
  }, [simulatedEngines, breakdown]);

  useEffect(() => {
    setActiveSimulations([]);
  }, [auditTrace?.overallScore]);

  if (!auditTrace) {
    return (
      <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200 text-center">
        <h3 className="text-lg font-bold text-slate-800">Legacy Scan Detected</h3>
        <p className="text-slate-500 mt-2 text-sm">This scan was processed before the ATS Engine v4 upgrade. Detailed audit traces are not available.</p>
      </div>
    );
  }

  const toggleSimulation = (rule: RuleFailure, engine: EngineResult) => {
    const simKey = `${engine.engineName}-${rule.ruleName}-${rule.reason}`;
    setActiveSimulations(prev => 
      prev.includes(simKey) ? prev.filter(k => k !== simKey) : [...prev, simKey]
    );
  };

  const getSeverityIcon = (deduction: number) => {
    if (deduction >= 5) return <XCircle className="w-5 h-5 text-red-500" />;
    if (deduction >= 3) return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    return <AlertCircle className="w-5 h-5 text-orange-400" />;
  };

  const getScoreColor = (score: number, max: number) => {
    const pct = (score / max) * 100;
    if (pct >= 85) return "bg-emerald-500";
    if (pct >= 60) return "bg-amber-400";
    return "bg-red-500";
  };

  const getScoreTextColor = (score: number, max: number) => {
    const pct = (score / max) * 100;
    if (pct >= 85) return "text-emerald-600";
    if (pct >= 60) return "text-amber-600";
    return "text-red-600";
  };

  const getBulletGradeColor = (grade: string) => {
    if (grade === "Strong") return { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", badge: "bg-emerald-100 text-emerald-800" };
    if (grade === "Weak") return { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", badge: "bg-red-100 text-red-800" };
    return { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", badge: "bg-amber-100 text-amber-800" };
  };

  // Charts Data Preparation
  const radarData = simulatedEngines.filter((e: any) => e.maxScore > 0).map((e: any) => ({
    subject: e.engineName.split(' ')[0],
    A: Math.round((e.score / e.maxScore) * 100),
    fullMark: 100,
  }));

  const waterfallData = simulatedEngines.map((e: any) => ({
    name: e.engineName,
    Deductions: e.failedRules.reduce((acc: number, rule: any) => {
      const simKey = `${e.engineName}-${rule.ruleName}-${rule.reason}`;
      return acc + (activeSimulations.includes(simKey) ? 0 : rule.deduction);
    }, 0)
  })).filter((d: any) => d.Deductions > 0);

  // Checklist stats
  const passedChecks = checklistItems.filter(c => c.status === 'pass').length;
  const failedChecks = checklistItems.filter(c => c.status === 'fail').length;
  const warningChecks = checklistItems.filter(c => c.status === 'warning').length;
  const totalChecks = checklistItems.length;

  // Bullet stats
  const strongBullets = bulletAnalysis.filter(b => b.grade === "Strong").length;
  const weakBullets = bulletAnalysis.filter(b => b.grade === "Weak").length;
  const needsWorkBullets = bulletAnalysis.filter(b => b.grade === "Needs Work").length;

  // Filtered bullets
  const filteredBullets = bulletFilter === 'all' ? bulletAnalysis : bulletAnalysis.filter(b => b.grade === bulletFilter);

  // Filtered checklist
  const filteredChecklist = checklistFilter === 'all' ? checklistItems : checklistItems.filter(c => checklistFilter === 'fail' ? (c.status === 'fail' || c.status === 'warning') : c.status === 'pass');

  // Tier score ring component
  const TierRing = ({ score, label, size = 100, color }: { score: number; label: string; size?: number; color: string }) => {
    const r = (size - 12) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (score / 100) * circ;
    return (
      <div className="flex flex-col items-center gap-2">
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="8" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
        </svg>
        <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
          <span className="text-xl font-black text-slate-900">{score}%</span>
        </div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</p>
      </div>
    );
  };

  const TABS = [
    { id: 'overview', label: 'Executive Dashboard', icon: <BarChart2 className="w-4 h-4" /> },
    { id: 'audit', label: 'Engine Audit Trace', icon: <Layers className="w-4 h-4" /> },
    { id: 'keywords', label: 'Keyword Intelligence', icon: <Search className="w-4 h-4" /> },
    { id: 'bullets', label: 'Line-by-Line', icon: <ListChecks className="w-4 h-4" /> },
    { id: 'ai', label: 'AI Rewrites', icon: <Sparkles className="w-4 h-4" /> }
  ];

  return (
    <div ref={reportRef} className="space-y-6 animate-fade-in w-full">
      {/* Enterprise Tabs Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sticky top-0 z-20 print:hidden bg-white/95 backdrop-blur -mx-4 px-4 py-4 md:-mx-6 md:px-6 border-b border-slate-100 shadow-sm">
        <div className="flex overflow-x-auto custom-scrollbar gap-2 bg-white p-1 md:p-2 rounded-2xl border border-slate-200 shadow-sm w-full md:w-auto min-w-0">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-xl font-bold text-xs md:text-sm whitespace-nowrap transition-all ${
                activeTab === tab.id 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
           <button onClick={() => handlePrint()} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 transition shadow-sm">
             <Download className="w-4 h-4" /> Download Report
           </button>
           <button onClick={() => {
              if (navigator.share) {
                 navigator.share({ title: 'ATS Report', url: window.location.href });
              } else {
                 navigator.clipboard.writeText(window.location.href);
                 alert('Link copied to clipboard!');
              }
           }} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 transition shadow-sm">
             <Share2 className="w-4 h-4" /> Share
           </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ==================== OVERVIEW TAB ==================== */}
        {activeTab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
            
            {/* Header section inside Overview */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-8 bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 rounded-full border border-indigo-150 mb-2">
                      <Activity className="w-3.5 h-3.5" /> ATS Engine v{(scan as any).engineVersion || '4.0'}
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Deterministic Match Score</h2>
                    <p className="text-slate-500 text-sm">Calculated mathematically from {auditTrace.engines.length} rule engines without AI hallucination.</p>
                  </div>
                </div>

                {/* Two-Tier Score Rings */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8 my-8">
                  <div className="relative">
                    <TierRing score={simulatedOverallScore} label="Overall" size={120} color="#4f46e5" />
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <TierRing score={parsabilityScore} label="Parsability" size={96} color="#10b981" />
                    </div>
                    <div className="relative">
                      <TierRing score={contentMatchScore} label="Content Match" size={96} color="#f59e0b" />
                    </div>
                  </div>
                </div>

                {/* Quick stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                  {[
                    { label: "Checks Passed", val: `${passedChecks}/${totalChecks}`, color: passedChecks / totalChecks >= 0.7 ? "text-emerald-600" : "text-amber-600" },
                    { label: "Keywords", val: `${simulatedBreakdown.keywords || 0}%`, color: getScoreTextColor(simulatedBreakdown.keywords || 0, 100) },
                    { label: "Quantified", val: `${quantificationRate.percentage}%`, color: quantificationRate.percentage >= 30 ? "text-emerald-600" : "text-red-600" },
                    { label: "Word Count", val: `${resumeWordCount}`, color: resumeWordCount >= recommendedWordRange[0] && resumeWordCount <= recommendedWordRange[1] ? "text-emerald-600" : "text-amber-600" }
                  ].map((stat, i) => (
                    <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">{stat.label}</p>
                      <p className={`text-2xl font-black ${stat.color}`}>{stat.val}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="md:col-span-4 bg-linear-to-br from-indigo-900 to-slate-900 p-6 md:p-8 rounded-3xl text-white shadow-xl flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Target className="w-32 h-32" /></div>
                <div className="relative z-10">
                  <h3 className="text-lg font-black text-indigo-100 mb-2">Recruiter Perspective</h3>
                  <div className="flex gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star key={star} className={`w-6 h-6 ${star <= (overallAssessment.recruiterStars || 3) ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />
                    ))}
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10 mb-4">
                    <p className="text-sm font-medium text-indigo-100">Probability of Interview</p>
                    <p className="text-2xl font-black text-white mt-1">{overallAssessment.hiringProbability || "Borderline"}</p>
                  </div>

                  {/* Quantification Gauge */}
                  <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                    <p className="text-sm font-medium text-indigo-100 mb-2">Bullet Quantification</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-400 transition-all duration-500" style={{ width: `${quantificationRate.percentage}%` }} />
                      </div>
                      <span className="text-sm font-black text-white">{quantificationRate.quantified}/{quantificationRate.total}</span>
                    </div>
                    <p className="text-[10px] text-indigo-200 mt-1">{quantificationRate.percentage >= 30 ? "Good quantification rate" : "Add more numbers to your bullets"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts & Visualizations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-[400px] flex flex-col">
                  <h3 className="font-bold text-slate-900 mb-6">Engine Performance Radar</h3>
                  <div className="flex-1 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 'bold' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name="Score" dataKey="A" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.5} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
               </div>

               <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-[400px] flex flex-col">
                  <h3 className="font-bold text-slate-900 mb-6">Deduction Waterfall</h3>
                  <div className="flex-1 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={waterfallData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} interval={0} angle={-45} textAnchor="end" height={60} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                        <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="Deductions" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
               </div>
            </div>

            {/* Resume Overview Metadata */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-indigo-600" /> Resume Overview</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Candidate Name</p>
                    <p className="font-semibold text-slate-800 text-sm truncate">{structuredResume.personalInfo?.name || [structuredResume.personalInfo?.firstName, structuredResume.personalInfo?.lastName].filter(Boolean).join(' ') || 'Unknown'}</p>
                 </div>
                 <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Target Role</p>
                    <p className="font-semibold text-slate-800 text-sm truncate">{structuredJD.title || 'Unknown'}</p>
                 </div>
                 <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Word Count</p>
                    <p className="font-semibold text-slate-800 text-sm truncate">{resumeWordCount} <span className="text-[10px] text-slate-400">({recommendedWordRange[0]}-{recommendedWordRange[1]} rec.)</span></p>
                 </div>
                 <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Email Found</p>
                    <p className="font-semibold text-slate-800 text-sm truncate">{structuredResume.personalInfo?.email || 'Missing'}</p>
                 </div>
              </div>
            </div>

          </motion.div>
        )}

        {/* ==================== AUDIT TAB ==================== */}
        {activeTab === 'audit' && (
          <motion.div key="audit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
             
            {/* Simulator Panel */}
            <div className="bg-indigo-600 p-6 rounded-3xl text-white shadow-md flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div>
                <h4 className="font-bold flex items-center gap-2 text-lg">
                  <Zap className="w-5 h-5 text-indigo-200 fill-indigo-200" />
                  Improvement Simulator Active
                </h4>
                <p className="text-indigo-100 text-sm mt-1 leading-relaxed max-w-xl">
                  Click on any red rule failure below to simulate fixing it. Watch your deterministic ATS score recalculate instantly.
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1">Simulated Score</p>
                <p className="text-4xl font-black text-white">{simulatedOverallScore}<span className="text-xl text-indigo-300">/100</span></p>
              </div>
            </div>

            {/* Section Completeness Checklist */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <ListChecks className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-lg font-black text-slate-900">Resume Checklist</h3>
                  <span className="text-xs font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-600">{passedChecks}/{totalChecks} passed</span>
                </div>
                <div className="flex gap-2">
                  {(['all', 'fail', 'pass'] as const).map(f => (
                    <button key={f} onClick={() => setChecklistFilter(f)} className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${checklistFilter === f ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
                      {f === 'all' ? `All (${totalChecks})` : f === 'fail' ? `Issues (${failedChecks + warningChecks})` : `Passed (${passedChecks})`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grouped by category */}
              {(['Parsability', 'Content', 'Keywords', 'Writing Quality', 'Structure'] as const).map(category => {
                const items = filteredChecklist.filter(c => c.category === category);
                if (items.length === 0) return null;
                return (
                  <div key={category} className="mb-4">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2 px-1">{category}</p>
                    <div className="space-y-1">
                      {items.map(item => (
                        <div
                          key={item.id}
                          onClick={() => {
                            setExpandedChecklist(prev => {
                              const next = new Set(prev);
                              next.has(item.id) ? next.delete(item.id) : next.add(item.id);
                              return next;
                            });
                          }}
                          className={`flex items-start gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all hover:bg-slate-50 ${expandedChecklist.has(item.id) ? 'bg-slate-50' : ''}`}
                        >
                          {item.status === 'pass' && <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />}
                          {item.status === 'fail' && <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />}
                          {item.status === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold ${item.status === 'pass' ? 'text-slate-600' : 'text-slate-800'}`}>{item.label}</p>
                            {expandedChecklist.has(item.id) && item.detail && (
                              <div className="mt-2 space-y-1">
                                <p className="text-xs text-slate-500">{item.detail}</p>
                                {item.suggestedFix && <p className="text-xs text-indigo-600 font-medium">💡 {item.suggestedFix}</p>}
                              </div>
                            )}
                          </div>
                          {item.deduction > 0 && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-red-100 text-red-600 shrink-0">-{item.deduction}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Priority Roadmap */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <Target className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-black text-slate-900">Priority Roadmap (Highest ROI Fixes)</h3>
              </div>
              
              <div className="space-y-4">
                {auditTrace.engines
                  .flatMap((e: any) => e.failedRules.map((r: any) => ({ ...r, engineName: e.engineName })))
                  .sort((a: any, b: any) => b.deduction - a.deduction)
                  .map((issue: any, idx: number) => {
                    const simKey = `${issue.engineName}-${issue.ruleName}-${issue.reason}`;
                    const isSim = activeSimulations.includes(simKey);
                    return (
                      <div 
                        key={idx} 
                        onClick={() => toggleSimulation(issue, { engineName: issue.engineName } as EngineResult)}
                        className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${isSim ? 'bg-emerald-50 border-emerald-200 opacity-60' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}
                      >
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold shrink-0 ${isSim ? 'bg-emerald-200 text-emerald-800' : 'bg-red-100 text-red-700'}`}>
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className={`font-bold text-sm ${isSim ? 'line-through text-slate-500' : 'text-slate-800'}`}>{issue.ruleName} <span className="text-xs font-normal text-slate-400">({issue.engineName})</span></h4>
                          <p className="text-xs text-slate-500 mt-0.5">{issue.reason}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-xs font-black px-2 py-1 rounded-md ${isSim ? 'text-emerald-700 bg-emerald-100' : 'text-red-600 bg-red-100'}`}>
                            +{issue.deduction} pts
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Engine Report Grid */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2"><Layers className="w-5 h-5 text-indigo-600" /> All Engine Evaluations</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {simulatedEngines.filter((e: any) => e.maxScore > 0).map((engine: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setActiveEngine(activeEngine === engine.engineName ? null : engine.engineName)}
                    className={`text-left p-4 rounded-2xl border transition-all ${
                      activeEngine === engine.engineName 
                        ? "border-indigo-500 bg-indigo-50/30 shadow-md ring-2 ring-indigo-100" 
                        : "border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-slate-700 text-sm">{engine.engineName}</span>
                      <span className={`text-xs font-bold ${getScoreTextColor(engine.score, engine.maxScore)}`}>
                        {engine.score} / {engine.maxScore}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden mb-3">
                      <div 
                        className={`h-full rounded-full ${getScoreColor(engine.score, engine.maxScore)}`} 
                        style={{ width: `${engine.maxScore > 0 ? (engine.score / engine.maxScore) * 100 : 100}%` }}
                      />
                    </div>
                    <div className="flex gap-2">
                      {engine.failedRules.length > 0 ? (
                        <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> {engine.failedRules.length} Issues
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Perfect
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Drilldown Trace */}
            <AnimatePresence mode="wait">
              {activeEngine && (
                <motion.div
                  key={activeEngine}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-white rounded-3xl border border-indigo-200 p-6 shadow-sm space-y-6">
                    {(() => {
                      const engine = auditTrace.engines.find((e: any) => e.engineName === activeEngine);
                      if (!engine) return null;
                      return (
                        <>
                          <div>
                            <h3 className="text-xl font-black text-indigo-950 flex items-center gap-2">
                              <Search className="w-5 h-5 text-indigo-600" />
                              {engine.engineName} Audit Trace
                            </h3>
                            <p className="text-slate-500 text-xs mt-1">Detailed deterministic evaluation.</p>
                          </div>

                          {engine.failedRules.length > 0 && (
                            <div className="space-y-3">
                              <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-500" /> Rule Failures
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {engine.failedRules.map((rule: any, idx: number) => {
                                  const simKey = `${engine.engineName}-${rule.ruleName}-${rule.reason}`;
                                  const isSimulating = activeSimulations.includes(simKey);
                                  return (
                                    <div 
                                      key={idx} 
                                      onClick={() => toggleSimulation(rule, engine)}
                                      className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                                        isSimulating 
                                          ? "bg-emerald-50 border-emerald-200" 
                                          : "bg-red-50/30 border-red-100 hover:border-red-200 hover:bg-red-50/50"
                                      }`}
                                    >
                                      {isSimulating && (
                                        <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-bold px-2 py-1 rounded-bl-lg">
                                          FIX SIMULATED
                                        </div>
                                      )}
                                      <div className="flex gap-3">
                                        <div className="shrink-0 mt-0.5">
                                          {isSimulating ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : getSeverityIcon(rule.deduction)}
                                        </div>
                                        <div className="space-y-1 w-full">
                                          <div className="flex justify-between items-start">
                                            <h5 className={`font-bold text-sm ${isSimulating ? 'text-emerald-800 line-through opacity-70' : 'text-slate-900'}`}>
                                              {rule.ruleName}
                                            </h5>
                                            <span className={`text-xs font-black px-2 py-0.5 rounded-full ${isSimulating ? 'text-emerald-600 bg-emerald-100/50' : 'text-red-600 bg-red-100'}`}>
                                              -{rule.deduction} pts
                                            </span>
                                          </div>
                                          <p className={`text-xs font-medium ${isSimulating ? 'text-emerald-600/70' : 'text-slate-700'}`}>{rule.reason}</p>
                                          
                                          {rule.evidence && !isSimulating && (
                                            <div className="mt-2 text-[10px] text-slate-500 bg-white/50 p-1.5 rounded border border-slate-100">
                                              <span className="font-bold">Evidence:</span> {rule.evidence}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {engine.passedRules.length > 0 && (
                            <div className="space-y-3 pt-4 border-t border-slate-100">
                              <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-emerald-500" /> Passed Rules
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {engine.passedRules.map((rule: string, idx: number) => (
                                  <span key={idx} className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> {rule}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ==================== KEYWORDS TAB ==================== */}
        {activeTab === 'keywords' && (
          <motion.div key="keywords" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
            
            {/* Keyword Frequency Table */}
            {keywordFrequency.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <Hash className="w-5 h-5 text-indigo-600" /> Keyword Frequency Analysis
                </h3>
                <p className="text-slate-500 text-xs mb-6">Shows how many times each keyword appears in the JD vs. your resume.</p>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left py-3 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Keyword</th>
                        <th className="text-center py-3 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Type</th>
                        <th className="text-center py-3 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">JD Count</th>
                        <th className="text-center py-3 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Resume Count</th>
                        <th className="text-center py-3 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Found In</th>
                        <th className="text-center py-3 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {keywordFrequency.map((kf, idx) => (
                        <tr key={idx} className="border-b border-slate-50 hover:bg-slate-25 transition-colors">
                          <td className="py-3 px-3 font-semibold text-slate-800">{kf.keyword}</td>
                          <td className="py-3 px-3 text-center">
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                              kf.type === 'Hard Skill' ? 'bg-blue-100 text-blue-700' :
                              kf.type === 'Soft Skill' ? 'bg-purple-100 text-purple-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>{kf.type}</span>
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-slate-500">{kf.jdCount}</td>
                          <td className="py-3 px-3 text-center font-bold">
                            <span className={kf.resumeCount === 0 ? 'text-red-600' : kf.resumeCount >= kf.jdCount ? 'text-emerald-600' : 'text-amber-600'}>
                              {kf.resumeCount}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex flex-wrap gap-1 justify-center">
                              {kf.foundIn.length > 0 ? kf.foundIn.map((loc, i) => (
                                <span key={i} className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{loc}</span>
                              )) : <span className="text-[9px] text-red-400">—</span>}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {kf.status === 'matched' && <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" />}
                            {kf.status === 'partial' && <AlertTriangle className="w-4 h-4 text-amber-500 mx-auto" />}
                            {kf.status === 'missing' && <XCircle className="w-4 h-4 text-red-500 mx-auto" />}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Matched vs Missing Skills */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="bg-white p-6 rounded-3xl border border-emerald-200 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                     <CheckCircle className="w-5 h-5 text-emerald-500" /> Matched Required Skills
                  </h3>
                  <div className="flex flex-wrap gap-2">
                     {(scan.matchedKeywords || []).map((kw: any, i: number) => {
                        const keyword = typeof kw === 'string' ? kw : kw.keyword;
                        return (
                           <div key={i} className="px-3 py-1.5 bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm font-bold rounded-xl flex items-center gap-1.5">
                              {keyword}
                           </div>
                        )
                     })}
                     {(!scan.matchedKeywords || scan.matchedKeywords.length === 0) && (
                        <p className="text-slate-400 text-sm">No exact keyword matches found.</p>
                     )}
                  </div>
               </div>

               <div className="bg-white p-6 rounded-3xl border border-red-200 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                     <XCircle className="w-5 h-5 text-red-500" /> Missing Critical Skills
                  </h3>
                  <div className="flex flex-wrap gap-2">
                     {(scan.missingKeywords || []).map((kw: any, i: number) => {
                        const keyword = typeof kw === 'string' ? kw : kw.keyword;
                        return (
                           <div key={i} className="px-3 py-1.5 bg-red-50 border border-red-100 text-red-800 text-sm font-bold rounded-xl flex items-center gap-1.5">
                              {keyword}
                           </div>
                        )
                     })}
                     {(!scan.missingKeywords || scan.missingKeywords.length === 0) && (
                        <p className="text-slate-400 text-sm">No missing keywords! Perfect match.</p>
                     )}
                  </div>
               </div>
            </div>

          </motion.div>
        )}

        {/* ==================== LINE-BY-LINE BULLETS TAB ==================== */}
        {activeTab === 'bullets' && (
          <motion.div key="bullets" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
            
            {/* Bullet Summary Header */}
            <div className="bg-linear-to-r from-indigo-50 to-purple-50 p-6 rounded-3xl border border-indigo-200 shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-xl font-black text-indigo-900 flex items-center gap-2 mb-1">
                    <Eye className="w-6 h-6 text-indigo-600" /> Line-by-Line Bullet Analysis
                  </h3>
                  <p className="text-indigo-700 text-sm">Every bullet point scored individually for impact, metrics, and JD relevance.</p>
                </div>
                <div className="flex gap-3">
                  <div className="text-center px-3 py-1.5 bg-emerald-100 rounded-xl">
                    <p className="text-lg font-black text-emerald-700">{strongBullets}</p>
                    <p className="text-[10px] font-bold text-emerald-600">Strong</p>
                  </div>
                  <div className="text-center px-3 py-1.5 bg-amber-100 rounded-xl">
                    <p className="text-lg font-black text-amber-700">{needsWorkBullets}</p>
                    <p className="text-[10px] font-bold text-amber-600">Needs Work</p>
                  </div>
                  <div className="text-center px-3 py-1.5 bg-red-100 rounded-xl">
                    <p className="text-lg font-black text-red-700">{weakBullets}</p>
                    <p className="text-[10px] font-bold text-red-600">Weak</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-2">
              {(['all', 'Weak', 'Needs Work', 'Strong'] as const).map(f => (
                <button key={f} onClick={() => setBulletFilter(f)} className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${bulletFilter === f ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
                  {f === 'all' ? `All (${bulletAnalysis.length})` : `${f} (${bulletAnalysis.filter(b => b.grade === f).length})`}
                </button>
              ))}
            </div>

            {/* Bullet Cards */}
            <div className="space-y-4">
              {filteredBullets.length === 0 ? (
                <div className="text-center p-8 bg-slate-50 rounded-2xl border border-slate-200">
                  <p className="text-slate-500">No bullets found{bulletFilter !== 'all' ? ` with grade "${bulletFilter}"` : ''}. Run a new scan to generate bullet analysis.</p>
                </div>
              ) : (
                filteredBullets.map((bullet, idx) => {
                  const colors = getBulletGradeColor(bullet.grade);
                  return (
                    <div key={idx} className={`p-5 rounded-2xl border ${colors.border} ${colors.bg} transition-all`}>
                      <div className="flex justify-between items-start gap-3 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${colors.badge}`}>{bullet.grade}</span>
                            <span className="text-[10px] text-slate-400 font-medium">{bullet.section} • {bullet.role}</span>
                          </div>
                          <p className="text-sm text-slate-800 leading-relaxed">"{bullet.text}"</p>
                        </div>
                        <div className="text-center shrink-0">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black ${
                            bullet.score >= 70 ? 'bg-emerald-100 text-emerald-700' :
                            bullet.score >= 40 ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {bullet.score}
                          </div>
                        </div>
                      </div>

                      {/* Metrics Row */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                          bullet.actionVerb.strength === 'Strong' ? 'bg-emerald-100 text-emerald-700' :
                          bullet.actionVerb.strength === 'Weak' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          <Type className="w-3 h-3 inline mr-0.5" /> {bullet.actionVerb.word} ({bullet.actionVerb.strength})
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${bullet.hasMetrics ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          <Hash className="w-3 h-3 inline mr-0.5" /> {bullet.hasMetrics ? `Metrics: ${bullet.metricSnippet}` : 'No Metrics'}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                          bullet.jdRelevance >= 40 ? 'bg-emerald-100 text-emerald-700' :
                          bullet.jdRelevance > 0 ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          <Target className="w-3 h-3 inline mr-0.5" /> JD Relevance: {bullet.jdRelevance}%
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                          bullet.length === 'Good' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {bullet.length}
                        </span>
                      </div>

                      {/* Issues & Fix */}
                      {bullet.issues.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {bullet.issues.map((issue, i) => (
                            <p key={i} className="text-xs text-slate-600 flex items-center gap-1.5">
                              <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" /> {issue}
                            </p>
                          ))}
                        </div>
                      )}
                      {bullet.suggestedFix && (
                        <div className="mt-3 p-3 bg-white/80 rounded-xl border border-indigo-100">
                          <p className="text-xs text-indigo-700 font-medium flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" /> {bullet.suggestedFix}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}

        {/* ==================== AI REWRITES TAB ==================== */}
        {activeTab === 'ai' && (
          <motion.div key="ai" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
            
            <div className="bg-linear-to-r from-indigo-50 to-purple-50 p-6 rounded-3xl border border-indigo-200 shadow-sm">
              <h3 className="text-xl font-black text-indigo-900 flex items-center gap-2 mb-2">
                <Sparkles className="w-6 h-6 text-indigo-600" /> AI Rewrite Suggestions
              </h3>
              <p className="text-indigo-700 text-sm">Generated securely based on your deterministic rule failures.</p>
            </div>

            {/* Bullet Rewrites */}
            {aiSuggestions.bulletRewrites && aiSuggestions.bulletRewrites.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-bold text-slate-800 text-lg">Bullet Point Enhancements</h4>
                {aiSuggestions.bulletRewrites.map((rewrite: any, i: number) => (
                  <div key={i} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                    <p className="text-[10px] uppercase font-bold text-indigo-600 mb-3 tracking-wider bg-indigo-50 inline-block px-2 py-1 rounded-md">Section: {rewrite.section}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-red-50/50 border border-red-100 rounded-2xl">
                        <p className="text-xs font-bold text-red-600 mb-2 uppercase tracking-wider">Before (Original)</p>
                        <p className="text-sm text-slate-700">{rewrite.originalText}</p>
                      </div>
                      <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl relative">
                         <Sparkles className="w-4 h-4 text-emerald-500 absolute top-4 right-4" />
                        <p className="text-xs font-bold text-emerald-600 mb-2 uppercase tracking-wider">After (Optimized)</p>
                        <p className="text-sm text-slate-800 font-medium">{rewrite.rewrittenText}</p>
                      </div>
                    </div>
                    
                    <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-xs font-bold text-slate-800 mb-1">Why this is better:</p>
                      <p className="text-xs text-slate-600">{rewrite.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Section Analysis */}
            {aiSuggestions.sectionAnalysis && aiSuggestions.sectionAnalysis.length > 0 && (
               <div className="space-y-4 pt-6 border-t border-slate-200">
                  <h4 className="font-bold text-slate-800 text-lg">Section-by-Section Feedback</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {aiSuggestions.sectionAnalysis.map((sec: any, i: number) => (
                        <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                           <div className="flex justify-between items-start mb-2">
                              <h5 className="font-bold text-slate-900">{sec.sectionName}</h5>
                              <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase ${sec.priority === 'High' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{sec.priority} Priority</span>
                           </div>
                           <p className="text-sm text-slate-600">{sec.feedback}</p>
                        </div>
                     ))}
                  </div>
               </div>
            )}

          </motion.div>
        )}


      </AnimatePresence>

    </div>
  );
}
