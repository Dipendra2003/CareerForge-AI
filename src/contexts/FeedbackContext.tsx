import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Star, MessageSquare, AlertTriangle, Send, CheckCircle2, ThumbsUp, Sparkles } from "lucide-react";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";

interface FeedbackContextProps {
  showFeedback: (triggerReason?: "scan" | "cover_letter" | "periodic" | "manual") => void;
  closeFeedback: () => void;
}

const FeedbackContext = createContext<FeedbackContextProps>({} as FeedbackContextProps);

type FeedbackTab = "feedback" | "bug";

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<"scan" | "cover_letter" | "periodic" | "manual">("manual");
  
  // Modal form states
  const [activeTab, setActiveTab] = useState<FeedbackTab>("feedback");
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Quick feedback tags/chips
  const feedbackTags = ["ATS Score Accuracy", "AI Suggestions", "UI & Design", "Speed & Performance", "Feature Request"];
  const bugTags = ["Analysis Error", "Document Upload", "UI Glitch", "AI Generation Stuck", "Billing Issue"];

  const showFeedback = useCallback((triggerReason: "scan" | "cover_letter" | "periodic" | "manual" = "manual") => {
    // If the user has opted out of periodic/automatic alerts, only allow manual trigger
    if (triggerReason !== "manual" && localStorage.getItem("careerforgeai_feedback_opt_out") === "true") {
      return;
    }
    
    setReason(triggerReason);
    setActiveTab(triggerReason === "periodic" || triggerReason === "manual" ? "feedback" : "feedback");
    setIsOpen(true);
    setIsSuccess(false);
    setMessage("");
    setRating(5);
    setSelectedTags([]);
  }, []);

  const closeFeedback = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Handle automatic periodic prompts
  useEffect(() => {
    if (!user) return;

    // Check if user has already opted out
    if (localStorage.getItem("careerforgeai_feedback_opt_out") === "true") return;

    // Check last prompted time
    const lastPrompt = localStorage.getItem("careerforgeai_feedback_last_prompt");
    const now = Date.now();
    const standardInterval = 2 * 60 * 60 * 1000; // Prompt at most once every 2 hours if active (for sandbox testing/demo purposes)

    if (!lastPrompt || now - parseInt(lastPrompt, 10) > standardInterval) {
      // Set a delayed timer to prompt after 30 seconds of activity
      const timer = setTimeout(() => {
        // Double check they haven't done it or completed actions
        showFeedback("periodic");
        localStorage.setItem("careerforgeai_feedback_last_prompt", now.toString());
      }, 45000); // 45 seconds

      return () => clearTimeout(timer);
    }
  }, [user, showFeedback]);

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleOptOut = () => {
    localStorage.setItem("careerforgeai_feedback_opt_out", "true");
    toast.info("You won't be prompted for automatic feedback again.", "Preferences Updated");
    closeFeedback();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && selectedTags.length === 0) {
      toast.warning("Please provide a comment or select at least one tag.", "Feedback Required");
      return;
    }

    setIsSubmitting(true);

    try {
      // Structure the message professionally for the /api/contact endpoint
      const subject = activeTab === "feedback" 
        ? `[Quick Feedback] ${reason === "scan" ? "After Scan Completion" : reason === "cover_letter" ? "After Cover Letter Gen" : "General Platform Feedback"}`
        : `[Issue Report] Bug reported via Analyzer Modal`;

      const formattedMessage = `
--- SUBMISSION DETAILS ---
Type: ${activeTab === "feedback" ? "Feedback & Suggestions" : "Issue / Bug Report"}
Trigger: ${reason.toUpperCase()}
Rating: ${activeTab === "feedback" ? `${rating} / 5 Stars` : "N/A"}
Tags: ${selectedTags.join(", ") || "None selected"}

--- USER COMMENTS ---
${message || "No specific comments left."}
      `.trim();

      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: user?.name || "Logged-in User",
          email: user?.email || "user@example.com",
          phone: "N/A",
          category: activeTab === "feedback" ? "Feedback & Suggestions" : "Technical Support",
          subject,
          message: formattedMessage,
        }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || "Failed to submit feedback");
      }

      setIsSuccess(true);
      toast.success("Thank you for your valuable feedback!", "Feedback Submitted");
      
      // Update last prompt time to avoid immediate prompting
      localStorage.setItem("careerforgeai_feedback_last_prompt", Date.now().toString());

      // Auto close after 3 seconds on success
      setTimeout(() => {
        closeFeedback();
      }, 3000);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Something went wrong. Please try again.", "Submission Failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FeedbackContext.Provider value={{ showFeedback, closeFeedback }}>
      {children}

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeFeedback}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              id="feedback-backdrop"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 pointer-events-auto"
              id="feedback-modal-container"
            >
              {/* Header */}
              <div className="relative px-4 py-4 sm:px-6 sm:pt-6 sm:pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 max-w-[85%]">
                  <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg text-indigo-600 dark:text-indigo-400 shrink-0">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base sm:text-lg truncate">
                      {reason === "scan" && "Amazing! Your scan is saved."}
                      {reason === "cover_letter" && "Awesome! Cover letter generated."}
                      {reason === "periodic" && "Help us build CareerForge AI!"}
                      {reason === "manual" && "Share your thoughts"}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {reason === "scan" || reason === "cover_letter" 
                        ? "Take 10 seconds to share your thoughts on the results."
                        : "Tell us about your experience and how we can improve."}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeFeedback}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors shrink-0"
                  id="close-feedback-btn"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="px-4 py-4 sm:px-6 sm:py-5">
                {isSuccess ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-10 text-center space-y-4"
                    id="feedback-success-state"
                  >
                    <div className="mx-auto w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 rounded-full flex items-center justify-center border border-emerald-100 dark:border-emerald-900/50">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xl font-bold text-slate-950 dark:text-slate-50">Thank you!</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-300 max-w-sm mx-auto">
                        Your input helps us refine our ATS scanner, custom AI cover letter generators, and layout styles.
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5" id="feedback-form">
                    {/* Tabs */}
                    <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm">
                      <button
                        type="button"
                        onClick={() => { setActiveTab("feedback"); setSelectedTags([]); }}
                        className={`flex items-center justify-center gap-2 py-2 rounded-lg font-semibold transition ${
                          activeTab === "feedback"
                            ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                        }`}
                        id="feedback-tab-button"
                      >
                        <MessageSquare className="w-4 h-4" /> Share Feedback
                      </button>
                      <button
                        type="button"
                        onClick={() => { setActiveTab("bug"); setSelectedTags([]); }}
                        className={`flex items-center justify-center gap-2 py-2 rounded-lg font-semibold transition ${
                          activeTab === "bug"
                            ? "bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200"
                        }`}
                        id="bug-tab-button"
                      >
                        <AlertTriangle className="w-4 h-4" /> Report Issue
                      </button>
                    </div>

                    {/* Feedback Rating */}
                    {activeTab === "feedback" && (
                      <div className="space-y-2 text-center" id="rating-container">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                          How satisfied are you with the results?
                        </label>
                        <div className="flex items-center justify-center gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setRating(star)}
                              onMouseEnter={() => setHoverRating(star)}
                              onMouseLeave={() => setHoverRating(null)}
                              className="p-1 transition-transform hover:scale-110"
                              id={`feedback-star-${star}`}
                            >
                              <Star
                                className={`h-8 w-8 transition-colors ${
                                  star <= (hoverRating ?? rating)
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-slate-300 dark:text-slate-700"
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-slate-500 font-medium">
                          {rating === 5 && "Excellent! Love the tools."}
                          {rating === 4 && "Great, very useful!"}
                          {rating === 3 && "Good, but could be better."}
                          {rating === 2 && "A bit disappointed."}
                          {rating === 1 && "Extremely unsatisfied."}
                        </p>
                      </div>
                    )}

                    {/* Tags / Chips Section */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                        Select tags that apply:
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {(activeTab === "feedback" ? feedbackTags : bugTags).map((tag) => {
                          const isSelected = selectedTags.includes(tag);
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => handleTagToggle(tag)}
                              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                                isSelected
                                  ? activeTab === "feedback"
                                    ? "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/50 dark:border-indigo-800 dark:text-indigo-300"
                                    : "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-300"
                                  : "bg-white border-slate-200 hover:border-slate-300 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                              }`}
                              id={`tag-${tag.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
                            >
                              {isSelected && "✓ "}
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Details / Comments Text Area */}
                    <div className="space-y-1.5">
                      <label htmlFor="feedback-comment" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                        Describe your feedback or issue:
                      </label>
                      <textarea
                        id="feedback-comment"
                        rows={4}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={
                          activeTab === "feedback"
                            ? "Tell us what you liked, what felt confusing, or suggestions for additional AI tools..."
                            : "Provide step-by-step instructions on what happened, what template or file you uploaded..."
                        }
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm resize-none"
                      />
                    </div>

                    {/* Footer buttons */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                      {reason !== "manual" ? (
                        <button
                          type="button"
                          onClick={handleOptOut}
                          className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline font-medium transition"
                          id="feedback-opt-out-btn"
                        >
                          Don't ask me again
                        </button>
                      ) : (
                        <div />
                      )}

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={closeFeedback}
                          className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition"
                          id="feedback-cancel-btn"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className={`px-5 py-2 text-sm font-semibold text-white rounded-xl shadow-sm flex items-center gap-1.5 transition-all ${
                            activeTab === "feedback"
                              ? "bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400"
                              : "bg-rose-600 hover:bg-rose-500 disabled:bg-rose-400"
                          }`}
                          id="feedback-submit-btn"
                        >
                          {isSubmitting ? "Submitting..." : "Submit"}
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </FeedbackContext.Provider>
  );
}

export const useFeedback = () => {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error("useFeedback must be used within a FeedbackProvider");
  }
  return context;
};
