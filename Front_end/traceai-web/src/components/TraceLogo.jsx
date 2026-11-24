export default function TraceLogo({ className = 'size-9' }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" fill="#111513" className="dark:fill-[#1A241F]" />
      <rect
        x="0.75"
        y="0.75"
        width="30.5"
        height="30.5"
        rx="7.25"
        stroke="#2A352F"
        strokeWidth="1.5"
        className="dark:stroke-[#384B41]"
      />
      <path
        d="M7 11.2V8.7A1.7 1.7 0 0 1 8.7 7h2.5M20.8 7h2.5A1.7 1.7 0 0 1 25 8.7v2.5M25 20.8v2.5a1.7 1.7 0 0 1-1.7 1.7h-2.5M11.2 25H8.7A1.7 1.7 0 0 1 7 23.3v-2.5"
        stroke="#F1F4F2"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="16" r="5.75" stroke="#34D399" strokeOpacity="0.45" strokeWidth="1.35" />
      <path
        d="M10.5 16h2.6l1.35-3.2 2.45 6.4 1.5-3.2h3.1"
        stroke="#34D399"
        strokeWidth="1.85"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
