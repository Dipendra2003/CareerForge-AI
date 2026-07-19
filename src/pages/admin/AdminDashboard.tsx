import { useEffect, useState } from "react";
import apiClient from "../../lib/apiClient";
import { Users, CreditCard, Activity, FileText, CheckCircle, Shield, AlertTriangle, UserPlus, TrendingUp } from "lucide-react";

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await apiClient.get("/admin/dashboard");
        setData(res.data);
      } catch (error) {
      // Securely log the error without leaking stack traces or sensitive data
      console.error('An error occurred during this operation.');
    } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <>
        <div className="flex h-full items-center justify-center text-slate-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-3"></div>
          Loading Dashboard...
        </div>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <div className="flex h-full items-center justify-center text-red-500 bg-red-50 rounded-xl p-6">
          <AlertTriangle className="w-5 h-5 mr-2" />
          Failed to load dashboard stats.
        </div>
      </>
    );
  }

  const { stats, recentSignups, latestScans, recentSuspensions } = data;

  const statCards = [
    { name: "Total Users", value: stats.totalUsers, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { name: "Active Accounts", value: stats.activeUsers, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
    { name: "Suspended Users", value: stats.suspendedUsers, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
    { name: "Today's Signups", value: stats.todaySignups, icon: UserPlus, color: "text-indigo-600", bg: "bg-indigo-50" },
    { name: "Month's Signups", value: stats.monthSignups, icon: TrendingUp, color: "text-indigo-600", bg: "bg-indigo-50" },
    { name: "Today's Scans", value: stats.todayScans, icon: FileText, color: "text-cyan-600", bg: "bg-cyan-50" },
    { name: "Month's Scans", value: stats.monthScans, icon: Activity, color: "text-cyan-600", bg: "bg-cyan-50" },
    { name: "Free Users", value: stats.freeUsers, icon: Activity, color: "text-slate-600", bg: "bg-slate-50" },
    { name: "Paid Users", value: stats.proUsers, icon: CreditCard, color: "text-purple-600", bg: "bg-purple-50" },
    { name: "Total Scans", value: stats.totalScans, icon: FileText, color: "text-teal-600", bg: "bg-teal-50" },
    { name: "Admin Users", value: stats.adminUsers, icon: Shield, color: "text-orange-600", bg: "bg-orange-50" },
  ];

  return (
    <>
      <div className="space-y-6 animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-slate-900">Overview</h1>
          <p className="text-sm text-slate-500">System statistics and latest activities</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {statCards.map((card) => (
            <div key={card.name} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center">
              <div className={`p-3 rounded-lg ${card.bg}`}>
                <card.icon className={`w-6 h-6 ${card.color}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-500">{card.name}</p>
                <p className="text-2xl font-bold text-slate-900">{card.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Signups */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">Recent Signups</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {recentSignups.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">No recent signups.</div>
              ) : recentSignups.map((user: any) => (
                <div key={user.id} className="p-4 px-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-xs">
                      {user.name?.[0] || user.email[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{user.name || "Unnamed"}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-medium text-slate-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </span>
                    <div className="mt-1">
                       <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                          {user.plan || "Free"}
                       </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Scans */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">Recent Scans</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {latestScans.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">No recent scans.</div>
              ) : latestScans.map((scan: any) => (
                <div key={scan.id} className="p-4 px-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="max-w-[60%]">
                    <p className="text-sm font-semibold text-slate-800 truncate">{scan.jobTitle || 'Untitled Scan'}</p>
                    <p className="text-xs text-slate-500 truncate">{scan.user.email}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex flex-col items-end gap-1">
                      <div className={`px-2 py-0.5 rounded-full flex items-center justify-center font-bold text-xs ${
                        scan.atsScore >= 80 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        scan.atsScore >= 60 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {scan.atsScore}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Suspensions */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">Recent Suspensions</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {!recentSuspensions || recentSuspensions.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500 flex flex-col items-center">
                   <Shield className="w-8 h-8 text-emerald-300 mb-2" />
                   No recent account suspensions.
                </div>
              ) : recentSuspensions.map((user: any) => (
                <div key={user.id} className="p-4 px-6 flex flex-col justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <p className="text-sm font-semibold text-slate-800 truncate">{user.email}</p>
                    </div>
                    <span className="text-xs font-medium text-slate-400">
                      {new Date(user.suspendedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 bg-slate-100 p-2 rounded">
                    {user.suspensionReason || 'No reason provided'}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
