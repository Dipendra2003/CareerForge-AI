import { useState, useEffect } from "react";
import apiClient from "../../lib/apiClient";
import { BarChart3, Users, FileText, CreditCard, Activity, TrendingUp, Calendar, Download, Server, Database, UserMinus, ShieldCheck } from "lucide-react";
import { format, subDays } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function AdminAnalytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30'); // 'today', '7', '30', '90', '365', 'custom'
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  useEffect(() => {
    if (dateRange !== 'custom' || (customFrom && customTo)) {
      fetchAnalytics();
    }
  }, [dateRange, customFrom, customTo]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      let from, to;
      const today = new Date();
      
      if (dateRange === 'today') {
        from = format(today, 'yyyy-MM-dd');
      } else if (dateRange !== 'custom') {
        from = format(subDays(today, parseInt(dateRange)), 'yyyy-MM-dd');
      } else {
        from = customFrom;
        to = customTo;
      }

      let url = '/admin/analytics';
      if (from) url += `?from=${from}`;
      if (to) url += from ? `&to=${to}` : `?to=${to}`;

      const res = await apiClient.get(url);
      setData(res.data);
    } catch (err: any) {
      console.error('Failed to fetch analytics:', err);
      // Show error state instead of infinite loading
      setData(null);
      // Optionally show toast notification if toast context is available
    } finally {
      setLoading(false);
    }
  };

  const getExportSummary = () => {
    if (!data) return [];
    return [
      { Metric: "Total Users", Value: data.users.total.toString() },
      { Metric: "Monthly Active Users", Value: data.users.active.toString() },
      { Metric: "Verified Users", Value: data.users.verified.toString() },
      { Metric: "Total Scans", Value: data.ats.totalScans.toString() },
      { Metric: "Total AI Requests", Value: data.ai.totalRequests.toString() },
      { Metric: "Total Revenue (MRR)", Value: `$${data.billing.mrr.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` },
      { Metric: "Total Revenue (ARR)", Value: `$${data.billing.arr.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` },
      { Metric: "Retention Rate", Value: `${data.users.retentionRate.toFixed(1)}%` },
      { Metric: "Churn Rate", Value: `${data.subscriptions.churnRate.toFixed(1)}%` },
    ];
  };

  const exportCSV = () => {
    const summary = getExportSummary();
    if (summary.length === 0) return;
    const csv = Papa.unparse(summary);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `careerforgeai-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const exportExcel = () => {
    const summary = getExportSummary();
    if (summary.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(summary);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Analytics");
    XLSX.writeFile(wb, `careerforgeai-analytics-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const exportPDF = () => {
    const summary = getExportSummary();
    if (summary.length === 0) return;
    const doc = new jsPDF();
    doc.text("CareerForge AI Analytics Report", 14, 15);
    doc.text(`Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`, 14, 25);
    
    const tableData = summary.map(item => [item.Metric, item.Value]);

    (doc as any).autoTable({
      startY: 30,
      head: [["Metric", "Value"]],
      body: tableData,
    });

    doc.save(`careerforgeai-analytics-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const renderCard = (title: string, value: string | number, icon: any, colorClass: string, subtitle?: string, gradient?: string) => (
    <div className={`relative overflow-hidden bg-white/80 backdrop-blur-xl p-5 rounded-2xl border border-white/40 shadow-sm hover:shadow-md transition-all duration-300 group`}>
      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-20 blur-2xl group-hover:opacity-40 transition-opacity ${gradient || 'bg-indigo-500'}`}></div>
      <div className="flex items-start gap-4 relative z-10">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${colorClass} shadow-inner bg-white/50 backdrop-blur-sm`}>
          {icon}
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{title}</div>
          <div className="text-3xl font-black text-slate-800 mt-1 tracking-tight">{value}</div>
          {subtitle && <div className="text-xs font-medium text-slate-400 mt-2 flex items-center gap-1">{subtitle}</div>}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="space-y-8 max-w-7xl xl:max-w-[96rem] mx-auto pb-12">
      
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/40 backdrop-blur-3xl p-6 rounded-3xl border border-white/50 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <div className="bg-indigo-600/10 p-2 rounded-xl"><BarChart3 className="w-8 h-8 text-indigo-600" /></div>
            Analytics Command Center
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Real-time metrics, revenue, and API health across the entire platform.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-white/60 backdrop-blur-md border border-white/60 rounded-xl p-1.5 shadow-sm">
            <select 
              value={dateRange} 
              onChange={e => setDateRange(e.target.value)}
              className="text-sm border-none bg-transparent py-1.5 pl-3 pr-8 focus:ring-0 text-slate-800 font-bold cursor-pointer"
            >
              <option value="today">Today</option>
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="365">Last 1 Year</option>
              <option value="custom">Custom Date</option>
            </select>
          </div>

          {dateRange === 'custom' && (
            <div className="flex items-center gap-2">
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="text-sm border-white/60 bg-white/60 backdrop-blur-md rounded-xl p-2 font-medium text-slate-700" />
              <span className="text-slate-400 font-bold">to</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="text-sm border-white/60 bg-white/60 backdrop-blur-md rounded-xl p-2 font-medium text-slate-700" />
            </div>
          )}

          <div className="flex items-center gap-1 bg-indigo-600 border-indigo-700 rounded-xl p-1 shadow-lg shadow-indigo-600/20">
            <button onClick={exportCSV} className="text-xs font-bold px-4 py-2 hover:bg-white/20 rounded-lg text-white transition-colors flex items-center gap-2"><Download className="w-4 h-4"/> CSV</button>
            <button onClick={exportExcel} className="text-xs font-bold px-4 py-2 hover:bg-white/20 rounded-lg text-white transition-colors flex items-center gap-2"><Download className="w-4 h-4"/> Excel</button>
            <button onClick={exportPDF} className="text-xs font-bold px-4 py-2 hover:bg-white/20 rounded-lg text-white transition-colors flex items-center gap-2"><Download className="w-4 h-4"/> PDF</button>
          </div>
        </div>
      </div>

      {loading && !data ? (
        <div className="p-24 flex justify-center items-center flex-col gap-4">
            <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-100"></div>
                <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
            </div>
            <div className="text-indigo-600 font-bold animate-pulse">Syncing Stripe & Database...</div>
        </div>
      ) : !data || !data.users ? (
        <div className="p-12 text-center bg-white/50 backdrop-blur-md rounded-3xl border border-white/50">
            <div className="text-slate-400 font-medium text-lg">No data available for this period.</div>
        </div>
      ) : (
        <div className="space-y-10">
          {/* SECTION 1: USER ANALYTICS */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-200/50 pb-4">
                <Users className="w-6 h-6 text-slate-800" />
                <h2 className="text-xl font-black text-slate-800">User Growth & Retention</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {renderCard("Total Users", data.users.total.toLocaleString(), <Users className="w-6 h-6"/>, "text-blue-600", "", "bg-blue-500")}
              {renderCard("Monthly Active Users", data.users.active.toLocaleString(), <Activity className="w-6 h-6"/>, "text-emerald-600", "Logged in last 30 days", "bg-emerald-500")}
              {renderCard("Retention Rate", `${data.users.retentionRate.toFixed(1)}%`, <ShieldCheck className="w-6 h-6"/>, "text-indigo-600", "Users retained > 30 days", "bg-indigo-500")}
              {renderCard("Verified Users", data.users.verified.toLocaleString(), <Users className="w-6 h-6"/>, "text-sky-600", `${data.users.total > 0 ? Math.round(data.users.verified/data.users.total*100) : 0}% of total`, "bg-sky-500")}
            </div>
            
            <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl border border-white/50 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-500" /> Signups Over Time
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.users.dailySignups}>
                    <defs>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} tickMargin={15} minTickGap={20} axisLine={false} tickLine={false} />
                    <YAxis tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Area type="monotone" dataKey="count" name="New Users" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* SECTION 2: SUBSCRIPTIONS & BILLING */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-200/50 pb-4">
                <CreditCard className="w-6 h-6 text-slate-800" />
                <h2 className="text-xl font-black text-slate-800">Stripe Billing & Subscriptions</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {renderCard("Real MRR", `$${data.billing.mrr.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, <CreditCard className="w-6 h-6"/>, "text-green-600", "Via Stripe API", "bg-green-500")}
              {renderCard("Real ARR", `$${data.billing.arr.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, <TrendingUp className="w-6 h-6"/>, "text-teal-600", "Via Stripe API", "bg-teal-500")}
              {renderCard("Active Subs", data.subscriptions.active.toLocaleString(), <Activity className="w-6 h-6"/>, "text-purple-600", "", "bg-purple-500")}
              {renderCard("Churn Rate", `${data.subscriptions.churnRate.toFixed(1)}%`, <UserMinus className="w-6 h-6"/>, "text-red-600", "Cancellations / Total", "bg-red-500")}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl border border-white/50 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Plan Distribution</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.subscriptions.byPlan}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={110}
                        paddingAngle={5}
                        dataKey="_count.plan"
                        nameKey="plan"
                        label={(entry: any) => `${entry.plan.toUpperCase()}: ${entry.value}`}
                        stroke="none"
                      >
                        {data.subscriptions.byPlan.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl border border-white/50 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Subscription Breakdown</h3>
                <div className="space-y-4 mt-8">
                  <div className="flex justify-between items-center py-4 border-b border-slate-100 group">
                    <span className="text-slate-500 font-semibold uppercase tracking-wider text-sm">Free Users</span>
                    <span className="text-slate-900 font-black text-xl group-hover:scale-110 transition-transform">{data.subscriptions.free.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-4 border-b border-slate-100 group">
                    <span className="text-purple-500 font-semibold uppercase tracking-wider text-sm flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-purple-500"></div>Pro Users</span>
                    <span className="text-slate-900 font-black text-xl group-hover:scale-110 transition-transform">{data.subscriptions.pro.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-4 group">
                    <span className="text-teal-500 font-semibold uppercase tracking-wider text-sm flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-teal-500"></div>Annual Users</span>
                    <span className="text-slate-900 font-black text-xl group-hover:scale-110 transition-transform">{data.subscriptions.annual.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 3: ATS & AI */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-200/50 pb-4">
                <Server className="w-6 h-6 text-slate-800" />
                <h2 className="text-xl font-black text-slate-800">AI Tool Usage & Infrastructure</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {renderCard("API Hits", data.system.totalApiRequests.toLocaleString(), <Server className="w-6 h-6"/>, "text-indigo-600", "Total Server Requests", "bg-indigo-500")}
              {renderCard("Total ATS Scans", data.ats.totalScans.toLocaleString(), <FileText className="w-6 h-6"/>, "text-cyan-600", "", "bg-cyan-500")}
              {renderCard("Avg ATS Score", Math.round(data.ats.avgScore).toString(), <Activity className="w-6 h-6"/>, "text-amber-600", "", "bg-amber-500")}
              {renderCard("Storage Used", `${(data.storage.totalBytesUsed / (1024*1024)).toFixed(2)} MB`, <Database className="w-6 h-6"/>, "text-slate-700", "", "bg-slate-500")}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl border border-white/50 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Daily ATS Scans</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.ats.dailyScans}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                      <YAxis tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="count" name="Scans" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl border border-white/50 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-lg font-bold text-slate-800 mb-6">AI Feature Usage (Exact)</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.ai.featureUsage} layout="vertical" margin={{left: 30}}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" tick={{fontSize: 13, fill: '#334155', fontWeight: 600}} width={120} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="count" name="Generations" fill="#8b5cf6" radius={[0, 6, 6, 0]}>
                         {data.ai.featureUsage.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl border border-white/50 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-lg font-bold text-slate-800 mb-6">Top Job Titles Targetted</h3>
              {data.ats.topJobTitles.length === 0 ? (
                <div className="text-slate-500 font-medium p-4 bg-slate-50 rounded-xl">No active scans for this period.</div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {data.ats.topJobTitles.map((job: any, i: number) => (
                    <div key={i} className="bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm text-sm font-bold text-slate-700 flex items-center gap-3 hover:-translate-y-1 hover:shadow-md hover:border-indigo-200 transition-all cursor-default">
                      {job.name} 
                      <span className="text-xs bg-indigo-100 px-2.5 py-1 rounded-lg text-indigo-700">{job.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

        </div>
      )}
      </div>
    </>
  );
}
