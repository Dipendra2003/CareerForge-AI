import { useState } from 'react';
import { useSystemSettings } from '../contexts/SystemSettingsContext';
import { X, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AnnouncementBanner() {
  const { settings, loading } = useSystemSettings();
  const [isVisible, setIsVisible] = useState(true);

  if (loading || !settings.announcementIsActive || !isVisible) {
    return null;
  }

  return (
    <div 
      className="relative z-50 text-white flex items-center justify-between px-4 py-2 sm:px-6 lg:px-8 shadow-sm transition-all duration-300"
      style={{ backgroundColor: settings.announcementColor || '#3b82f6' }}
    >
      <div className="flex-1 flex justify-center items-center text-sm font-medium text-center gap-4 flex-wrap">

        <span className="flex-1 text-center md:flex-none">
          {settings.announcementBanner}
        </span>
        {settings.announcementButtonText && settings.announcementButtonUrl && (
          <a
            href={settings.announcementButtonUrl}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white text-xs font-semibold whitespace-nowrap backdrop-blur-sm"
          >
            {settings.announcementButtonText}
            <ArrowRight className="w-3 h-3" />
          </a>
        )}
      </div>
      <button 
        onClick={() => setIsVisible(false)}
        className="shrink-0 p-1 rounded-full hover:bg-white/20 transition-colors ml-4 focus:outline-none focus:ring-2 focus:ring-white"
        aria-label="Dismiss banner"
      >
        <X className="w-4 h-4 text-white" />
      </button>
    </div>
  );
}
