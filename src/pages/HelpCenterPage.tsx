import SEOMeta from '../components/SEOMeta';
import { useState, useEffect } from "react";
import { Book, FileText, HelpCircle, Shield, CreditCard, ChevronRight, MessageSquare, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { useSystemSettings } from "../contexts/SystemSettingsContext";

export default function HelpCenterPage() {
  const { settings } = useSystemSettings();
  const companyName = settings.companyName || 'CareerForge AI';

  const [categories, setCategories] = useState<any[]>([]);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [activeFaq, setActiveFaq] = useState<string | null>(null);

  useEffect(() => {
    fetchFaqs();
  }, [search, selectedCategoryId]);

  const fetchFaqs = () => {
    setLoading(true);
    let url = `/api/public/faqs?limit=100`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (selectedCategoryId) url += `&categoryId=${selectedCategoryId}`;

    import("axios").then(axios => {
      axios.default.get(url).then(res => {
        setFaqs(res.data.faqs || []);
        if (categories.length === 0) {
          setCategories(res.data.categories || []);
        }
      }).catch(err => { if(err?.response?.status !== 401) console.error(err); }).finally(() => setLoading(false));
    });
  };

  const toggleFaq = (id: string) => {
    setActiveFaq(activeFaq === id ? null : id);
  };

  return (
    <div className="max-w-6xl xl:max-w-7xl 2xl:max-w-[90rem] mx-auto py-16 px-4 sm:px-6 xl:px-8 w-full animate-in fade-in duration-500">
      <SEOMeta pageKey="help" />
      <div className="text-center space-y-6 mb-16 bg-slate-900 rounded-3xl p-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500 via-transparent to-transparent pointer-events-none"></div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight relative z-10">Help Center</h1>
        <p className="text-indigo-100 max-w-2xl mx-auto text-lg relative z-10">
          Everything you need to know about {companyName}. Advice and answers from our product team.
        </p>
        
        <div className="max-w-2xl mx-auto mt-8 relative z-10">
          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <HelpCircle className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search for answers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl border-0 focus:outline-none focus:ring-4 focus:ring-indigo-500/30 transition-all text-slate-900 bg-white shadow-xl"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8 mb-16">
        {/* Sidebar Categories */}
        <div className="w-full md:w-64 shrink-0">
          <h3 className="font-bold text-slate-900 mb-4 px-2">Categories</h3>
          <div className="space-y-1">
            <button
              onClick={() => setSelectedCategoryId("")}
              className={`w-full text-left px-4 py-2.5 rounded-xl font-medium transition ${selectedCategoryId === "" ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
            >
              All FAQs
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`w-full text-left px-4 py-2.5 rounded-xl font-medium transition ${selectedCategoryId === cat.id ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* FAQ Accordion List */}
        <div className="flex-1">
          {loading ? (
            <div className="py-12 text-center text-slate-500">Loading...</div>
          ) : faqs.length === 0 ? (
            <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-100">
              No articles found matching your criteria.
            </div>
          ) : (
            <div className="space-y-3">
              {faqs.map((faq) => (
                <div key={faq.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:border-indigo-200 transition-colors">
                  <button
                    onClick={() => toggleFaq(faq.id)}
                    className="w-full text-left py-4 px-5 flex justify-between items-center bg-white cursor-pointer"
                  >
                    <span className="font-bold text-slate-900 pr-4">{faq.question}</span>
                    <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${activeFaq === faq.id ? "rotate-180 text-indigo-600" : ""}`} />
                  </button>
                  
                  {activeFaq === faq.id && (
                    <div className="px-5 pb-5 pt-1 text-sm text-slate-600 leading-relaxed border-t border-slate-100 whitespace-pre-wrap">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-indigo-50 rounded-3xl p-8 md:p-12 text-center border border-indigo-100 flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-6 text-indigo-600">
          <MessageSquare className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-3">Can't find what you're looking for?</h2>
        <p className="text-slate-600 max-w-md mx-auto mb-8">
          Our support team is always ready to help you with any issues or questions you might have.
        </p>
        <Link to="/contact" className="bg-indigo-600 text-white font-semibold py-3 px-8 rounded-xl hover:bg-indigo-700 transition shadow-sm">
          Contact Support
        </Link>
      </div>
    </div>
  );
}
