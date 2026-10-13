"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  Building2,
  Calendar,
  Globe,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  User,
  Camera,
  Trash2,
  UploadCloud,
  Lock,
  Phone,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { api } from "@/lib/api";
import { useToast } from "@/components/common/ToastProvider";

export default function SettingsPage() {
  const { toast, confirm } = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Profile Info Fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [userPhoto, setUserPhoto] = useState<string>("");
  const [profileSaving, setProfileSaving] = useState(false);

  // Password Change Fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const user = api.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        if (user.full_name) setFullName(user.full_name);
        if (user.email) setEmail(user.email);
        if (user.phone) setPhone(user.phone);
        if (user.organization_name) setCompanyName(user.organization_name);
        else if (user.full_name) setCompanyName(`${user.full_name}'s Workspace`);
        if (user.picture) setUserPhoto(user.picture);
      }
    }
  }, []);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File Too Large", "Please choose an image under 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setUserPhoto(base64);
        if (typeof window !== "undefined") {
          const user = api.getCurrentUser() || {};
          const updated = { ...user, picture: base64 };
          localStorage.setItem("zigmaa_user", JSON.stringify(updated));
          window.dispatchEvent(new CustomEvent("zigmaa_user_updated"));
        }
        toast.success("Photo Updated", "Your profile photo has been updated.");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = async () => {
    const confirmed = await confirm({
      title: "Remove Profile Picture",
      message: "Are you sure you want to remove your profile photo and use initials instead?",
      confirmText: "Remove Photo",
      cancelText: "Cancel",
      variant: "danger"
    });

    if (confirmed) {
      setUserPhoto("");
      if (typeof window !== "undefined") {
        const user = api.getCurrentUser() || {};
        const updated = { ...user, picture: "" };
        localStorage.setItem("zigmaa_user", JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent("zigmaa_user_updated"));
      }
      toast.success("Photo Removed", "Your profile picture was removed.");
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Validation Error", "Full name cannot be empty.");
      return;
    }
    if (!email.trim()) {
      toast.error("Validation Error", "Email address cannot be empty.");
      return;
    }

    setProfileSaving(true);
    try {
      await api.updateProfile({
        email: currentUser?.email || email.trim(),
        full_name: fullName.trim(),
        new_email: email.trim(),
        phone: phone.trim(),
        organization_name: companyName.trim(),
        picture: userPhoto
      });
      setSaved(true);
      toast.success("Profile Updated", "Your account and workspace profile was saved successfully.");
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      toast.error("Update Failed", err.message || "Failed to update profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");

    if (!currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setPasswordSaving(true);
    try {
      await api.changePassword({
        email: currentUser?.email || email.trim(),
        current_password: currentPassword,
        new_password: newPassword
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password Changed", "Your password has been changed successfully.");
    } catch (err: any) {
      setPasswordError(err.message || "Failed to change password. Please check your current password.");
      toast.error("Password Change Failed", err.message || "Current password incorrect.");
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleResetData = async () => {
    const confirmed = await confirm({
      title: "Reset All CRM Data",
      message: "Reset all CRM data to 0 (clean slate)? This removes all local leads, deals, tasks, events, and expenses.",
      confirmText: "Reset to Zero",
      cancelText: "Cancel",
      variant: "danger"
    });

    if (confirmed) {
      api.clearAllData();
      toast.success("Data Reset", "All records reset to 0.");
      setTimeout(() => {
        window.location.reload();
      }, 600);
    }
  };


  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 font-sans overflow-hidden select-none">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6 custom-scrollbar">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-red-50 text-red-600 border border-red-100">
                <Settings className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">CRM & Integration Settings</h1>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Manage organization profile, Google Calendar connection, and lead webhooks
                </p>
              </div>
            </div>

            {saved && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Settings Saved!</span>
              </div>
            )}
          </div>

          <div className="w-full max-w-5xl mx-auto space-y-6">
            {/* Personal Profile & Workspace Details Card */}
            <form onSubmit={handleSaveProfile} className="p-6 lg:p-7 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-red-50 text-red-600">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Personal & Organization Profile</h3>
                    <p className="text-xs text-slate-500">Manage your identity, contact information, and company credentials</p>
                  </div>
                </div>
              </div>

              {/* Profile Photo Row */}
              <div className="flex flex-col sm:flex-row items-center gap-5 pt-1">
                <div className="relative group shrink-0">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 text-slate-900 font-bold text-2xl flex items-center justify-center shadow-sm select-none overflow-hidden border-2 border-white ring-2 ring-slate-200">
                    {userPhoto ? (
                      <img
                        src={userPhoto}
                        alt={fullName || "Profile"}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <span className="text-2xl font-bold text-white drop-shadow-xs">
                        {fullName
                          ? fullName
                              .trim()
                              .split(/\s+/)
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()
                          : "U"}
                      </span>
                    )}
                  </div>

                  <input
                    type="file"
                    id="settings-photo-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />

                  <label
                    htmlFor="settings-photo-upload"
                    className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer text-[10px] font-semibold"
                    title="Upload photo"
                  >
                    <Camera className="w-4 h-4 mb-0.5" />
                    <span>Change</span>
                  </label>
                </div>

                <div className="space-y-2 text-center sm:text-left flex-1">
                  <h4 className="text-xs font-bold text-slate-800">Profile Picture</h4>
                  <p className="text-[11px] text-slate-500">
                    PNG, JPG, or GIF up to 5MB. Avatars are synced with your navigation bar.
                  </p>

                  <div className="flex items-center gap-2 justify-center sm:justify-start pt-1">
                    <label
                      htmlFor="settings-photo-upload"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>{userPhoto ? "Change Photo" : "Upload Photo"}</span>
                    </label>

                    {userPhoto && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-slate-200 hover:border-rose-200"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Editable Fields: Full Name, Email, Phone Number, Company Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Full Name</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>Email Address</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>Contact Number (10 digits)</span>
                  </label>
                  <div className="flex rounded-xl border border-slate-200 bg-slate-50 overflow-hidden focus-within:ring-2 focus-within:ring-red-500">
                    <span className="px-3 py-2.5 text-xs font-bold text-slate-600 bg-slate-200/60 border-r border-slate-200 select-none">
                      +91
                    </span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                        setPhone(digits);
                      }}
                      placeholder="9876543210"
                      className="flex-1 bg-transparent text-slate-900 p-2.5 focus:outline-none font-medium tracking-wide text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Company / Organization Name</span>
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Zigmaa Global"
                    className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end border-t border-slate-100">
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {profileSaving ? "Saving..." : "Save Profile Details"}
                </button>
              </div>
            </form>

            {/* Change Password Card */}
            <form onSubmit={handleChangePassword} className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-red-50 text-red-600">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Change Password</h3>
                    <p className="text-xs text-slate-500">Ensure your account uses a long, secure password</p>
                  </div>
                </div>
              </div>

              {passwordError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{passwordError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 text-slate-900 p-2.5 pr-10 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">New Password (min. 6)</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 text-slate-900 p-2.5 pr-10 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 text-slate-900 p-2.5 pr-10 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-start">
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{passwordSaving ? "Updating Password..." : "Update Password"}</span>
                </button>
              </div>
            </form>

            {/* Google Calendar Integration Card */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4 border-l-4 border-l-red-600">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-red-50 text-red-600">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Google Calendar Integration</h3>
                    <p className="text-xs text-slate-500">Live synchronization for sales meetings and demo bookings</p>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Ready & Enabled
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Your CRM integrates with Google Calendar. Every scheduled call or meeting includes direct
                <strong> &quot;Add to Google Cal&quot;</strong> and <strong>&quot;Download .ics&quot;</strong> actions.
              </p>

              <div className="flex items-center gap-3 pt-1">
                <a
                  href="https://calendar.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Launch Google Calendar</span>
                </a>
              </div>
            </div>


            {/* Webhook Endpoints */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Globe className="w-4 h-4 text-emerald-600" />
                <span>Inbound Lead Webhooks (Meta & Google Ads)</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Meta Ads Webhook URL</label>
                  <code className="block bg-slate-50 p-2.5 rounded-xl border border-slate-200 font-mono text-red-600 text-[11px]">
                    https://your-domain.com/api/v1/webhooks/meta
                  </code>
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Website Form Ingestion URL</label>
                  <code className="block bg-slate-50 p-2.5 rounded-xl border border-slate-200 font-mono text-emerald-600 text-[11px]">
                    https://your-domain.com/api/v1/webhooks/form
                  </code>
                </div>
              </div>
            </div>

            {/* Danger Zone: Start from Zero */}
            <div className="p-6 rounded-2xl bg-rose-50/60 border border-rose-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-rose-800">
                <RotateCcw className="w-4 h-4" />
                <h3 className="text-sm font-bold">Start from Zero (Clean Slate)</h3>
              </div>
              <p className="text-xs text-rose-700">
                Clear all mock leads, deals, tasks, calendar events, and expenses. Your CRM will reset to pure 0 counters.
              </p>
              <button
                type="button"
                onClick={handleResetData}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
              >
                Reset All Records to 0
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
