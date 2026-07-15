import SEOMeta from '../components/SEOMeta';
import { useSearchParams } from "react-router-dom";
import { useSystemSettings } from "../contexts/SystemSettingsContext";

export default function LegalPage() {
  const [searchParams] = useSearchParams();
  const { settings } = useSystemSettings();
  const companyName = settings.companyName || 'CareerForge AI';
  const type = searchParams.get("type") || "privacy";
  const isPrivacy = type === "privacy";
  const isTerms = type === "terms";
  const isRefund = type === "refund";
  const isCookie = type === "cookie";
  
  const getTitle = () => {
    if (isTerms) return "Terms of Service";
    if (isRefund) return "Refund Policy";
    if (isCookie) return "Cookie Policy";
    return "Privacy Protocols";
  };
  
  return (
    <div className="max-w-3xl xl:max-w-5xl 2xl:max-w-[80rem] mx-auto py-12 px-4 sm:px-6 xl:px-8 animate-in fade-in duration-500">
      <SEOMeta pageKey="legal" />
      <div className="space-y-2 mb-10 pb-8 border-b border-slate-200">
        <span className="text-indigo-600 font-bold uppercase tracking-wider text-xs">Legal Documentation</span>
        <h1 className="text-2xl md:text-4xl font-black font-display text-slate-900">
          {getTitle()}
        </h1>
        <p className="text-slate-500 text-sm">Last Updated: June 15, 2026</p>
      </div>

      <div className="prose prose-slate prose-sm sm:prose-base max-w-none text-slate-600">
        <p>
          Welcome to {companyName} Application Suite. Please read these {getTitle()} carefully before using our software.
        </p>

        {isPrivacy && (
          <>
            <h3 className="text-slate-900 font-bold mt-8 mb-4 text-xl">1. Data Collection and Relational Storage</h3>
            <p className="mb-4">
              We collect information you provide directly to us when you use the Service, including your account details, uploaded resume texts, and targeted job descriptions. This data is securely stored using normalized relational database schema constraints.
            </p>
            <h3 className="text-slate-900 font-bold mt-8 mb-4 text-xl">2. Row-Level Security</h3>
            <p className="mb-4">
              Access to your personalized scan data and career trajectory documents is restricted through absolute row-level security. Only your authenticated user identifier can query or mutate rows associated with your account.
            </p>
            <h3 className="text-slate-900 font-bold mt-8 mb-4 text-xl">3. AI Utilization</h3>
            <p className="mb-4">
              Resume text processed through our Gemini AI analyzer is utilized strictly for the ephemeral evaluation and drafting of suggestions. We do not use your private personal career history to train global generative AI foundation models.
            </p>
          </>
        )}
        
        {isTerms && (
          <>
            <h3 className="text-slate-900 font-bold mt-8 mb-4 text-xl">1. Software License and Limitations</h3>
            <p className="mb-4">
              Subject to your compliance with these Terms, {companyName} grants you a limited, non-exclusive, non-transferable license to access and use the platform for personal career advancement purposes.
            </p>
            <h3 className="text-slate-900 font-bold mt-8 mb-4 text-xl">2. Service Quotas</h3>
            <p className="mb-4">
              Free accounts are limited to the monthly scan quotas outlined on our pricing page. You agree not to circumvent these platform quotas through automated scripts or rapid account re-registration.
            </p>
            <h3 className="text-slate-900 font-bold mt-8 mb-4 text-xl">3. Termination</h3>
            <p className="mb-4">
              We may terminate or suspend your access immediately, without prior notice or liability, for any breach of these Terms, particularly interactions that endanger the platform's stability or violate ethical scanning protocols.
            </p>
          </>
        )}
        
        {isRefund && (
          <>
            <h3 className="text-slate-900 font-bold mt-8 mb-4 text-xl">1. Refund Eligibility</h3>
            <p className="mb-4">
              We offer a 7-day money-back guarantee for all new Pro subscriptions. If you are not satisfied with the AI suggestions, contact support within 7 days of your purchase.
            </p>
            <h3 className="text-slate-900 font-bold mt-8 mb-4 text-xl">2. Processing</h3>
            <p className="mb-4">
              Refunds are processed back to the original payment method and may take 5-10 business days to appear on your statement.
            </p>
          </>
        )}

        {isCookie && (
          <>
            <h3 className="text-slate-900 font-bold mt-8 mb-4 text-xl">1. Essential Cookies</h3>
            <p className="mb-4">
              We use secure, HTTP-only cookies to manage your authentication state and session identity. These are strictly necessary for the application to function.
            </p>
            <h3 className="text-slate-900 font-bold mt-8 mb-4 text-xl">2. Analytics</h3>
            <p className="mb-4">
              With your consent, we may use PostHog analytics to track basic usage patterns to improve the software's UX and feature set.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
