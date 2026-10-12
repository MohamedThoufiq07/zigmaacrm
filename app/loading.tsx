import LogoLoader from "@/components/common/LogoLoader";

export default function Loading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-[#7f1d1d] via-[#dc2626] to-[#991b1b] relative overflow-hidden select-none">
      {/* Background watermark of loadinglogo.png */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <img
          src="/loadinglogo.png"
          alt=""
          className="w-[500px] h-[500px] object-contain opacity-15 filter blur-xs select-none"
        />
      </div>

      {/* Ambient background glows */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-black/30 pointer-events-none" />
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-red-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-rose-400/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        <LogoLoader size="lg" text="Loading Zigmaa CRM..." />
      </div>
    </div>
  );
}
