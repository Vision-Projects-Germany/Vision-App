export function AccountChip() {
  return (
    <div className="relative">
      <button
        type="button"
        className="flex h-[44px] w-[175px] items-center gap-[10px] rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#131419] px-[12px]"
      >
        <div className="h-[22px] w-[22px] rounded-[7px] bg-[rgba(255,255,255,0.18)]" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-[12px] font-semibold leading-[14px] text-[rgba(255,255,255,0.92)]">
            Player
          </span>
          <span className="text-[10px] leading-[12px] text-[rgba(255,255,255,0.60)]">
            Vision Account
          </span>
        </div>
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0"
        >
          <path
            d="M3.5 5.25L7 8.75L10.5 5.25"
            stroke="rgba(255,255,255,0.60)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <div className="absolute right-0 top-full mt-[8px] hidden w-[175px] rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#131419] p-[10px]">
        <div className="text-[10px] text-[rgba(255,255,255,0.60)]">Menu placeholder</div>
      </div>
    </div>
  );
}
