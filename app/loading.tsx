import LogoLoader from "@/components/common/LogoLoader";

export default function Loading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#0c091f]">
      <LogoLoader size="lg" text="Loading Zigmaa CRM..." />
    </div>
  );
}
