"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { 
  Eye, 
  EyeOff, 
  X, 
  CheckCircle2, 
  ChevronDown, 
  Users, 
  Briefcase, 
  GitBranch, 
  Zap, 
  BarChart3, 
  CheckCircle, 
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Phone,
  FileText,
  Trophy,
  ArrowRight,
  Layers,
  Sparkles,
  Mail,
  Lock,
  AlertCircle
} from "lucide-react";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [isSignUp, setIsSignUp] = useState(pathname === "/signup");
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [otpValues, setOtpValues] = useState(["", "", "", "", "", ""]);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Sign up form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [contactNumber, setContactNumber] = useState("");
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);

  // Field-level error validation mapping (e.g. { email: "Invalid email", password: "Password is required" })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validateEmailFormat = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  };

  const validatePhoneFormat = (val: string) => {
    const clean = val.replace(/\D/g, "");
    return clean.length === 10;
  };

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    if (!email.trim() && !password) {
      setError("Please enter your email and password.");
      return;
    }

    if (!email.trim()) {
      setError("Email address is required.");
      return;
    }

    if (!validateEmailFormat(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Password is required.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccessMsg("");

    try {
      await api.login(email, password);
      router.push("/");
    } catch (err: any) {
      const errMsg = err.message || "Incorrect email or password";
      setError(errMsg);
      // Keep error message in top banner only - no duplicate underneath the fields
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!firstName.trim()) {
      errors.firstName = "First name is required";
    }
    if (!lastName.trim()) {
      errors.lastName = "Last name is required";
    }
    if (!companyName.trim()) {
      errors.companyName = "Company name is required";
    }
    if (!signUpPassword) {
      errors.signUpPassword = "Password is required";
    } else if (signUpPassword.length < 6) {
      errors.signUpPassword = "Password must be at least 6 characters";
    }

    if (!signUpEmail.trim()) {
      errors.signUpEmail = "Email is required";
    } else if (!validateEmailFormat(signUpEmail)) {
      errors.signUpEmail = "Invalid email";
    }

    if (!contactNumber.trim()) {
      errors.contactNumber = "Contact number is required";
    } else if (!validatePhoneFormat(contactNumber)) {
      errors.contactNumber = "Please enter a valid 10-digit mobile number";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    setError("");
    setSuccessMsg("");

    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      await api.register({
        email: signUpEmail.trim(),
        password: signUpPassword,
        full_name: fullName,
        organization_name: companyName.trim()
      });
      router.push("/");
    } catch (err: any) {
      const errMsg = err.message || "Failed to create account.";
      setError(errMsg);
      // Keep error message in top banner only - no duplicate underneath the fields
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setError("Please enter your email address");
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await api.sendOtp(resetEmail);
      setOtpSent(true);
      setOtpVerified(false);
      setSuccessMsg(res.message || `Verification code sent to ${resetEmail}`);
    } catch (err: any) {
      setError(err.message || "Failed to send verification code. Ensure your email exists.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    const otpCode = otpValues.join("");
    if (otpCode.length !== 6) {
      setError("Please enter the complete 6-digit OTP");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await api.verifyOtp(resetEmail, otpCode);
      setOtpVerified(true);
      setSuccessMsg("Code verified! Please enter your new password below.");
    } catch (err: any) {
      setError(err.message || "Invalid or expired verification code.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    const otpCode = otpValues.join("");
    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await api.resetPassword(resetEmail, otpCode, newPassword);
      setSuccessMsg(res.message || "Password updated successfully. Please log in.");
      setTimeout(() => {
        setIsResetPassword(false);
        setOtpSent(false);
        setOtpVerified(false);
        setPassword(newPassword);
        setEmail(resetEmail);
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to reset password.");
    } finally {
      setSubmitting(false);
    }
  }


  // Google OAuth Client ID
  const GOOGLE_CLIENT_ID =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    "38953728767-m0ufev60495sh0qnmmjpjg2smio9dbhl.apps.googleusercontent.com";

  // Load Google Identity Services SDK dynamically
  useState(() => {
    if (typeof window !== "undefined") {
      const existingScript = document.getElementById("google-gsi-script");
      if (!existingScript) {
        const script = document.createElement("script");
        script.id = "google-gsi-script";
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
      }
    }
  });

  const handleGoogleSignIn = () => {
    setGoogleLoading(true);
    setError("");

    if (typeof window === "undefined") return;

    const google = (window as any).google;

    if (google?.accounts?.oauth2) {
      try {
        const tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: "email profile openid",
          callback: async (tokenResponse: any) => {
            if (tokenResponse && tokenResponse.access_token) {
              try {
                // Fetch verified user profile directly from Google
                const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                });
                const profile = await userInfoRes.json();

                // Authenticate with CRM
                await api.loginWithGoogle({
                  email: profile.email,
                  name: profile.name,
                  picture: profile.picture,
                  token: tokenResponse.access_token,
                });

                router.push("/");
              } catch (e: any) {
                console.error("Failed to process Google profile", e);
                setError(e.message || "No account found with this Google email. Please sign up first.");
                setGoogleLoading(false);
              }
            } else {
              setGoogleLoading(false);
            }
          },
          error_callback: (err: any) => {
            console.error("Google OAuth error", err);
            setError("Google sign-in was cancelled or encountered an error.");
            setGoogleLoading(false);
          },
        });

        tokenClient.requestAccessToken({ prompt: "select_account" });
      } catch (err: any) {
        console.error("Google Token Client initialization error", err);
        setError("Failed to open Google Sign-In popup. Please check your browser popup settings.");
        setGoogleLoading(false);
      }
    } else {
      // If script is still downloading, retry in 500ms or fallback
      setTimeout(() => {
        const retryGoogle = (window as any).google;
        if (retryGoogle?.accounts?.oauth2) {
          handleGoogleSignIn();
        } else {
          setError("Google Sign-In SDK is loading. Please click again in 2 seconds.");
          setGoogleLoading(false);
        }
      }, 600);
    }
  };

  function handleForgotPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (forgotEmail.trim()) {
      setResetSent(true);
    }
  }

  return (
    <div className="relative h-screen max-h-screen w-screen overflow-hidden bg-white dark:bg-slate-950 text-slate-900 font-sans select-none flex">
      {/* ================= LEFT SIDE: RICH ENTERPRISE CRM SHOWCASE ================= */}
      <div className="hidden lg:flex lg:w-[58%] xl:w-[62%] h-full relative flex-col justify-between p-6 xl:p-8 bg-[#0D0B14] text-white border-r border-slate-800/80 overflow-hidden">
        {/* Ambient Obsidian & Brand Neon Glows */}
        <div className="absolute -top-32 -left-32 w-[480px] h-[480px] bg-gradient-to-br from-rose-600/25 via-[#EF4444]/15 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-24 w-[420px] h-[420px] bg-gradient-to-tl from-purple-700/20 via-rose-600/15 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-28 left-1/4 w-[380px] h-[380px] bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Subtle Tech Grid */}
        <div 
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
            backgroundSize: "24px 24px"
          }}
        />

        {/* Ambient Glowing Particle Accents */}
        <div className="absolute top-28 right-24 w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_#EF4444] animate-pulse pointer-events-none" />
        <div className="absolute top-1/2 right-12 w-2 h-2 rounded-full bg-purple-500/80 shadow-[0_0_10px_#8B5CF6] pointer-events-none" />
        <div className="absolute bottom-40 right-1/3 w-1 h-1 rounded-full bg-rose-400 shadow-[0_0_6px_#EF4444] pointer-events-none" />

        {/* Back-Layered Translucent Visual Artwork Element (image_3.png) */}
        <div className="absolute right-0 bottom-4 w-[65%] h-[62%] pointer-events-none z-0 select-none overflow-hidden opacity-30 xl:opacity-40 mix-blend-screen filter contrast-125">
          <img 
            src="/image_3.png" 
            alt="CRM Visualization" 
            className="w-full h-full object-cover object-left-top transform scale-105" 
          />
          {/* Edge softening gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0D0B14] via-transparent to-[#0D0B14]/80" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0D0B14] via-transparent to-[#0D0B14]/60" />
        </div>

        {/* Gradient Mask to ensure typography & bullet buttons stay 100% crisp and readable */}
        <div 
          className="absolute inset-0 pointer-events-none z-[1]"
          style={{
            background: "linear-gradient(90deg, #08070b 0%, #08070b 40%, rgba(8, 7, 11, 0.88) 58%, rgba(8, 7, 11, 0.25) 82%, transparent 100%)"
          }}
        />

        {/* TOP BRAND HEADER */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-red-500 p-0.5 shadow-xl shadow-rose-900/50 flex items-center justify-center">
              <img src="/crmlogo.png" alt="Zigmaa CRM" className="w-7 h-7 object-contain drop-shadow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg xl:text-xl tracking-tight text-white">Zigmaa CRM</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                  AI-Powered
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Intelligent Sales & Telephony Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#0D0B14]/90 border border-slate-800/90 text-xs text-slate-300 shadow-sm backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10B981] animate-pulse" />
            <span className="font-medium text-[11px]">System Online • Secure</span>
          </div>
        </div>

        {/* CENTER HERO & CRM HIGHLIGHTS */}
        <div className="relative z-10 space-y-2.5 my-auto py-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-semibold shadow-[0_0_12px_rgba(239,68,68,0.15)]">
            <Sparkles className="w-3 h-3 text-rose-400 animate-pulse" />
            <span>High-Velocity Revenue Operations</span>
          </div>

          <h1 className="text-2xl xl:text-3xl font-black tracking-tight text-white leading-tight">
            Turn every customer touchpoint into <br />
            <span className="bg-gradient-to-r from-rose-400 via-red-400 to-amber-300 bg-clip-text text-transparent">
              predictable revenue.
            </span>
          </h1>

          <p className="text-xs xl:text-sm text-slate-300 max-w-lg leading-relaxed">
            Consolidate your pipeline, browser-based telephony, AI Copilot insights, and GST quotations into one enterprise workspace.
          </p>

          {/* Key Features Grid with Glowing Borders */}
          <div className="grid grid-cols-2 gap-2.5 pt-0.5 max-w-lg">
            {/* Card 1: AI Sales Copilot */}
            <div className="group relative flex items-center gap-2.5 p-2.5 rounded-xl bg-[#0D0B14]/85 border border-rose-500/30 hover:border-rose-500/70 shadow-[0_0_12px_rgba(239,68,68,0.08)] hover:shadow-[0_0_20px_rgba(239,68,68,0.25)] backdrop-blur-md transition-all duration-300">
              <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/35 flex items-center justify-center text-rose-400 shrink-0 shadow-[0_0_10px_rgba(244,63,94,0.3)]">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white tracking-wide">AI Sales Copilot</p>
                <p className="text-[10px] text-slate-400 font-medium">Contextual deal guidance</p>
              </div>
            </div>

            {/* Card 2: Direct Calling */}
            <div className="group relative flex items-center gap-2.5 p-2.5 rounded-xl bg-[#0D0B14]/85 border border-emerald-500/30 hover:border-emerald-500/70 shadow-[0_0_12px_rgba(16,185,129,0.08)] hover:shadow-[0_0_20px_rgba(16,185,129,0.25)] backdrop-blur-md transition-all duration-300">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/35 flex items-center justify-center text-emerald-400 shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                <Phone className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white tracking-wide">Direct Calling</p>
                <p className="text-[10px] text-slate-400 font-medium">In-app dialer & history</p>
              </div>
            </div>

            {/* Card 3: Kanban Pipelines */}
            <div className="group relative flex items-center gap-2.5 p-2.5 rounded-xl bg-[#0D0B14]/85 border border-purple-500/30 hover:border-purple-500/70 shadow-[0_0_12px_rgba(168,85,247,0.08)] hover:shadow-[0_0_20px_rgba(168,85,247,0.25)] backdrop-blur-md transition-all duration-300">
              <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/35 flex items-center justify-center text-purple-400 shrink-0 shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                <GitBranch className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white tracking-wide">Kanban Pipelines</p>
                <p className="text-[10px] text-slate-400 font-medium">Drag & drop stages</p>
              </div>
            </div>

            {/* Card 4: Instant Quotes */}
            <div className="group relative flex items-center gap-2.5 p-2.5 rounded-xl bg-[#0D0B14]/85 border border-amber-500/30 hover:border-amber-500/70 shadow-[0_0_12px_rgba(245,158,11,0.08)] hover:shadow-[0_0_20px_rgba(245,158,11,0.25)] backdrop-blur-md transition-all duration-300">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/35 flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white tracking-wide">Instant Quotes</p>
                <p className="text-[10px] text-slate-400 font-medium">GST-ready quotations</p>
              </div>
            </div>
          </div>

          {/* HYPER-DETAILED VISUAL GLASS-DASHBOARD PATTERN (IMAGE_3.PNG PREVIEW) */}
          <div className="mt-1 p-2.5 xl:p-3 rounded-2xl bg-[#0D0B14]/90 border border-rose-500/30 shadow-[0_0_40px_rgba(239,68,68,0.18)] backdrop-blur-xl max-w-xl group">
            {/* Window Topbar */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] shadow-[0_0_6px_#EF4444]" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="ml-2 font-mono text-[10px] text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-rose-400" />
                  <span>zigmaa-revenue-cloud • live</span>
                </span>
              </div>
              <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)] flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Deal Probability 92%
              </span>
            </div>

            {/* Visual Glass Frame Overlaying image_3.png */}
            <div className="relative w-full overflow-hidden rounded-xl border border-slate-800/80 bg-[#08070b]">
              <img 
                src="/image_3.png" 
                alt="Zigmaa CRM Dashboard Pattern" 
                className="w-full h-auto max-h-[165px] xl:max-h-[195px] object-cover object-top filter brightness-[0.98] contrast-[1.08] group-hover:scale-[1.015] transition-transform duration-700" 
              />
              {/* Inner ambient vignette overlay */}
              <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#0D0B14] via-[#0D0B14]/50 to-transparent pointer-events-none" />
              
              {/* Floating Live Deal Micro-Badge */}
              <div className="absolute bottom-2 left-2 flex items-center gap-2 pointer-events-none">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#0D0B14]/92 border border-rose-500/40 backdrop-blur-md shadow-lg shadow-black/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_6px_#EF4444]" />
                  <span className="text-[10px] font-bold text-white">Apex Global Technologies</span>
                  <span className="text-[9px] text-emerald-400 font-extrabold ml-1">₹ 14,80,000</span>
                </div>
              </div>

              {/* Floating AI Recommendation Chip */}
              <div className="absolute top-2 right-2 pointer-events-none">
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#0D0B14]/90 border border-purple-500/40 backdrop-blur-md shadow-md text-[9px] font-semibold text-purple-300">
                  <Zap className="w-2.5 h-2.5 text-rose-400" />
                  <span>AI Copilot Insight</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM METRICS & TRUST */}
        <div className="relative z-10 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-5">
            <div>
              <span className="block text-sm xl:text-base font-extrabold text-white">4.8x</span>
              <span className="text-[10px] text-slate-400">Pipeline Velocity</span>
            </div>
            <div className="h-5 w-px bg-slate-800" />
            <div>
              <span className="block text-sm xl:text-base font-extrabold text-white">99.9%</span>
              <span className="text-[10px] text-slate-400">System Uptime</span>
            </div>
            <div className="h-5 w-px bg-slate-800" />
            <div>
              <span className="block text-sm xl:text-base font-extrabold text-white">100%</span>
              <span className="text-[10px] text-slate-400">Data Ownership</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 font-medium">© 2026 Zigmaa CRM</p>
        </div>
      </div>

      {/* ================= RIGHT SIDE: INTERACTIVE FORM PANEL ================= */}
      <div className="w-full lg:w-[42%] xl:w-[38%] h-full flex flex-col items-center justify-center px-6 sm:px-10 lg:px-8 xl:px-12 py-8 bg-white dark:bg-slate-900 overflow-y-auto">
        {/* Mobile Header Branding */}
        <div className="lg:hidden flex items-center gap-2.5 mb-6">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-red-500 p-0.5 shadow-md flex items-center justify-center">
            <img src="/crmlogo.png" alt="Zigmaa CRM" className="w-6 h-6 object-contain" />
          </div>
          <div>
            <span className="font-extrabold text-lg text-slate-900 dark:text-white">Zigmaa CRM</span>
            <span className="ml-2 text-[10px] font-bold text-rose-600 uppercase bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.5 rounded">
              Enterprise
            </span>
          </div>
        </div>
        {/* SIGN UP VIEW */}
        {isSignUp ? (
          <div className="w-full max-w-[420px] space-y-4">
            {/* Header */}
            <div>
              <h2 className="text-[26px] font-bold text-[#111827] tracking-tight">
                Create your account
              </h2>
              <p className="text-sm text-[#6B7280] mt-0.5 font-normal">
                One login for all products.
              </p>
            </div>

            {error && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSignUp} className="space-y-3.5" noValidate>
              {/* Row 1: First Name & Last Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[13px] font-medium text-[#374151] mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      if (fieldErrors.firstName) {
                        setFieldErrors((prev) => {
                          const n = { ...prev };
                          delete n.firstName;
                          return n;
                        });
                      }
                    }}
                    placeholder="Enter Your First Name"
                    className={`w-full px-3.5 py-2.5 rounded-lg border text-[#111827] text-xs sm:text-sm placeholder:text-[#9CA3AF] placeholder:italic placeholder:font-normal focus:outline-none transition-colors ${
                      fieldErrors.firstName
                        ? "border-[#EF4444] bg-[#FFF5F5] focus:border-[#EF4444] focus:ring-1 focus:ring-[#EF4444]"
                        : "border-[#E5E7EB] bg-white focus:border-red-600 focus:ring-1 focus:ring-red-600"
                    }`}
                  />
                  {fieldErrors.firstName && (
                    <div className="flex items-center gap-1 text-[11px] text-[#EF4444] mt-1 font-medium">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{fieldErrors.firstName}</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#374151] mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      if (fieldErrors.lastName) {
                        setFieldErrors((prev) => {
                          const n = { ...prev };
                          delete n.lastName;
                          return n;
                        });
                      }
                    }}
                    placeholder="Enter Your Last Name"
                    className={`w-full px-3.5 py-2.5 rounded-lg border text-[#111827] text-xs sm:text-sm placeholder:text-[#9CA3AF] placeholder:italic placeholder:font-normal focus:outline-none transition-colors ${
                      fieldErrors.lastName
                        ? "border-[#EF4444] bg-[#FFF5F5] focus:border-[#EF4444] focus:ring-1 focus:ring-[#EF4444]"
                        : "border-[#E5E7EB] bg-white focus:border-red-600 focus:ring-1 focus:ring-red-600"
                    }`}
                  />
                  {fieldErrors.lastName && (
                    <div className="flex items-center gap-1 text-[11px] text-[#EF4444] mt-1 font-medium">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{fieldErrors.lastName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Row 2: Company Name & Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[13px] font-medium text-[#374151] mb-1">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => {
                      setCompanyName(e.target.value);
                      if (fieldErrors.companyName) {
                        setFieldErrors((prev) => {
                          const n = { ...prev };
                          delete n.companyName;
                          return n;
                        });
                      }
                    }}
                    placeholder="Enter Your Company Name"
                    className={`w-full px-3.5 py-2.5 rounded-lg border text-[#111827] text-xs sm:text-sm placeholder:text-[#9CA3AF] placeholder:italic placeholder:font-normal focus:outline-none transition-colors ${
                      fieldErrors.companyName
                        ? "border-[#EF4444] bg-[#FFF5F5] focus:border-[#EF4444] focus:ring-1 focus:ring-[#EF4444]"
                        : "border-[#E5E7EB] bg-white focus:border-red-600 focus:ring-1 focus:ring-red-600"
                    }`}
                  />
                  {fieldErrors.companyName && (
                    <div className="flex items-center gap-1 text-[11px] text-[#EF4444] mt-1 font-medium">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{fieldErrors.companyName}</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#374151] mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showSignUpPassword ? "text" : "password"}
                      value={signUpPassword}
                      onChange={(e) => {
                        setSignUpPassword(e.target.value);
                        if (fieldErrors.signUpPassword) {
                          setFieldErrors((prev) => {
                            const n = { ...prev };
                            delete n.signUpPassword;
                            return n;
                          });
                        }
                      }}
                      placeholder="Enter Your Password"
                      className={`w-full px-3.5 py-2.5 pr-10 rounded-lg border text-[#111827] text-xs sm:text-sm placeholder:text-[#9CA3AF] placeholder:italic placeholder:font-normal focus:outline-none transition-colors ${
                        fieldErrors.signUpPassword
                          ? "border-[#EF4444] bg-[#FFF5F5] focus:border-[#EF4444] focus:ring-1 focus:ring-[#EF4444]"
                          : "border-[#E5E7EB] bg-white focus:border-red-600 focus:ring-1 focus:ring-red-600"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                      className="absolute right-3 text-[#9CA3AF] hover:text-[#4B5563] cursor-pointer p-0.5"
                      title={showSignUpPassword ? "Hide password" : "Show password"}
                    >
                      {showSignUpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.signUpPassword && (
                    <div className="flex items-center gap-1 text-[11px] text-[#EF4444] mt-1 font-medium">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{fieldErrors.signUpPassword}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Row 3: Email */}
              <div>
                <label className="block text-[13px] font-medium text-[#374151] mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={signUpEmail}
                  onChange={(e) => {
                    setSignUpEmail(e.target.value);
                    if (fieldErrors.signUpEmail) {
                      setFieldErrors((prev) => {
                        const n = { ...prev };
                        delete n.signUpEmail;
                        return n;
                      });
                    }
                  }}
                  placeholder="Enter Your Email ID"
                  className={`w-full px-3.5 py-2.5 rounded-lg border text-[#111827] text-xs sm:text-sm placeholder:text-[#9CA3AF] placeholder:italic placeholder:font-normal focus:outline-none transition-colors ${
                    fieldErrors.signUpEmail
                      ? "border-[#EF4444] bg-[#FFF5F5] focus:border-[#EF4444] focus:ring-1 focus:ring-[#EF4444]"
                      : "border-[#E5E7EB] bg-white focus:border-red-600 focus:ring-1 focus:ring-red-600"
                  }`}
                />
                {fieldErrors.signUpEmail && (
                  <div className="flex items-center gap-1 text-[11px] text-[#EF4444] mt-1 font-medium">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{fieldErrors.signUpEmail}</span>
                  </div>
                )}
              </div>

              {/* Row 4: Contact Number with Country Code Dropdown */}
              <div>
                <label className="block text-[13px] font-medium text-[#374151] mb-1">
                  Contact <span className="text-red-500">*</span>
                </label>
                <div
                  className={`flex rounded-lg border transition-colors overflow-hidden ${
                    fieldErrors.contactNumber
                      ? "border-[#EF4444] bg-[#FFF5F5] focus-within:border-[#EF4444] focus-within:ring-1 focus-within:ring-[#EF4444]"
                      : "border-[#E5E7EB] bg-white focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-600"
                  }`}
                >
                  <div className="flex items-center bg-slate-50 border-r border-[#E5E7EB] px-3.5 select-none">
                    <span className="text-xs font-bold text-[#374151] tracking-wide">+91</span>
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={contactNumber}
                    onChange={(e) => {
                      // Only allow numeric digits and cap at 10 digits
                      const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setContactNumber(digitsOnly);
                      if (fieldErrors.contactNumber) {
                        setFieldErrors((prev) => {
                          const n = { ...prev };
                          delete n.contactNumber;
                          return n;
                        });
                      }
                    }}
                    placeholder="Enter 10-digit Mobile Number"
                    className="flex-1 px-3.5 py-2.5 bg-transparent text-[#111827] text-xs sm:text-sm placeholder:text-[#9CA3AF] placeholder:italic placeholder:font-normal focus:outline-none font-medium tracking-wide"
                  />
                </div>
                {fieldErrors.contactNumber && (
                  <div className="flex items-center gap-1 text-[11px] text-[#EF4444] mt-1 font-medium">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{fieldErrors.contactNumber}</span>
                  </div>
                )}
              </div>

              {/* Sign Up Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 py-2.5 px-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {submitting ? "Creating account..." : "Sign up"}
              </button>
            </form>

            {/* Already a Member? Sign In */}
            <div className="text-center text-xs text-[#4B5563] pt-1">
              Already a Member?{" "}
              <button
                type="button"
                onClick={() => setIsSignUp(false)}
                className="font-semibold text-red-600 hover:underline cursor-pointer"
              >
                Sign In
              </button>
            </div>
          </div>
        ) : isResetPassword ? (
          /* RESET PASSWORD / FORGOT PASSWORD VIEW (Matches Image 3 & 4) */
          <div className="w-full max-w-[400px] space-y-6">
            <div>
              <h2 className="text-[28px] sm:text-[32px] font-bold text-[#111827] tracking-tight">
                Reset your password
              </h2>
              <p className="text-xs sm:text-sm text-[#6B7280] mt-1 font-normal">
                {otpSent 
                  ? "We've sent the 6 Digit OTP to your registered email address."
                  : "We will sent the OTP for your below email address"}
              </p>
            </div>

            {error && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs font-medium">
                {error}
              </div>
            )}

            {successMsg && (
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
                {successMsg}
              </div>
            )}

            {!otpSent ? (
              /* Step 1: Enter Email & Send OTP (Matches Image 3) */
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E5E7EB] bg-white text-[#111827] text-xs sm:text-sm placeholder:text-[#9CA3AF] placeholder:italic placeholder:font-normal focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Sending OTP..." : "Send OTP"}
                </button>

                <div className="text-center text-xs text-[#4B5563] pt-1">
                  Already a Member?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setIsResetPassword(false);
                      setOtpSent(false);
                      setError("");
                      setSuccessMsg("");
                    }}
                    className="font-medium text-red-600 hover:underline cursor-pointer"
                  >
                    Sign In
                  </button>
                </div>
              </form>
            ) : !otpVerified ? (
              /* Step 2: Enter 6-digit OTP & Verify (Matches Image 4) */
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    readOnly
                    value={resetEmail}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E5E7EB] bg-slate-50 text-[#111827] text-xs sm:text-sm cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
                    Enter 6-digit OTP
                  </label>
                  <div className="flex gap-2 justify-between">
                    {otpValues.map((digit, idx) => (
                      <input
                        key={idx}
                        id={`otp-input-${idx}`}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => {
                          const val = e.target.value;
                          const nextOtp = [...otpValues];
                          nextOtp[idx] = val;
                          setOtpValues(nextOtp);
                          if (val && idx < 5) {
                            const nextElem = document.getElementById(`otp-input-${idx + 1}`);
                            nextElem?.focus();
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Backspace" && !otpValues[idx] && idx > 0) {
                            const prevElem = document.getElementById(`otp-input-${idx - 1}`);
                            prevElem?.focus();
                          }
                        }}
                        className="w-11 h-11 text-center font-bold text-base rounded-lg border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-colors"
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Verifying..." : "Verify OTP"}
                </button>

                <div className="space-y-1.5 pt-1 text-center text-xs text-[#4B5563]">
                  <div>
                    Already a Member?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setIsResetPassword(false);
                        setOtpSent(false);
                        setOtpVerified(false);
                        setError("");
                        setSuccessMsg("");
                      }}
                      className="font-medium text-red-600 hover:underline cursor-pointer"
                    >
                      Sign In
                    </button>
                  </div>
                  <div>
                    Didn't Received?{" "}
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleSendOtp}
                      className="font-medium text-red-600 hover:underline cursor-pointer"
                    >
                      Resend OTP
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              /* Step 3: Set New Password after verification */
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter your new password"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E5E7EB] bg-white text-[#111827] text-xs sm:text-sm placeholder:text-[#9CA3AF] placeholder:italic placeholder:font-normal focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Update Password"}
                </button>

                <div className="text-center text-xs text-[#4B5563] pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsResetPassword(false);
                      setOtpSent(false);
                      setOtpVerified(false);
                      setError("");
                      setSuccessMsg("");
                    }}
                    className="font-medium text-red-600 hover:underline cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                </div>
              </form>
            )}

          </div>
        ) : (
          /* SIGN IN (LOGIN) VIEW (Matches Image 1 Text, Sizing, Inputs & Button without arrow) */
          <div className="w-full max-w-[400px] space-y-5">
            {/* Header */}
            <div>
              <h2 className="text-[26px] sm:text-[28px] font-bold text-[#111827] tracking-tight">
                Welcome back
              </h2>
              <p className="text-xs sm:text-sm text-[#6B7280] mt-1 font-normal">
                Sign in to continue to your Zigmaa CRM account.
              </p>
            </div>

            {error && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs font-medium">
                {error}
              </div>
            )}

            {successMsg && (
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
                {successMsg}
              </div>
            )}


            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-3.5" noValidate>
              <div>
                <label className="block text-[13px] font-medium text-[#374151] mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="Enter Your Registered Email Address"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E5E7EB] bg-white text-[#111827] text-xs sm:text-sm placeholder:text-[#9CA3AF] placeholder:italic placeholder:font-normal focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#374151] mb-1">
                  Password
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="Enter Your Password"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-[#E5E7EB] bg-white text-[#111827] text-xs sm:text-sm placeholder:text-[#9CA3AF] placeholder:italic placeholder:font-normal focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-[#9CA3AF] hover:text-[#4B5563] cursor-pointer p-0.5"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Forgot Password Link */}
              <div className="flex justify-end pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email || "");
                    setIsResetPassword(true);
                    setOtpSent(false);
                  }}
                  className="text-xs font-medium text-red-600 hover:underline cursor-pointer"
                >
                  Forgot Password ?
                </button>
              </div>

              {/* Login Button (No arrow, exact label) */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {submitting ? "Signing in..." : "Login"}
              </button>
            </form>

            {/* Continue with Google Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-[#E5E7EB] text-[#374151] font-medium text-xs sm:text-sm rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.27 21.43 7.35 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.98 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.27 2.57 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>{googleLoading ? "Signing in..." : "Sign in with Google"}</span>
            </button>

            {/* Not a Member ? Sign Up */}
            <div className="text-center text-xs text-[#4B5563] pt-0.5">
              Not a Member ?{" "}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true);
                  setIsResetPassword(false);
                }}
                className="font-medium text-red-600 hover:underline cursor-pointer"
              >
                Sign Up
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
