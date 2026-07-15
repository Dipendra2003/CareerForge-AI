import SEOMeta from '../components/SEOMeta';
import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import apiClient from "../lib/apiClient";
import { useAuth } from "../contexts/AuthContext";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyAndLogin } = useAuth();
  
  const initialEmail = searchParams.get("email") || "";
  const queryToken = searchParams.get("token") || "";
  
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  useEffect(() => {
    if (queryToken) {
      handleTokenVerification(queryToken);
    }
  }, [queryToken]);

  const handleTokenVerification = async (token: string) => {
    setLoading(true);
    try {
      await verifyAndLogin(token, undefined, undefined);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Invalid or expired token.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await verifyAndLogin(undefined, email, otp);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Invalid or expired OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError("Please enter your email to resend.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await apiClient.post("/auth/resend-verification", { email });
      setSuccess("Verification email resent. Please check your inbox.");
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to resend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 animate-slide-up">
      <SEOMeta pageKey="verify" />
      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-8 shadow-card">
        <h1 className="text-2xl font-bold font-display text-[var(--color-gray-900)] mb-2 text-center">Verify your email to continue</h1>
        <p className="text-slate-500 text-sm mb-6 text-center">
          Open Email Instructions or enter the OTP here.
        </p>

        {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
        {success && <p className="text-green-500 text-sm mb-4 text-center">{success}</p>}

        {!queryToken && (
          <form onSubmit={handleOtpVerification} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2 outline-none focus:border-[var(--color-primary)] transition-colors bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">OTP (6-digits)</label>
              <input 
                type="text" 
                maxLength={6}
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                className="w-full border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2 outline-none focus:border-[var(--color-primary)] transition-colors font-mono tracking-[0.25em] text-center text-lg"
              />
            </div>
            <button 
              type="submit" 
              disabled={loading || !otp || !email}
              className="w-full bg-[var(--color-primary)] text-white font-medium py-2 rounded-[var(--radius-md)] hover:bg-opacity-90 disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify"}
            </button>
          </form>
        )}

        <div className="mt-6 flex flex-col space-y-3">
          <button 
            type="button"
            onClick={handleResend}
            disabled={loading}
            className="w-full border border-[var(--color-border)] text-slate-700 font-medium py-2 rounded-[var(--radius-md)] hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Resend OTP Button
          </button>
        </div>
      </div>
    </div>
  );
}
