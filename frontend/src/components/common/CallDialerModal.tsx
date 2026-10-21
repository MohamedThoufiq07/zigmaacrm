"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Phone,
  PhoneOff,
  PhoneCall,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Grid,
  Copy,
  Check,
  X,
  AlertCircle,
  AlertTriangle,
  MessageSquare,
  ExternalLink,
  Clock,
  Sparkles,
  Save,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  Settings,
  Radio
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/common/ToastProvider";

interface CallDialerModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: {
    id?: string | number;
    name?: string;
    full_name?: string;
    phone?: string;
    company_name?: string;
    email?: string;
  } | null;
  onCallLogged?: () => void;
}

// DTMF Tone mapping (Hz)
const DTMF_FREQS: Record<string, [number, number]> = {
  "1": [697, 1209],
  "2": [697, 1336],
  "3": [697, 1477],
  "4": [770, 1209],
  "5": [770, 1336],
  "6": [770, 1477],
  "7": [852, 1209],
  "8": [852, 1336],
  "9": [852, 1477],
  "*": [941, 1209],
  "0": [941, 1336],
  "#": [941, 1477]
};

export default function CallDialerModal({
  isOpen,
  onClose,
  contact,
  onCallLogged
}: CallDialerModalProps) {
  const { toast } = useToast();

  const [callState, setCallState] = useState<"dialing" | "connected" | "ended">("dialing");
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [showKeypad, setShowKeypad] = useState(false);
  const [enteredDigits, setEnteredDigits] = useState("");
  const [copied, setCopied] = useState(false);

  // Phone number state
  const [activePhone, setActivePhone] = useState("");
  const [customPhoneInput, setCustomPhoneInput] = useState("");

  // Twilio Real Calling State
  const [realCallInfo, setRealCallInfo] = useState<any>(null);
  const [twilioConfigured, setTwilioConfigured] = useState<boolean | null>(null);
  const [twilioErrorMessage, setTwilioErrorMessage] = useState<string | null>(null);

  // Error / Warning state
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [micStatus, setMicStatus] = useState<"checking" | "allowed" | "blocked" | "unsupported">("checking");
  const [micErrorMessage, setMicErrorMessage] = useState<string | null>(null);

  // Post-call logging
  const [outcome, setOutcome] = useState<string>("Connected");
  const [callNotes, setCallNotes] = useState("");
  const [savingLog, setSavingLog] = useState(false);
  const [logSaved, setLogSaved] = useState(false);

  // Audio Context Ref for DTMF & Ringtone
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ringOscillatorsRef = useRef<{ osc1: OscillatorNode; osc2: OscillatorNode; gain: GainNode } | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const connectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const contactName = contact?.name || contact?.full_name || "Contact";

  // Helper to get or create Web Audio Context
  const getAudioContext = () => {
    if (typeof window === "undefined") return null;
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioCtxRef.current = new AudioContextClass();
        }
      }
      if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume().catch(() => {});
      }
      return audioCtxRef.current;
    } catch {
      return null;
    }
  };

  // Stop Ringtone
  const stopRingtone = () => {
    if (ringOscillatorsRef.current) {
      try {
        const { osc1, osc2, gain } = ringOscillatorsRef.current;
        gain.gain.setValueAtTime(0, audioCtxRef.current?.currentTime || 0);
        osc1.stop();
        osc2.stop();
        osc1.disconnect();
        osc2.disconnect();
        gain.disconnect();
      } catch {}
      ringOscillatorsRef.current = null;
    }
  };

  // Play Ringtone
  const startRingtone = () => {
    if (!isSpeakerOn) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      stopRingtone();

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.setValueAtTime(440, ctx.currentTime);
      osc2.frequency.setValueAtTime(480, ctx.currentTime);

      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.setValueAtTime(0.04, now + 1.6);
      gain.gain.setValueAtTime(0, now + 1.65);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);

      ringOscillatorsRef.current = { osc1, osc2, gain };
    } catch {}
  };

  // Play DTMF Touch Tone
  const playDTMF = (digit: string) => {
    if (!isSpeakerOn) return;
    const freqs = DTMF_FREQS[digit];
    if (!freqs) return;

    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.setValueAtTime(freqs[0], ctx.currentTime);
      osc2.frequency.setValueAtTime(freqs[1], ctx.currentTime);

      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.2);
      osc2.stop(now + 0.2);
    } catch {}
  };

  // Request Microphone Permission
  const requestMicrophoneAccess = async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setMicStatus("unsupported");
      setMicErrorMessage("Your browser does not support WebRTC audio devices.");
      return;
    }

    setMicStatus("checking");
    setMicErrorMessage(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicStatus("allowed");
      toast.success("Microphone Enabled", "Audio devices authorized.");
    } catch (err: any) {
      setMicStatus("blocked");
      const name = err?.name || "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setMicErrorMessage("Permission was denied. Please allow microphone in your browser address bar.");
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setMicErrorMessage("No audio input device (microphone) found on this machine.");
      } else {
        setMicErrorMessage(err?.message || "Could not access audio device.");
      }
    }
  };

  // Initiate call (attempts real Twilio call + Web Audio simulation)
  const initiateCallWithNumber = (phoneToCall: string) => {
    const cleaned = (phoneToCall || "").trim();
    if (!cleaned) {
      setWarningMessage("No phone number entered. Please provide a valid phone number to call.");
      setCallState("ended");
      return;
    }

    setActivePhone(cleaned);
    setWarningMessage(null);
    setCallState("dialing");
    setCallDuration(0);
    setIsMuted(false);
    setIsSpeakerOn(true);
    setShowKeypad(false);
    setEnteredDigits("");
    setCopied(false);
    setOutcome("Connected");
    setCallNotes("");
    setSavingLog(false);
    setLogSaved(false);
    setRealCallInfo(null);
    setTwilioErrorMessage(null);

    // Start tone
    startRingtone();

    // Attempt real outbound call via backend Twilio gateway
    api.initiateRealCall({
      to_phone: cleaned,
      contact_id: contact?.id,
      contact_name: contactName
    })
      .then((res) => {
        setRealCallInfo(res);
        setTwilioConfigured(true);
        toast.success("Real Call Dispatched!", `Twilio SID: ${res.call_sid}. The recipient's phone is ringing!`);
      })
      .catch((err: any) => {
        setTwilioConfigured(false);
        setTwilioErrorMessage(err.message || "Twilio API credentials not configured.");
      });

    // Auto-connect timer after 2.8s
    if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);
    connectTimeoutRef.current = setTimeout(() => {
      stopRingtone();
      setCallState("connected");
    }, 2800);
  };

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      const initialPhone = contact?.phone?.trim() || "";
      setActivePhone(initialPhone);
      setCustomPhoneInput(initialPhone);

      // Check microphone permission
      if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({ audio: true })
          .then((stream) => {
            stream.getTracks().forEach((track) => track.stop());
            setMicStatus("allowed");
          })
          .catch((err) => {
            const name = err?.name || "";
            if (name === "NotAllowedError" || name === "PermissionDeniedError") {
              setMicStatus("blocked");
              setMicErrorMessage("Microphone access is blocked in your browser.");
            } else {
              setMicStatus("blocked");
              setMicErrorMessage("Microphone not detected or permission denied.");
            }
          });
      } else {
        setMicStatus("unsupported");
      }

      // Check whether Twilio is configured
      api.getTelephonySettings()
        .then((cfg) => {
          setTwilioConfigured(cfg?.is_configured || false);
        })
        .catch(() => {
          setTwilioConfigured(false);
        });

      if (initialPhone) {
        initiateCallWithNumber(initialPhone);
      } else {
        setWarningMessage("This contact does not have a registered phone number. You can enter one below to dial directly.");
        setCallState("ended");
      }
    } else {
      stopRingtone();
      if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);
    }

    return () => {
      stopRingtone();
      if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);
    };
  }, [isOpen, contact]);

  // Call duration counter
  useEffect(() => {
    if (callState === "connected") {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [callState]);

  if (!isOpen || !contact) return null;

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleEndCall = () => {
    stopRingtone();
    if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);
    setCallState("ended");
  };

  const handleCopyNumber = () => {
    if (activePhone && typeof navigator !== "undefined") {
      navigator.clipboard.writeText(activePhone);
      setCopied(true);
      toast.info("Copied", `${activePhone} copied to clipboard.`);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveCallLog = async () => {
    if (!contact?.id) {
      toast.success("Call Logged", "Call summary noted.");
      setLogSaved(true);
      return;
    }

    setSavingLog(true);
    try {
      const durationText = callDuration > 0 ? `Duration: ${formatTimer(callDuration)}` : "Not connected";
      const notes = `[Call Outcome: ${outcome}] - ${durationText}. ${callNotes.trim()}`;

      await api.createActivity({
        contact_id: String(contact.id),
        type: "CALL",
        notes: notes,
        status: "COMPLETED"
      });

      toast.success("Activity Saved", `Call with ${contactName} logged to activity history.`);
      setLogSaved(true);
      if (onCallLogged) onCallLogged();
    } catch (e: any) {
      toast.error("Save Error", e.message || "Failed to log call activity.");
    } finally {
      setSavingLog(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        
        {/* 1. TOP HEADER & STATUS BAR */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                callState === "connected"
                  ? "bg-emerald-400 animate-pulse"
                  : callState === "dialing"
                  ? "bg-amber-400 animate-ping"
                  : "bg-slate-400"
              }`}
            />
            <span className="text-xs font-semibold tracking-wide uppercase text-slate-300">
              {callState === "dialing"
                ? "Connecting Call..."
                : callState === "connected"
                ? "Call Active (In-App)"
                : "Call Disposition"}
            </span>
          </div>

          <button
            onClick={() => {
              stopRingtone();
              onClose();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close Dialer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. REAL CALL NOTIFICATION: TWILIO LIVE OR CONFIG BANNER */}
        {realCallInfo ? (
          <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Real Twilio Call Dispatched</span>
            </div>
            <span className="font-mono text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
              {realCallInfo.call_sid ? `${realCallInfo.call_sid.slice(0, 10)}...` : "Queued"}
            </span>
          </div>
        ) : twilioConfigured === false && callState !== "ended" ? (
          <div className="px-4 py-2.5 bg-amber-50/90 border-b border-amber-200 text-amber-900 text-xs space-y-1.5">
            <div className="flex items-start gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-snug flex-1">
                <span className="font-bold">Real Telecom Calling (Twilio)</span>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  To physically ring {contactName}'s mobile phone, enter your Twilio API keys in Settings.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 pl-5 pt-0.5">
              <Link
                href="/settings"
                onClick={() => {
                  stopRingtone();
                  onClose();
                }}
                className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[11px] font-bold shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Settings className="w-3 h-3" />
                <span>Settings</span>
              </Link>
              <span className="text-[10px] text-amber-700">or use WhatsApp free</span>
            </div>
          </div>
        ) : null}

        {/* Microphone Permission Warning Card */}
        {micStatus === "blocked" && callState !== "ended" && (
          <div className="px-4 py-2 bg-rose-50/90 border-b border-rose-200 text-rose-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span className="text-[11px] font-semibold">Mic Blocked</span>
            </div>
            <button
              type="button"
              onClick={requestMicrophoneAccess}
              className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer"
            >
              Allow Mic
            </button>
          </div>
        )}

        {/* 3. CONTACT PROFILE & CALL STATUS DISPLAY */}
        <div className="p-6 text-center bg-gradient-to-b from-slate-50 to-white flex flex-col items-center border-b border-slate-100">
          <div className="relative mb-3">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-rose-600 text-white flex items-center justify-center font-bold text-xl shadow-lg shadow-red-500/20">
              {contactName
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
            {callState === "connected" && (
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white shadow-xs">
                <Phone className="w-2.5 h-2.5" />
              </span>
            )}
          </div>

          <h3 className="font-bold text-slate-900 text-lg tracking-tight">{contactName}</h3>
          {contact?.company_name && (
            <p className="text-xs text-slate-500 font-medium mt-0.5">{contact.company_name}</p>
          )}

          {/* Number & Copy chip */}
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full text-xs font-mono text-slate-700">
            <span>{activePhone || "No registered number"}</span>
            {activePhone && (
              <button
                type="button"
                onClick={handleCopyNumber}
                title="Copy phone number"
                className="p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>

          {/* Live Call Duration / Status */}
          <div className="mt-4 flex items-center gap-2 text-sm font-semibold">
            {callState === "dialing" ? (
              <div className="flex items-center gap-2 text-amber-600">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span className="font-medium text-xs">Dialing & Ringing...</span>
              </div>
            ) : callState === "connected" ? (
              <div className="flex items-center gap-1.5 text-emerald-600 font-mono text-base bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                <Clock className="w-4 h-4 animate-pulse" />
                <span>{formatTimer(callDuration)}</span>
              </div>
            ) : (
              <span className="text-slate-500 text-xs font-medium">Call Finished</span>
            )}
          </div>
        </div>

        {/* 4. ACTIVE CALL CONTROLS */}
        {callState !== "ended" ? (
          <div className="p-6 bg-white space-y-5">
            {/* 3 Action Buttons: Mute, Keypad, Speaker */}
            <div className="flex items-center justify-center gap-5">
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  isMuted ? "bg-red-50 text-red-600 border border-red-200" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
                title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <button
                type="button"
                onClick={() => setShowKeypad(!showKeypad)}
                className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  showKeypad ? "bg-slate-900 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
                title="Dialpad Keypad"
              >
                <Grid className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  if (isSpeakerOn) {
                    stopRingtone();
                    setIsSpeakerOn(false);
                  } else {
                    setIsSpeakerOn(true);
                  }
                }}
                className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  !isSpeakerOn ? "bg-red-50 text-red-600 border border-red-200" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
                title={isSpeakerOn ? "Turn Speaker Off" : "Turn Speaker On"}
              >
                {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
            </div>

            {/* Dialpad Popup if active */}
            {showKeypad && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl animate-in fade-in duration-150">
                <div className="text-center font-mono font-bold text-sm text-slate-700 mb-2 h-6 tracking-widest">
                  {enteredDigits || "Touch tones"}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        playDTMF(key);
                        setEnteredDigits((prev) => prev + key);
                      }}
                      className="py-2 rounded-xl bg-white hover:bg-slate-200 text-slate-800 font-bold text-sm border border-slate-200 transition-colors shadow-2xs cursor-pointer active:scale-95"
                    >
                      {key}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Primary Red End Call Action */}
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={handleEndCall}
                className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg shadow-red-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                title="End Call"
              >
                <PhoneOff className="w-7 h-7" />
              </button>
            </div>

            {/* Fallback Telephony Options */}
            <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  if (activePhone) {
                    window.location.href = `tel:${activePhone}`;
                  }
                }}
                className="text-slate-600 hover:text-red-600 font-medium flex items-center gap-1 cursor-pointer"
                title="Launch phone app installed on your device"
              >
                <span>Device App</span>
                <ExternalLink className="w-3 h-3" />
              </button>

              <a
                href={`https://wa.me/${(activePhone || "").replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                title="Place direct WhatsApp call"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp Call</span>
              </a>
            </div>
          </div>
        ) : (
          /* 5. POST-CALL LOGGING / SUMMARY & ENTER NUMBER FALLBACK */
          <div className="p-5 space-y-4 bg-slate-50">
            {/* If contact had no phone number, show inline direct dialing form */}
            {!activePhone && (
              <div className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <Phone className="w-3.5 h-3.5 text-red-600" />
                  <span>Enter Phone Number to Call</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={customPhoneInput}
                    onChange={(e) => setCustomPhoneInput(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                  <button
                    type="button"
                    onClick={() => initiateCallWithNumber(customPhoneInput)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Call</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Quick Call Again Button if phone exists */}
            {activePhone && (
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs text-slate-500 font-medium">Need to redial?</span>
                <button
                  type="button"
                  onClick={() => initiateCallWithNumber(activePhone)}
                  className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <PhoneCall className="w-3 h-3 text-red-600" />
                  <span>Redial Call</span>
                </button>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Call Outcome
              </label>
              <div className="grid grid-cols-2 gap-1.5 text-xs font-medium">
                {[
                  { label: "Connected" },
                  { label: "Busy / Callback" },
                  { label: "No Answer" },
                  { label: "Wrong Number" }
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setOutcome(item.label)}
                    className={`py-1.5 px-2 rounded-xl text-center border transition-all cursor-pointer ${
                      outcome === item.label
                        ? "bg-red-600 border-red-600 text-white font-bold shadow-2xs"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Call Notes
              </label>
              <textarea
                rows={2}
                value={callNotes}
                onChange={(e) => setCallNotes(e.target.value)}
                placeholder="Key takeaways, customer requirements, follow-up..."
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                disabled={savingLog || logSaved}
                onClick={handleSaveCallLog}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {logSaved ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Saved!</span>
                  </>
                ) : savingLog ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save to History</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
