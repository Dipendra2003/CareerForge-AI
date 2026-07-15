import SEOMeta from '../components/SEOMeta';
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "motion/react";
import { BarChart2, Terminal, CheckCircle, XCircle, Lightbulb, CheckSquare, RefreshCw, FileSearch } from "lucide-react";
import { Scan } from "../types";

export default function PublicScanPage() {
  const { id } = useParams();
  const [scanResult, setScanResult] = useState<Scan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    fetchScan();
  }, [id]);

  const fetchScan = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/public/scans/${id}`);
      if (!res.ok) {
        throw new Error("Scan not found or server error");
      }
      const data = await res.json();
      setScanResult(data.scan);
    } catch (err) {
      setErrorText("This scan result is not available or does not exist.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center p-6">
      <SEOMeta pageKey="public-scan" />
        <div className="text-center text-slate-500 text-sm">
          Loading scan results...
        </div>
      </div>
    );
  }

  if (errorText || !scanResult) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 space-y-4">
        <div className="p-4 bg-slate-100 rounded-full">
          <FileSearch className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Scan Not Found</h2>
        <p className="text-slate-500 text-sm text-center max-w-sm">
          {errorText || "We couldn't locate this scan result. It may have been deleted or the link is invalid."}
        </p>
        <Link to="/" className="mt-4 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-sm transition shadow cursor-pointer">
          Create Your Own Scan
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl xl:max-w-7xl 2xl:max-w-[90rem] mx-auto space-y-10 pb-16 px-4 xl:px-8 pt-10">
      {/* Header */}
      <div className="text-center space-y-2">
        <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
          Public Scan Result
        </span>
        <h1 className="text-2xl md:text-3xl font-extrabold font-display text-slate-900 tracking-tight">ATS Resume Match Profile</h1>
        <p className="text-slate-600 max-w-xl mx-auto text-sm md:text-base">
          This is a shared, read-only analysis report.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-8"
      >
        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <p className="text-slate-500 text-xs">Targeted Target Title Assessed:</p>
            <h4 className="font-bold text-slate-800 text-sm md:text-base">{scanResult.job_title}</h4>
          </div>
          <Link
            to="/"
            className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-200 rounded-lg flex items-center gap-1 cursor-pointer shadow-xs"
          >
            Create Your Own
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 text-center md:text-left">
            <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2 text-sm">
              <BarChart2 className="w-4 h-4 text-indigo-600" /> ATS Match Score
            </h3>

            <div className="flex flex-col items-center justify-center py-2 space-y-2">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="72"
                    cy="72"
                    r="64"
                    className="stroke-slate-100"
                    strokeWidth="10"
                    fill="transparent"
                  />
                  <circle
                    cx="72"
                    cy="72"
                    r="64"
                    className={`${
                      scanResult.ats_score >= 80 
                        ? "stroke-emerald-500" 
                        : scanResult.ats_score >= 65 
                          ? "stroke-amber-500" 
                          : "stroke-red-500"
                    }`}
                    strokeWidth="10"
                    fill="transparent"
                    strokeDasharray="402"
                    strokeDashoffset={402 - (402 * scanResult.ats_score) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-4xl font-extrabold text-slate-800">{scanResult.ats_score}%</span>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">Match Score</p>
                </div>
              </div>

              <div className="text-center pt-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold leading-none ${
                  scanResult.ats_score >= 80 
                    ? "text-emerald-800 bg-emerald-50 border border-emerald-100" 
                    : scanResult.ats_score >= 65 
                      ? "text-amber-800 bg-amber-50 border border-amber-100" 
                      : "text-red-800 bg-red-50 border border-red-100"
                }`}>
                  {scanResult.ats_score >= 80 ? "Good — Matches Market Standards" : scanResult.ats_score >= 65 ? "Fair Match — Improvements Needed" : "Deficit — High Risk of Rejection"}
                </span>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100 mt-6">
              {[
                { label: 'Keywords', value: scanResult.breakdown?.keywords || scanResult.ats_score, color: 'bg-indigo-500' },
                { label: 'Format', value: scanResult.breakdown?.format || 80, color: 'bg-emerald-500' },
                { label: 'Experience', value: scanResult.breakdown?.experience || 70, color: 'bg-amber-500' },
                { label: 'Skills', value: scanResult.breakdown?.skills || scanResult.ats_score, color: 'bg-blue-500' },
              ].map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
                    <span>{item.label}</span>
                    <span>{item.value}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <motion.div initial={{width:0}} animate={{width:`${item.value}%`}} transition={{duration:1, delay:0.2 + (i*0.1)}} className={`h-full ${item.color} rounded-full`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2 text-sm">
              <Terminal className="w-4 h-4 text-indigo-600" /> Keyword Analysis List
            </h3>

            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Identified in Resume (Green = Matching)</h4>
                <div className="flex flex-wrap gap-2">
                  {scanResult.matched_kw?.map((kw, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-xs text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl font-bold border border-emerald-100/60">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> {kw}
                    </span>
                  ))}
                  {(!scanResult.matched_kw || scanResult.matched_kw.length === 0) && (
                    <p className="text-xs text-slate-400">No matching technical skills isolated.</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Missing Deficit Keywords (Red = Action Needed)</h4>
                <div className="flex flex-wrap gap-2">
                  {scanResult.missing_kw?.map((kw, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-xs text-red-800 bg-red-50 px-3 py-1.5 rounded-xl font-bold border border-red-100/60">
                      <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" /> {kw}
                    </span>
                  ))}
                  {(!scanResult.missing_kw || scanResult.missing_kw.length === 0) && (
                    <p className="text-xs text-emerald-600 font-semibold">✓ Outstanding! Your resume contains all target JD criteria skills.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2 text-sm">
            <Lightbulb className="w-4 h-4 text-indigo-600" /> AI-Generated Formatting Suggestions
          </h3>
          
          <div className="space-y-3">
            {scanResult.suggestions?.map((sug, idx) => (
              <div key={idx} className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl flex gap-3 text-slate-700 text-xs md:text-sm">
                <CheckSquare className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed font-medium">{typeof sug === 'string' ? sug : sug.text}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
