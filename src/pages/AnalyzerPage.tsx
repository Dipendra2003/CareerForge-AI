import SEOMeta from '../components/SEOMeta';
import { useState, useRef, DragEvent, ChangeEvent, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Upload, Terminal, AlertTriangle, Sparkles, CheckCircle, Lock,
  Trash2, RefreshCw, BarChart2, Lightbulb, ChevronRight, CheckSquare, XCircle,
  Download, FileText, Check, Search, AlertCircle, FileUp, Sparkle, Target, Award,
  ArrowUpRight, HelpCircle, ArrowLeft, History, Briefcase
} from "lucide-react";
import { Scan, User } from "../types";
import apiClient from "../lib/apiClient";
import posthog from "posthog-js";
import { exportResumeToPDF } from "../utils/exportUtils";
import { useToast } from "../contexts/ToastContext";
import { useFeedback } from "../contexts/FeedbackContext";
import ATSReport from "../components/ATSReport";



interface AnalyzerPageProps {
  onScanCompleted: (scan: Scan) => void;
  currentUser: User;
  onUpgrade: () => void;
  onNavigate: (page: string) => void;
}

export default function AnalyzerPage({ onScanCompleted, currentUser, onUpgrade, onNavigate }: AnalyzerPageProps) {
  const toast = useToast();
  const { showFeedback } = useFeedback();
  const [resumeText, setResumeText] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [uploadedFileInfo, setUploadedFileInfo] = useState<any>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [errorText, setErrorText] = useState("");
  
  const [scanResult, setScanResult] = useState<Scan | null>(null);
  const [systemSettings, setSystemSettings] = useState<any>(null);
  const [userScansLeft, setUserScansLeft] = useState<number | string>("");
  const [editedResumeText, setEditedResumeText] = useState("");

  // Modern UI UX interactive states
  const [resumeInputMode, setResumeInputMode] = useState<"upload" | "paste">("upload");
  const [keywordSearch, setKeywordSearch] = useState("");
  const [keywordTab, setKeywordTab] = useState<"all" | "matched" | "missing">("all");
  const [exportingPdf, setExportingPdf] = useState(false);
  const [showScoreExplanation, setShowScoreExplanation] = useState(false);

  useEffect(() => {
    if (scanResult) {
      setEditedResumeText(scanResult.resume_text || "");
    } else {
      setEditedResumeText("");
    }
  }, [scanResult]);

  // Handle optimized PDF export with upload to Cloudinary
  const handleExportOptimizedPDF = async () => {
    if (!editedResumeText || !scanResult) {
      toast?.error("No resume content to export");
      return;
    }

    setExportingPdf(true);
    try {
      // Generate PDF as blob
      const pdfBlob = exportResumeToPDF(
        editedResumeText, 
        `${scanResult.job_title?.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-optimized-resume.pdf`,
        true // Return blob instead of downloading
      ) as Blob;

      // 1. Immediately download the PDF to user's computer
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${scanResult.job_title?.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-optimized-resume.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      toast?.success("Optimized PDF exported successfully!");

      // 2. Upload to Cloudinary in the background
      try {
        const formData = new FormData();
        formData.append("file", pdfBlob, `${scanResult.job_title || "optimized"}-resume.pdf`);

        const uploadResponse = await apiClient.post("/parse", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });

        const { fileInfo } = uploadResponse.data;

        // Save optimized PDF info to the scan
        await apiClient.post(`/workspace/scans/${scanResult.id}/optimized-pdf`, {
          pdfUrl: fileInfo.url,
          pdfPublicId: fileInfo.public_id,
          pdfFileName: fileInfo.filename,
          pdfSize: fileInfo.size
        });

        // Update local scan result
        setScanResult({
          ...scanResult,
          optimizedPdfUrl: fileInfo.url,
          optimizedPdfPublicId: fileInfo.public_id,
          optimizedPdfFileName: fileInfo.filename,
          optimizedPdfSize: fileInfo.size
        });
      } catch (uploadError) {
      // Securely log the error without leaking stack traces or sensitive data
      console.error('An error occurred during this operation.');
    }

    } catch (error: any) {
      
      toast?.error("Failed to generate PDF document");
    } finally {
      setExportingPdf(false);
    }
  };

  useEffect(() => {
    import("axios").then(axios => {
      axios.default.get("/api/public/config").then(res => {
        const settings = res.data.settings;
        setSystemSettings(settings);
        
        if (currentUser) {
           // Calculate base limit from plan
           const baseLimit = (!currentUser.plan || currentUser.plan.toLowerCase() === 'free') ? settings.freeScanLimit : settings.proScanLimit;
           // Add extra scans from admin quota override
           const extraScans = currentUser.extra_scans || 0;
           const totalLimit = baseLimit + extraScans;
           // Calculate scans left
           const scansUsed = currentUser.scans_used_this_month || 0;
           const scansLeft = Math.max(0, totalLimit - scansUsed);
           
           setUserScansLeft(scansLeft);
        } else {
           setUserScansLeft(settings.guestScanLimit);
        }
      });
    });
  }, [currentUser]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Autofill helpers
  const handleAutofillResume = (text: string, name: string) => {
    setResumeText(text);
    setResumeFileName(name + ".txt");
    setErrorText("");
    setResumeInputMode("paste"); // Switch to paste tab so they see and can edit the text instantly
  };

  const handleAutofillJd = (text: string) => {
    setJobDescription(text);
    setErrorText("");
  };

  // Drag and Drop
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    setErrorText("");

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      readUploadedFile(file);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      readUploadedFile(e.target.files[0]);
    }
  };

  const readUploadedFile = async (file: File) => {
    const isTxt = file.type === "text/plain" || file.name.endsWith(".txt");
    const isDoc = file.name.endsWith(".docx") || file.name.endsWith(".pdf"); // Accept for user feedback
    
    setResumeFileName(file.name);
    setUploadedFileInfo(null);
    
    if (isTxt) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && typeof event.target.result === "string") {
          setResumeText(event.target.result);
          setResumeInputMode("paste"); // Auto-switch to paste tab to show parsed content!
        }
      };
      reader.readAsText(file);
    } else if (isDoc) {
      setIsLoading(true);
      setLoadingStep(0);
      try {
        const formData = new FormData();
        formData.append("file", file);
        
        const response = await fetch("/api/parse", {
          method: "POST",
          body: formData,
        });
        
        if (!response.ok) {
           const errData = await response.json();
           throw new Error(errData.error || "Failed to extract text from document");
        }
        
        const data = await response.json();
        setResumeText(data.text);
        if (data.fileInfo) {
          setUploadedFileInfo(data.fileInfo);
        }
        setResumeInputMode("paste"); // Auto-switch to show text
      } catch (err: any) {
        setErrorText(err.message || "Failed to extract text from document");
        setResumeFileName("");
      } finally {
        setIsLoading(false);
      }
    } else {
        setErrorText("Unsupported file type. Please upload a PDF, DOCX, or TXT file.");
        setResumeFileName("");
    }
  };

  const handleReset = () => {
    setResumeText("");
    setResumeFileName("");
    setUploadedFileInfo(null);
    setJobDescription("");
    setScanResult(null);
    setErrorText("");
    setResumeInputMode("upload");
  };

  const runAnalysis = async () => {
    if (!resumeText.trim()) {
      setErrorText("Please upload or paste your resume content to proceed.");
      return;
    }
    if (!jobDescription.trim()) {
      setErrorText("Please provide a target job description to match against.");
      return;
    }

    setErrorText("");
    setIsLoading(true);
    setLoadingStep(0);

    // Beautiful reassuring step transitions
    const stepIntervals = [
      setTimeout(() => setLoadingStep(1), 2500),
      setTimeout(() => setLoadingStep(2), 5000),
      setTimeout(() => setLoadingStep(3), 7500),
    ];

    try {
      const response = await apiClient.post("/analyze", {
        resumeText,
        jobDescription,
        resumeFileName,
        fileInfo: uploadedFileInfo
      });

      const { jobId } = response.data;

      // Clear the fake steps and start polling
      stepIntervals.forEach(clearTimeout);

      let isDone = false;
      let attempt = 0;
      
      const pollInterval = setInterval(async () => {
        if (isDone) return;
        attempt++;
        
        try {
          const statusRes = await apiClient.get(`/analyze/status/${jobId}`);
          const { state, progress, result, error } = statusRes.data;
          
          if (progress === 10) setLoadingStep(1);
          if (progress === 30) setLoadingStep(2);
          if (progress === 60) setLoadingStep(3);
          
          if (state === "completed") {
             clearInterval(pollInterval);
             isDone = true;
             setIsLoading(false);
             
             const data = result;
             setScanResult(data.scan);
             // We don't get userScansLeft directly from the worker, but we can refresh the config if needed
             // Just trigger complete
             onScanCompleted(data.scan);
             toast.success("Resume scan completed and results saved successfully!", "Scan Saved");
             
             setTimeout(() => {
               showFeedback("scan");
             }, 1200);
       
             const isFirstScan = currentUser?.scans_used === 0;
             if (posthog) {
               posthog.capture("Scan Completed", {
                  isFirstScan: isFirstScan,
                  jobTitle: data.scan.jobTitle,
                  score: data.scan.atsScore
               });
               if (isFirstScan) posthog.capture("First Scan");
             }
          } else if (state === "failed") {
             clearInterval(pollInterval);
             isDone = true;
             setIsLoading(false);
             setErrorText(error || "Analysis failed during processing.");
             toast.error(error || "Analysis failed", "Scan Failed");
          }
        } catch (pollErr) {
           
           if (attempt > 30) { // Timeout after ~1 minute
              clearInterval(pollInterval);
              isDone = true;
              setIsLoading(false);
              setErrorText("Polling timeout. Please check your dashboard later.");
           }
        }
      }, 2000);

    } catch (err: any) {
      
      stepIntervals.forEach(clearTimeout);
      const errMsg = err.response?.data?.message || err.response?.data?.error || "Failed to communicate with our secure AI backend. Please verify that your dev server is responsive.";
      if (err.response?.data?.quotaError) {
        setErrorText(err.response.data.message);
      } else {
        setErrorText(errMsg);
      }
      toast.error(errMsg, "Scan Match Failed");
      setIsLoading(false);
    }
  };

  // Helper counters
  const resumeWordCount = resumeText ? resumeText.trim().split(/\s+/).filter(Boolean).length : 0;
  const jdWordCount = jobDescription ? jobDescription.trim().split(/\s+/).filter(Boolean).length : 0;

  // Helper to handle both old string[] and new object[] formats
  const getKeywordString = (kw: any) => typeof kw === 'string' ? kw : kw.keyword;
  const getStrengthText = (str: any) => typeof str === 'string' ? str : str.text;

  // Filter keyword analysis by search query & tab
  const matchedKeywordsArray = scanResult?.matched_kw || [];
  const missingKeywordsArray = scanResult?.missing_kw || [];
  
  const filteredMatchedKeywords = matchedKeywordsArray.filter((kw: any) => 
    getKeywordString(kw).toLowerCase().includes(keywordSearch.toLowerCase())
  );
  const filteredMissingKeywords = missingKeywordsArray.filter((kw: any) => 
    getKeywordString(kw).toLowerCase().includes(keywordSearch.toLowerCase())
  );

  return (
    <div id="root-analyzer" className="max-w-7xl 2xl:max-w-[1600px] mx-auto space-y-8 md:space-y-12 pb-20 px-4 sm:px-6 lg:px-8 w-full min-w-0">
      <SEOMeta pageKey="analyzer" />
      
      {/* Premium Elegant Header Block */}
      <div className="text-center space-y-4 max-w-3xl mx-auto pt-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 rounded-full border border-indigo-150 animate-fade-in">
          <Sparkle className="w-3.5 h-3.5 text-indigo-600 fill-indigo-100" />
          <span>Llama & Gemini Enterprise Match Engine v2.0</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">
          Your Resume vs. <span className="bg-linear-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Job Match</span>
        </h1>
        <p className="text-slate-500 text-sm md:text-base leading-relaxed">
          Instantly evaluate ATS match accuracy, pinpoint critical keyword deficits, and generate tailored resume improvements to optimize your profile callbacks.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!scanResult && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-stretch"
          >
            {/* Left side: Resume Upload & Input Pane (7 cols) */}
            <div className="xl:col-span-7 bg-white rounded-3xl border border-slate-200/90 p-6 md:p-8 shadow-md flex flex-col justify-between space-y-6 relative overflow-hidden">
              <div className="space-y-6">
                
                {/* Section Header & Tab Controls */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-slate-100">
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2 text-base md:text-lg">
                      <FileUp className="w-5 h-5 text-indigo-600" />
                      <span>1. Supply Your Resume</span>
                    </h3>
                    <p className="text-slate-400 text-xs font-medium">Choose file upload or enter plain text directly</p>
                  </div>
                  
                  {/* Modern segment pill tab selector */}
                  <div className="flex bg-slate-100/80 p-1 rounded-xl self-start sm:self-auto border border-slate-200/50">
                    <button
                      type="button"
                      onClick={() => setResumeInputMode("upload")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        resumeInputMode === "upload"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      File Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => setResumeInputMode("paste")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        resumeInputMode === "paste"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Plain Text {resumeText && "•"}
                    </button>
                  </div>
                </div>

                {/* Switchable Interactive Panels */}
                <AnimatePresence mode="wait">
                  {resumeInputMode === "upload" ? (
                    <motion.div
                      key="upload-tab"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="space-y-4"
                    >
                      {/* Premium Drag & Drop Area */}
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-6 md:p-8 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center min-h-[140px] md:min-h-[180px] group ${
                          isDragOver 
                            ? "border-indigo-600 bg-indigo-50/40 shadow-inner" 
                            : "border-slate-250 hover:border-indigo-400 bg-slate-50/30 hover:bg-slate-50/80"
                        }`}
                      >
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept=".txt,.pdf,.docx"
                          className="hidden"
                        />
                        <div className={`p-4 rounded-2xl bg-white shadow-sm border border-slate-100 mb-3 group-hover:scale-105 transition-transform duration-300 ${isDragOver ? "text-indigo-600" : "text-slate-400"}`}>
                          <Upload className="w-7 h-7" />
                        </div>
                        {resumeFileName ? (
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-indigo-600">{resumeFileName}</p>
                            <p className="text-xs text-slate-400">Successfully extracted & stored. Click to upload another file.</p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <p className="text-sm text-slate-700 font-bold">Drop your resume file here</p>
                            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">Accepts PDF, Microsoft Word (.docx), or plain text (.txt). Files are processed securely in local runtime.</p>
                          </div>
                        )}
                      </div>

                      {/* Display warning or option if already parsed */}
                      {resumeFileName && (
                        <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-center justify-between text-xs text-indigo-800">
                          <span className="flex items-center gap-2 font-medium">
                            <Check className="w-4 h-4 text-indigo-600" /> Loaded as editable plaintext.
                          </span>
                          <button 
                            type="button" 
                            onClick={() => setResumeInputMode("paste")} 
                            className="font-bold underline hover:text-indigo-900 cursor-pointer"
                          >
                            Inspect / Edit Content →
                          </button>
                        </div>
                      )}

                    </motion.div>
                  ) : (
                    <motion.div
                      key="paste-tab"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="space-y-2"
                    >
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-extrabold text-slate-400 uppercase tracking-widest block">Resume Plaintext Editor</label>
                        {resumeWordCount > 0 && (
                          <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full">
                            {resumeWordCount} words
                          </span>
                        )}
                      </div>
                      <textarea
                        value={resumeText}
                        onChange={(e) => {
                          setResumeText(e.target.value);
                          if (!e.target.value) setResumeFileName("");
                        }}
                        placeholder="Paste full text details of your resume (Summary, Skills, Experience, Education)..."
                        className="w-full h-48 md:h-72 p-4 text-xs md:text-sm font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/30 custom-scrollbar"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>


              </div>
            </div>

            {/* Right side: Job Description Pane (5 cols) */}
            <div className="xl:col-span-5 bg-white rounded-3xl border border-slate-200/90 p-6 md:p-8 shadow-md flex flex-col justify-between space-y-6 relative">
              <div className="space-y-6">
                
                {/* Section Title */}
                <div className="space-y-1 pb-4 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2 text-base md:text-lg">
                    <Target className="w-5 h-5 text-indigo-600" />
                    <span>2. Enter Target Job Criteria</span>
                  </h3>
                  <p className="text-slate-400 text-xs font-medium">Input expectations from the hiring pipeline</p>
                </div>



                {/* JD Input Textarea */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-extrabold text-slate-400 uppercase tracking-widest block">Job Description Text</label>
                    {jdWordCount > 0 && (
                      <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full">
                        {jdWordCount} words
                      </span>
                    )}
                  </div>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste full listing details, roles, responsibilities, and required technical stacks..."
                    className="w-full h-64 md:h-80 p-4 text-xs md:text-sm font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/30 custom-scrollbar resize-none"
                  />
                </div>
              </div>

              {/* Action Buttons & Error Block */}
              <div className="space-y-4 pt-4">
                {errorText && (
                  <div className="p-3.5 bg-red-50 border border-red-150 rounded-xl flex gap-3 text-red-800 text-xs animate-shake">
                    <AlertTriangle className="w-5 h-5 shrink-0 text-red-600" />
                    <div>
                      <p className="font-bold">Match Verification Blocked</p>
                      <p className="mt-0.5 leading-relaxed">{errorText}</p>
                      {errorText.includes("Quota") && (
                        <button
                          type="button"
                          onClick={onUpgrade}
                          className="mt-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg border-0 transition cursor-pointer shadow-sm"
                        >
                          Upgrade to Pro Plan
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Footer Controls Row */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                  <div className="text-xs text-slate-400 text-center sm:text-left">
                    {currentUser?.plan?.toLowerCase() === "free" ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">
                          Usage: <strong className="text-slate-700 font-black">{(currentUser.scans_used_this_month || 0)} / {(systemSettings?.freeScanLimit || 3) + (currentUser.extra_scans || 0)} scans</strong> used this month.
                        </p>
                        {(currentUser.extra_scans || 0) > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                            <Sparkles className="w-3 h-3" />
                            +{currentUser.extra_scans} bonus scans
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-emerald-600 font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        Enterprise Pro Active
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2.5 w-full sm:w-auto">
                    <button
                      onClick={handleReset}
                      type="button"
                      className="px-4 py-2.5 text-slate-600 hover:bg-slate-50 text-xs font-bold rounded-xl border border-slate-250 cursor-pointer w-1/3 sm:w-auto text-center hover:scale-102 transition-all"
                    >
                      Clear All
                    </button>
                    <button
                      onClick={runAnalysis}
                      type="button"
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-md hover:shadow-indigo-100 cursor-pointer flex-1 sm:flex-initial flex items-center justify-center gap-1.5 hover:scale-102"
                    >
                      <Sparkles className="w-4 h-4 fill-white/10" /> Run Match Analysis
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modern Dynamic Fullscreen Loading Screen */}
      {isLoading && (
        <div className="max-w-xl mx-auto text-center py-24 space-y-8 bg-white/50 backdrop-blur-sm rounded-3xl border border-slate-100 p-8 shadow-sm">
          <div className="relative w-24 h-24 mx-auto">
            {/* Spinning external radial glow */}
            <div className="absolute inset-0 rounded-full border-4 border-indigo-100 animate-pulse"></div>
            <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin duration-1000"></div>
            {/* Core pulsate icon */}
            <div className="absolute inset-2.5 bg-indigo-50 rounded-full flex items-center justify-center shadow-inner">
              <Sparkles className="w-8 h-8 text-indigo-600 animate-pulse" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">AI Engine Parsing Content</h3>
              <p className="text-slate-400 text-xs">Translating semantics, tracking structural parameters...</p>
            </div>
            
            {/* Elegant horizontal loading timeline bar */}
            <div className="h-1 w-full max-w-xs mx-auto bg-slate-100 rounded-full overflow-hidden relative border border-slate-200/20">
              <motion.div 
                className="h-full bg-indigo-600"
                initial={{ width: "10%" }}
                animate={{ width: loadingStep === 0 ? "25%" : loadingStep === 1 ? "50%" : loadingStep === 2 ? "75%" : "95%" }}
                transition={{ duration: 1.5 }}
              />
            </div>

            <div className="h-6 overflow-hidden relative max-w-sm mx-auto">
              <AnimatePresence mode="wait">
                {loadingStep === 0 && (
                  <motion.p
                    key="step-0"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    className="text-xs text-indigo-600 font-bold uppercase tracking-wider"
                  >
                    Processing text payload...
                  </motion.p>
                )}
                {loadingStep === 1 && (
                  <motion.p
                    key="step-1"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    className="text-xs text-indigo-600 font-bold uppercase tracking-wider"
                  >
                    Calculating semantic overlap scores...
                  </motion.p>
                )}
                {loadingStep === 2 && (
                  <motion.p
                    key="step-2"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    className="text-xs text-indigo-600 font-bold uppercase tracking-wider"
                  >
                    Identifying system keyword deficits...
                  </motion.p>
                )}
                {loadingStep === 3 && (
                  <motion.p
                    key="step-3"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    className="text-xs text-indigo-600 font-bold uppercase tracking-wider"
                  >
                    Formatting bullet rewriter inputs...
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}

      {/* Results Workspace Panel */}
      {scanResult && !isLoading && (
        <motion.div
          initial={{ opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-8"
        >
          {/* Result Context Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 p-5 rounded-2xl border border-slate-200/80 gap-4">
            <div className="space-y-0.5">
              <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">Evaluation Profile</span>
              <h4 className="font-extrabold text-slate-900 text-base md:text-lg">{scanResult.job_title}</h4>
              {scanResult.optimizedPdfUrl && (
                <a 
                  href={`/api/workspace/download/scan/${scanResult.id}/optimized`} 
                  download={scanResult.optimizedPdfFileName || "optimized-resume.pdf"}
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-semibold hover:text-emerald-700 transition mt-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Saved Optimized PDF
                </a>
              )}
            </div>
            
            <div className="flex gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setResumeInputMode("paste");
                  setScanResult(null); // Go back and edit original input
                }}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-250 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Adjust Inputs
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-100 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Trigger New Scan
              </button>
            </div>
          </div>
          {scanResult.auditTrace || scanResult.fullResult?.auditTrace ? (
            <ATSReport scan={scanResult} />
          ) : (
            <div className="w-full space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Result Block: Score Display and breakdown stats (4 cols) */}
            <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-md space-y-8">
              <div className="flex justify-between items-start pb-4 border-b border-slate-100">
                <div className="space-y-1.5">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm md:text-base">
                    <BarChart2 className="w-4.5 h-4.5 text-indigo-600" />
                    <span>ATS Match Benchmark</span>
                  </h3>
                  <p className="text-slate-400 text-xs">Computed via standard industry weights</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowScoreExplanation(true)} 
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition border border-indigo-100"
                  title="How is this calculated?"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>How it works</span>
                </button>
              </div>

              {/* Score Circular Match Badge */}
              <div className="flex flex-col items-center justify-center py-4 space-y-4">
                <div className="relative w-40 h-40 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      className="stroke-slate-100"
                      strokeWidth="11"
                      fill="transparent"
                    />
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      className={`${
                        scanResult.ats_score >= 80 
                          ? "stroke-emerald-500" 
                          : scanResult.ats_score >= 65 
                            ? "stroke-amber-500" 
                            : "stroke-red-500"
                      }`}
                      strokeWidth="11"
                      fill="transparent"
                      strokeDasharray="440"
                      strokeDashoffset={440 - (440 * scanResult.ats_score) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-4xl font-black text-slate-800">{scanResult.ats_score}%</span>
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider block mt-1">Match Grade</p>
                  </div>
                </div>

                <div className="text-center">
                  <span className={`px-3 py-1.5 rounded-full text-xs font-bold leading-none border inline-block ${
                    scanResult.ats_score >= 80 
                      ? "text-emerald-800 bg-emerald-50 border-emerald-200" 
                      : scanResult.ats_score >= 65 
                        ? "text-amber-800 bg-amber-50 border-amber-200" 
                        : "text-red-800 bg-red-50 border-red-200"
                  }`}>
                    {scanResult.ats_score >= 80 ? "Optimized — Target Achieved" : scanResult.ats_score >= 65 ? "Fair Match — Fine Tune" : "Poor Match — Extreme Deficit"}
                  </span>
                </div>
              </div>

              {scanResult.overallAssessment && (
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-center space-y-2 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 rounded-l-xl"></div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-indigo-500" /> 
                    AI Assessment
                  </h4>
                  <p className="text-xs text-slate-700 italic leading-relaxed font-medium">
                    "{scanResult.overallAssessment.recommendation || JSON.stringify(scanResult.overallAssessment)}"
                  </p>
                </div>
              )}

              {/* Slider Metrics */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
                    <span className="text-slate-500">Keyword Density Match</span>
                    <span className="text-indigo-600">{scanResult.breakdown?.keywords || scanResult.ats_score}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <motion.div initial={{width:0}} animate={{width:`${scanResult.breakdown?.keywords || scanResult.ats_score}%`}} transition={{duration:1, delay:0.2}} className="h-full bg-indigo-500 rounded-full" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
                    <span className="text-slate-500">Formatting & Syntax Layout</span>
                    <span className="text-emerald-600">{scanResult.breakdown?.format || 80}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <motion.div initial={{width:0}} animate={{width:`${scanResult.breakdown?.format || 80}%`}} transition={{duration:1, delay:0.3}} className="h-full bg-emerald-500 rounded-full" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
                    <span className="text-slate-500">Experience & Title Depth</span>
                    <span className="text-amber-600">{scanResult.breakdown?.experience || 70}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <motion.div initial={{width:0}} animate={{width:`${scanResult.breakdown?.experience || 70}%`}} transition={{duration:1, delay:0.4}} className="h-full bg-amber-500 rounded-full" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Result Block: Advanced Keyword Analytics & Search (8 cols) */}
            <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200 shadow-md space-y-6">
              
              {/* Card Header with Counts */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-slate-100">
                <div className="space-y-0.5">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm md:text-base">
                    <Terminal className="w-4.5 h-4.5 text-indigo-600" />
                    <span>Hiring Keyword Match Audit</span>
                  </h3>
                  <p className="text-slate-400 text-xs">Identified {scanResult.matched_kw.length} matching skills, missing {scanResult.missing_kw.length} recommendations</p>
                </div>

                {/* Segment tab triggers */}
                <div className="flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/40">
                  <button
                    type="button"
                    onClick={() => setKeywordTab("all")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      keywordTab === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                    }`}
                  >
                    All ({scanResult.matched_kw.length + scanResult.missing_kw.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setKeywordTab("matched")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      keywordTab === "matched" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                    }`}
                  >
                    Matched ({scanResult.matched_kw.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setKeywordTab("missing")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      keywordTab === "missing" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                    }`}
                  >
                    Missing ({scanResult.missing_kw.length})
                  </button>
                </div>
              </div>

              {/* Dynamic Keyword Filter Input */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter keywords (e.g. React, SQL, Python)..."
                  value={keywordSearch}
                  onChange={(e) => setKeywordSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>

              {/* Keyword Cloud Container */}
              <div className="space-y-6">
                
                {/* Matched Cloud */}
                {(keywordTab === "all" || keywordTab === "matched") && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Matched In Resume (Green)</h4>
                    <div className="flex flex-wrap gap-2">
                      {filteredMatchedKeywords.map((kw: any, i: number) => {
                        const keyword = getKeywordString(kw);
                        const isEnhanced = typeof kw === 'object';
                        const category = isEnhanced ? kw.category : null;
                        const context = isEnhanced ? kw.context : null;
                        const synonymMatch = isEnhanced ? kw.synonymMatch : false;
                        
                        return (
                          <span 
                            key={i} 
                            className="inline-flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl font-bold border border-emerald-100/50 hover:bg-emerald-100/30 transition-colors cursor-default group relative"
                            title={isEnhanced ? `${category} • Found in ${context}${synonymMatch ? ' (synonym match)' : ''}` : undefined}
                          >
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{keyword}</span>
                            {synonymMatch && <span className="text-[9px] opacity-70">~</span>}
                            {isEnhanced && (
                              <span className="hidden group-hover:block absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10">
                                {category} • {context}{synonymMatch ? ' • synonym' : ''}
                              </span>
                            )}
                          </span>
                        );
                      })}
                      {filteredMatchedKeywords.length === 0 && (
                        <p className="text-xs text-slate-400 italic">No matching keywords fit this criteria.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Missing Cloud */}
                {(keywordTab === "all" || keywordTab === "missing") && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Missing Hard Deficits (Red / Urgent)</h4>
                    <div className="flex flex-wrap gap-2">
                      {filteredMissingKeywords.map((kw: any, i: number) => {
                        const keyword = getKeywordString(kw);
                        const isEnhanced = typeof kw === 'object';
                        const priority = isEnhanced ? kw.priority : 'medium';
                        const category = isEnhanced ? kw.category : null;
                        const suggestion = isEnhanced ? kw.suggestion : null;
                        
                        const priorityColors = {
                          critical: 'bg-red-100 border-red-300 text-red-900',
                          high: 'bg-red-50 border-red-200 text-red-800',
                          medium: 'bg-red-50/80 border-red-150/40 text-red-800',
                          low: 'bg-orange-50 border-orange-200 text-orange-800'
                        };
                        
                        return (
                          <span 
                            key={i} 
                            className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-bold border hover:scale-105 transition-all cursor-default group relative ${priorityColors[priority as keyof typeof priorityColors] || priorityColors.medium}`}
                            title={isEnhanced ? `${category} • Priority: ${priority}${suggestion ? `\n${suggestion}` : ''}` : undefined}
                          >
                            <XCircle className="w-3.5 h-3.5 text-red-500" />
                            <span>{keyword}</span>
                            {priority === 'critical' && <span className="text-[9px]">!</span>}
                            {isEnhanced && suggestion && (
                              <span className="hidden group-hover:block absolute -top-16 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1.5 rounded max-w-xs z-10 text-center">
                                {suggestion}
                              </span>
                            )}
                          </span>
                        );
                      })}
                      {filteredMissingKeywords.length === 0 && (
                        <p className="text-xs text-emerald-600 font-bold">✓ Perfect coverage! No missing target keywords isolated.</p>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>

          {/* Enhanced Analytics Section */}
          {(scanResult.experienceAnalysis || scanResult.formatIssues || scanResult.contactInfo || scanResult.overallAssessment) && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Experience Analysis Card */}
              {scanResult.experienceAnalysis && (
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-md space-y-4">
                  <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2 text-sm">
                    <History className="w-4.5 h-4.5 text-indigo-600" />
                    <span>Experience Analysis</span>
                  </h3>
                  
                  <div className="space-y-3">
                    {scanResult.experienceAnalysis.totalYears !== undefined && (
                      <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                        <span className="text-xs text-slate-600 font-semibold">Total Experience</span>
                        <span className="text-sm font-black text-slate-900">
                          {scanResult.experienceAnalysis.totalYears} years
                        </span>
                      </div>
                    )}
                    
                    {scanResult.experienceAnalysis.progression && (
                      <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                        <span className="text-xs text-slate-600 font-semibold">Career Progression</span>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                          scanResult.experienceAnalysis.progression === 'excellent' ? 'bg-emerald-100 text-emerald-700' :
                          scanResult.experienceAnalysis.progression === 'good' ? 'bg-blue-100 text-blue-700' :
                          scanResult.experienceAnalysis.progression === 'fair' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {scanResult.experienceAnalysis.progression}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                      <span className="text-xs text-slate-600 font-semibold">Quantified Results</span>
                      <span className="text-sm font-black text-slate-900">
                        {scanResult.experienceAnalysis.quantifiedAchievements}/{scanResult.experienceAnalysis.totalBullets}
                      </span>
                    </div>
                    
                    {scanResult.experienceAnalysis.gaps && scanResult.experienceAnalysis.gaps.length > 0 && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-xs text-amber-800 font-semibold mb-1">Employment Gaps Detected</p>
                        <p className="text-[10px] text-amber-700">{scanResult.experienceAnalysis.gaps.join(', ')}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Format Issues Card */}
              {scanResult.formatIssues && scanResult.formatIssues.length > 0 && (
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-md space-y-4">
                  <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2 text-sm">
                    <AlertTriangle className="w-4.5 h-4.5 text-amber-600" />
                    <span>Format Issues ({scanResult.formatIssues.length})</span>
                  </h3>
                  
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                    {scanResult.formatIssues.map((issue: any, idx: number) => (
                      <div key={idx} className={`p-3 rounded-lg border ${
                        issue.severity === 'critical' ? 'bg-red-50 border-red-200' :
                        issue.severity === 'high' ? 'bg-orange-50 border-orange-200' :
                        issue.severity === 'medium' ? 'bg-amber-50 border-amber-200' :
                        'bg-yellow-50 border-yellow-200'
                      }`}>
                        <div className="flex items-start gap-2">
                          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            issue.severity === 'critical' ? 'bg-red-100 text-red-700' :
                            issue.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                            issue.severity === 'medium' ? 'bg-amber-100 text-amber-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {issue.severity}
                          </span>
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-slate-800">{issue.message}</p>
                            {issue.fix && <p className="text-[10px] text-slate-600 mt-1">Fix: {issue.fix}</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact Info & Overall Assessment Card */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-md space-y-4">
                {scanResult.contactInfo && (
                  <>
                    <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2 text-sm">
                      <FileText className="w-4.5 h-4.5 text-indigo-600" />
                      <span>Contact Information</span>
                    </h3>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                        <span className="text-xs text-slate-600">Email</span>
                        {scanResult.contactInfo.hasEmail ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                      <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                        <span className="text-xs text-slate-600">Phone</span>
                        {scanResult.contactInfo.hasPhone ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                      {scanResult.contactInfo.hasLinkedIn !== undefined && (
                        <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                          <span className="text-xs text-slate-600">LinkedIn</span>
                          {scanResult.contactInfo.hasLinkedIn ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
                
                {scanResult.overallAssessment && (
                  <>
                    <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2 text-sm mt-6">
                      <Target className="w-4.5 h-4.5 text-indigo-600" />
                      <span>Overall Assessment</span>
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                        <p className="text-xs text-indigo-600 font-semibold mb-1">ATS Compatibility</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${
                                scanResult.overallAssessment.atsCompatibility >= 80 ? 'bg-emerald-500' :
                                scanResult.overallAssessment.atsCompatibility >= 60 ? 'bg-amber-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${scanResult.overallAssessment.atsCompatibility}%` }}
                            />
                          </div>
                          <span className="text-sm font-black text-indigo-900">{scanResult.overallAssessment.atsCompatibility}%</span>
                        </div>
                      </div>
                      
                      <div className={`p-3 rounded-lg border font-semibold text-xs text-center ${
                        scanResult.overallAssessment.recommendation === 'strong_match' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                        scanResult.overallAssessment.recommendation === 'potential_match' ? 'bg-blue-50 border-blue-200 text-blue-800' :
                        scanResult.overallAssessment.recommendation === 'weak_match' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                        'bg-red-50 border-red-200 text-red-800'
                      }`}>
                        {scanResult.overallAssessment.recommendation.replace(/_/g, ' ').toUpperCase()}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Strengths & AI Suggestions Panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Strengths */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-md space-y-4">
              <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2 text-sm md:text-base">
                <Award className="w-5 h-5 text-emerald-600" />
                <span>Detected Resume Strengths</span>
              </h3>
              
              <div className="space-y-3">
                {scanResult.strengths?.map((strength: any, idx: number) => {
                  const isEnhanced = typeof strength === 'object';
                  const text = getStrengthText(strength);
                  const category = isEnhanced ? strength.category : 'general';
                  
                  return (
                    <div key={idx} className="p-4 bg-emerald-50/50 border border-emerald-100/50 rounded-xl flex gap-3 text-emerald-900 text-xs md:text-sm">
                      <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        {isEnhanced && <span className="text-[9px] font-bold uppercase text-emerald-600 block mb-1">{category}</span>}
                        <p className="leading-relaxed font-semibold">{text}</p>
                      </div>
                    </div>
                  );
                })}
                {(!scanResult.strengths || scanResult.strengths.length === 0) && (
                  <p className="text-sm text-slate-500 italic">No significant quantitative metrics extracted. Try including statistics.</p>
                )}
              </div>
            </div>

            {/* Suggestions with Lock Blocked Gate */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-md space-y-4">
              <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2 text-sm md:text-base">
                <Lightbulb className="w-5 h-5 text-indigo-600" />
                <span>AI Bullet Optimization Blueprint</span>
              </h3>
              
              <div className="space-y-3 relative">
                {scanResult.suggestions?.sort((a: any, b: any) => (b.priority || 5) - (a.priority || 5)).map((sug: any, idx: number) => {
                  const isFreePlan = !currentUser?.plan || currentUser.plan.toLowerCase() === "free";
                  const isLocked = isFreePlan && idx >= 3;
                  
                  const sugType = typeof sug === "string" ? "tip" : sug.type || "tip";
                  const sugText = typeof sug === "string" ? sug : sug.text || sug;
                  const sugCategory = sug.category || 'general';
                  const sugPriority = sug.priority || 5;
                  
                  const typeColors = {
                    critical: "bg-red-50 border-red-200 text-red-800",
                    improvement: "bg-blue-50 border-blue-200 text-blue-800",
                    tip: "bg-amber-50 border-amber-200 text-amber-800"
                  };
                  
                  const iconColors = {
                    critical: "text-red-600",
                    improvement: "text-blue-600",
                    tip: "text-amber-600"
                  };
                  
                  const badgeColors = {
                    critical: "bg-red-100 text-red-700",
                    improvement: "bg-blue-100 text-blue-700",
                    tip: "bg-amber-100 text-amber-700"
                  };

                  return (
                    <div key={idx} className={`p-4 ${typeColors[sugType as keyof typeof typeColors] || typeColors.tip} border rounded-xl flex gap-3 text-xs md:text-sm relative overflow-hidden`}>
                      <div className={isLocked ? "filter blur-[6px] select-none flex gap-3 opacity-60 w-full" : "flex gap-3 w-full"}>
                        <Lightbulb className={`w-5 h-5 ${iconColors[sugType as keyof typeof iconColors] || iconColors.tip} shrink-0 mt-0.5`} />
                        <div className="w-full">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-sm ${badgeColors[sugType as keyof typeof badgeColors] || badgeColors.tip}`}>{sugType}</span>
                            <span className="text-[9px] uppercase font-bold text-slate-500 px-2 py-0.5 bg-slate-100 rounded-sm">{sugCategory}</span>
                            {sugPriority >= 8 && <span className="text-[9px] font-bold text-red-600">⚡ HIGH PRIORITY</span>}
                          </div>
                          <p className="leading-relaxed font-semibold">{sugText}</p>
                        </div>
                      </div>
                      {isLocked && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/40 z-10 backdrop-blur-[1px]">
                          <Lock className="w-6 h-6 text-slate-800 mb-1" />
                          <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Premium Core Insight Locked</span>
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {(!currentUser?.plan || currentUser.plan.toLowerCase() === "free") && scanResult.suggestions && scanResult.suggestions.length > 3 && (
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={onUpgrade}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition hover:scale-102 cursor-pointer"
                    >
                      Unlock All Career Pro Insights
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          </div>
          )}

          {/* Premium Resume Editor & Export Area (Always Shown) */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-md space-y-6 mt-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-slate-100 pb-4 gap-4">
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm md:text-base">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  <span>Interactive Smart Resume workspace</span>
                </h3>
                <p className="text-slate-400 text-xs">Edit real-time content changes matching suggestions, then export to premium PDF</p>
              </div>

              <button
                type="button"
                onClick={handleExportOptimizedPDF}
                disabled={exportingPdf}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-indigo-100 self-start sm:self-auto"
              >
                {exportingPdf ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" /> Export Optimized PDF
                  </>
                )}
              </button>
            </div>

            <textarea
              value={editedResumeText}
              onChange={(e) => setEditedResumeText(e.target.value)}
              className="w-full h-80 p-4 text-xs font-mono border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/30"
              placeholder="Workspace text content..."
            />
          </div>


          {/* Premium Bottom CTA card */}
          {(!currentUser?.plan || currentUser.plan.toLowerCase() === "free") && (
            <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl border border-indigo-500/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 rounded-full blur-2xl" />
              <div className="space-y-2 max-w-xl text-center md:text-left z-10">
                <span className="bg-indigo-600 text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full inline-block">
                  Pro Upgrades Available
                </span>
                <h3 className="text-xl md:text-2xl font-black tracking-tight leading-tight">Generate premium cover letters and career logs</h3>
                <p className="text-slate-400 text-xs md:text-sm leading-relaxed">
                  Unlock unlimited matcher requests, semantic cover letter copy generation, advanced ATS profile rewriters, and custom interview blueprints.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto shrink-0 z-10">
                <button
                  type="button"
                  onClick={() => onNavigate("tools")}
                  className="px-5 py-3 bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold rounded-xl text-center cursor-pointer transition border border-slate-700"
                >
                  Explore AI Tools First
                </button>
                <button
                  type="button"
                  onClick={onUpgrade}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl text-center cursor-pointer transition shadow-lg shadow-indigo-950/40"
                >
                  Unlock Career Pro
                </button>
              </div>
            </div>
          )}
          {/* Score Explanation Modal */}
      <AnimatePresence>
        {showScoreExplanation && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-100 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowScoreExplanation(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl relative border border-slate-100"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setShowScoreExplanation(false)}
                className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 bg-slate-100 p-1.5 rounded-full transition"
              >
                <XCircle className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                  <BarChart2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">How your ATS Score is Calculated</h2>
                  <p className="text-sm text-slate-500">Industry-standard weighting algorithm</p>
                </div>
              </div>

              <div className="space-y-6 text-sm text-slate-600 leading-relaxed">
                <p>
                  Your ATS Match Grade is not a random number. It is carefully calculated using a weighted algorithm based on what modern Applicant Tracking Systems (like Workday, Taleo, and Greenhouse) actually parse:
                </p>

                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex justify-between font-bold text-slate-900 mb-1">
                      <span>Keyword Density Match (40%)</span>
                      <span className="text-indigo-600">Highest Impact</span>
                    </div>
                    <p className="text-xs text-slate-500">Evaluates how well your resume's keywords match the target job description. Missing "Hard Skills" will heavily penalize this score.</p>
                  </div>
                  
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex justify-between font-bold text-slate-900 mb-1">
                      <span>Experience & Title Depth (20%)</span>
                    </div>
                    <p className="text-xs text-slate-500">Analyzes the seniority of your past titles and the quantified achievements (e.g., "Increased sales by 20%") in your bullet points.</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex justify-between font-bold text-slate-900 mb-1">
                      <span>Formatting & Syntax (15%)</span>
                    </div>
                    <p className="text-xs text-slate-500">Checks if your resume can be safely parsed by a machine without failing on weird fonts, bad tables, or missing contact info.</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex justify-between font-bold text-slate-900 mb-1">
                      <span>Core Fundamentals (25%)</span>
                    </div>
                    <p className="text-xs text-slate-500">Checks for essential components like Contact Info (5%), Summary (5%), Education (5%), Projects (5%), and Grammar (3%).</p>
                  </div>
                </div>
                
                <p className="text-xs text-slate-400 text-center italic mt-4">
                  Trust the algorithm. Optimize your red deficits until your score turns green.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
      )}
    </div>
  );
}
