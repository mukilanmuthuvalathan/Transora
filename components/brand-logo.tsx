import Image from "next/image";

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`inline-flex items-center ${compact ? "h-11 w-36" : "h-12 w-44"}`}>
      <Image
        alt="Transora"
        className="h-auto w-full object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,0.35)]"
        height={207}
        priority
        src="/transora-logo-no-white.png"
        width={810}
      />
    </span>
  );
}
