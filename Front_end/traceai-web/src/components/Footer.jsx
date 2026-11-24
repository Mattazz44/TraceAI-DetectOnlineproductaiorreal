export default function Footer() {
  return (
    <footer className="mt-auto border-t border-line bg-card/60">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-1.5 px-4 py-4 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10">
        <p>
          TraceAI memeriksa pola tekstur piksel, anomali pencahayaan, dan metadata EXIF pada foto produk.
        </p>
        <p className="font-mono text-[11px] text-muted">
          Riwayat disimpan lokal di peramban ini · Swin Transformer v6
        </p>
      </div>
    </footer>
  )
}
