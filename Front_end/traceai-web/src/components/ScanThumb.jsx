import { ImageIcon } from 'lucide-react'

export default function ScanThumb({ scan, size = 'md' }) {
  const dimensions =
    size === 'lg'
      ? { box: 'size-14 rounded-xl', px: 56, icon: 'size-5' }
      : { box: 'size-12 rounded-xl', px: 48, icon: 'size-4.5' }

  if (scan?.thumbnail) {
    return (
      <div
        className={`${dimensions.box} shrink-0 overflow-hidden border border-line bg-inset transition-colors duration-300`}
      >
        <img
          src={scan.thumbnail}
          alt=""
          width={dimensions.px}
          height={dimensions.px}
          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
    )
  }

  return (
    <div
      className={`${dimensions.box} grid shrink-0 place-items-center border border-line bg-subtle text-muted transition-colors duration-300`}
      aria-hidden="true"
    >
      <ImageIcon className={dimensions.icon} strokeWidth={1.75} />
    </div>
  )
}
