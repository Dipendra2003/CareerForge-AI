import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, GripVertical, Check, Save, Image as ImageIcon } from 'lucide-react';
import apiClient from '../../lib/apiClient';

export default function AdminLanding() {
  const [activeTab, setActiveTab] = useState('sections');
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await apiClient.get('/public/landing');
      setData(res.data);
    } catch (error) {
      if (error?.response?.status !== 401) console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'sections', label: 'Section Visibility' },
    { id: 'hero', label: 'Hero Section' },
    { id: 'stats', label: 'Statistics' },
    { id: 'features', label: 'Features' },
    { id: 'partners', label: 'Partners' },
    { id: 'testimonials', label: 'Testimonials' },
    { id: 'ctas', label: 'CTAs' },
    { id: 'newsletter', label: 'Newsletter' }
  ];

  if (loading) return <div className="p-8">Loading CMS...</div>;

  return (
    <>
    <div className="p-8 max-w-7xl xl:max-w-360 2xl:max-w-380 mx-auto space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Landing Page CMS</h1>
          <p className="text-slate-500 mt-1">Manage public landing page content.</p>
        </div>
      </div>

      <div className="flex overflow-x-auto border-b border-slate-200">
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

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        {activeTab === 'sections' && <SectionsManager sections={data.sections} onRefresh={fetchData} />}
        {activeTab === 'hero' && <HeroManager hero={data.hero} onRefresh={fetchData} />}
        {activeTab === 'stats' && <StatsManager stats={data.stats} onRefresh={fetchData} />}
        {activeTab === 'features' && <FeaturesManager features={data.features} onRefresh={fetchData} />}
        {activeTab === 'partners' && <PartnersManager partners={data.partners} onRefresh={fetchData} />}
        {activeTab === 'testimonials' && <TestimonialsManager testimonials={data.testimonials} onRefresh={fetchData} />}
        {activeTab === 'ctas' && <CTAManager ctas={data.ctas} onRefresh={fetchData} />}
        {activeTab === 'newsletter' && <NewsletterManager newsletter={data.newsletters} onRefresh={fetchData} />}
      </div>
    </div>
    </>
  );
}

