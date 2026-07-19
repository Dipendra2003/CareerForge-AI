import { useState, useEffect } from "react";
import { Save, Upload, Image as ImageIcon } from "lucide-react";
import apiClient from "../../lib/apiClient";

export default function AdminSettings() {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("limits");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await apiClient.get('/admin/settings/limits');
      setSettings(res.data.settings);
    } catch (err) {
      // Securely log the error without leaking stack traces or sensitive data
      console.error('An error occurred during this operation.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.put('/admin/settings/limits', settings);
      alert("Settings saved successfully!");
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    let finalValue: any = value;
    if (type === 'checkbox') {
      finalValue = (e.target as HTMLInputElement).checked;
    } else if (type === 'number') {
      finalValue = value ? Number(value) : 0;
    }

    setSettings((prev: any) => ({
      ...prev,
      [name]: finalValue
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'faviconUrl') => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    
    if (field === 'logoUrl') setUploadingLogo(true);
    else setUploadingFavicon(true);

    try {
      const res = await apiClient.post('/admin/settings/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSettings((prev: any) => ({ ...prev, [field]: res.data.url }));
    } catch (err: any) {
      alert("Upload failed: " + (err.response?.data?.error || err.message));
    } finally {
      if (field === 'logoUrl') setUploadingLogo(false);
      else setUploadingFavicon(false);
    }
  };

  if (loading) return <div className="p-8">Loading settings...</div>;

  const tabs = [
    { id: 'limits', name: 'Limits & Toggles' },
    { id: 'company', name: 'Company Details' },
    { id: 'branding', name: 'Branding' },
    { id: 'contact', name: 'Contact' },
    { id: 'social', name: 'Social Links' },
    { id: 'localization', name: 'Localization' },
    { id: 'system', name: 'System Maintenance' },
  ];

  return (
    <>
    <div className="space-y-6 max-w-5xl xl:max-w-360 2xl:max-w-380 mx-auto pb-12">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">System Settings</h1>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 flex flex-col">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`text-left px-6 py-4 text-sm font-medium transition-colors border-l-2 ${
                activeTab === tab.id 
                  ? 'border-indigo-600 bg-white text-indigo-700' 
                  : 'border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          
          {/* LIMITS TAB */}
          {activeTab === 'limits' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b pb-2">Scan Limits (per month)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Guest Scan Limit</label>
                    <input type="number" name="guestScanLimit" value={settings.guestScanLimit || 0} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Free Tier Limit</label>
                    <input type="number" name="freeScanLimit" value={settings.freeScanLimit || 0} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Pro Tier Limit</label>
                    <input type="number" name="proScanLimit" value={settings.proScanLimit || 0} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Annual Tier Limit</label>
                    <input type="number" name="annualScanLimit" value={settings.annualScanLimit || 0} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b pb-2">Upload Constraints</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Max Resume Size (bytes)</label>
                    <input type="number" name="maxResumeUploadSize" value={settings.maxResumeUploadSize || 0} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Max Resume Characters</label>
                    <input type="number" name="maxResumeCharacters" value={settings.maxResumeCharacters || 0} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Max Job Description Chars</label>
                    <input type="number" name="maxJDCharacters" value={settings.maxJDCharacters || 0} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b pb-2">Global Access Toggles</h2>
                <div className="space-y-4">
                  <label className="flex items-center gap-3">
                    <input type="checkbox" name="allowGuestScans" checked={!!settings.allowGuestScans} onChange={handleChange} className="w-5 h-5 text-indigo-600 rounded" />
                    <span className="text-sm font-medium text-slate-700">Allow Guest Scans (Unauthenticated)</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" name="allowSignup" checked={!!settings.allowSignup} onChange={handleChange} className="w-5 h-5 text-indigo-600 rounded" />
                    <span className="text-sm font-medium text-slate-700">Allow New User Signups</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" name="allowGoogleLogin" checked={!!settings.allowGoogleLogin} onChange={handleChange} className="w-5 h-5 text-indigo-600 rounded" />
                    <span className="text-sm font-medium text-slate-700">Allow Google Login</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* COMPANY TAB */}
          {activeTab === 'company' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b pb-2">Company Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                  <input type="text" name="companyName" value={settings.companyName || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Company Tagline</label>
                  <input type="text" name="companyTagline" value={settings.companyTagline || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Company Description</label>
                  <textarea name="companyDescription" value={settings.companyDescription || ''} onChange={handleChange} rows={3} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"></textarea>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Website URL</label>
                  <input type="url" name="companyWebsite" value={settings.companyWebsite || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                  <textarea name="companyAddress" value={settings.companyAddress || ''} onChange={handleChange} rows={2} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"></textarea>
                </div>
              </div>
            </div>
          )}

          {/* BRANDING TAB */}
          {activeTab === 'branding' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b pb-2">Branding Assets</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Logo Upload */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">Company Logo</label>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden">
                    {settings.logoUrl ? (
                      <div className="relative w-full aspect-video flex items-center justify-center bg-white rounded shadow-sm p-4">
                        <img src={settings.logoUrl} alt="Logo preview" className="max-h-full max-w-full object-contain" />
                        <button 
                          onClick={() => setSettings((s: any) => ({ ...s, logoUrl: null }))}
                          className="absolute top-2 right-2 bg-red-100 text-red-600 px-2 py-1 text-xs rounded shadow-sm hover:bg-red-200"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <ImageIcon className="mx-auto h-12 w-12 text-slate-400" />
                        <div className="mt-4 flex text-sm text-slate-600 justify-center">
                          <label className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500">
                            <span>{uploadingLogo ? 'Uploading...' : 'Upload Logo'}</span>
                            <input type="file" className="sr-only" accept="image/*" onChange={(e) => handleFileUpload(e, 'logoUrl')} disabled={uploadingLogo} />
                          </label>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">PNG, JPG up to 5MB</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Favicon Upload */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">Favicon</label>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden">
                    {settings.faviconUrl ? (
                      <div className="relative w-24 h-24 flex items-center justify-center bg-white rounded shadow-sm p-2">
                        <img src={settings.faviconUrl} alt="Favicon preview" className="max-h-full max-w-full object-contain" />
                        <button 
                          onClick={() => setSettings((s: any) => ({ ...s, faviconUrl: null }))}
                          className="absolute -top-2 -right-2 bg-red-100 text-red-600 px-2 py-1 text-xs rounded-full shadow-sm hover:bg-red-200"
                        >
                          X
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <ImageIcon className="mx-auto h-12 w-12 text-slate-400" />
                        <div className="mt-4 flex text-sm text-slate-600 justify-center">
                          <label className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500">
                            <span>{uploadingFavicon ? 'Uploading...' : 'Upload Favicon'}</span>
                            <input type="file" className="sr-only" accept="image/*" onChange={(e) => handleFileUpload(e, 'faviconUrl')} disabled={uploadingFavicon} />
                          </label>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">Square PNG, ICO up to 2MB</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-6 mt-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b pb-2">Theme Colors</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Primary Color (Hex)</label>
                    <div className="flex gap-2">
                      <input type="color" name="primaryColor" value={settings.primaryColor || '#4f46e5'} onChange={handleChange} className="h-10 w-10 p-1 border rounded-lg cursor-pointer" />
                      <input type="text" name="primaryColor" value={settings.primaryColor || ''} onChange={handleChange} className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Secondary Color (Hex)</label>
                    <div className="flex gap-2">
                      <input type="color" name="secondaryColor" value={settings.secondaryColor || '#ec4899'} onChange={handleChange} className="h-10 w-10 p-1 border rounded-lg cursor-pointer" />
                      <input type="text" name="secondaryColor" value={settings.secondaryColor || ''} onChange={handleChange} className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-slate-200 pt-6 mt-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b pb-2">Footer Details</h2>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Footer Copyright Text</label>
                    <input type="text" name="footerCopyright" value={settings.footerCopyright || ''} onChange={handleChange} placeholder="© 2026 CareerForge AI. All rights reserved." className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Additional Footer Text</label>
                    <textarea name="footerText" value={settings.footerText || ''} onChange={handleChange} rows={2} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"></textarea>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CONTACT TAB */}
          {activeTab === 'contact' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b pb-2">Contact Information</h2>
              
              <div className="mb-6">
                <label className="flex items-center gap-3">
                  <input type="checkbox" name="contactPageEnabled" checked={settings.contactPageEnabled ?? true} onChange={handleChange} className="w-5 h-5 text-indigo-600 rounded" />
                  <span className="text-sm font-medium text-slate-700">Enable Public Contact Page</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Support Email</label>
                  <input type="email" name="supportEmail" value={settings.supportEmail || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sales Email</label>
                  <input type="email" name="salesEmail" value={settings.salesEmail || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Support Phone</label>
                  <input type="tel" name="supportPhone" value={settings.supportPhone || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Business Hours</label>
                  <input type="text" name="businessHours" value={settings.businessHours || ''} onChange={handleChange} placeholder="e.g. Mon-Fri, 9am-5pm EST" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
            </div>
          )}

          {/* SOCIAL LINKS TAB */}
          {activeTab === 'social' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b pb-2">Social Media Links</h2>
              <p className="text-sm text-slate-500 mb-4">Leave URL blank to hide the icon from the footer.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Facebook URL</label>
                  <input type="url" name="socialFacebook" value={settings.socialFacebook || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Twitter / X URL</label>
                  <input type="url" name="socialTwitter" value={settings.socialTwitter || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">LinkedIn URL</label>
                  <input type="url" name="socialLinkedin" value={settings.socialLinkedin || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">GitHub URL</label>
                  <input type="url" name="socialGithub" value={settings.socialGithub || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">YouTube URL</label>
                  <input type="url" name="socialYoutube" value={settings.socialYoutube || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Instagram URL</label>
                  <input type="url" name="socialInstagram" value={settings.socialInstagram || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
            </div>
          )}

          {/* LOCALIZATION TAB */}
          {activeTab === 'localization' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b pb-2">Localization</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Default Timezone</label>
                  <select name="timezone" value={settings.timezone || 'UTC'} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white">
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time (US & Canada)</option>
                    <option value="America/Chicago">Central Time (US & Canada)</option>
                    <option value="America/Denver">Mountain Time (US & Canada)</option>
                    <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                    <option value="Europe/London">London</option>
                    <option value="Europe/Paris">Paris</option>
                    <option value="Asia/Tokyo">Tokyo</option>
                    <option value="Asia/Kolkata">India Standard Time</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Default Currency</label>
                  <select name="defaultCurrency" value={settings.defaultCurrency || 'USD'} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white">
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CAD">CAD ($)</option>
                    <option value="AUD">AUD ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Default Language</label>
                  <select name="defaultLanguage" value={settings.defaultLanguage || 'en'} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white">
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date Format</label>
                  <select name="dateFormat" value={settings.dateFormat || 'MM/DD/YYYY'} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white">
                    <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY (EU)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* SYSTEM TAB */}
          {activeTab === 'system' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              
              {/* Maintenance Mode */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
                <h2 className="text-lg font-semibold text-amber-900 mb-2 flex items-center gap-2">
                  Maintenance Mode
                </h2>
                <p className="text-sm text-amber-700 mb-4">
                  When enabled, normal users will see a maintenance page. Admins will still have full access.
                </p>
                <div className="space-y-4">
                  <label className="flex items-center gap-3">
                    <input type="checkbox" name="maintenanceMode" checked={!!settings.maintenanceMode} onChange={handleChange} className="w-5 h-5 text-amber-600 rounded focus:ring-amber-500" />
                    <span className="text-sm font-medium text-amber-900">Enable Maintenance Mode</span>
                  </label>
                  
                  {settings.maintenanceMode && (
                    <div>
                      <label className="block text-sm font-medium text-amber-900 mb-1">Custom Maintenance Message</label>
                      <textarea 
                        name="maintenanceMessage" 
                        value={settings.maintenanceMessage || ''} 
                        onChange={handleChange} 
                        rows={3} 
                        placeholder="We are currently down for maintenance. Please check back later."
                        className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white"
                      ></textarea>
                    </div>
                  )}
                </div>
              </div>

              {/* Announcement Banner */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
                <h2 className="text-lg font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  Announcement Banner
                </h2>
                <p className="text-sm text-blue-700 mb-4">
                  Displays a global banner at the top of the application for all users.
                </p>
                <div className="space-y-4">
                  <label className="flex items-center gap-3">
                    <input type="checkbox" name="announcementIsActive" checked={!!settings.announcementIsActive} onChange={handleChange} className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500" />
                    <span className="text-sm font-medium text-blue-900">Show Announcement Banner</span>
                  </label>
                  
                  {settings.announcementIsActive && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-blue-900 mb-1">Announcement Message</label>
                        <input 
                          type="text" 
                          name="announcementBanner" 
                          value={settings.announcementBanner || ''} 
                          onChange={handleChange} 
                          className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-blue-900 mb-1">Button Text (Optional)</label>
                          <input 
                            type="text" 
                            name="announcementButtonText" 
                            value={settings.announcementButtonText || ''} 
                            onChange={handleChange} 
                            className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-blue-900 mb-1">Button URL (Optional)</label>
                          <input 
                            type="url" 
                            name="announcementButtonUrl" 
                            value={settings.announcementButtonUrl || ''} 
                            onChange={handleChange} 
                            className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-blue-900 mb-1">Background Color</label>
                        <div className="flex gap-2">
                          <input type="color" name="announcementColor" value={settings.announcementColor || '#3b82f6'} onChange={handleChange} className="h-10 w-10 p-1 border border-blue-300 rounded-lg cursor-pointer" />
                          <input type="text" name="announcementColor" value={settings.announcementColor || '#3b82f6'} onChange={handleChange} className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b pb-2">Audit Logs</h2>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Retention Period (Days)</label>
                  <input 
                    type="number" 
                    name="auditLogRetentionDays" 
                    value={settings.auditLogRetentionDays || 0} 
                    onChange={handleChange} 
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" 
                  />
                  <p className="text-xs text-slate-500 mt-1">Set to 0 to keep logs forever.</p>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
    </>
  );
}
