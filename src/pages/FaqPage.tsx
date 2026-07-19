import SEOMeta from '../components/SEOMeta';
import { useState, useEffect } from "react";
import { Plus, Minus, Search, Loader2 } from "lucide-react";
import apiClient from '../lib/apiClient';

export default function FaqPage() {
  const [faqsData, setFaqsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [openIndex, setOpenIndex] = useState<string | null>(null);

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const res = await apiClient.get('/public/faqs');
        const rawFaqs = res.data.faqs || [];
        const categories = res.data.categories || [];
        
        // Group FAQs by category name
        const grouped = categories.map((cat: any) => ({
          category: cat.name,
          questions: rawFaqs
            .filter((f: any) => f.categoryId === cat.id)
            .map((f: any) => ({ q: f.question, a: f.answer }))
        })).filter((g: any) => g.questions.length > 0);

        // Append any uncategorized FAQs if present
        const uncategorized = rawFaqs.filter((f: any) => !f.categoryId);
        if (uncategorized.length > 0) {
          grouped.push({
            category: "Other",
            questions: uncategorized.map((f: any) => ({ q: f.question, a: f.answer }))
          });
        }

        setFaqsData(grouped);
        
        // Open the first FAQ of the first category by default
        if (grouped.length > 0 && grouped[0].questions.length > 0) {
          setOpenIndex(`${grouped[0].category}-0`);
        }
      } catch (err) {
        console.error('Failed to load FAQs');
      } finally {
        setLoading(false);
      }
    };
    fetchFaqs();
  }, []);

  const toggleAccordion = (id: string) => {
    setOpenIndex(openIndex === id ? null : id);
  };

  return (
    <div className="max-w-4xl mx-auto py-16 px-4 sm:px-6 w-full animate-in fade-in duration-500">
      <SEOMeta pageKey="faq" />
      <div className="text-center space-y-4 mb-16">
        <span className="text-indigo-600 font-bold uppercase tracking-wider text-xs bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">Help & Support</span>
        <h1 className="text-3xl md:text-5xl font-black font-display text-slate-900 tracking-tight">Frequently Asked Questions</h1>
        <p className="text-slate-600 max-w-xl mx-auto text-sm md:text-base">
          Find answers to common questions about our resume tools, pricing, and account management.
        </p>
      </div>

      <div className="relative max-w-2xl mx-auto mb-12">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400" />
        </div>
        <input
          type="text"
          placeholder="Search for answers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 bg-white shadow-sm"
        />
      </div>

      <div className="max-w-3xl xl:max-w-5xl 2xl:max-w-280 mx-auto space-y-12 relative z-10">
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : faqsData.map((category) => {
          const filteredQuestions = category.questions.filter(
            (item) => 
              item.q.toLowerCase().includes(searchQuery.toLowerCase()) || 
              item.a.toLowerCase().includes(searchQuery.toLowerCase())
          );

          if (filteredQuestions.length === 0) return null;

          return (
            <div key={category.category}>
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                {category.category}
              </h2>
              <div className="space-y-4">
                {filteredQuestions.map((item, index) => {
                  const id = `${category.category}-${index}`;
                  const isOpen = openIndex === id;

                  return (
                    <div 
                      key={id} 
                      className={`border rounded-2xl overflow-hidden transition-all duration-200 ${isOpen ? 'border-indigo-200 bg-white shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                    >
                      <button
                        onClick={() => toggleAccordion(id)}
                        className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
                      >
                        <span className="font-semibold text-slate-900 pr-8">{item.q}</span>
                        <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isOpen ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                          {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        </div>
                      </button>
                      <div 
                        className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 pb-5 opacity-100' : 'max-h-0 opacity-0'}`}
                      >
                        <p className="text-slate-600 leading-relaxed text-sm">{item.a}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-16 text-center">
        <p className="text-slate-600 mb-4">Still have questions?</p>
        <a href="/contact" className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-xl text-indigo-700 bg-indigo-100 hover:bg-indigo-200 transition-colors">
          Contact Support
        </a>
      </div>
    </div>
  );
}
