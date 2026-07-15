import { useState, useEffect } from 'react';
import { Plus, Edit, Trash, Search, GripVertical, Check, X, Filter } from 'lucide-react';
import apiClient from '../../lib/apiClient';

export default function AdminFAQs() {
  const [faqs, setFaqs] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  
  // Editing state
  const [editingFaq, setEditingFaq] = useState<any | null>(null);
  const [editingCat, setEditingCat] = useState<any | null>(null);
  
  // Forms
  const [faqForm, setFaqForm] = useState({ question: '', answer: '', slug: '', categoryId: '', isPublished: true, isFeatured: false, displayOrder: 0 });
  const [catForm, setCatForm] = useState({ name: '', slug: '', description: '', displayOrder: 0 });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [faqsRes, catRes] = await Promise.all([
        apiClient.get('/admin/faqs'),
        apiClient.get('/admin/faqs/categories')
      ]);
      setFaqs(faqsRes.data.faqs);
      setCategories(catRes.data);
    } catch (err) {
      if (err?.response?.status !== 401) console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (text: string) => {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  };

  // --- FAQ Actions ---
  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingFaq) {
        await apiClient.put(`/admin/faqs/${editingFaq.id}`, faqForm);
      } else {
        await apiClient.post('/admin/faqs', faqForm);
      }
      setShowFaqModal(false);
      setEditingFaq(null);
      fetchData();
    } catch (err) {
      if (err?.response?.status !== 401) console.error(err);
      alert('Failed to save FAQ');
    }
  };

  const handleDeleteFaq = async (id: string) => {
    if (!confirm('Are you sure you want to delete this FAQ?')) return;
    try {
      await apiClient.delete(`/admin/faqs/${id}`);
      fetchData();
    } catch (err) {
      if (err?.response?.status !== 401) console.error(err);
    }
  };

  const openAddFaq = () => {
    setEditingFaq(null);
    setFaqForm({ question: '', answer: '', slug: '', categoryId: categories[0]?.id || '', isPublished: true, isFeatured: false, displayOrder: faqs.length });
    setShowFaqModal(true);
  };

  const openEditFaq = (faq: any, duplicate = false) => {
    setEditingFaq(duplicate ? null : faq);
    setFaqForm({
      question: faq.question + (duplicate ? ' (Copy)' : ''),
      answer: faq.answer,
      slug: faq.slug + (duplicate ? '-copy' : ''),
      categoryId: faq.categoryId || '',
      isPublished: duplicate ? false : faq.isPublished,
      isFeatured: duplicate ? false : faq.isFeatured,
      displayOrder: duplicate ? faqs.length : faq.displayOrder
    });
    setShowFaqModal(true);
  };

  // --- Category Actions ---
  const handleSaveCat = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCat) {
        await apiClient.put(`/admin/faqs/categories/${editingCat.id}`, catForm);
      } else {
        await apiClient.post('/admin/faqs/categories', catForm);
      }
      setShowCatModal(false);
      setEditingCat(null);
      fetchData();
    } catch (err) {
      if (err?.response?.status !== 401) console.error(err);
      alert('Failed to save category');
    }
  };

  const handleDeleteCat = async (id: string) => {
    if (!confirm('Are you sure? FAQs in this category will lose their category assignment.')) return;
    try {
      await apiClient.delete(`/admin/faqs/categories/${id}`);
      fetchData();
    } catch (err) {
      if (err?.response?.status !== 401) console.error(err);
    }
  };

  const openAddCat = () => {
    setEditingCat(null);
    setCatForm({ name: '', slug: '', description: '', displayOrder: categories.length });
    setShowCatModal(true);
  };

  const openEditCat = (cat: any) => {
    setEditingCat(cat);
    setCatForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      displayOrder: cat.displayOrder
    });
    setShowCatModal(true);
  };

  if (loading) return <div className="p-8">Loading FAQs...</div>;

  return (
    <>
    <div className="p-8 max-w-7xl xl:max-w-360 2xl:max-w-380 mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">FAQ Management</h1>
          <p className="text-slate-500 mt-1">Manage frequently asked questions and categories.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={openAddCat} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition">
            Manage Categories
          </button>
          <button onClick={openAddFaq} className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-indigo-700 text-white rounded-lg font-medium transition">
            <Plus className="w-4 h-4" /> Add FAQ
          </button>
        </div>
      </div>

      {/* Categories List (Simple) */}
      <div className="mb-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h2 className="font-semibold text-slate-800">Categories</h2>
          <button onClick={openAddCat} className="text-sm text-[var(--color-primary)] font-medium hover:underline">+ New Category</button>
        </div>
        <div className="divide-y divide-slate-100">
          {categories.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-sm">No categories found. Create one first.</div>
          ) : (
            categories.map((cat) => (
              <div key={cat.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                <div>
                  <span className="font-medium text-slate-900">{cat.name}</span>
                  <span className="text-slate-500 text-sm ml-4">/{cat.slug}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEditCat(cat)} className="p-2 text-slate-400 hover:text-indigo-600 transition">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeleteCat(cat.id)} className="p-2 text-slate-400 hover:text-red-600 transition">
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* FAQs List */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-semibold text-slate-800">Questions & Answers</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {faqs.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No FAQs found.</div>
          ) : (
            faqs.map((faq) => (
              <div key={faq.id} className="p-5 hover:bg-slate-50 flex gap-4">
                <div className="mt-1 cursor-grab text-slate-300 hover:text-slate-500">
                  <GripVertical className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-slate-900">{faq.question}</h3>
                      <p className="text-sm text-slate-500 mt-1 line-clamp-2">{faq.answer}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {faq.isFeatured && <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">Featured</span>}
                      {faq.isPublished ? (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">Published</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">Draft</span>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                    <span>Category: <span className="font-medium text-slate-700">{faq.category?.name || 'Uncategorized'}</span></span>
                    <span>Views: {faq.viewCount}</span>
                    <div className="flex-1"></div>
                    <button onClick={() => openEditFaq(faq, true)} className="text-slate-500 font-medium hover:text-indigo-600 hover:underline flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Duplicate
                    </button>
                    <button onClick={() => openEditFaq(faq)} className="text-indigo-600 font-medium hover:underline flex items-center gap-1">
                      <Edit className="w-3 h-3" /> Edit
                    </button>
                    <button onClick={() => handleDeleteFaq(faq.id)} className="text-red-600 font-medium hover:underline flex items-center gap-1">
                      <Trash className="w-3 h-3" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* FAQ Modal */}
      {showFaqModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-slate-900">{editingFaq ? 'Edit FAQ' : 'Add New FAQ'}</h2>
              <button onClick={() => setShowFaqModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveFaq} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Question</label>
                <input 
                  type="text" 
                  required
                  value={faqForm.question}
                  onChange={(e) => {
                    setFaqForm({...faqForm, question: e.target.value});
                    if (!editingFaq && faqForm.slug === generateSlug(faqForm.question)) {
                      setFaqForm({...faqForm, question: e.target.value, slug: generateSlug(e.target.value)});
                    }
                  }}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Slug</label>
                  <input 
                    type="text" 
                    required
                    value={faqForm.slug}
                    onChange={(e) => setFaqForm({...faqForm, slug: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select 
                    value={faqForm.categoryId}
                    onChange={(e) => setFaqForm({...faqForm, categoryId: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Uncategorized</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Answer</label>
                <textarea 
                  required
                  rows={5}
                  value={faqForm.answer}
                  onChange={(e) => setFaqForm({...faqForm, answer: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
                ></textarea>
              </div>
              <div className="flex gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={faqForm.isPublished}
                    onChange={(e) => setFaqForm({...faqForm, isPublished: e.target.checked})}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <span className="text-sm font-medium text-slate-700">Published</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={faqForm.isFeatured}
                    onChange={(e) => setFaqForm({...faqForm, isFeatured: e.target.checked})}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <span className="text-sm font-medium text-slate-700">Featured (Shows on Landing Page)</span>
                </label>
              </div>
              <div className="pt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setShowFaqModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-[var(--color-primary)] hover:bg-indigo-700 text-white rounded-lg font-medium transition">
                  Save FAQ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCatModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">{editingCat ? 'Edit Category' : 'Add Category'}</h2>
              <button onClick={() => setShowCatModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveCat} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input 
                  type="text" 
                  required
                  value={catForm.name}
                  onChange={(e) => {
                    setCatForm({...catForm, name: e.target.value});
                    if (!editingCat && catForm.slug === generateSlug(catForm.name)) {
                      setCatForm({...catForm, name: e.target.value, slug: generateSlug(e.target.value)});
                    }
                  }}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Slug</label>
                <input 
                  type="text" 
                  required
                  value={catForm.slug}
                  onChange={(e) => setCatForm({...catForm, slug: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
                />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowCatModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-[var(--color-primary)] hover:bg-indigo-700 text-white rounded-lg font-medium transition">
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </>
  );
}