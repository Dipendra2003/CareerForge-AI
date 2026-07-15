import SEOMeta from '../components/SEOMeta';
import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import apiClient from "../lib/apiClient";
import { Eye, EyeOff } from "lucide-react";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const emailParam = searchParams.get("email");
  
  const [email, setEmail] = useState(emailParam || "");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      const payload: any = { newPassword };
      if (token) {
        payload.token = token;
      } else {
        payload.email = email;
        payload.otp = otp;
      }

      await apiClient.post("/auth/reset-password", payload);
      setMessage("Password has been successfully changed. You can now log in.");
      setResendMessage("");
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to reset password.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!email) {
      setError("Please enter your email to resend OTP.");
      return;
    }
    setResending(true);
    setError("");
    setResendMessage("");
    setMessage("");

    try {
      await apiClient.post("/auth/forgot-password", { email });
      setResendMessage("A new OTP has been sent to your email.");
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to resend OTP.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-page)] p-4 sm:p-6">
      <SEOMeta pageKey="reset-password" />
      <div className="max-w-md w-full bg-[var(--color-card)] rounded-[var(--radius-lg)] shadow-card p-6 sm:p-8 border border-[var(--color-border)]">
        <h1 className="text-2xl font-black font-display tracking-tight text-slate-900 mb-2">
          Set New Password
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          {token ? "Enter your new desired password." : "Enter your email, the OTP sent to you, and your new desired password."}
        </p>
        
        {error && <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg mb-4">{error}</div>}
        {message && <div className="p-3 bg-emerald-50 text-emerald-700 text-xs rounded-lg mb-4">{message}</div>}
        {resendMessage && <div className="p-3 bg-blue-50 text-blue-700 text-xs rounded-lg mb-4">{resendMessage}</div>}

        <form onSubmit={handleReset} className="space-y-4">
          {!token && (
            <>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-sm border-slate-200 rounded-lg p-2.5 focus:ring-1 focus:ring-indigo-500 transition-shadow outline-none"
                  placeholder="you@example.com"
                  required
                  readOnly={!!emailParam}
                />
              </div>
              <div>
                <div className="flex justify-between mb-1 items-end">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">6-Digit OTP</label>
                  <button 
                    type="button" 
                    onClick={handleResendOTP}
                    disabled={resending}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                  >
                    {resending ? "Sending..." : "Resend OTP"}
                  </button>
                </div>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full text-sm border-slate-200 rounded-lg p-2.5 focus:ring-1 focus:ring-indigo-500 transition-shadow outline-none tracking-widest font-mono"
                  placeholder="123456"
                  required
                  maxLength={6}
                />
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full text-sm border-slate-200 rounded-lg pl-2.5 pr-11 py-2.5 focus:ring-1 focus:ring-indigo-500 transition-shadow outline-none"
                placeholder="********"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={isLoading || message !== ""}
            className="w-full bg-slate-900 text-white font-bold py-2.5 rounded-lg text-sm transition hover:bg-slate-800 disabled:opacity-50"
          >
            {isLoading ? "Saving..." : "Change Password"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">Back to Login</Link>
        </div>
      </div>
    </div>
  );
}