// -------------------------------------------------------------
// SECTIONS MANAGER
// -------------------------------------------------------------
function SectionsManager({ sections, onRefresh }: { sections: any[], onRefresh: () => void }) {
  const toggleVisibility = async (id: string, currentVal: boolean) => {
    await apiClient.put(`/admin/landing/section/${id}`, { isVisible: !currentVal });
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Manage Sections Visibility</h2>
      <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
        {sections.map(s => (
          <div key={s.id} className="p-4 flex items-center justify-between">
            <span className="font-medium capitalize">{s.name}</span>
            <button
              onClick={() => toggleVisibility(s.id, s.isVisible)}
              className={`px-3 py-1 rounded-full text-xs font-bold ${s.isVisible ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
            >
              {s.isVisible ? 'Visible' : 'Hidden'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// HERO MANAGER
// -------------------------------------------------------------
function HeroManager({ hero, onRefresh }: { hero: any, onRefresh: () => void }) {
  const [form, setForm] = useState(hero || { title: '', subtitle: '', description: '', primaryButtonText: '', primaryButtonUrl: '', secondaryButtonText: '', secondaryButtonUrl: '', imageUrl: '' });

  const save = async () => {
    await apiClient.put('/admin/landing/hero', form);
    alert('Hero saved');
    onRefresh();
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <h2 className="text-lg font-bold">Hero Section</h2>
      <div className="space-y-4">
        <div><label className="block text-sm font-medium mb-1">Title</label><input type="text" className="w-full p-2 border rounded" value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
        <div><label className="block text-sm font-medium mb-1">Subtitle</label><input type="text" className="w-full p-2 border rounded" value={form.subtitle || ''} onChange={e => setForm({...form, subtitle: e.target.value})} /></div>
        <div><label className="block text-sm font-medium mb-1">Description</label><textarea className="w-full p-2 border rounded" value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Primary Button Text</label><input type="text" className="w-full p-2 border rounded" value={form.primaryButtonText || ''} onChange={e => setForm({...form, primaryButtonText: e.target.value})} /></div>
          <div><label className="block text-sm font-medium mb-1">Primary Button URL</label><input type="text" className="w-full p-2 border rounded" value={form.primaryButtonUrl || ''} onChange={e => setForm({...form, primaryButtonUrl: e.target.value})} /></div>
          <div><label className="block text-sm font-medium mb-1">Secondary Button Text</label><input type="text" className="w-full p-2 border rounded" value={form.secondaryButtonText || ''} onChange={e => setForm({...form, secondaryButtonText: e.target.value})} /></div>
          <div><label className="block text-sm font-medium mb-1">Secondary Button URL</label><input type="text" className="w-full p-2 border rounded" value={form.secondaryButtonUrl || ''} onChange={e => setForm({...form, secondaryButtonUrl: e.target.value})} /></div>
        </div>
        <ImageUpload field="imageUrl" value={form.imageUrl} onChange={(val) => setForm({...form, imageUrl: val})} />
        <button onClick={save} className="bg-indigo-600 text-white px-4 py-2 rounded">Save Hero</button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// NEWSLETTER MANAGER
// -------------------------------------------------------------
function NewsletterManager({ newsletter, onRefresh }: { newsletter: any, onRefresh: () => void }) {
  const [form, setForm] = useState(newsletter || { title: '', subtitle: '', buttonText: '', isPublished: true });

  const save = async () => {
    await apiClient.put('/admin/landing/newsletter', form);
    alert('Newsletter saved');
    onRefresh();
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <h2 className="text-lg font-bold">Newsletter Section</h2>
      <div className="space-y-4">
        <div><label className="block text-sm font-medium mb-1">Title</label><input type="text" className="w-full p-2 border rounded" value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
        <div><label className="block text-sm font-medium mb-1">Subtitle</label><input type="text" className="w-full p-2 border rounded" value={form.subtitle || ''} onChange={e => setForm({...form, subtitle: e.target.value})} /></div>
        <div><label className="block text-sm font-medium mb-1">Button Text</label><input type="text" className="w-full p-2 border rounded" value={form.buttonText || ''} onChange={e => setForm({...form, buttonText: e.target.value})} /></div>
        <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.isPublished} onChange={e => setForm({...form, isPublished: e.target.checked})} />
            <span>Published</span>
        </label>
        <button onClick={save} className="bg-indigo-600 text-white px-4 py-2 rounded">Save Newsletter</button>
      </div>
    </div>
  );
}

// Generic CRUD Manager Factory for the rest
function createCrudManager(modelName: string, fields: {name: string, label: string, type: string}[]) {
  return function Manager({ [modelName]: items, onRefresh }: any) {
    const [editing, setEditing] = useState<any>(null);
    const [form, setForm] = useState<any>({});

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
      if (editing.id === 'new') {
        await apiClient.post(`/admin/landing/${modelName}`, form);
      } else {
        await apiClient.put(`/admin/landing/${modelName}/${editing.id}`, form);
      }
      setEditing(null);
      onRefresh();
    };

    const remove = async (id: string) => {
      if (!confirm('Are you sure?')) return;
      await apiClient.delete(`/admin/landing/${modelName}/${id}`);
      onRefresh();
    };

    if (editing) {
      return (
        <div className="space-y-4 max-w-2xl">
          <h2 className="text-lg font-bold">{editing.id === 'new' ? 'Add' : 'Edit'}</h2>
          <div className="space-y-4">
            {fields.map(f => (
              <div key={f.name}>
                <label className="block text-sm font-medium mb-1">{f.label}</label>
                {f.type === 'textarea' ? (
                  <textarea className="w-full p-2 border rounded" value={form[f.name] || ''} onChange={e => setForm({...form, [f.name]: e.target.value})} />
                ) : f.type === 'image' ? (
                  <ImageUpload field={f.name} value={form[f.name]} onChange={val => setForm({...form, [f.name]: val})} />
                ) : f.type === 'checkbox' ? (
                  <input type="checkbox" checked={form[f.name] || false} onChange={e => setForm({...form, [f.name]: e.target.checked})} />
                ) : (
                  <input type={f.type} className="w-full p-2 border rounded" value={form[f.name] || ''} onChange={e => setForm({...form, [f.name]: f.type === 'number' ? Number(e.target.value) : e.target.value})} />
                )}
              </div>
            ))}
            <label className="flex items-center gap-2 mt-2">
                <input type="checkbox" checked={form.isPublished} onChange={e => setForm({...form, isPublished: e.target.checked})} />
                <span>Published</span>
            </label>
            <div className="flex gap-2 pt-2">
              <button onClick={save} className="bg-indigo-600 text-white px-4 py-2 rounded">Save</button>
              <button onClick={() => setEditing(null)} className="bg-slate-200 px-4 py-2 rounded">Cancel</button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold capitalize">{modelName.replace('landing', '')}</h2>
            <button onClick={() => openEdit()} className="bg-indigo-600 text-white px-3 py-1 rounded text-sm">+ Add</button>
        </div>
        <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
          {(items || []).map((item: any) => (
            <div key={item.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">{item.title}</div>
                {item.subtitle && <div className="text-sm text-slate-500">{item.subtitle}</div>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(item)} className="p-2 text-slate-400 hover:text-indigo-600"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => remove(item.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
}

const StatsManager = createCrudManager('landingStatistic', [
  { name: 'title', label: 'Value (e.g. 70%)', type: 'text' },
  { name: 'subtitle', label: 'Subtitle', type: 'text' },
  { name: 'description', label: 'Description', type: 'text' },
  { name: 'icon', label: 'Icon Name (Lucide)', type: 'text' },
  { name: 'displayOrder', label: 'Display Order', type: 'number' }
]);

const FeaturesManager = createCrudManager('landingFeature', [
  { name: 'title', label: 'Title', type: 'text' },
  { name: 'subtitle', label: 'Subtitle', type: 'text' },
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'icon', label: 'Icon Name (Lucide)', type: 'text' },
  { name: 'imageUrl', label: 'Image URL', type: 'image' },
  { name: 'displayOrder', label: 'Display Order', type: 'number' }
]);

const PartnersManager = createCrudManager('landingPartner', [
  { name: 'title', label: 'Company Name', type: 'text' },
  { name: 'websiteUrl', label: 'Website URL', type: 'text' },
  { name: 'imageUrl', label: 'Logo Image URL', type: 'image' },
  { name: 'displayOrder', label: 'Display Order', type: 'number' }
]);

const TestimonialsManager = createCrudManager('landingTestimonial', [
  { name: 'title', label: 'Reviewer Name', type: 'text' },
  { name: 'subtitle', label: 'Role/Designation', type: 'text' },
  { name: 'company', label: 'Company', type: 'text' },
  { name: 'description', label: 'Review Content', type: 'textarea' },
  { name: 'rating', label: 'Rating (1-5)', type: 'number' },
  { name: 'imageUrl', label: 'Avatar URL', type: 'image' },
  { name: 'displayOrder', label: 'Display Order', type: 'number' }
]);

const CTAManager = createCrudManager('landingCTA', [
  { name: 'title', label: 'Title', type: 'text' },
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'buttonText', label: 'Button Text', type: 'text' },
  { name: 'buttonUrl', label: 'Button URL', type: 'text' },
  { name: 'background', label: 'Background Color/Class', type: 'text' },
  { name: 'displayOrder', label: 'Display Order', type: 'number' }
]);


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
    } catch (err) {
      if (err?.response?.status !== 401) console.error(err);
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
            <img src={value} alt="Preview" className="h-16 object-cover" />
            <button onClick={() => onChange('')} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"><X className="w-3 h-3" /></button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
            <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 border border-slate-300 px-3 py-1.5 rounded text-sm font-medium flex items-center gap-2">
                <ImageIcon className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Upload Image'}
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
        </div>
      )}
      <input type="text" className="w-full p-2 border rounded mt-2 text-sm" value={value || ''} onChange={e => onChange(e.target.value)} placeholder="Or paste image URL here" />
    </div>
  );
}
