import SEOMeta from '../components/SEOMeta';
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail } from "lucide-react";
import apiClient from "../lib/apiClient";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      await apiClient.post("/auth/forgot-password", { email });
      if (success) {
        setMessage("A new OTP has been sent to your email.");
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to request password reset.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-page)] p-4 sm:p-6">
      <SEOMeta pageKey="forgot-password" />
      <div className="max-w-md w-full bg-[var(--color-card)] rounded-[var(--radius-lg)] shadow-card p-6 sm:p-8 border border-[var(--color-border)]">
        <h1 className="text-2xl font-black font-display tracking-tight text-slate-900 mb-2">
          Forgot Password
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          Enter your email to receive an OTP and reset link.
        </p>

        {success ? (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 mb-4">
              <Mail className="h-6 w-6 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Check your email</h3>
            <p className="text-sm text-slate-500 mb-6">
              We've sent a 6-digit OTP and reset link to {email}.
            </p>
            
            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg mb-4">
                {error}
              </div>
            )}
            {message && (
              <div className="p-3 bg-emerald-50 text-emerald-700 text-xs rounded-lg mb-4">
                {message}
              </div>
            )}

            <div className="space-y-3">
              <button 
                onClick={() => navigate(`/reset-password?email=${encodeURIComponent(email)}`)}
                className="w-full bg-slate-900 text-white font-bold py-2.5 rounded-lg text-sm transition hover:bg-slate-800"
              >
                Enter OTP Now
              </button>
              <button 
                onClick={handleRequestReset}
                disabled={loading}
                className="w-full bg-white text-slate-700 font-bold py-2.5 rounded-lg text-sm transition border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
              >
                {loading ? "Sending..." : "Resend OTP"}
              </button>
            </div>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleRequestReset}>
            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg">
                {error}
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-sm border-slate-200 rounded-lg p-2.5 focus:ring-1 focus:ring-indigo-500 transition-shadow outline-none"
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white font-bold py-2.5 rounded-lg text-sm transition hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </form>
        )}
        
        <div className="mt-6 text-center">
          <Link to="/login" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">Back to Login</Link>
        </div>
      </div>
    </div>
  );
}
