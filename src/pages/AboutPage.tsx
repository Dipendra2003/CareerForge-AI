import SEOMeta from '../components/SEOMeta';
import { Users, Code, Zap } from "lucide-react";
import { useSystemSettings } from "../contexts/SystemSettingsContext";
import { useNavigate } from "react-router-dom";

export default function AboutPage() {
  const { settings } = useSystemSettings();
  const navigate = useNavigate();
  const companyName = settings.companyName || 'CareerForge AI';

  return (
    <div className="space-y-12 animate-in fade-in duration-500 max-w-4xl xl:max-w-7xl 2xl:max-w-[90rem] mx-auto py-8 xl:py-12 px-4 xl:px-8">
      <SEOMeta pageKey="about" />
      <div className="text-center space-y-4">
        <h1 className="text-3xl md:text-5xl font-black font-display text-slate-900 tracking-tight">Leveling the Playing Field</h1>
        <p className="text-slate-500 max-w-2xl mx-auto md:text-lg">
          We built {companyName} because modern hiring is broken. Applicants throw resumes into black-box ATS algorithms and never hear back. We want to put algorithmic power back into the hands of the job seeker.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs text-center space-y-3">
          <div className="mx-auto w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
            <Code className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900">Engineered Precision</h3>
          <p className="text-sm text-slate-500">We don't use simple keyword matching. Our Gemini-backed models understand context, synonyms, and impact.</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs text-center space-y-3">
          <div className="mx-auto w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900">Privacy First</h3>
          <p className="text-sm text-slate-500">Your professional timeline is private. We strictly adhere to relational security protocols and never use your data for generic model training.</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs text-center space-y-3">
          <div className="mx-auto w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-4">
            <Zap className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900">Actionable Velocity</h3>
          <p className="text-sm text-slate-500">No complex dashboards. Every feature is designed for speed so you can iterate on your application and apply faster.</p>
        </div>
      </div>

      <div className="bg-slate-900 text-white rounded-3xl p-8 md:p-12 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-8 mt-12">
        <div className="space-y-4 max-w-xl">
          <h2 className="text-2xl md:text-3xl font-bold">Ready to outsmart the algorithm?</h2>
          <p className="text-slate-400">Join thousands of developers and professionals who have accelerated their job search with algorithmic alignment.</p>
        </div>
        <button onClick={() => navigate('/analyze')} className="px-6 py-3.5 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-xl whitespace-nowrap transition cursor-pointer shadow-sm">
          Start Scanning Today
        </button>
      </div>
    </div>
  );
}
