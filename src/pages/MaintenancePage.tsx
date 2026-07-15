import React from 'react';
import { useSystemSettings } from '../contexts/SystemSettingsContext';
import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function MaintenancePage() {
  const { settings } = useSystemSettings();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-slate-100">
        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-4">We'll be back soon!</h1>
        <p className="text-slate-600 text-lg mb-8 leading-relaxed">
          {settings.maintenanceMessage || "Sorry for the inconvenience but we're performing some maintenance at the moment. We'll be back online shortly!"}
        </p>
        <div className="text-sm text-slate-500 border-t border-slate-100 pt-6">
          <p>Need immediate assistance?</p>
          <a href={`mailto:${settings.supportEmail}`} className="text-indigo-600 hover:text-indigo-700 font-medium mt-1 inline-block">
            Contact Support
          </a>
        </div>
      </div>
      <div className="mt-8 text-center text-sm text-slate-400">
        Admin? <Link to="/login" className="hover:text-indigo-600 underline">Login here</Link>
      </div>
    </div>
  );
}
