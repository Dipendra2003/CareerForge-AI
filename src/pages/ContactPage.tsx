import SEOMeta from '../components/SEOMeta';
import { useState } from "react";
import { Mail, MessageSquare, Send, CheckCircle2 } from "lucide-react";
import { useSystemSettings } from "../contexts/SystemSettingsContext";

export default function ContactPage() {
  const { settings } = useSystemSettings();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    category: "General Inquiry",
    subject: "",
    message: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");
    
    // Front-end validations
    if (!formData.name.trim()) {
      setErrorMsg("Name is required");
      setIsSubmitting(false);
      return;
    }
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) {
      setErrorMsg("A valid email address is required");
      setIsSubmitting(false);
      return;
    }
    if (!formData.phone.trim() || formData.phone.trim().replace(/\D/g, "").length < 7) {
      setErrorMsg("A valid phone number is required (at least 7 digits)");
      setIsSubmitting(false);
      return;
    }
    if (!formData.category) {
      setErrorMsg("Please select a category");
      setIsSubmitting(false);
      return;
    }
    if (!formData.subject.trim()) {
      setErrorMsg("Subject is required");
      setIsSubmitting(false);
      return;
    }
    if (!formData.message.trim() || formData.message.trim().length < 10) {
      setErrorMsg("Message must be at least 10 characters long");
      setIsSubmitting(false);
      return;
    }
    
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to send message");
      }
      
      setIsSubmitted(true);
      setFormData({ name: "", email: "", phone: "", category: "General Inquiry", subject: "", message: "" });
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl xl:max-w-7xl 2xl:max-w-[90rem] mx-auto py-16 px-4 sm:px-6 xl:px-8 w-full animate-in fade-in duration-500">
      <SEOMeta pageKey="contact" />
      <div className="text-center space-y-4 mb-16">
        <span className="text-indigo-600 font-bold uppercase tracking-wider text-xs bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">Contact Us</span>
        <h1 className="text-3xl md:text-5xl font-black font-display text-slate-900 tracking-tight">We're here to help</h1>
        <p className="text-slate-600 max-w-xl mx-auto text-sm md:text-base">
          Have questions about your ATS score or need help upgrading? Send us a message and our support team will get back to you within 24 hours.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        <div className="md:col-span-1 space-y-8">
          <div>
            <h3 className="font-bold text-slate-900 mb-2">Get in touch</h3>
            <p className="text-sm text-slate-500 mb-4">
              We'd love to hear from you. Our friendly team is always here to chat.
            </p>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-slate-50 rounded-lg shrink-0 border border-slate-100">
                  <Mail className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Email support</h4>
                  <a href={`mailto:${settings.supportEmail || 'support@careerforgeai.com'}`} className="text-sm text-slate-600 hover:text-indigo-600 transition">{settings.supportEmail || 'support@careerforgeai.com'}</a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-slate-50 rounded-lg shrink-0 border border-slate-100">
                  <MessageSquare className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Business Hours</h4>
                  <p className="text-sm text-slate-600">Mon-Fri from 9am to 5pm</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-2xl">
            <h3 className="text-sm font-bold text-indigo-900 mb-2">Need a faster answer?</h3>
            <p className="text-xs text-indigo-700 mb-4">Check out our frequently asked questions for immediate help with common issues.</p>
            <a href="/#faq" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
              Read the FAQ <Send className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="md:col-span-2">
          {isSubmitted ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-4 shadow-sm h-full flex flex-col justify-center items-center min-h-[400px]">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-100 mb-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900">Message sent!</h3>
              <p className="text-slate-600 max-w-sm mx-auto">
                Thanks for reaching out. We've received your message and will get back to you shortly.
              </p>
              <button 
                onClick={() => setIsSubmitted(false)}
                className="mt-4 text-indigo-600 font-semibold hover:text-indigo-700 text-sm"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="name" className="block text-sm font-semibold text-slate-700">Full Name</label>
                  <input 
                    type="text" 
                    id="name" 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                    placeholder="Jane Doe"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-semibold text-slate-700">Email Address</label>
                  <input 
                    type="email" 
                    id="email" 
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                    placeholder="jane@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="phone" className="block text-sm font-semibold text-slate-700">Phone Number</label>
                  <input 
                    type="tel" 
                    id="phone" 
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                    placeholder="+1 (555) 019-2834"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="category" className="block text-sm font-semibold text-slate-700">Category</label>
                  <select 
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm bg-white"
                  >
                    <option>General Inquiry</option>
                    <option>Technical Support</option>
                    <option>Billing Question</option>
                    <option>Feedback & Suggestions</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="subject" className="block text-sm font-semibold text-slate-700">Subject</label>
                <input 
                  type="text"
                  id="subject"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                  placeholder="e.g. Inquiring about Pro subscription duration"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="message" className="block text-sm font-semibold text-slate-700">Message</label>
                <textarea 
                  id="message" 
                  rows={5}
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm resize-none"
                  placeholder="How can we help you today?"
                ></textarea>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
                  {errorMsg}
                </div>
              )}

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-slate-900 text-white font-semibold py-3.5 rounded-xl hover:bg-slate-800 disabled:opacity-70 disabled:cursor-not-allowed transition shadow-sm flex items-center justify-center gap-2"
              >
                {isSubmitting ? "Sending..." : "Send Message"} <Send className="w-4 h-4" />
              </button>
              <p className="text-xs text-center text-slate-500">
                By submitting this form, you agree to our <a href="/legal?type=privacy" className="underline hover:text-slate-900">Privacy Policy</a>.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
