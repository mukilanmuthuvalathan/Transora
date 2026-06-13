import Image from "next/image";

type TransoraLogoProps = {
  size?: "sm" | "md";
  showTagline?: boolean;
};

export function TransoraLogo({ size = "md", showTagline = false }: TransoraLogoProps) {
  const compact = size === "sm";

  return (
    <div className="inline-flex items-center gap-3">
      <Image
        src="/transora-icon.png"
        alt=""
        width={compact ? 40 : 56}
        height={compact ? 40 : 56}
        className={
          compact
            ? "h-9 w-9 rounded-xl object-contain sm:h-10 sm:w-10"
            : "h-12 w-12 rounded-2xl object-contain sm:h-14 sm:w-14"
        }
        priority={compact}
      />

      <div className="leading-none">
        <div
          className={
            compact
              ? "flex items-center text-xl font-bold tracking-normal text-[#06215f] sm:text-2xl"
              : "flex items-center text-3xl font-bold tracking-normal text-[#06215f] sm:text-4xl"
          }
        >
          <span>Trans</span>
          <span
            className={
              compact
                ? "mx-0.5 inline-block h-4 w-4 rounded-full border-4 border-[#0987ee] border-b-[#ff6a13] border-r-[#00a35b] sm:h-5 sm:w-5 sm:border-[5px]"
                : "mx-1 inline-block h-6 w-6 rounded-full border-[6px] border-[#0987ee] border-b-[#ff6a13] border-r-[#00a35b] sm:h-8 sm:w-8 sm:border-[7px]"
            }
          />
          <span>ra</span>
        </div>
        {showTagline && (
          <div className="mt-2 text-sm font-medium leading-5 text-ink/62">
            From video to clarity in seconds.
          </div>
        )}
      </div>
    </div>
  );
}
