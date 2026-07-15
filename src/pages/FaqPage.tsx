import SEOMeta from '../components/SEOMeta';
import { useState } from "react";
import { Plus, Minus, Search } from "lucide-react";

const faqs = [
  {
    category: "General",
    questions: [
      {
        q: "What is CareerForge AI?",
        a: "CareerForge AI is an advanced AI-powered platform designed to optimize your resume, analyze ATS compatibility, and help you land more interviews by matching your skills with job descriptions."
      },
      {
        q: "Is CareerForge AI free to use?",
        a: "We offer a generous free tier that includes basic resume scanning and keyword analysis. For advanced features like unlimited cover letter generation and deep ATS insights, we offer a Pro plan."
      }
    ]
  },
  {
    category: "Technical",
    questions: [
      {
        q: "How does the ATS Checker work?",
        a: "Our ATS Checker simulates exactly how applicant tracking systems parse your resume. It identifies missing keywords, formatting errors, and readability issues that might prevent human recruiters from seeing your application."
      },
      {
        q: "Which file formats do you support?",
        a: "Currently, our analyzer supports PDF (.pdf) and Microsoft Word (.docx) files. PDF is highly recommended to preserve formatting during the parsing process."
      }
    ]
  },
  {
    category: "Billing & Account",
    questions: [
      {
        q: "Can I cancel my Pro subscription at any time?",
        a: "Yes! You can cancel your subscription at any time from your Account Settings page. You will retain access to Pro features until the end of your current billing cycle."
      },
      {
        q: "Do you offer refunds?",
        a: "Yes, we offer a 7-day money-back guarantee. If you're not satisfied with your Pro subscription, contact our support team within 7 days of purchase for a full refund."
      }
    ]
  }
];

export default function FaqPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [openIndex, setOpenIndex] = useState<string | null>("General-0");

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

      <div className="max-w-3xl xl:max-w-5xl 2xl:max-w-[70rem] mx-auto space-y-12">
        {faqs.map((category) => {
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
