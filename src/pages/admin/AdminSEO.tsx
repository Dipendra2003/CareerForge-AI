import { useState, useEffect } from 'react';
import { Search, Globe, Image as ImageIcon, Code, Save, Settings, Info, Zap } from 'lucide-react';
import apiClient from '../../lib/apiClient';
import { useToast } from '../../contexts/ToastContext';

export default function AdminSEO() {
  const [activeTab, setActiveTab] = useState<'pages' | 'settings'>('pages');
  const [pages, setPages] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  // Editing state
  const [editingPage, setEditingPage] = useState<any>(null);
  const [pageForm, setPageForm] = useState<any>({});
  const [settingsForm, setSettingsForm] = useState<any>({});
  
  const [uploadingFavicon, setUploadingFavicon] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [pagesRes, settingsRes] = await Promise.all([
        apiClient.get('/admin/seo/pages'),
        apiClient.get('/admin/seo/settings')
      ]);
      setPages(pagesRes.data);
      setSettings(settingsRes.data);
      setSettingsForm(settingsRes.data || { robotsTxtDisallow: '', robotsTxtAllow: '', robotsTxtSitemap: '', globalFavicon: '' });
    } catch (error) {
      // Securely log the error without leaking stack traces or sensitive data
      console.error('An error occurred during this operation.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPage = (page: any) => {
    setEditingPage(page);
    setPageForm(page);
  };

  const handleNewPage = () => {
    setEditingPage({ id: 'new' });
    setPageForm({ pageKey: '', pageName: '', isIndexed: true });
  };

  const savePage = async () => {
    if (!pageForm.pageKey) return toast.error("Page Key is required", "Validation Error");
    try {
      await apiClient.put(`/admin/seo/pages/${pageForm.pageKey}`, pageForm);
      toast.success('SEO Page saved successfully', 'Success');
      setEditingPage(null);
      fetchData();
    } catch (error) {
      toast.error('Error saving SEO Page', 'Error');
    }
  };

  const saveSettings = async () => {
    try {
      await apiClient.put(`/admin/seo/settings`, settingsForm);
      toast.success('SEO Settings saved successfully', 'Success');
      fetchData();
    } catch (error) {
      toast.error('Error saving SEO Settings', 'Error');
    }
  };

  const handleAutoMap = async () => {
    try {
      const res = await apiClient.post('/admin/seo/auto-map', {});
      if (res.data.added > 0) {
        toast.success(`Successfully auto-mapped ${res.data.added} standard pages!`, 'Success');
        fetchData();
      } else {
        toast.info('All standard pages are already mapped.', 'Info');
      }
    } catch (err) {
      toast.error('Error auto-mapping pages', 'Error');
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    setUploadingFavicon(true);

    try {
      const res = await apiClient.post('/admin/settings/upload-branding', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSettingsForm({ ...settingsForm, globalFavicon: res.data.url });
    } catch (err) {
      toast.error('Favicon upload failed', 'Error');
    } finally {
      setUploadingFavicon(false);
    }
  };

  return (
    <>
    <div className="p-8 max-w-7xl xl:max-w-360 2xl:max-w-380 mx-auto space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">SEO Management</h1>
          <p className="text-slate-500 mt-1">Manage meta tags, robots.txt, sitemap, and JSON-LD for all public pages.</p>
        </div>
      </div>

      <div className="flex space-x-4 border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('pages')}
          className={`pb-4 px-2 font-medium transition-colors ${activeTab === 'pages' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500 hover:text-slate-900'}`}
        >
          <Globe className="inline-block w-4 h-4 mr-2" /> Page SEO
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-4 px-2 font-medium transition-colors ${activeTab === 'settings' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500 hover:text-slate-900'}`}
        >
          <Settings className="inline-block w-4 h-4 mr-2" /> Global Settings & Robots.txt
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading SEO system...</div>
      ) : activeTab === 'settings' ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 max-w-3xl space-y-6">
          <h2 className="text-lg font-bold text-slate-900">Global SEO Configuration</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Global Favicon</label>
              <div className="flex items-center gap-4">
                {settingsForm.globalFavicon && <img src={settingsForm.globalFavicon} className="h-8 w-8 object-contain bg-slate-100 rounded" />}
                <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded text-sm font-medium flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" /> {uploadingFavicon ? 'Uploading...' : 'Upload Favicon'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleFaviconUpload} disabled={uploadingFavicon} />
                </label>
              </div>
              <input type="text" className="w-full p-2 border rounded mt-2 text-sm" value={settingsForm.globalFavicon || ''} onChange={e => setSettingsForm({...settingsForm, globalFavicon: e.target.value})} placeholder="Or paste URL here" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">robots.txt Disallow</label>
              <textarea className="w-full p-2 border rounded font-mono text-sm" rows={4} placeholder="/admin&#10;/api" value={settingsForm.robotsTxtDisallow || ''} onChange={e => setSettingsForm({...settingsForm, robotsTxtDisallow: e.target.value})} />
              <p className="text-xs text-slate-500 mt-1">One path per line.</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">robots.txt Allow</label>
              <textarea className="w-full p-2 border rounded font-mono text-sm" rows={3} value={settingsForm.robotsTxtAllow || ''} onChange={e => setSettingsForm({...settingsForm, robotsTxtAllow: e.target.value})} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Custom Sitemap URL</label>
              <input type="text" className="w-full p-2 border rounded" placeholder="https://yourdomain.com/sitemap.xml" value={settingsForm.robotsTxtSitemap || ''} onChange={e => setSettingsForm({...settingsForm, robotsTxtSitemap: e.target.value})} />
              <p className="text-xs text-slate-500 mt-1">Leave blank to use the default auto-generated sitemap.</p>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button onClick={saveSettings} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-indigo-700">
                <Save className="w-4 h-4" /> Save Global Settings
              </button>
            </div>
          </div>
        </div>
      ) : editingPage ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold">{editingPage.id === 'new' ? 'Create New Page SEO' : `Editing: ${editingPage.pageName}`}</h2>
              <button onClick={() => setEditingPage(null)} className="text-slate-500 hover:text-slate-800 font-medium">Cancel</button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Page Key <span className="text-red-500">*</span></label>
                <input type="text" className="w-full p-2 border rounded" placeholder="e.g. home, about, pricing" value={pageForm.pageKey || ''} onChange={e => setPageForm({...pageForm, pageKey: e.target.value})} disabled={editingPage.id !== 'new'} />
                <p className="text-xs text-slate-500 mt-1">Used to map route to SEO data.</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Page Name (Admin Only)</label>
                <input type="text" className="w-full p-2 border rounded" value={pageForm.pageName || ''} onChange={e => setPageForm({...pageForm, pageName: e.target.value})} />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="font-bold text-slate-800">Basic Meta Tags</h3>
              <div>
                <label className="block text-sm font-medium mb-1">Meta Title</label>
                <input type="text" className="w-full p-2 border rounded" value={pageForm.title || ''} onChange={e => setPageForm({...pageForm, title: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Meta Description</label>
                <textarea className="w-full p-2 border rounded" rows={3} value={pageForm.description || ''} onChange={e => setPageForm({...pageForm, description: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Keywords</label>
                <input type="text" className="w-full p-2 border rounded" placeholder="resume, cv, builder, ai" value={pageForm.keywords || ''} onChange={e => setPageForm({...pageForm, keywords: e.target.value})} />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="font-bold text-slate-800">Advanced</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Canonical URL</label>
                  <input type="text" className="w-full p-2 border rounded" value={pageForm.canonicalUrl || ''} onChange={e => setPageForm({...pageForm, canonicalUrl: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Robots</label>
                  <select className="w-full p-2 border rounded" value={pageForm.robots || ''} onChange={e => setPageForm({...pageForm, robots: e.target.value})}>
                    <option value="">Default (index, follow)</option>
                    <option value="index, follow">index, follow</option>
                    <option value="noindex, follow">noindex, follow</option>
                    <option value="index, nofollow">index, nofollow</option>
                    <option value="noindex, nofollow">noindex, nofollow</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={pageForm.isIndexed} onChange={e => setPageForm({...pageForm, isIndexed: e.target.checked})} />
                  <span className="font-medium text-sm">Include in Sitemap (isIndexed)</span>
                </label>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="font-bold text-slate-800">Open Graph (Facebook / LinkedIn)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">OG Title</label>
                  <input type="text" className="w-full p-2 border rounded" value={pageForm.ogTitle || ''} onChange={e => setPageForm({...pageForm, ogTitle: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">OG Description</label>
                  <input type="text" className="w-full p-2 border rounded" value={pageForm.ogDescription || ''} onChange={e => setPageForm({...pageForm, ogDescription: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">OG Image URL</label>
                  <input type="text" className="w-full p-2 border rounded" value={pageForm.ogImage || ''} onChange={e => setPageForm({...pageForm, ogImage: e.target.value})} />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="font-bold text-slate-800">Twitter Card</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Twitter Title</label>
                  <input type="text" className="w-full p-2 border rounded" value={pageForm.twitterTitle || ''} onChange={e => setPageForm({...pageForm, twitterTitle: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Twitter Description</label>
                  <input type="text" className="w-full p-2 border rounded" value={pageForm.twitterDescription || ''} onChange={e => setPageForm({...pageForm, twitterDescription: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Twitter Image URL</label>
                  <input type="text" className="w-full p-2 border rounded" value={pageForm.twitterImage || ''} onChange={e => setPageForm({...pageForm, twitterImage: e.target.value})} />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="font-bold text-slate-800">JSON-LD Structured Data</h3>
              <div>
                <label className="block text-sm font-medium mb-1">Schema Type</label>
                <select className="w-full p-2 border rounded" value={pageForm.schemaType || ''} onChange={e => setPageForm({...pageForm, schemaType: e.target.value})}>
                  <option value="">None</option>
                  <option value="Organization">Organization</option>
                  <option value="Website">Website</option>
                  <option value="FAQPage">FAQPage</option>
                  <option value="Article">Article</option>
                  <option value="SoftwareApplication">SoftwareApplication</option>
                  <option value="BreadcrumbList">BreadcrumbList</option>
                </select>
              </div>
              {pageForm.schemaType && (
                <div>
                  <label className="block text-sm font-medium mb-1">Schema JSON</label>
                  <textarea className="w-full p-2 border rounded font-mono text-sm" rows={8} value={pageForm.schemaJson || ''} onChange={e => setPageForm({...pageForm, schemaJson: e.target.value})} placeholder='{"@context": "https://schema.org", "@type": "..."}' />
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-slate-200">
              <button onClick={savePage} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700">
                <Save className="w-5 h-5" /> Save Page SEO
              </button>
            </div>
          </div>

          {/* Live Preview Column */}
          <div className="lg:col-span-1 space-y-6">
            <div className="sticky top-6 space-y-6">
              <h3 className="font-bold text-slate-800 border-b pb-2">Live Previews</h3>

              {/* Google Preview */}
              <div className="bg-white border rounded-lg p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                  <div className="w-4 h-4 bg-slate-200 rounded-full flex items-center justify-center text-[8px]">G</div>
                  <span>www.careerforgeai.com › {pageForm.pageKey}</span>
                </div>
                <div className="text-blue-700 text-lg sm:text-xl font-medium cursor-pointer hover:underline line-clamp-1">
                  {pageForm.title || "Page Title"}
                </div>
                <div className="text-sm text-slate-600 line-clamp-2 mt-1">
                  {pageForm.description || "Provide a meta description to see how it looks in Google search results."}
                </div>
              </div>

              {/* Twitter Card Preview */}
              <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                <div className="h-40 bg-slate-100 border-b flex items-center justify-center">
                  {pageForm.twitterImage || pageForm.ogImage ? (
                    <img src={pageForm.twitterImage || pageForm.ogImage} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-slate-300" />
                  )}
                </div>
                <div className="p-4 bg-slate-50">
                  <div className="text-sm text-slate-500 mb-1">careerforgeai.com</div>
                  <div className="font-bold text-slate-900 line-clamp-1">{pageForm.twitterTitle || pageForm.ogTitle || pageForm.title || "Twitter Card Title"}</div>
                  <div className="text-sm text-slate-600 line-clamp-2 mt-1">{pageForm.twitterDescription || pageForm.ogDescription || pageForm.description || "Description snippet will appear here."}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
            <h2 className="font-bold text-slate-800">SEO Pages ({pages.length})</h2>
            <div className="flex gap-3">
              <button onClick={handleAutoMap} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" /> Auto-Map Standard Pages
              </button>
              <button onClick={handleNewPage} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
                + Map New Page
              </button>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {pages.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No pages mapped. Add your first page to manage its SEO.</div>
            ) : (
              pages.map(p => (
                <div key={p.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{p.pageName || p.pageKey}</span>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">/{p.pageKey === 'home' ? '' : p.pageKey}</span>
                      {p.isIndexed ? (
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded uppercase font-bold tracking-wider">Indexed</span>
                      ) : (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded uppercase font-bold tracking-wider">NoIndex</span>
                      )}
                    </div>
                    <div className="text-sm text-slate-500 mt-1 line-clamp-1">{p.title || 'No Title Set'}</div>
                  </div>
                  <button onClick={() => handleEditPage(p)} className="px-4 py-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-sm font-medium transition-colors">
                    Edit Meta
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
    </>
  );
}
