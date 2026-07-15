import { useState, useEffect } from "react";
import apiClient from "../../lib/apiClient";
import { Mail, Save, RefreshCw, Send, Eye, FileText, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

export default function AdminEmails() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'logs'>('editor');
  
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  
  const [testEmail, setTestEmail] = useState("");
  const [testVariables, setTestVariables] = useState<Record<string, string>>({});
  
  const [logPage, setLogPage] = useState(1);
  const [logTotal, setLogTotal] = useState(0);

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs(1);
    }
  }, [activeTab]);

  const fetchTemplates = async () => {
    try {
      const res = await apiClient.get('/admin/emails');
      setTemplates(res.data.templates);
      if (res.data.templates.length > 0 && !activeTemplateId) {
        handleSelect(res.data.templates[0].id, res.data.templates);
      }
    } catch (err) {
      if (err?.response?.status !== 401) console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (page: number) => {
    try {
      const res = await apiClient.get(`/admin/emails/logs?page=${page}&limit=20`);
      setLogs(res.data.logs);
      setLogTotal(res.data.pages);
      setLogPage(page);
    } catch (err) {
      if (err?.response?.status !== 401) console.error(err);
    }
  };

  const handleSelect = (id: string, list = templates) => {
    setActiveTemplateId(id);
    const template = list.find(t => t.id === id);
    if (template) {
      setEditingTemplate({ ...template });
      
      // Initialize test variables
      let vars: string[] = [];
      try {
        vars = JSON.parse(template.variables || '[]');
      } catch (e) {}
      
      const newTestVars: Record<string, string> = {};
      vars.forEach(v => {
        newTestVars[v] = `Sample ${v}`;
      });
      setTestVariables(newTestVars);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setEditingTemplate((prev: any) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleTestVarChange = (key: string, value: string) => {
    setTestVariables(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!editingTemplate) return;
    setSaving(true);
    try {
      const res = await apiClient.put(`/admin/emails/${editingTemplate.id}`, editingTemplate);
      setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? res.data.template : t));
      setEditingTemplate(res.data.template);
      alert("Template saved successfully!");
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async () => {
    if (!editingTemplate || !confirm("Are you sure you want to restore the default template? This will overwrite your changes.")) return;
    try {
      const res = await apiClient.post(`/admin/emails/${editingTemplate.id}/restore`, {});
      setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? res.data.template : t));
      setEditingTemplate(res.data.template);
      alert("Template restored to default.");
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to restore template");
    }
  };

  const handleTest = async () => {
    if (!editingTemplate || !testEmail) return alert("Please enter a test email address.");
    try {
      await apiClient.post(`/admin/emails/${editingTemplate.id}/test`, { email: testEmail, testVariables });
      alert("Test email sent! Check your inbox.");
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to send test email");
    }
  };

  const replacePreviewVariables = (content: string) => {
    let result = content || '';
    for (const [key, value] of Object.entries(testVariables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, value);
    }
    return result;
  };

  const renderVarsList = () => {
    if (!editingTemplate) return null;
    let vars: string[] = [];
    try {
      vars = JSON.parse(editingTemplate.variables || '[]');
    } catch (e) {}
    
    return vars.map(v => (
      <span key={v} className="inline-block bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded font-mono mr-2 mb-2">
        {`{{${v}}}`}
      </span>
    ));
  };

  if (loading) return <div className="p-8 text-center text-slate-500 font-medium animate-pulse">Loading email system...</div>;

  return (
    <>
    <div className="space-y-6 max-w-7xl xl:max-w-360 2xl:max-w-380 mx-auto pb-12">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Mail className="w-6 h-6 text-indigo-600" />
          Email Management
        </h1>
        {activeTab === 'editor' && editingTemplate && (
          <button 
            onClick={handleSave}
            disabled={saving}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Template"}
          </button>
        )}
      </div>

      <div className="flex border-b border-slate-200">
        <button className={`px-4 py-2 font-medium flex items-center gap-2 ${activeTab === 'editor' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('editor')}>
          <FileText className="w-4 h-4" /> Editor & Testing
        </button>
        <button className={`px-4 py-2 font-medium flex items-center gap-2 ${activeTab === 'preview' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('preview')}>
          <Eye className="w-4 h-4" /> Preview
        </button>
        <button className={`px-4 py-2 font-medium flex items-center gap-2 ${activeTab === 'logs' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('logs')}>
          <Mail className="w-4 h-4" /> Delivery Logs
        </button>
      </div>

      {(activeTab === 'editor' || activeTab === 'preview') && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Left Sidebar: List of templates */}
          <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-fit">
            <div className="p-4 border-b bg-slate-50 font-semibold text-slate-700 flex justify-between">
              Templates
            </div>
            <div className="divide-y max-h-[700px] overflow-y-auto">
              {templates.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleSelect(t.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${activeTemplateId === t.id ? 'bg-indigo-50 border-l-4 border-indigo-600' : 'border-l-4 border-transparent'} ${!t.isActive ? 'opacity-50' : ''}`}
                >
                  <div className={`font-medium ${activeTemplateId === t.id ? 'text-indigo-900' : 'text-slate-700'}`}>{t.name}</div>
                  <div className="text-xs text-slate-500 mt-1 truncate capitalize">{t.category} • {t.key}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Right Content */}
          <div className="lg:col-span-3 space-y-6">
            {editingTemplate ? (
              <>
                {activeTab === 'editor' && (
                  <>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
                      <div className="flex justify-between items-start border-b pb-4">
                        <div>
                          <div className="flex items-center gap-3">
                            <h2 className="text-xl font-bold text-slate-900">{editingTemplate.name}</h2>
                            <span className="text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-600 rounded-full capitalize">{editingTemplate.category}</span>
                            <label className="flex items-center gap-2 ml-4">
                              <input type="checkbox" name="isActive" checked={editingTemplate.isActive} onChange={handleChange as any} className="w-4 h-4 text-indigo-600 rounded" />
                              <span className="text-sm font-medium text-slate-700">Active</span>
                            </label>
                          </div>
                          <p className="text-sm text-slate-500 mt-1">Key: {editingTemplate.key} • Version {editingTemplate.version} • Updated by {editingTemplate.updatedBy}</p>
                        </div>
                        <button onClick={handleRestore} className="text-slate-500 hover:text-red-600 flex items-center gap-1 text-sm font-medium">
                          <RefreshCw className="w-4 h-4" /> Restore Default
                        </button>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Available Variables</label>
                        <div>{renderVarsList()}</div>
                        <p className="text-xs text-slate-500 mt-2">Use these exact placeholders in your templates.</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                        <input type="text" name="subject" value={editingTemplate.subject} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium" />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">HTML Body</label>
                        <textarea name="htmlBody" value={editingTemplate.htmlBody} onChange={handleChange} rows={12} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-sm leading-relaxed" />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Plain Text Body</label>
                        <textarea name="textBody" value={editingTemplate.textBody} onChange={handleChange} rows={6} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-sm leading-relaxed" />
                      </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
                      <h3 className="font-semibold text-slate-900 flex items-center gap-2 border-b pb-2">
                        <Send className="w-4 h-4 text-indigo-600" /> Test Configuration
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <label className="block text-sm font-medium text-slate-700">Test Variables</label>
                          {Object.keys(testVariables).map(key => (
                            <div key={key} className="flex gap-2 items-center">
                              <span className="text-xs font-mono w-24 text-right text-slate-500">{key}</span>
                              <input 
                                type="text" 
                                value={testVariables[key]} 
                                onChange={(e) => handleTestVarChange(key, e.target.value)}
                                className="flex-1 px-2 py-1 text-sm border rounded bg-slate-50"
                              />
                            </div>
                          ))}
                          {Object.keys(testVariables).length === 0 && <span className="text-sm text-slate-500">No variables required.</span>}
                        </div>
                        <div className="space-y-3">
                          <label className="block text-sm font-medium text-slate-700">Send Test</label>
                          <input 
                            type="email" 
                            placeholder="recipient@example.com" 
                            value={testEmail} 
                            onChange={e => setTestEmail(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                          />
                          <button 
                            onClick={handleTest}
                            className="w-full bg-slate-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                          >
                            <Send className="w-4 h-4" /> Send Test Email
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'preview' && (
                  <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                      <h3 className="font-semibold text-slate-900 mb-4 border-b pb-2">Subject Preview</h3>
                      <div className="font-medium text-lg text-slate-800 bg-slate-50 p-3 rounded">
                        {replacePreviewVariables(editingTemplate.subject)}
                      </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                      <div className="p-4 bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 flex justify-between items-center">
                        HTML Preview
                        <span className="text-xs font-normal text-slate-500">Rendered in standard viewport</span>
                      </div>
                      <div className="p-8 bg-slate-100 flex justify-center">
                        <div 
                          className="bg-white w-full max-w-2xl min-h-[400px] border shadow-sm rounded p-6 overflow-auto"
                          dangerouslySetInnerHTML={{ __html: replacePreviewVariables(editingTemplate.htmlBody) }}
                        />
                      </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                      <div className="p-4 bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                        Plain Text Preview
                      </div>
                      <pre className="p-6 bg-slate-900 text-slate-300 font-mono text-sm whitespace-pre-wrap overflow-auto min-h-[200px]">
                        {replacePreviewVariables(editingTemplate.textBody)}
                      </pre>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 flex flex-col items-center justify-center text-center">
                <Mail className="w-12 h-12 text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-900">No template selected</h3>
                <p className="text-slate-500 mt-1">Select a template from the sidebar to view or edit it.</p>
              </div>
            )}
          </div>

        </div>
      )}

      {activeTab === 'logs' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-900">Email Delivery Logs</h2>
            <button onClick={() => fetchLogs(1)} className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Recipient</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Template</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No email logs found.</td>
                  </tr>
                ) : logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {format(new Date(log.sentAt), "MMM d, yyyy HH:mm:ss")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      {log.recipient}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {log.template?.name || 'Unknown / Deleted'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 truncate max-w-xs">
                      {log.subject}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {log.status === 'Sent' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-800">
                          <CheckCircle className="w-3 h-3" /> Sent
                        </span>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-medium bg-red-100 text-red-800 w-fit">
                            <XCircle className="w-3 h-3" /> Failed
                          </span>
                          {log.errorMessage && <span className="text-xs text-red-500 truncate max-w-[200px]" title={log.errorMessage}>{log.errorMessage}</span>}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {logTotal > 1 && (
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
              <button 
                disabled={logPage === 1} 
                onClick={() => fetchLogs(logPage - 1)}
                className="px-3 py-1 border rounded text-sm font-medium disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-slate-500">Page {logPage} of {logTotal}</span>
              <button 
                disabled={logPage === logTotal} 
                onClick={() => fetchLogs(logPage + 1)}
                className="px-3 py-1 border rounded text-sm font-medium disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
    </>
  );
}
