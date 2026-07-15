import React from 'react';
import { Link } from 'react-router-dom';
import { Layers, ShieldCheck, Lock, Mail, Clock, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin, Github, Youtube } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSystemSettings } from '../contexts/SystemSettingsContext';
import { useFeedback } from '../contexts/FeedbackContext';

export default function Footer() {
  const { isAuthenticated, signOut } = useAuth();
  const { settings } = useSystemSettings();
  const { showFeedback } = useFeedback();

  const companyName = settings.companyName || 'CareerForge AI';
  const companyDescription = settings.companyDescription || 'AI-Powered Resume Optimization Platform. Improve ATS scores, optimize resumes, generate cover letters, and prepare for interviews.';
  const supportEmail = settings.supportEmail || 'support@careerforgeai.com';
  const footerCopyright = settings.footerCopyright || `© ${companyName} ${new Date().getFullYear()}. All rights reserved.`;

  return (
    <footer className="bg-white border-t border-border pt-16 pb-8 mt-auto">
      {/* CTA Section */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mb-16 text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-4">
          Ready to improve your ATS score?
        </h2>
        <p className="text-slate-600 text-lg mb-8 max-w-2xl mx-auto">
          Analyze your resume, identify keyword gaps, and land more interviews.
        </p>
        <Link 
          to="/analyze" 
          className="inline-flex items-center justify-center px-8 py-3.5 bg-primary text-white font-semibold rounded-xl hover:bg-opacity-90 transition shadow-sm text-sm"
        >
          Analyze Resume Free
        </Link>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-8 mb-16">
          {/* Brand & Trust Section - 1/3 width on desktop */}
          <div className="lg:w-1/3 shrink-0">
            <Link to="/" className="flex items-center gap-2 mb-4">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt={`${companyName} Logo`} className="h-6 object-contain" />
              ) : (
                <Layers className="w-6 h-6 text-primary" />
              )}
              <span className="font-black text-slate-900 tracking-tight text-xl font-display">{companyName}</span>
            </Link>
            <p className="text-slate-500 text-sm leading-relaxed mb-6 pr-4">
              {companyDescription}
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Privacy Protected</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
                <Lock className="w-4 h-4 text-slate-400" />
                <span>SSL Secured</span>
              </div>
            </div>
          </div>

          {/* Links Section - 2/3 width on desktop */}
          <div className="lg:w-2/3 grid grid-cols-2 sm:grid-cols-4 gap-8">
            {/* Column 1 - Product */}
            <div>
              <h3 className="font-bold text-slate-900 mb-4 text-sm tracking-wider uppercase">Product</h3>
              <ul className="space-y-3">
                <li><Link to="/analyze" className="text-slate-600 hover:text-primary text-sm transition">Resume Scanner</Link></li>
                <li><Link to="/tools" className="text-slate-600 hover:text-primary text-sm transition">AI Tools</Link></li>
                <li><Link to="/pricing" className="text-slate-600 hover:text-primary text-sm transition">Pricing</Link></li>
              </ul>
            </div>

            {/* Column 2 - Company */}
            <div>
              <h3 className="font-bold text-slate-900 mb-4 text-sm tracking-wider uppercase">Company</h3>
              <ul className="space-y-3 mb-6">
                <li><Link to="/about" className="text-slate-600 hover:text-primary text-sm transition">About Us</Link></li>
                {settings.contactPageEnabled !== false && (
                  <li><Link to="/contact" className="text-slate-600 hover:text-primary text-sm transition">Contact Us</Link></li>
                )}
                <li>
                  <button 
                    type="button" 
                    onClick={() => showFeedback("manual")} 
                    className="text-slate-600 hover:text-primary text-sm transition cursor-pointer text-left"
                  >
                    Send Feedback
                  </button>
                </li>
              </ul>
              
              <h3 className="font-bold text-slate-900 mb-3 text-sm tracking-wider uppercase">Contact</h3>
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <a href={`mailto:${supportEmail}`} className="hover:text-primary transition truncate max-w-full">{supportEmail}</a>
                </div>
                {settings.companyPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <a href={`tel:${settings.companyPhone}`} className="hover:text-primary transition truncate max-w-full">{settings.companyPhone}</a>
                  </div>
                )}
                {settings.companyAddress && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <span className="leading-snug">{settings.companyAddress}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Column 3 - Resources */}
            <div>
              <h3 className="font-bold text-slate-900 mb-4 text-sm tracking-wider uppercase">Resources</h3>
              <ul className="space-y-3">
                <li><Link to="/faq" className="text-slate-600 hover:text-primary text-sm transition">FAQ</Link></li>
                <li><Link to="/help" className="text-slate-600 hover:text-primary text-sm transition">Help Center</Link></li>
                <li><Link to="/legal?type=privacy" className="text-slate-600 hover:text-primary text-sm transition">Privacy Policy</Link></li>
                <li><Link to="/legal?type=terms" className="text-slate-600 hover:text-primary text-sm transition">Terms of Service</Link></li>
                <li><Link to="/legal?type=refund" className="text-slate-600 hover:text-primary text-sm transition">Refund Policy</Link></li>
                <li><Link to="/legal?type=cookie" className="text-slate-600 hover:text-primary text-sm transition">Cookie Policy</Link></li>
              </ul>
            </div>

            {/* Column 4 - Account */}
            <div>
              <h3 className="font-bold text-slate-900 mb-4 text-sm tracking-wider uppercase">Account</h3>
              <ul className="space-y-3 mb-6">
                {!isAuthenticated ? (
                  <>
                    <li><Link to="/login" className="text-slate-600 hover:text-primary text-sm transition">Login</Link></li>
                    <li><Link to="/signup" className="text-slate-600 hover:text-primary text-sm transition">Signup</Link></li>
                  </>
                ) : (
                  <>
                    <li><Link to="/dashboard" className="text-slate-600 hover:text-primary text-sm transition">Dashboard</Link></li>
                    <li><Link to="/account" className="text-slate-600 hover:text-primary text-sm transition">Account Settings</Link></li>
                    <li>
                      <button 
                        onClick={() => signOut()} 
                        className="text-slate-600 hover:text-red-600 text-sm transition cursor-pointer text-left w-full"
                      >
                        Logout
                      </button>
                    </li>
                  </>
                )}
              </ul>

              {/* Social Links */}
              <div className="flex flex-wrap gap-3 mt-6">
                {settings.socialFacebook && (
                  <a href={settings.socialFacebook} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-primary transition">
                    <Facebook className="w-5 h-5" />
                  </a>
                )}
                {settings.socialTwitter && (
                  <a href={settings.socialTwitter} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-primary transition">
                    <Twitter className="w-5 h-5" />
                  </a>
                )}
                {settings.socialInstagram && (
                  <a href={settings.socialInstagram} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-primary transition">
                    <Instagram className="w-5 h-5" />
                  </a>
                )}
                {settings.socialLinkedin && (
                  <a href={settings.socialLinkedin} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-primary transition">
                    <Linkedin className="w-5 h-5" />
                  </a>
                )}
                {settings.socialGithub && (
                  <a href={settings.socialGithub} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-primary transition">
                    <Github className="w-5 h-5" />
                  </a>
                )}
                {settings.socialYoutube && (
                  <a href={settings.socialYoutube} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-primary transition">
                    <Youtube className="w-5 h-5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 text-sm">
            {footerCopyright}
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            <Link to="/legal?type=privacy" className="text-slate-500 hover:text-slate-900 text-sm transition">Privacy Policy</Link>
            <Link to="/legal?type=terms" className="text-slate-500 hover:text-slate-900 text-sm transition">Terms of Service</Link>
            <Link to="/legal?type=refund" className="text-slate-500 hover:text-slate-900 text-sm transition">Refund Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
