import { Armchair, Footprints, ImageIcon, Lamp, ShoppingBag } from 'lucide-react'

// Placeholder illustrations for demo scans that have no real thumbnail.
const ICONS = {
  lamp: { Icon: Lamp, className: 'bg-[#ece6da] text-[#a08a63]' },
  bag: { Icon: ShoppingBag, className: 'bg-[#efe3d8] text-[#9a5b32]' },
  shoe: { Icon: Footprints, className: 'bg-[#e7e7e4] text-[#8d8d88]' },
  chair: { Icon: Armchair, className: 'bg-[#e6eadc] text-[#5d6b3a]' },
}

/** Square scan thumbnail: real image if saved, otherwise an illustrative icon. */
export default function ScanThumb({ scan, size = 'md' }) {
  const box = size === 'lg' ? 'size-15 rounded-xl' : 'size-11 rounded-xl'
  const iconSize = size === 'lg' ? 'size-6' : 'size-4.5'

  if (scan.thumbnail) {
    return (
      <div className={`${box} shrink-0 overflow-hidden bg-thumb`}>
        <img src={scan.thumbnail} alt="" className="size-full object-cover" />
      </div>
    )
  }

  const preset = ICONS[scan.icon]
  const Icon = preset?.Icon ?? ImageIcon
  return (
    <div className={`${box} grid shrink-0 place-items-center ${preset?.className ?? 'bg-thumb text-ink/20'}`}>
      <Icon className={iconSize} strokeWidth={1.75} aria-hidden="true" />
    </div>
  )
}

