import React, { useState, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import apiClient from "../../lib/apiClient";
import { User, Camera } from "lucide-react";
import { useToast } from "../../contexts/ToastContext";

export default function ProfileTab() {
  const { user, refreshSession } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [avatar, setAvatar] = useState(user?.avatarUrl || "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      await apiClient.put("/user/profile", { name, email });
      await refreshSession();
      setMessage("Profile updated successfully!");
      toast.success("Profile settings updated successfully!", "Settings Updated");
    } catch (err: any) {
      const errMsg = err.response?.data?.error || "Failed to update profile";
      setMessage(errMsg);
      toast.error(errMsg, "Update Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const { data } = await apiClient.post("/user/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setAvatar(data.avatarUrl);
      await refreshSession();
      toast.success("Profile picture updated successfully!", "Avatar Updated");
    } catch (err) {
      if (err?.response?.status !== 401) console.error(err);
      toast.error("Failed to upload profile picture. Please try again.", "Upload Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Profile Information</h2>
        <p className="text-sm text-slate-500">Update your account's profile information and email address.</p>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative">
          {avatar ? (
            <img src={avatar} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center border-4 border-white shadow-lg">
              <User className="w-10 h-10" />
            </div>
          )}
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow border border-slate-200 text-slate-600 hover:text-indigo-600 transition"
          >
            <Camera className="w-4 h-4" />
          </button>
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">Profile Photo</h3>
          <p className="text-xs text-slate-500">JPG, GIF or PNG. Max size of 2MB.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4 pt-4 border-t border-slate-100">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
        {message && <p className={`text-sm ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>{message}</p>}
        <div>
          <button type="submit" disabled={loading} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition shadow-sm">
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
