import { useState, useEffect } from "react";
import apiClient from "../../lib/apiClient";
import { Save, Bot, Plus, Trash, Play, AlertCircle } from "lucide-react";

export default function AdminAI() {
  const [settings, setSettings] = useState<any>({});
  const [prompts, setPrompts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'health' | 'settings' | 'prompts' | 'test'>('health');
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [refreshingModels, setRefreshingModels] = useState(false);
  const [healthData, setHealthData] = useState<any[]>([]);
  const [cacheStatus, setCacheStatus] = useState<any>(null);
  
  // Test Panel State
  const [testResume, setTestResume] = useState("");
  const [testJD, setTestJD] = useState("");
  const [testPromptId, setTestPromptId] = useState("");
  const [testResult, setTestResult] = useState("");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await apiClient.get('/admin/ai');
      const modelsRes = await apiClient.get('/admin/ai/models');
      const healthRes = await apiClient.get('/admin/ai/health');
      
      setAvailableModels(modelsRes.data || []);
      setHealthData(healthRes.data.health || []);
      setCacheStatus(healthRes.data.cache);
      setSettings(res.data.settings);
      setPrompts(res.data.prompts);
    } catch (err) {
      if (err?.response?.status !== 401) console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const refreshModels = async () => {
    setRefreshingModels(true);
    try {
      const modelsRes = await apiClient.get('/admin/ai/models?forceRefresh=true');
      setAvailableModels(modelsRes.data.models || []);
      alert("Models refreshed from Google GenAI API!");
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to refresh models");
    } finally {
      setRefreshingModels(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await apiClient.put('/admin/ai', settings);
      alert("AI Settings saved successfully!");
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to save AI settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSettingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setSettings((prev: any) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : (type === 'number' ? Number(value) : value)
    }));
  };

  const handlePromptChange = (idx: number, field: string, value: any) => {
    const newPrompts = [...prompts];
    newPrompts[idx] = { ...newPrompts[idx], [field]: value };
    setPrompts(newPrompts);
  };

  const addPrompt = () => {
    setPrompts([...prompts, { id: 'new_' + Date.now(), name: '', slug: '', content: '', description: '', isActive: true, isNew: true }]);
  };

  const savePrompt = async (prompt: any, idx: number) => {
    try {
      if (prompt.isNew) {
        const res = await apiClient.post('/admin/ai/prompts', prompt);
        const newPrompts = [...prompts];
        newPrompts[idx] = res.data.prompt;
        setPrompts(newPrompts);
        alert("Prompt created successfully");
      } else {
        const res = await apiClient.put(`/admin/ai/prompts/${prompt.id}`, prompt);
        const newPrompts = [...prompts];
        newPrompts[idx] = res.data.prompt;
        setPrompts(newPrompts);
        alert("Prompt updated successfully");
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to save prompt");
    }
  };

  const deletePrompt = async (prompt: any, idx: number) => {
    if (!confirm("Are you sure?")) return;
    try {
      if (!prompt.isNew) {
        await apiClient.delete(`/admin/ai/prompts/${prompt.id}`);
      }
      const newPrompts = [...prompts];
      newPrompts.splice(idx, 1);
      setPrompts(newPrompts);
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to delete prompt");
    }
  };

  const handleTest = async () => {
    if (!testResume || !testPromptId) return alert("Resume and Prompt are required");
    const prompt = prompts.find(p => p.id === testPromptId) || { content: testPromptId };
    
    setTesting(true);
    setTestResult("");
    try {
      const res = await apiClient.post('/admin/ai/test', {
        resumeText: testResume,
        jobDescription: testJD,
        promptContent: prompt.content || testPromptId // Fallback to raw string if standard prompt id isn't found
      });
      setTestResult(res.data.result);
    } catch (err: any) {
      setTestResult("Error: " + (err.response?.data?.error || err.message));
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <div className="p-8">Loading AI settings...</div>;

  return (
    <>
    <div className="space-y-6 max-w-6xl xl:max-w-360 2xl:max-w-380 mx-auto pb-12">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Bot className="w-6 h-6 text-indigo-600" />
          AI Configuration
        </h1>
        
      {activeTab === 'health' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
              <span className="text-slate-500 text-sm font-medium mb-1">Active Model</span>
              <span className="text-2xl font-bold text-slate-900">{settings.geminiModel || "None"}</span>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
              <span className="text-slate-500 text-sm font-medium mb-1">Models Discovered</span>
              <span className="text-2xl font-bold text-indigo-600">{availableModels.length}</span>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
              <span className="text-slate-500 text-sm font-medium mb-1">Cache Status</span>
              <span className="text-lg font-bold text-emerald-600">{cacheStatus?.isRefreshing ? "Refreshing..." : "Active"}</span>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h2 className="text-lg font-semibold text-slate-900">AI Model Health & Analytics</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 border-b">
                  <tr>
                    <th className="px-6 py-3 font-medium">Model</th>
                    <th className="px-6 py-3 font-medium">State</th>
                    <th className="px-6 py-3 font-medium text-right">Requests</th>
                    <th className="px-6 py-3 font-medium text-right">Success Rate</th>
                    <th className="px-6 py-3 font-medium text-right">Failovers</th>
                    <th className="px-6 py-3 font-medium text-right">Avg Latency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {healthData.length === 0 && (
                    <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No runtime analytics yet.</td></tr>
                  )}
                  {healthData.map((h: any) => (
                    <tr key={h.modelName} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-900">{h.modelName}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          h.state === 'CLOSED' ? 'bg-emerald-100 text-emerald-800' :
                          h.state === 'OPEN' ? 'bg-red-100 text-red-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {h.state}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">{h.totalRequests}</td>
                      <td className="px-6 py-4 text-right">
                        {h.totalRequests > 0 ? Math.round((h.successCount / h.totalRequests) * 100) : 0}%
                      </td>
                      <td className="px-6 py-4 text-right text-amber-600 font-medium">{h.failoverCount}</td>
                      <td className="px-6 py-4 text-right">{Math.round(h.avgLatencyMs)}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
          <button 
            onClick={handleSaveSettings}
            disabled={saving}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Settings"}
          </button>
        )}
      </div>

      <div className="flex border-b">
        <button className={`px-4 py-2 font-medium ${activeTab === 'health' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('health')}>System Health</button>
        <button className={`px-4 py-2 font-medium ${activeTab === 'settings' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('settings')}>Settings & Models</button>
        <button className={`px-4 py-2 font-medium ${activeTab === 'prompts' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('prompts')}>Prompt Templates</button>
        <button className={`px-4 py-2 font-medium ${activeTab === 'test' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('test')}>Test Panel</button>
      </div>

      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">Model Parameters</h2>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-slate-700">Gemini Model</label>
                <button onClick={refreshModels} disabled={refreshingModels} className="text-xs text-indigo-600 hover:text-indigo-800">
                  {refreshingModels ? "Refreshing..." : "Refresh Models"}
                </button>
              </div>
              <select name="geminiModel" value={settings.geminiModel || ''} onChange={handleSettingChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500">
                {availableModels.length === 0 && <option value="">Loading models...</option>}
                {availableModels.map(m => (
                  <option key={m.name} value={m.name}>{m.displayName} ({m.version})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Temperature ({settings.temperature || 0})</label>
              <input type="range" min="0" max="1" step="0.1" name="temperature" value={settings.temperature || 0} onChange={handleSettingChange} className="w-full" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Top P</label>
                <input type="number" step="0.05" name="topP" value={settings.topP || 0} onChange={handleSettingChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Top K</label>
                <input type="number" name="topK" value={settings.topK || 40} onChange={handleSettingChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Max Tokens</label>
                <input type="number" name="maxTokens" value={settings.maxTokens || 0} onChange={handleSettingChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Retry Count</label>
                <input type="number" name="retryCount" value={settings.retryCount || 0} onChange={handleSettingChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Timeout (s)</label>
                <input type="number" name="timeout" value={settings.timeout || 30} onChange={handleSettingChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            
            
            <div className="pt-4 border-t space-y-4">
              <h3 className="font-medium text-slate-900">High Availability & Failover</h3>
              
              <label className="flex items-center gap-3">
                <input type="checkbox" name="enableFailover" checked={!!settings.enableFailover} onChange={handleSettingChange} className="w-5 h-5 text-indigo-600 rounded" />
                <span className="text-sm font-medium text-slate-700">Enable Automatic Model Failover</span>
              </label>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Max Retries</label>
                  <input type="number" name="failoverRetryCount" value={settings.failoverRetryCount || 3} onChange={handleSettingChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cooldown (Mins)</label>
                  <input type="number" name="failoverCooldownMins" value={settings.failoverCooldownMins || 5} onChange={handleSettingChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t space-y-3">
              <label className="flex items-center gap-3">
                <input type="checkbox" name="enableStreaming" checked={!!settings.enableStreaming} onChange={handleSettingChange} className="w-5 h-5 text-indigo-600 rounded" />
                <span className="text-sm font-medium text-slate-700">Enable Streaming Responses (where supported)</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" name="enableLogging" checked={!!settings.enableLogging} onChange={handleSettingChange} className="w-5 h-5 text-indigo-600 rounded" />
                <span className="text-sm font-medium text-slate-700">Enable AI Request Logging</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" name="enablePromptHistory" checked={!!settings.enablePromptHistory} onChange={handleSettingChange} className="w-5 h-5 text-indigo-600 rounded" />
                <span className="text-sm font-medium text-slate-700">Enable Prompt History tracking</span>
              </label>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">Feature Toggles</h2>
            <p className="text-sm text-slate-500 mb-4">Turn AI features on or off globally across the application.</p>
            
            <div className="space-y-4">
              <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                <div>
                  <span className="font-medium text-slate-900 block">ATS Analyzer</span>
                  <span className="text-xs text-slate-500">Resume scoring against job descriptions</span>
                </div>
                <input type="checkbox" name="isAtsEnabled" checked={!!settings.isAtsEnabled} onChange={handleSettingChange} className="w-5 h-5 text-indigo-600 rounded" />
              </label>

              <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                <div>
                  <span className="font-medium text-slate-900 block">Cover Letter Generator</span>
                  <span className="text-xs text-slate-500">Auto-generate tailored cover letters</span>
                </div>
                <input type="checkbox" name="isCoverLetterEnabled" checked={!!settings.isCoverLetterEnabled} onChange={handleSettingChange} className="w-5 h-5 text-indigo-600 rounded" />
              </label>

              <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                <div>
                  <span className="font-medium text-slate-900 block">Bullet Rewriter</span>
                  <span className="text-xs text-slate-500"> Individual resume bullet points</span>
                </div>
                <input type="checkbox" name="isBulletRewriterEnabled" checked={!!settings.isBulletRewriterEnabled} onChange={handleSettingChange} className="w-5 h-5 text-indigo-600 rounded" />
              </label>

              <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                <div>
                  <span className="font-medium text-slate-900 block">LinkedIn Optimizer</span>
                  <span className="text-xs text-slate-500">Generate LinkedIn profile summaries</span>
                </div>
                <input type="checkbox" name="isLinkedinEnabled" checked={!!settings.isLinkedinEnabled} onChange={handleSettingChange} className="w-5 h-5 text-indigo-600 rounded" />
              </label>

              <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                <div>
                  <span className="font-medium text-slate-900 block">Interview Prep</span>
                  <span className="text-xs text-slate-500">Generate practice questions and red flags</span>
                </div>
                <input type="checkbox" name="isInterviewEnabled" checked={!!settings.isInterviewEnabled} onChange={handleSettingChange} className="w-5 h-5 text-indigo-600 rounded" />
              </label>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'prompts' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button onClick={addPrompt} className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-indigo-100">
              <Plus className="w-4 h-4" /> Add Prompt
            </button>
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            {prompts.map((prompt, idx) => (
              <div key={prompt.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                      <input type="text" value={prompt.name} onChange={e => handlePromptChange(idx, 'name', e.target.value)} placeholder="e.g. ATS Analyzer v2" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Slug</label>
                      <input type="text" value={prompt.slug} onChange={e => handlePromptChange(idx, 'slug', e.target.value)} placeholder="e.g. ats_analyzer_v2" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                      <input type="text" value={prompt.description || ''} onChange={e => handlePromptChange(idx, 'description', e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <button onClick={() => savePrompt(prompt, idx)} className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-indigo-700">Save Prompt</button>
                    <button onClick={() => deletePrompt(prompt, idx)} className="text-red-600 hover:bg-red-50 px-3 py-1.5 rounded text-sm font-medium">Delete</button>
                    {!prompt.isNew && <span className="text-xs text-slate-400 mt-2">v{prompt.version} • updated by {prompt.updatedBy}</span>}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Content (Use {'{{resumeText}}'} and {'{{jobDescription}}'} as variables)</label>
                  <textarea value={prompt.content} onChange={e => handlePromptChange(idx, 'content', e.target.value)} rows={6} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-sm" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={prompt.isActive} onChange={e => handlePromptChange(idx, 'isActive', e.target.checked)} id={`active-${idx}`} className="w-4 h-4 text-indigo-600 rounded" />
                  <label htmlFor={`active-${idx}`} className="text-sm font-medium text-slate-700">Active</label>
                </div>
              </div>
            ))}
            {prompts.length === 0 && (
              <div className="text-center p-12 bg-slate-50 border rounded-xl border-dashed">
                <p className="text-slate-500 mb-4">No custom prompts defined.</p>
                <button onClick={addPrompt} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium inline-flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Create First Prompt
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'test' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">Inputs</h2>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Prompt to Test</label>
                <select value={testPromptId} onChange={e => setTestPromptId(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500">
                  <option value="">-- Select a prompt --</option>
                  {prompts.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.slug})</option>
                  ))}
                  <option value={settings.atsPrompt}>Legacy ATS Prompt</option>
                  <option value={settings.coverLetterPrompt}>Legacy Cover Letter Prompt</option>
                  <option value={settings.bulletRewriterPrompt}>Legacy Bullet Rewriter Prompt</option>
                  <option value={settings.linkedinPrompt}>Legacy LinkedIn Prompt</option>
                  <option value={settings.interviewPrompt}>Legacy Interview Prep Prompt</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Resume Text ({'{{resumeText}}'})</label>
                <textarea value={testResume} onChange={e => setTestResume(e.target.value)} rows={6} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="Paste sample resume text..." />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Job Description ({'{{jobDescription}}'})</label>
                <textarea value={testJD} onChange={e => setTestJD(e.target.value)} rows={4} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="Paste sample job description..." />
              </div>
              
              <button onClick={handleTest} disabled={testing || !testPromptId || !testResume} className="w-full bg-slate-900 text-white px-4 py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-slate-800 disabled:opacity-50">
                <Play className="w-4 h-4" /> {testing ? "Running AI..." : "Run Test Prompt"}
              </button>
            </div>
          </div>
          
          <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 p-6 flex flex-col h-full min-h-[500px]">
            <h2 className="text-lg font-semibold text-white border-b border-slate-700 pb-2 mb-4">Result Output</h2>
            <div className="flex-1 overflow-auto bg-slate-950 p-4 rounded-lg font-mono text-sm text-emerald-400 whitespace-pre-wrap">
              {testing ? (
                <div className="flex items-center gap-2 text-slate-400 animate-pulse">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" /> Generating response...
                </div>
              ) : testResult ? (
                testResult
              ) : (
                <span className="text-slate-600">No output yet. Run the test to see results.</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
