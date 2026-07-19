import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, X, GripVertical, Check, Save, Image as ImageIcon, Eye, EyeOff, Star, Loader2 } from 'lucide-react';
import apiClient from '../../lib/apiClient';

// Toast helper
function useToast() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const ToastUI = toast ? (
    <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium animate-fade-in flex items-center gap-2 ${
      toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
    }`}>
      {toast.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
      {toast.message}
    </div>
  ) : null;

  return { showToast, ToastUI };
}

export default function AdminLanding() {
  const [activeTab, setActiveTab] = useState('sections');
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const { showToast, ToastUI } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Use admin endpoint to get ALL items including unpublished
      const res = await apiClient.get('/admin/landing/all');
      setData(res.data);
    } catch (error: any) {
      // Securely log the error without leaking stack traces or sensitive data
      console.error('An error occurred during this operation.');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'sections', label: 'Section Visibility' },
    { id: 'hero', label: 'Hero Section' },
    { id: 'stats', label: 'Statistics' },
    { id: 'steps', label: 'How It Works' },
    { id: 'features', label: 'Features' },
    { id: 'partners', label: 'Partners' },
    { id: 'testimonials', label: 'Testimonials' },
    { id: 'ctas', label: 'CTAs' },
    { id: 'newsletter', label: 'Newsletter' }
  ];

  if (loading) return (
    <div className="p-8 flex items-center gap-3 text-slate-500">
      <Loader2 className="w-5 h-5 animate-spin" /> Loading CMS...
    </div>
  );

  return (
    <>
    {ToastUI}
    <div className="p-4 sm:p-8 max-w-7xl xl:max-w-360 2xl:max-w-380 mx-auto space-y-6">
      <div className="flex justify-between items-center mb-4 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Landing Page CMS</h1>
          <p className="text-sm sm:text-base text-slate-500 mt-1">Manage public landing page content.</p>
        </div>
      </div>

      <div className="flex overflow-x-auto border-b border-slate-200 no-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
        {activeTab === 'sections' && <SectionsManager sections={data.sections || []} onRefresh={fetchData} showToast={showToast} />}
        {activeTab === 'hero' && <HeroManager hero={data.hero} onRefresh={fetchData} showToast={showToast} />}
        {activeTab === 'stats' && <StatsManager items={data.stats || []} onRefresh={fetchData} showToast={showToast} />}
        {activeTab === 'steps' && <StepsManager items={data.steps || []} onRefresh={fetchData} showToast={showToast} />}
        {activeTab === 'features' && <FeaturesManager items={data.features || []} onRefresh={fetchData} showToast={showToast} />}
        {activeTab === 'partners' && <PartnersManager items={data.partners || []} onRefresh={fetchData} showToast={showToast} />}
        {activeTab === 'testimonials' && <TestimonialsManager items={data.testimonials || []} onRefresh={fetchData} showToast={showToast} />}
        {activeTab === 'ctas' && <CTAsManager items={data.ctas || []} onRefresh={fetchData} showToast={showToast} />}
        {activeTab === 'newsletter' && <NewsletterManager newsletter={data.newsletters} onRefresh={fetchData} showToast={showToast} />}
      </div>
    </div>
    </>
  );
}

// -------------------------------------------------------------
// SECTIONS MANAGER
// -------------------------------------------------------------
const sectionLabels: Record<string, string> = {
  hero: 'Hero Section',
  stats: 'Statistics Bar',
  howItWorks: 'How It Works',
  features: 'Features Grid',
  pricing: 'Pricing Plans',
  testimonials: 'Testimonials',
  faq: 'FAQ Section',
  newsletter: 'Newsletter',
  cta: 'Call to Action',
  partners: 'Partners / Audience'
};

function SectionsManager({ sections, onRefresh, showToast }: { sections: any[], onRefresh: () => void, showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const [saving, setSaving] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});

  const toggleVisibility = async (id: string, currentVal: boolean) => {
    setSaving(id);
    try {
      await apiClient.put(`/admin/landing/section/${id}`, { isVisible: !currentVal });
      showToast(`Section ${!currentVal ? 'shown' : 'hidden'} successfully`);
      onRefresh();
    } catch (err) {
      showToast('Failed to update section', 'error');
    } finally {
      setSaving(null);
    }
  };

  const startEdit = (s: any) => {
    setEditingId(s.id);
    setForm({ title: s.title || '', subtitle: s.subtitle || '', description: s.description || '' });
  };

  const saveDetails = async (id: string) => {
    setSaving(id);
    try {
      await apiClient.put(`/admin/landing/section/${id}`, form);
      showToast('Section details saved');
      setEditingId(null);
      onRefresh();
    } catch (err) {
      showToast('Failed to save details', 'error');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Manage Sections</h2>
        <p className="text-xs text-slate-400">Toggle visibility and edit section headings</p>
      </div>
      <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
        {sections.map(s => (
          <div key={s.id} className="p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <GripVertical className="w-4 h-4 text-slate-300" />
                <div>
                  <span className="font-medium">{sectionLabels[s.name] || s.name}</span>
                  <span className="text-xs text-slate-400 ml-2">({s.name})</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => editingId === s.id ? setEditingId(null) : startEdit(s)}
                  className="px-3 py-1.5 rounded-full text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  <Edit2 className="w-3 h-3 inline mr-1" />
                  Edit
                </button>
                <button
                  onClick={() => toggleVisibility(s.id, s.isVisible)}
                  disabled={saving === s.id}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors ${
                    s.isVisible
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  } ${saving === s.id ? 'opacity-60' : ''}`}
                >
                  {saving === s.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : s.isVisible ? (
                    <Eye className="w-3 h-3" />
                  ) : (
                    <EyeOff className="w-3 h-3" />
                  )}
                  {s.isVisible ? 'Visible' : 'Hidden'}
                </button>
              </div>
            </div>
            
            {editingId === s.id && (
              <div className="mt-2 pl-2 sm:pl-7 p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Section Title</label>
                  <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full text-sm p-2 border rounded" placeholder="E.g. How It Works" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Subtitle / Highlight</label>
                  <input type="text" value={form.subtitle} onChange={e => setForm({...form, subtitle: e.target.value})} className="w-full text-sm p-2 border rounded" placeholder="E.g. Simple 3-Step Process" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                  <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full text-sm p-2 border rounded h-20" placeholder="Optional short description paragraph..." />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setEditingId(null)} className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50">Cancel</button>
                  <button onClick={() => saveDetails(s.id)} disabled={saving === s.id} className="px-4 py-2 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-60">
                    {saving === s.id ? 'Saving...' : 'Save Details'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// HERO MANAGER
// -------------------------------------------------------------
function HeroManager({ hero, onRefresh, showToast }: { hero: any, onRefresh: () => void, showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const [form, setForm] = useState(hero || { title: '', subtitle: '', description: '', primaryButtonText: '', primaryButtonUrl: '', secondaryButtonText: '', secondaryButtonUrl: '', imageUrl: '', background: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (hero) setForm(hero);
  }, [hero]);

  const save = async () => {
    setSaving(true);
    try {
      await apiClient.put('/admin/landing/hero', form);
      showToast('Hero section saved successfully');
      onRefresh();
    } catch (err) {
      showToast('Failed to save hero section', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <h2 className="text-lg font-bold">Hero Section</h2>
      <div className="space-y-4">
        <div><label className="block text-sm font-medium mb-1">Title</label><input type="text" className="w-full p-2 border rounded" value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
        <div><label className="block text-sm font-medium mb-1">Subtitle / Badge Text</label><input type="text" className="w-full p-2 border rounded" value={form.subtitle || ''} onChange={e => setForm({...form, subtitle: e.target.value})} /></div>
        <div><label className="block text-sm font-medium mb-1">Description</label><textarea className="w-full p-2 border rounded" rows={3} value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Primary Button Text</label><input type="text" className="w-full p-2 border rounded" value={form.primaryButtonText || ''} onChange={e => setForm({...form, primaryButtonText: e.target.value})} /></div>
          <div><label className="block text-sm font-medium mb-1">Primary Button URL</label><input type="text" className="w-full p-2 border rounded" value={form.primaryButtonUrl || ''} onChange={e => setForm({...form, primaryButtonUrl: e.target.value})} /></div>
          <div><label className="block text-sm font-medium mb-1">Secondary Button Text</label><input type="text" className="w-full p-2 border rounded" value={form.secondaryButtonText || ''} onChange={e => setForm({...form, secondaryButtonText: e.target.value})} /></div>
          <div><label className="block text-sm font-medium mb-1">Secondary Button URL</label><input type="text" className="w-full p-2 border rounded" value={form.secondaryButtonUrl || ''} onChange={e => setForm({...form, secondaryButtonUrl: e.target.value})} /></div>
          <div><label className="block text-sm font-medium mb-1">Background CSS</label><input type="text" className="w-full p-2 border rounded" value={form.background || ''} onChange={e => setForm({...form, background: e.target.value})} placeholder="e.g. bg-indigo-50" /></div>
        </div>
        <ImageUpload field="Hero Image" value={form.imageUrl} onChange={(val) => setForm({...form, imageUrl: val})} />
        <button onClick={save} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Hero'}
        </button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// NEWSLETTER MANAGER
// -------------------------------------------------------------
function NewsletterManager({ newsletter, onRefresh, showToast }: { newsletter: any, onRefresh: () => void, showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const [form, setForm] = useState(newsletter || { title: '', subtitle: '', buttonText: '', isPublished: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (newsletter) setForm(newsletter);
  }, [newsletter]);

  const save = async () => {
    setSaving(true);
    try {
      await apiClient.put('/admin/landing/newsletter', form);
      showToast('Newsletter section saved successfully');
      onRefresh();
    } catch (err) {
      showToast('Failed to save newsletter section', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <h2 className="text-lg font-bold">Newsletter Section</h2>
      <div className="space-y-4">
        <div><label className="block text-sm font-medium mb-1">Title</label><input type="text" className="w-full p-2 border rounded" value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
        <div><label className="block text-sm font-medium mb-1">Subtitle</label><input type="text" className="w-full p-2 border rounded" value={form.subtitle || ''} onChange={e => setForm({...form, subtitle: e.target.value})} /></div>
        <div><label className="block text-sm font-medium mb-1">Button Text</label><input type="text" className="w-full p-2 border rounded" value={form.buttonText || ''} onChange={e => setForm({...form, buttonText: e.target.value})} /></div>
        <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.isPublished} onChange={e => setForm({...form, isPublished: e.target.checked})} className="w-4 h-4 rounded" />
            <span className="text-sm font-medium">Published</span>
        </label>
        <button onClick={save} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Newsletter'}
        </button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// GENERIC CRUD MANAGER FACTORY (Fixed prop passing)
// -------------------------------------------------------------
interface CrudField {
  name: string;
  label: string;
  type: string; // 'text' | 'textarea' | 'number' | 'image' | 'checkbox'
}

interface CrudManagerProps {
  items: any[];
  onRefresh: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

function createCrudManager(
  apiModelName: string,
  displayName: string,
  fields: CrudField[],
  listRenderer?: (item: any) => React.ReactNode
) {
  return function Manager({ items, onRefresh, showToast }: CrudManagerProps) {
    const [editing, setEditing] = useState<any>(null);
    const [form, setForm] = useState<any>({});
    const [saving, setSaving] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    const openEdit = (item?: any) => {
      setEditing(item || { id: 'new' });
      const initialForm: any = { isPublished: true };
      if (item) {
        Object.assign(initialForm, item);
      } else {
        fields.forEach(f => initialForm[f.name] = f.type === 'number' ? 0 : '');
      }
      setForm(initialForm);
    };

    const save = async () => {
      setSaving(true);
      try {
        if (editing.id === 'new') {
          await apiClient.post(`/admin/landing/${apiModelName}`, form);
          showToast(`${displayName} created successfully`);
        } else {
          await apiClient.put(`/admin/landing/${apiModelName}/${editing.id}`, form);
          showToast(`${displayName} updated successfully`);
        }
        setEditing(null);
        onRefresh();
      } catch (err) {
        showToast(`Failed to save ${displayName.toLowerCase()}`, 'error');
      } finally {
        setSaving(false);
      }
    };

    const confirmDelete = async (id: string) => {
      setDeleting(true);
      try {
        await apiClient.delete(`/admin/landing/${apiModelName}/${id}`);
        showToast(`${displayName} deleted successfully`);
        onRefresh();
      } catch (err) {
        showToast(`Failed to delete ${displayName.toLowerCase()}`, 'error');
      } finally {
        setDeleting(false);
        setItemToDelete(null);
      }
    };

    if (editing) {
      return (
        <div className="space-y-4 max-w-2xl">
          <h2 className="text-lg font-bold">{editing.id === 'new' ? `Add ${displayName}` : `Edit ${displayName}`}</h2>
          <div className="space-y-4">
            {fields.map(f => (
              <div key={f.name}>
                <label className="block text-sm font-medium mb-1">{f.label}</label>
                {f.type === 'textarea' ? (
                  <textarea className="w-full p-2 border rounded" rows={3} value={form[f.name] || ''} onChange={e => setForm({...form, [f.name]: e.target.value})} />
                ) : f.type === 'image' ? (
                  <ImageUpload field={f.label} value={form[f.name]} onChange={val => setForm({...form, [f.name]: val})} />
                ) : f.type === 'checkbox' ? (
                  <input type="checkbox" checked={form[f.name] || false} onChange={e => setForm({...form, [f.name]: e.target.checked})} className="w-4 h-4 rounded" />
                ) : (
                  <input type={f.type} className="w-full p-2 border rounded" value={form[f.name] || ''} onChange={e => setForm({...form, [f.name]: f.type === 'number' ? Number(e.target.value) : e.target.value})} />
                )}
              </div>
            ))}
            <label className="flex items-center gap-2 mt-2">
                <input type="checkbox" checked={form.isPublished} onChange={e => setForm({...form, isPublished: e.target.checked})} className="w-4 h-4 rounded" />
                <span className="text-sm font-medium">Published</span>
            </label>
            <div className="flex gap-2 pt-2">
              <button onClick={save} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setEditing(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2 rounded-lg font-medium transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">{displayName}s</h2>
            <button onClick={() => openEdit()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors">
              <Plus className="w-4 h-4" /> Add {displayName}
            </button>
        </div>
        {(items || []).length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p className="text-sm">No {displayName.toLowerCase()}s yet. Click "Add {displayName}" to create one.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
            {(items || []).map((item: any) => (
              <div key={item.id} className="p-4 flex items-center justify-between group hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-xs text-slate-300 font-mono w-6 text-center shrink-0">#{item.displayOrder ?? '-'}</span>
                  {listRenderer ? listRenderer(item) : (
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 truncate">{item.title}</div>
                      {item.subtitle && <div className="text-sm text-slate-500 truncate">{item.subtitle}</div>}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {item.isPublished ? 'Published' : 'Draft'}
                  </span>
                  <button onClick={() => openEdit(item)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => setItemToDelete(item.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {itemToDelete && (
          <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Confirm Deletion</h3>
              <p className="text-sm text-slate-500">Are you sure you want to delete this item? This action cannot be undone.</p>
              <div className="flex gap-3 justify-end pt-2">
                <button onClick={() => setItemToDelete(null)} disabled={deleting} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
                <button onClick={() => confirmDelete(itemToDelete)} disabled={deleting} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-60 flex items-center gap-2 transition-colors">
                  {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };
}

// ---- CRUD Manager Instances ----

const StatsManager = createCrudManager('landingStatistic', 'Statistic', [
  { name: 'title', label: 'Value (e.g. 70%)', type: 'text' },
  { name: 'subtitle', label: 'Subtitle', type: 'text' },
  { name: 'description', label: 'Description', type: 'text' },
  { name: 'icon', label: 'Icon Name (Lucide)', type: 'text' },
  { name: 'displayOrder', label: 'Display Order', type: 'number' }
], (item) => (
  <div className="min-w-0">
    <div className="font-bold text-indigo-600 text-lg">{item.title}</div>
    <div className="text-sm text-slate-500">{item.subtitle}</div>
    {item.description && <div className="text-xs text-slate-400">{item.description}</div>}
  </div>
));

const StepsManager = createCrudManager('landingStep', 'Step', [
  { name: 'title', label: 'Title', type: 'text' },
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'icon', label: 'Icon Name (Lucide)', type: 'text' },
  { name: 'accent', label: 'Gradient/Color Classes (e.g. from-indigo-500 to-blue-500)', type: 'text' },
  { name: 'displayOrder', label: 'Display Order', type: 'number' }
], (item) => (
  <div className="flex items-center gap-3 min-w-0">
    <div className={`p-2 rounded-lg bg-linear-to-br ${item.accent || 'from-slate-200 to-slate-300'} shrink-0`}>
       <span className="text-white text-xs">{item.icon || 'Icon'}</span>
    </div>
    <div className="min-w-0">
      <div className="font-medium text-slate-900 truncate">{item.title}</div>
      {item.description && <div className="text-sm text-slate-500 truncate">{item.description}</div>}
    </div>
  </div>
));

const FeaturesManager = createCrudManager('landingFeature', 'Feature', [
  { name: 'title', label: 'Title', type: 'text' },
  { name: 'subtitle', label: 'Subtitle', type: 'text' },
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'icon', label: 'Icon Name (Lucide)', type: 'text' },
  { name: 'imageUrl', label: 'Feature Image', type: 'image' },
  { name: 'displayOrder', label: 'Display Order', type: 'number' }
], (item) => (
  <div className="flex items-center gap-3 min-w-0">
    {item.imageUrl && <img src={item.imageUrl} alt="" className="w-10 h-10 rounded object-cover shrink-0 bg-slate-100" />}
    <div className="min-w-0">
      <div className="font-medium text-slate-900 truncate">{item.title}</div>
      {item.subtitle && <div className="text-sm text-slate-500 truncate">{item.subtitle}</div>}
      {item.icon && <span className="text-xs text-indigo-500">Icon: {item.icon}</span>}
    </div>
  </div>
));

const PartnersManager = createCrudManager('landingPartner', 'Partner', [
  { name: 'title', label: 'Company Name', type: 'text' },
  { name: 'websiteUrl', label: 'Website URL', type: 'text' },
  { name: 'icon', label: 'Icon Name (Lucide)', type: 'text' },
  { name: 'imageUrl', label: 'Logo Image', type: 'image' },
  { name: 'displayOrder', label: 'Display Order', type: 'number' }
], (item) => (
  <div className="flex items-center gap-3 min-w-0">
    {item.imageUrl && <img src={item.imageUrl} alt="" className="h-8 w-auto object-contain shrink-0 bg-slate-50 rounded p-1" />}
    <div className="min-w-0">
      <div className="font-medium text-slate-900 truncate">{item.title}</div>
      {item.websiteUrl && <div className="text-xs text-slate-400 truncate">{item.websiteUrl}</div>}
    </div>
  </div>
));

const TestimonialsManager = createCrudManager('landingTestimonial', 'Testimonial', [
  { name: 'title', label: 'Reviewer Name', type: 'text' },
  { name: 'subtitle', label: 'Role/Designation', type: 'text' },
  { name: 'company', label: 'Company', type: 'text' },
  { name: 'description', label: 'Review Content', type: 'textarea' },
  { name: 'achievement', label: 'Achievement Badge', type: 'text' },
  { name: 'rating', label: 'Rating (1-5)', type: 'number' },
  { name: 'imageUrl', label: 'Avatar', type: 'image' },
  { name: 'displayOrder', label: 'Display Order', type: 'number' }
], (item) => (
  <div className="flex items-center gap-3 min-w-0">
    {item.imageUrl ? (
      <img src={item.imageUrl} alt="" className="w-10 h-10 rounded-full object-cover shrink-0 bg-slate-100" />
    ) : (
      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
        <span className="text-indigo-600 font-bold text-sm">{item.title?.[0] || '?'}</span>
      </div>
    )}
    <div className="min-w-0">
      <div className="font-medium text-slate-900 truncate">{item.title}</div>
      <div className="text-sm text-slate-500 truncate">{item.subtitle}{item.company ? ` at ${item.company}` : ''}</div>
      {item.rating > 0 && (
        <div className="flex gap-0.5 mt-0.5">
          {[...Array(item.rating || 0)].map((_, i) => <Star key={i} className="w-3 h-3 text-amber-400 fill-current" />)}
        </div>
      )}
    </div>
  </div>
));

const CTAsManager = createCrudManager('landingCTA', 'CTA', [
  { name: 'title', label: 'Title', type: 'text' },
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'buttonText', label: 'Button Text', type: 'text' },
  { name: 'buttonUrl', label: 'Button URL', type: 'text' },
  { name: 'background', label: 'Background Color/Class', type: 'text' },
  { name: 'displayOrder', label: 'Display Order', type: 'number' }
]);


// -------------------------------------------------------------
// IMAGE UPLOAD COMPONENT
// -------------------------------------------------------------
function ImageUpload({ field, value, onChange }: any) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);

    try {
      const res = await apiClient.post('/admin/settings/upload-branding', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onChange(res.data.url);
    } catch (err: any) {
      
      alert('Upload failed. Ensure Cloudinary is configured.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">{field}</label>
      {value ? (
        <div className="relative inline-block border rounded p-1">
            <img src={value} alt="Preview" className="h-16 object-cover rounded" />
            <button onClick={() => onChange('')} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"><X className="w-3 h-3" /></button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
            <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 border border-slate-300 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                <ImageIcon className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Upload Image'}
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
        </div>
      )}
      <input type="text" className="w-full p-2 border rounded mt-2 text-sm" value={value || ''} onChange={e => onChange(e.target.value)} placeholder="Or paste image URL here" />
    </div>
  );
}
