"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, X, CheckCircle2, TrendingUp, ChevronDown } from "lucide-react";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  // Login form state
  const [email, setEmail] = useState("admin@zigmaa.com");
  const [password, setPassword] = useState("admin123");
  const [showPassword, setShowPassword] = useState(false);

  // Sign up form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [countryCode, setCountryCode] = useState("IN");
  const [contactNumber, setContactNumber] = useState("");
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await api.getHealth();
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Failed to log in.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      // Simulate account registration and log directly into CRM
      await new Promise((resolve) => setTimeout(resolve, 600));
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Failed to create account.");
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
                setError("Google sign-in succeeded, but syncing with CRM failed.");
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
    <div className="h-screen max-h-screen w-screen overflow-hidden flex flex-col lg:flex-row bg-white text-slate-900 font-sans select-none fixed inset-0">
      {/* ================= LEFT SHOWCASE PANEL ================= */}
      <div className="relative w-full lg:w-1/2 h-full bg-gradient-to-br from-[#3B1578] via-[#5B259E] to-[#7B2CBF] p-6 lg:p-10 xl:p-12 flex flex-col justify-between overflow-hidden shrink-0">
        {/* Ambient Subtle Grid & Glows */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.5) 1px, transparent 1px)",
            backgroundSize: "24px 24px"
          }}
        />
        <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-purple-400/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Left: Zigmaa Logo & Brand Title */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md p-1.5 flex items-center justify-center border border-white/20 shadow-lg shadow-purple-950/40">
              <img
                src="/crmlogo.png"
                alt="Zigmaa Logo"
                className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]"
              />
            </div>
            <div>
              <span className="font-bold text-white text-base tracking-tight block">Zigmaa CRM</span>
              <span className="text-[11px] text-purple-200/80 font-medium block">Enterprise Sales & Operations</span>
            </div>
          </div>

          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white/90 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Active Suite</span>
          </div>
        </div>

        {/* Center: Seamless Glassmorphic CRM Analytics Showcase */}
        <div className="relative z-10 my-auto py-2 max-w-md w-full mx-auto space-y-3">
          {/* Main Glass Card: Sales Velocity */}
          <div className="rounded-3xl bg-white/[0.12] backdrop-blur-xl border border-white/20 p-5 shadow-2xl shadow-purple-950/50">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-[11px] font-bold text-purple-200/90 uppercase tracking-wider block">Sales Velocity</span>
                <span className="text-2xl font-black text-white tracking-tight">$3.8M Revenue</span>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-400/20 border border-emerald-400/30 text-emerald-300 font-bold text-xs">
                <TrendingUp className="w-3.5 h-3.5" /> +28.4%
              </span>
            </div>

            {/* Glowing Smooth Curve */}
            <div className="h-16 w-full">
              <svg viewBox="0 0 360 70" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,55 C60,50 100,35 150,42 C200,48 260,18 360,10 L360,70 L0,70 Z"
                  fill="url(#chartGrad)"
                />
                <path
                  d="M0,55 C60,50 100,35 150,42 C200,48 260,18 360,10"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <circle cx="360" cy="10" r="4.5" fill="#ffffff" />
              </svg>
            </div>

            {/* Quick Metrics Pills */}
            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/10 text-center">
              <div className="bg-white/5 rounded-xl py-1.5 px-2">
                <span className="text-[10px] text-purple-200 block">Deals Won</span>
                <span className="text-xs font-bold text-white block">184 Deals</span>
              </div>
              <div className="bg-white/5 rounded-xl py-1.5 px-2">
                <span className="text-[10px] text-purple-200 block">Conversion</span>
                <span className="text-xs font-bold text-white block">94.2%</span>
              </div>
              <div className="bg-white/5 rounded-xl py-1.5 px-2">
                <span className="text-[10px] text-purple-200 block">Avg Value</span>
                <span className="text-xs font-bold text-white block">$21.4K</span>
              </div>
            </div>
          </div>

          {/* Secondary Floating Mini Banner */}
          <div className="rounded-2xl bg-white/[0.10] backdrop-blur-md border border-white/15 px-4 py-2.5 flex items-center justify-between text-xs text-white">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-purple-500/30 flex items-center justify-center p-0.5">
                <img src="/crmlogo.png" alt="Zigmaa" className="w-full h-full object-contain" />
              </div>
              <span className="font-semibold text-xs text-white/95">Omnichannel Lead Pipeline Synchronized</span>
            </div>
            <span className="text-[11px] font-bold text-emerald-300">● 100% Online</span>
          </div>
        </div>

        {/* Bottom: Attractive CRM Copy */}
        <div className="relative z-10 max-w-lg">
          <h1 className="text-2xl xl:text-3xl font-extrabold text-white tracking-tight leading-tight">
            Empower Your Sales. Accelerate Growth.
          </h1>
          <p className="mt-1.5 text-xs xl:text-sm text-purple-100/85 font-normal leading-relaxed">
            Unified omnichannel pipeline tracking, client communication, and deal management built for high-performing teams.
          </p>
        </div>
      </div>

      {/* ================= RIGHT FORM PANEL ================= */}
      <div className="w-full lg:w-1/2 h-full flex items-center justify-center p-6 sm:p-10 bg-white overflow-hidden">
        {/* SIGN UP VIEW (Exact Layout & Typography matching user reference) */}
        {isSignUp ? (
          <div className="w-full max-w-[440px] space-y-4">
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

            <form onSubmit={handleSignUp} className="space-y-3.5">
              {/* Row 1: First Name & Last Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[13px] font-medium text-[#374151] mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter Your First Name"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E5E7EB] bg-white text-[#111827] text-xs sm:text-sm placeholder:text-[#9CA3AF] placeholder:italic placeholder:font-normal focus:outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#374151] mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter Your Last Name"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E5E7EB] bg-white text-[#111827] text-xs sm:text-sm placeholder:text-[#9CA3AF] placeholder:italic placeholder:font-normal focus:outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-colors"
                  />
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
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Enter Your Company Name"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E5E7EB] bg-white text-[#111827] text-xs sm:text-sm placeholder:text-[#9CA3AF] placeholder:italic placeholder:font-normal focus:outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#374151] mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showSignUpPassword ? "text" : "password"}
                      required
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      placeholder="Enter Your Password"
                      className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-[#E5E7EB] bg-white text-[#111827] text-xs sm:text-sm placeholder:text-[#9CA3AF] placeholder:italic placeholder:font-normal focus:outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-colors"
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
                </div>
              </div>

              {/* Row 3: Email */}
              <div>
                <label className="block text-[13px] font-medium text-[#374151] mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  placeholder="Enter Your Email ID"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E5E7EB] bg-white text-[#111827] text-xs sm:text-sm placeholder:text-[#9CA3AF] placeholder:italic placeholder:font-normal focus:outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-colors"
                />
              </div>

              {/* Row 4: Contact Number with Country Code Dropdown */}
              <div>
                <label className="block text-[13px] font-medium text-[#374151] mb-1">
                  Contact <span className="text-red-500">*</span>
                </label>
                <div className="flex rounded-lg border border-[#E5E7EB] bg-white focus-within:border-[#7c3aed] focus-within:ring-1 focus-within:ring-[#7c3aed] transition-colors overflow-hidden">
                  <div className="relative flex items-center bg-slate-50 border-r border-[#E5E7EB] px-2.5">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="bg-transparent text-xs font-semibold text-[#374151] pr-4 py-2.5 appearance-none cursor-pointer focus:outline-none"
                    >
                      <option value="IN">IN</option>
                      <option value="US">US</option>
                      <option value="UK">UK</option>
                      <option value="AE">AE</option>
                      <option value="CA">CA</option>
                      <option value="AU">AU</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500 pointer-events-none absolute right-1.5" />
                  </div>
                  <input
                    type="tel"
                    required
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    placeholder="Enter Your Contact Number"
                    className="flex-1 px-3.5 py-2.5 bg-transparent text-[#111827] text-xs sm:text-sm placeholder:text-[#9CA3AF] placeholder:italic placeholder:font-normal focus:outline-none"
                  />
                </div>
              </div>

              {/* Sign Up Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 py-2.5 px-4 bg-[#7c3aed] hover:bg-[#6d28d9] active:bg-[#5b21b6] text-white font-semibold text-sm rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
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
                className="font-semibold text-[#7c3aed] hover:underline cursor-pointer"
              >
                Sign In
              </button>
            </div>
          </div>
        ) : (
          /* SIGN IN (LOGIN) VIEW */
          <div className="w-full max-w-[390px] space-y-5">
            {/* Header */}
            <div>
              <h2 className="text-[26px] sm:text-[28px] font-bold text-[#111827] tracking-tight">
                Welcome back
              </h2>
              <p className="text-xs sm:text-sm text-[#6B7280] mt-1 font-normal">
                Sign in to continue to your Zigmaa account.
              </p>
            </div>

            {error && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs font-medium">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="block text-[13px] font-medium text-[#374151] mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter Your Registered Email Address"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E5E7EB] bg-white text-[#111827] text-xs sm:text-sm placeholder:text-[#9CA3AF] placeholder:italic placeholder:font-normal focus:outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-colors"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#374151] mb-1">Password</label>
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter Your Password"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-[#E5E7EB] bg-white text-[#111827] text-xs sm:text-sm placeholder:text-[#9CA3AF] placeholder:italic placeholder:font-normal focus:outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-colors"
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
                    setShowForgotPassword(true);
                    setResetSent(false);
                  }}
                  className="text-xs font-medium text-[#7c3aed] hover:underline cursor-pointer"
                >
                  Forgot Password ?
                </button>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-[#7c3aed] hover:bg-[#6d28d9] active:bg-[#5b21b6] text-white font-semibold text-sm rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {submitting ? "Signing in..." : "Login"}
              </button>
            </form>

            {/* Continue with Google Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-[#E5E7EB] text-[#374151] font-medium text-xs sm:text-sm rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
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
                onClick={() => setIsSignUp(true)}
                className="font-medium text-[#7c3aed] hover:underline cursor-pointer"
              >
                Sign Up
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================= FORGOT PASSWORD MODAL ================= */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-sm w-full p-6 space-y-4 relative">
            <button
              onClick={() => setShowForgotPassword(false)}
              className="absolute right-3.5 top-3.5 p-1 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {resetSent ? (
              <div className="text-center py-3 space-y-2.5">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Reset Link Sent</h3>
                <p className="text-xs text-slate-500">
                  We've sent a password reset link to <span className="font-semibold text-slate-800">{forgotEmail}</span>.
                </p>
                <button
                  onClick={() => setShowForgotPassword(false)}
                  className="w-full mt-2 py-2 bg-[#7c3aed] text-white rounded-lg text-xs font-semibold hover:bg-[#6d28d9] cursor-pointer"
                >
                  Back to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-3.5">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Forgot Password</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Enter your email to receive password reset instructions.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="Enter Your Registered Email Address"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 placeholder:italic focus:outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed]"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="flex-1 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-semibold cursor-pointer"
                  >
                    Submit
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
