import SEOMeta from '../components/SEOMeta';
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, FileText, Share2, Clipboard, HeartHandshake, CheckCircle2, 
  Send, RefreshCw, Star, Info, HelpCircle, Loader2, AlertCircle, Download
} from "lucide-react";
import { Scan, User, CoverLetter } from "../types";
import { exportToPDF, exportToDOCX } from "../utils/exportUtils";
import apiClient from "../lib/apiClient";
import { useToast } from "../contexts/ToastContext";
import { useFeedback } from "../contexts/FeedbackContext";

interface AIToolsPageProps {
  currentUser: User;
  activeScan: Scan | null;
  onUpgrade: () => void;
}

export default function AIToolsPage({ currentUser, activeScan, onUpgrade }: AIToolsPageProps) {
  const toast = useToast();
  const { showFeedback } = useFeedback();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<"bullet" | "cover" | "linkedin" | "interview">("bullet");

  // Read tab from URL parameter on mount
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && ["bullet", "cover", "linkedin", "interview"].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [searchParams]);

  // States: Bullet Rewriter
  const [inputBullet, setInputBullet] = useState("Responsible for managing daily reports and writing some client code");
  const [bulletTone, setBulletTone] = useState("Strongly quantitative");
  const [bulletResults, setBulletResults] = useState<any[]>([]);
  const [bulletLoading, setBulletLoading] = useState(false);

  // States: Cover Letter
  const [clBackground, setClBackground] = useState("");
  const [clJobTitle, setClJobTitle] = useState("");
  const [clTone, setClTone] = useState("Professional and confident");
  const [clOutput, setClOutput] = useState<CoverLetter | null>(null);
  const [clLoading, setClLoading] = useState(false);

  // States: LinkedIn
  const [liBackground, setLiBackground] = useState("");
  const [liOutput, setLiOutput] = useState<any>(null);
  const [liLoading, setLiLoading] = useState(false);

  // States: Interview Prep
  const [ipBackground, setIpBackground] = useState("");
  const [ipJobDescription, setIpJobDescription] = useState("");
  const [ipQuestions, setIpQuestions] = useState<any[]>([]);
  const [ipRedFlags, setIpRedFlags] = useState<any[]>([]);
  const [ipQuestionsToAsk, setIpQuestionsToAsk] = useState<string[]>([]);
  const [ipPreparationPlan, setIpPreparationPlan] = useState<any[]>([]);
  const [ipLoading, setIpLoading] = useState(false);

  const [copiedText, setCopiedText] = useState("");

  // Pre-populate filters based on Active Scan passed from Dashboard / Scanner
  useEffect(() => {
    if (activeScan) {
      if (activeScan.resumeText) {
        setClBackground(activeScan.resumeText);
        setLiBackground(activeScan.resumeText);
        setIpBackground(activeScan.resumeText);
      }
      if (activeScan.jobTitle) {
        setClJobTitle(activeScan.jobTitle);
      }
      if (activeScan.jobDescription) {
        setIpJobDescription(activeScan.jobDescription);
      }
      // Suggest jumping to cover letter tab when pre-populated
      setActiveTab("cover");
    } else {
      // General fallbacks
      setClBackground("John Doe, Software Dev. 3 years exp React, JavaScript, SQLite, Node, Git.");
      setClJobTitle("React Software Developer");
      setLiBackground("Emily Ford, Data Analyst, Postgres database auditing, Python Pandas modeling.");
      setIpBackground("Experienced SWE: Python flask framework, docker containers, SQL queries.");
      setIpJobDescription("Backend Engineer Role: postgres sql database architectures, docker, flask python api deployment.");
    }
  }, [activeScan]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(""), 2000);
  };

  // 1. Rewrite Bullets API
  const handleRewriteBullet = async () => {
    if (!inputBullet.trim()) return;
    setBulletLoading(true);
    try {
      const response = await apiClient.post("/tools/rewrite-bullets", { bullet: inputBullet, tone: bulletTone });
      const data = response.data;
      setBulletResults(data.suggestions || []);
    } catch (err: any) {
      if (err.response?.status === 402) alert("Pro plan required for this feature.");
      if (err?.response?.status !== 401) console.error(err);
    } finally {
      setBulletLoading(false);
    }
  };

  // 2. Generate Cover Letter API
  const handleGenerateCoverLetter = async () => {
    if (!clBackground.trim() || !clJobTitle.trim()) return;
    setClLoading(true);
    try {
      const response = await apiClient.post("/tools/cover-letter", {
        resumeText: clBackground,
        jobTitle: clJobTitle,
        tone: clTone,
        scanId: activeScan ? activeScan.id : undefined
      });
      const data = response.data;
      setClOutput(data.coverLetter || null);
      toast.success("Tailored cover letter generated successfully!", "Cover Letter Ready");
      setTimeout(() => {
        showFeedback("cover_letter");
      }, 1500);
    } catch (err: any) {
      if (err.response?.status === 402) {
        toast.warning("Pro plan required for custom cover letters.", "Pro Plan Required");
        alert("Pro plan required for this feature.");
      } else {
        const errorMsg = err.response?.data?.error || "Failed to generate cover letter.";
        toast.error(errorMsg, "Generation Failed");
      }
      if (err?.response?.status !== 401) console.error(err);
    } finally {
      setClLoading(false);
    }
  };

  // 3. Generate LinkedIn Options
  const handleOptimizeLinkedIn = async () => {
    if (!liBackground.trim()) return;
    setLiLoading(true);
    try {
      const response = await apiClient.post("/tools/linkedin", { resumeText: liBackground });
      const data = response.data;
      setLiOutput(data.optimized || data);
    } catch (err: any) {
      if (err.response?.status === 402) alert("Pro plan required for this feature.");
      if (err?.response?.status !== 401) console.error(err);
    } finally {
      setLiLoading(false);
    }
  };

  // 4. Generate Interview questions
  const handleGenerateInterview = async () => {
    if (!ipBackground.trim() && !ipJobDescription.trim()) return;
    setIpLoading(true);
    try {
      const response = await apiClient.post("/tools/interview-prep", { 
        resumeText: ipBackground, 
        jobDescription: ipJobDescription, 
        scanId: activeScan ? activeScan.id : undefined 
      });
      const data = response.data;
      setIpQuestions(data.questions || []);
      setIpRedFlags(data.redFlags || []);
      setIpQuestionsToAsk(data.questionsToAsk || []);
      setIpPreparationPlan(data.preparationPlan || []);
    } catch (err: any) {
      if (err.response?.status === 402) alert("Pro plan required for this feature.");
      if (err?.response?.status !== 401) console.error(err);
    } finally {
      setIpLoading(false);
    }
  };

  // Renders premium locks for free plan limitations
  const renderLockOverlay = (featureTitle: string) => {
    const isFreePlan = !currentUser?.plan || currentUser.plan.toLowerCase() === "free";
    if (!isFreePlan) return null;
    return (
      <div className="absolute inset-0 bg-white/95 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center p-6 text-center z-10 select-none">
      <SEOMeta pageKey="tools" />
        <AlertCircle className="w-12 h-12 text-indigo-600 animate-pulse mb-3" />
        <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full mb-2">
          PRO EXCLUSIVE FEATURE
        </span>
        <h3 className="text-lg font-extrabold text-slate-800 tracking-tight">{featureTitle}</h3>
        <p className="text-slate-500 text-xs max-w-sm mt-1 mb-4 leading-relaxed">
          Upgrade to Career Pro to unlock unlimited use of our sub-module optimizer, bullet rewriter databases, and custom cover letters.
        </p>
        <button
          onClick={onUpgrade}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-md"
        >
          Unlock Pro Access Instantly
        </button>
      </div>
    );
  };

  return (
    <div className="max-w-5xl xl:max-w-7xl 2xl:max-w-[90rem] mx-auto space-y-8 pb-16 px-4 xl:px-8 min-w-0">
      {/* Title */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 tracking-tight">AI Optimizers & Tools</h1>
        <p className="text-slate-600 max-w-xl mx-auto text-sm md:text-base">Unlock four specialized engines targeting distinct phases of your career presentation and interview prep.</p>
        
        {activeScan && (
          <div className="inline-block mt-2 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs px-3.5 py-1.5 rounded-xl font-semibold">
             Active Context loaded: Utilizing parsed details from <strong className="font-extrabold">{activeScan.jobTitle}</strong>.
          </div>
        )}
      </div>

      {/* Tabs list */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-100/85 p-1.5 rounded-2xl border border-slate-200 text-xs md:text-sm font-semibold max-w-3xl mx-auto">
        <button
          onClick={() => setActiveTab("bullet")}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-xl cursor-pointer transition-all ${activeTab === "bullet" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
        >
          <Sparkles className="w-4 h-4" /> Bullet Rewriter
        </button>

        <button
          onClick={() => setActiveTab("cover")}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-xl cursor-pointer transition-all ${activeTab === "cover" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
        >
          <FileText className="w-4 h-4" /> Cover Letter
        </button>

        <button
          onClick={() => setActiveTab("linkedin")}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-xl cursor-pointer transition-all ${activeTab === "linkedin" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
        >
          <Share2 className="w-4 h-4" /> LinkedIn setup
        </button>

        <button
          onClick={() => setActiveTab("interview")}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-xl cursor-pointer transition-all ${activeTab === "interview" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
        >
          <HeartHandshake className="w-4 h-4" /> Interview Prep
        </button>
      </div>

      {/* Tabs Content Layout */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-6 min-h-[440px] relative">
        <AnimatePresence mode="wait">
          
          {/* Tab 1: Bullet point rewriter (ACCESSIBLE TO ALL) */}
          {activeTab === "bullet" && (
            <motion.div
              key="tab-bullet"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-6"
            >
              <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base md:text-lg">AI Performance Bullet Rewriter</h3>
                  <p className="text-xs text-slate-500">Transform generic job task logs into high-impact, quantified metrics recruiters love.</p>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 rounded-full uppercase">
                  Unlocked Feature
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Your original weak resume bullet</label>
                    <textarea
                      value={inputBullet}
                      onChange={(e) => setInputBullet(e.target.value)}
                      placeholder="e.g., Prepared monthly reports and coded client login page"
                      className="w-full h-24 p-3 text-xs md:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none bg-slate-50/20"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Target Writing Style / Focus Tone</label>
                    <select
                      value={bulletTone}
                      onChange={(e) => setBulletTone(e.target.value)}
                      className="w-full p-2.5 text-xs text-slate-700 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none bg-white cursor-pointer"
                    >
                      <option value="Strongly quantitative">Strongly quantitative (Highly recommended — focuses on business metrics)</option>
                      <option value="Action-verb Leader">Action-verb Leader (Highlights self-started operations)</option>
                      <option value="Sleek & Professional">Sleek & Professional (Traditional concise styling)</option>
                    </select>
                  </div>

                  <button
                    onClick={handleRewriteBullet}
                    disabled={bulletLoading || !inputBullet.trim()}
                    className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    {bulletLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Improving phrasing metrics...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" /> Rewrite Bullet Point
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col justify-between">
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-indigo-600 fill-current" /> Optimized alternatives
                    </h4>

                    <div className="space-y-3">
                      {bulletResults.map((res, idx) => (
                        <div key={idx} className="p-4 bg-white border border-slate-150 rounded-xl space-y-3 relative group shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 capitalize">
                              {res.actionVerb || "Optimized"}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-600">
                              Strength: {res.strengthScore || 85}/100
                            </span>
                          </div>
                          <p className="text-sm font-medium text-slate-800 leading-relaxed pr-8">{res.improved || res}</p>
                          {res.whyBetter && (
                            <p className="text-xs text-slate-500 italic">"{res.whyBetter}"</p>
                          )}
                          <button
                            onClick={() => handleCopy(res.improved || res, `b-${idx}`)}
                            className="absolute top-3.5 right-3.5 p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200 rounded-lg cursor-pointer transition"
                            title="Copy improved bullet"
                          >
                            {copiedText === `b-${idx}` ? (
                              <span className="text-[9px] font-bold text-indigo-700 px-1 py-0.5">Copied!</span>
                            ) : (
                              <Clipboard className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      ))}

                      {bulletResults.length === 0 && (
                        <div className="text-center py-8 space-y-1">
                          <p className="text-slate-400 text-xs">Enter a bullet point and click optimize to generate alternatives.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {bulletResults.length > 0 && false && (
                    <div className="text-[10px] text-slate-400 text-center flex items-center gap-1 justify-center pt-4 border-t border-slate-150">
                      <Info className="w-3 h-3 text-indigo-600" /> Operating in highly smart sandbox logic simulation.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Tab 2: Cover Letter Generator (LOCKED FOR FREE USER) */}
          {activeTab === "cover" && (
            <motion.div
              key="tab-cover"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-6"
            >
              {renderLockOverlay("AI Tailored Cover Letter Builder")}

              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-900 text-lg">AI-Tailored Cover Letter Generator</h3>
                <p className="text-xs text-slate-500">Generate high-impact cover letters matching your credentials exactly with job listings.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Target Job Title</label>
                      <input
                        type="text"
                        value={clJobTitle}
                        onChange={(e) => setClJobTitle(e.target.value)}
                        placeholder="e.g., Frontend React Engineer"
                        className="w-full p-2.5 text-xs text-slate-700 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none bg-slate-50/20 font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Tone Setting</label>
                      <input
                        type="text"
                        value={clTone}
                        onChange={(e) => setClTone(e.target.value)}
                        placeholder="e.g., Professional & Confident"
                        className="w-full p-2.5 text-xs text-slate-700 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none bg-slate-50/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Resume Content / Experience Highlights Context</label>
                    <textarea
                      value={clBackground}
                      onChange={(e) => setClBackground(e.target.value)}
                      placeholder="Enter details from your career or paste resume plaintext..."
                      className="w-full h-44 p-3 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none bg-slate-50/20"
                    />
                  </div>

                  <button
                    onClick={handleGenerateCoverLetter}
                    disabled={clLoading || !clBackground.trim() || !clJobTitle.trim()}
                    className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    {clLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Analyzing background & crafting draft...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Generate Cover Letter
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col justify-between">
                  <div className="space-y-3 flex-1 flex flex-col justify-between">
                    <div className="flex justify-between items-center bg-slate-50 border-b border-slate-200/60 pb-2">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Tailored Output Draft</h4>
                      {clOutput && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => exportToPDF("Optimized Cover Letter", clOutput.content, "cover_letter.pdf")}
                            className="px-2 py-1 text-[10px] font-bold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg cursor-pointer transition flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" /> PDF
                          </button>
                          <button
                            onClick={() => exportToDOCX("Optimized Cover Letter", clOutput.content, "cover_letter.docx")}
                            className="px-2 py-1 text-[10px] font-bold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg cursor-pointer transition flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" /> DOCX
                          </button>
                          <button
                            onClick={() => handleCopy(clOutput.content, "cl-copy")}
                            className="px-2.5 py-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg cursor-pointer transition flex items-center gap-1"
                          >
                            {copiedText === "cl-copy" ? "Copied Letter!" : "Copy Letter"}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="p-3 bg-white border border-slate-200 rounded-xl min-h-[220px] max-h-[300px] overflow-y-auto font-sans leading-relaxed text-slate-800 text-xs whitespace-pre-line select-text">
                      {clOutput ? clOutput.content : "Output draft will be rendered here. Provide job target metrics and click Generate."}
                    </div>
                  </div>

                </div>
              </div>
            </motion.div>
          )}

          {/* Tab 3: LinkedIn profile optimizer (LOCKED FOR FREE USER) */}
          {activeTab === "linkedin" && (
            <motion.div
              key="tab-linkedin"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-6"
            >
              {renderLockOverlay("LinkedIn Profile SEO Optimizer")}

              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-900 text-lg">LinkedIn Personal Branding Optimizer</h3>
                <p className="text-xs text-slate-500">Increase recruiter searching index rates by tuning your headline, summary bio, and experience summaries.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Resume Plaintext or Professional History Background</label>
                    <textarea
                      value={liBackground}
                      onChange={(e) => setLiBackground(e.target.value)}
                      placeholder="Paste your resume content or bullet list..."
                      className="w-full h-64 p-3 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none bg-slate-50/20"
                    />
                  </div>

                  <button
                    onClick={handleOptimizeLinkedIn}
                    disabled={liLoading || !liBackground.trim()}
                    className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    {liLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Tuning search patterns...
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4" /> Optimize LinkedIn Presence
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col justify-between">
                  <div className="space-y-4 max-h-[360px] overflow-y-auto flex-1">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-200/60 pb-2">optimized target parameters</h4>

                    {liOutput ? (
                      <div className="space-y-4 text-xs select-text">
                        <div className="space-y-1 relative bg-white p-3 border border-slate-200 rounded-xl">
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Recruiter Search headline</span>
                          <p className="font-bold text-slate-800 pr-10">{liOutput.headline}</p>
                          <button
                            onClick={() => handleCopy(liOutput.headline, "li-head")}
                            className="absolute top-2 right-2 p-1 text-slate-450 hover:text-indigo-600 cursor-pointer"
                          >
                            {copiedText === "li-head" ? <span className="text-[8px] font-black">Copied!</span> : <Clipboard className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        <div className="space-y-1 relative bg-white p-3 border border-slate-200 rounded-xl">
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Interactive 'About/Summary' Bio</span>
                          <p className="text-slate-600 leading-relaxed pr-10 whitespace-pre-line">{liOutput.about || liOutput.summary}</p>
                          <button
                            onClick={() => handleCopy(liOutput.about || liOutput.summary, "li-bio")}
                            className="absolute top-2 right-2 p-1 text-slate-450 hover:text-indigo-600 cursor-pointer"
                          >
                            {copiedText === "li-bio" ? <span className="text-[8px] font-black">Copied!</span> : <Clipboard className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        {liOutput.featuredSectionIdeas && liOutput.featuredSectionIdeas.length > 0 && (
                          <div className="space-y-2 bg-white p-3 border border-slate-200 rounded-xl">
                            <span className="text-[9px] font-bold text-indigo-500 uppercase flex items-center gap-1">
                              <Star className="w-3 h-3" /> Featured Section Ideas
                            </span>
                            <ul className="space-y-1 pl-4 list-disc marker:text-indigo-300">
                              {liOutput.featuredSectionIdeas.map((idea: string, i: number) => (
                                <li key={i} className="text-slate-600 text-[11px]">{idea}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {liOutput.recommendationTemplates && liOutput.recommendationTemplates.length > 0 && (
                          <div className="space-y-2 bg-white p-3 border border-slate-200 rounded-xl">
                            <span className="text-[9px] font-bold text-indigo-500 uppercase flex items-center gap-1">
                              <HeartHandshake className="w-3 h-3" /> Recommendation Templates
                            </span>
                            {liOutput.recommendationTemplates.map((template: any, i: number) => (
                              <div key={i} className="bg-slate-50 border border-slate-100 p-2 rounded relative">
                                <span className="block font-bold text-[9px] text-slate-500 uppercase mb-1">Target: {template.targetRole}</span>
                                <p className="text-slate-600 leading-relaxed text-[10px] whitespace-pre-line pr-6">"{template.message}"</p>
                                <button
                                  onClick={() => handleCopy(template.message, `li-rec-${i}`)}
                                  className="absolute top-2 right-2 p-1 text-slate-450 hover:text-indigo-600 cursor-pointer"
                                >
                                  {copiedText === `li-rec-${i}` ? <span className="text-[8px] font-black">Copied!</span> : <Clipboard className="w-3 h-3" />}
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-slate-400 text-xs py-4 text-center">Output parameters will show up here.</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Tab 4: Interview Planner (LOCKED FOR FREE USER) */}
          {activeTab === "interview" && (
            <motion.div
              key="tab-interview"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-6"
            >
              {renderLockOverlay("Behavioral Tech Interview Prep Helper")}

              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-900 text-lg">Interview Prep Planner</h3>
                <p className="text-xs text-slate-500">Formulate sample technical and behavioral interview Q&As based on target job description criteria.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Candidate Resume Background</label>
                    <textarea
                      value={ipBackground}
                      onChange={(e) => setIpBackground(e.target.value)}
                      placeholder="Paste your work background or resume draft..."
                      className="w-full h-24 p-3 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none bg-slate-50/20"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Target Job Description</label>
                    <textarea
                      value={ipJobDescription}
                      onChange={(e) => setIpJobDescription(e.target.value)}
                      placeholder="Paste the target job advertisement..."
                      className="w-full h-24 p-3 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none bg-slate-50/20"
                    />
                  </div>

                  <button
                    onClick={handleGenerateInterview}
                    disabled={ipLoading || (!ipBackground.trim() && !ipJobDescription.trim())}
                    className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    {ipLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Organizing behavioral STAR grids...
                      </>
                    ) : (
                      <>
                        <HeartHandshake className="w-4 h-4" /> Generate Interview Planner
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col justify-between">
                  <div className="space-y-4 max-h-[360px] overflow-y-auto flex-1 select-text">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-200/60 pb-2">interview planner questionnaire</h4>

                    {ipQuestions.length > 0 ? (
                      <div className="space-y-4 text-xs">
                        {ipQuestions.map((q, idx) => (
                          <div key={idx} className="bg-white p-3.5 border border-slate-200 rounded-xl space-y-2">
                            <div className="flex gap-1.5 items-center justify-between">
                              <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold text-[8px] uppercase tracking-wider px-2 py-0.5 rounded">
                                Q0{idx + 1} — {q.type}
                              </span>
                            </div>
                            <h4 className="font-bold text-slate-800 text-sm">{q.question}</h4>
                            <p className="text-[10px] text-slate-400 italic">Interviewer Intent: {q.intent}</p>
                            
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 mt-2 space-y-1">
                              <span className="font-bold text-slate-700 uppercase text-[8px] block">Sample Perfect STAR Answer</span>
                              <p className="text-slate-600 leading-relaxed text-[11px] font-sans whitespace-pre-line">{q.sampleAnswer}</p>
                            </div>

                            <div className="pt-2">
                              <span className="font-bold text-slate-700 uppercase text-[8px] block mb-1">Critical Key Talking Points</span>
                              <div className="flex flex-wrap gap-1">
                                {q.points?.map((pt: string, pIdx: number) => (
                                  <span key={pIdx} className="text-[9px] font-medium text-indigo-800 bg-indigo-50/50 px-2 py-0.5 rounded border border-indigo-100">
                                    • {pt}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}

                        {ipRedFlags.length > 0 && (
                          <div className="mt-6 space-y-3">
                            <h4 className="text-xs font-black text-rose-500 uppercase tracking-widest border-b border-rose-100 pb-2 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> Red Flags to Watch Out For</h4>
                            {ipRedFlags.map((rf, rIdx) => (
                              <div key={`rf-${rIdx}`} className="bg-rose-50 border border-rose-100 p-3 rounded-lg">
                                <p className="font-bold text-rose-800 text-xs shadow-none">"{rf.question}"</p>
                                <p className="text-[11px] text-rose-600 mt-1">{rf.warning}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {ipQuestionsToAsk.length > 0 && (
                          <div className="mt-6 space-y-3">
                            <h4 className="text-xs font-black text-indigo-500 uppercase tracking-widest border-b border-indigo-100 pb-2">Questions to Ask Them</h4>
                            <ul className="space-y-2 pl-4 list-disc marker:text-indigo-300">
                              {ipQuestionsToAsk.map((qa, qIdx) => (
                                <li key={`qa-${qIdx}`} className="text-xs text-slate-700">{qa}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {ipPreparationPlan && ipPreparationPlan.length > 0 && (
                          <div className="mt-6 space-y-3">
                            <h4 className="text-xs font-black text-emerald-600 uppercase tracking-widest border-b border-emerald-100 pb-2">3-Day Preparation Plan</h4>
                            <div className="space-y-2">
                              {ipPreparationPlan.map((dayPlan: any, dIdx: number) => (
                                <div key={`dp-${dIdx}`} className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-lg">
                                  <span className="font-bold text-emerald-800 text-[10px] uppercase block mb-1">Day {dayPlan.day || dIdx + 1}: {dayPlan.focusArea || dayPlan.focus || ""}</span>
                                  <ul className="space-y-1 pl-4 list-disc marker:text-emerald-400">
                                    {dayPlan.tasks?.map((task: string, tIdx: number) => (
                                      <li key={tIdx} className="text-[11px] text-slate-600">{task}</li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-slate-400 text-xs py-4 text-center">Formulated questions will appear here.</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
