import SEOMeta from '../components/SEOMeta';
import { useState, useEffect } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import apiClient, { setAccessToken } from "../lib/apiClient";
import { ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { isAuthenticated, fetchUserRecord, user: currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFaCode, setTwoFaCode] = useState("");
  const [tempToken, setTempToken] = useState("");
  const [requires2FA, setRequires2FA] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("error") === "account_suspended") {
      setError("Your account has been suspended. Please contact support.");
    }
    const token = params.get("tempToken");
    if (token) {
      setRequires2FA(true);
      setTempToken(token);
    }
  }, [location]);


  if (isAuthenticated) {
    if ((currentUser as any)?.role === "admin") {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (requires2FA) {
        const res = await apiClient.post("/auth/verify-2fa", { tempToken, code: twoFaCode });
        try {
          if (rememberMe) {
            localStorage.setItem('remember_me', 'true');
          } else {
            localStorage.removeItem('remember_me');
          }
        } catch (storageErr) {
          console.error("localStorage error:", storageErr);
        }
        setAccessToken(res.data.accessToken);
        await fetchUserRecord(); // Load user context
      } else {
        const res = await apiClient.post("/auth/login", { email, password });
        if (res.data.requires2FA) {
          setRequires2FA(true);
          setTempToken(res.data.tempToken);
        } else {
          try {
            if (rememberMe) {
              localStorage.setItem('remember_me', 'true');
            } else {
              localStorage.removeItem('remember_me');
            }
          } catch (storageErr) {
            console.error("localStorage error:", storageErr);
          }
          setAccessToken(res.data.accessToken);
          await fetchUserRecord(); // Load user context
        }
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || "Failed to string login error.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    window.location.href = "/api/auth/google";
  };

  return (
    <div className="min-h-screen bg-page flex items-center justify-center p-4">
      <SEOMeta pageKey="login" />
      <div className="max-w-md mx-auto w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
        <button 
          onClick={() => navigate("/")} 
          className="mb-6 flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </button>

        <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-10 border border-slate-100">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 rotate-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
              </svg>
            </div>
            <h1 className="text-2xl font-black font-display tracking-tight text-slate-900">Welcome Back</h1>
            <p className="text-slate-500 text-sm mt-2">Sign in to your account to continue</p>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 rounded-2xl border border-red-100 flex flex-col items-center">
              <p className="text-red-600 text-sm font-semibold text-center">{error}</p>
              {error === "Please verify your email before logging in." && (
                <div className="flex gap-3 mt-3">
                  <Link to={`/verify-email?email=${encodeURIComponent(email)}`} className="text-indigo-600 font-bold hover:text-indigo-700 text-sm transition-colors">Verify Now</Link>
                  <Link to={`/verify-email?email=${encodeURIComponent(email)}`} className="text-slate-600 hover:text-slate-900 text-sm font-medium border border-slate-300 hover:border-slate-400 bg-white rounded-lg px-3 py-1 transition-all shadow-sm">Resend Verification</Link>
                </div>
              )}
            </div>
          )}
          
          <form onSubmit={handleLogin} className="space-y-5">
            {!requires2FA ? (
              <>
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">Email Address</label>
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                    placeholder="name@example.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-semibold text-slate-700">Password</label>
                    <Link to="/forgot-password" className="text-indigo-600 font-semibold hover:text-indigo-700 text-sm transition-colors">Forgot password?</Link>
                  </div>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-11 py-3 text-slate-900 text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center pt-1">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm font-semibold text-slate-700 cursor-pointer select-none">
                    Remember me
                  </label>
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700 text-center">Authenticator or Backup Code</label>
                <input 
                  type="text" 
                  required
                  value={twoFaCode}
                  onChange={(e) => setTwoFaCode(e.target.value)}
                  placeholder="123456"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-slate-900 text-2xl font-mono tracking-[0.5em] text-center focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                />
              </div>
            )}
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl text-sm transition-all hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/20 active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none flex justify-center items-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="my-8 flex items-center justify-center space-x-4">
            <div className="h-px bg-slate-200 flex-1"></div>
            <span className="text-xs text-slate-400 font-bold tracking-wider uppercase">Or continue with</span>
            <div className="h-px bg-slate-200 flex-1"></div>
          </div>

          <button 
            onClick={handleGoogleLogin}
            className="w-full bg-white border border-slate-200 text-slate-700 font-bold py-3.5 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm flex items-center justify-center space-x-3 active:scale-[0.98]"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span>Google</span>
          </button>

          <p className="mt-8 text-center text-sm text-slate-500">
            Don't have an account? <Link to="/signup" className="text-slate-900 font-bold hover:underline transition-colors">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
