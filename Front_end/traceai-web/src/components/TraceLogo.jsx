export default function TraceLogo({ className = 'size-8 sm:size-9' }) {
  return (
    <span
      className={[
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#0B1018]',
        'ring-1 ring-ink/12 shadow-xs transition-all duration-300 ease-out',
        'group-hover:scale-105 group-hover:ring-emerald-brand/60',
        'group-hover:shadow-[0_0_18px_-4px_rgb(13_122_86/0.45)] dark:ring-white/15',
        className,
      ].join(' ')}
    >
      <img
        src="/logo/logo.jpeg"
        alt=""
        width={259}
        height={272}
        fetchPriority="high"
        className="size-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]"
      />
    </span>
  )
}
