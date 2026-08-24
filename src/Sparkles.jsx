// ✨ ฟองกระจิบ glitter แบบไม้กายสิทธิ์ — สุ่มตำแหน่ง/สี/จังหวะกระพริบให้ดูมีชีวิตชีวา ไม่ซ้ำกัน
const TINTS = ['tint-purple', 'tint-cyan', 'tint-pink', '']

function seededSpots(count, seed = 0) {
  // สุ่มแบบ deterministic เล็กน้อยจาก seed กันกระพริบพร้อมกันทุกจุดเป๊ะๆ
  const spots = []
  for (let i = 0; i < count; i++) {
    const r = (Math.sin(seed * 999 + i * 57.13) + 1) / 2
    const r2 = (Math.sin(seed * 471 + i * 13.7) + 1) / 2
    const r3 = (Math.sin(seed * 213 + i * 91.3) + 1) / 2
    spots.push({
      top: `${(r * 92).toFixed(1)}%`,
      left: `${(r2 * 92).toFixed(1)}%`,
      size: 6 + Math.round(r3 * 10),
      delay: (r * 3).toFixed(2),
      dur: (2 + r2 * 2.5).toFixed(2),
      tint: TINTS[i % TINTS.length],
    })
  }
  return spots
}

export default function Sparkles({ count = 8, seed = 0 }) {
  const spots = seededSpots(count, seed)
  return (
    <div className="payi-sparkle-field">
      {spots.map((s, i) => (
        <span
          key={i}
          className={`payi-sparkle ${s.tint}`}
          style={{
            top: s.top, left: s.left, width: s.size, height: s.size,
            animationDelay: `${s.delay}s, ${s.delay}s`,
            animationDuration: `${s.dur}s, ${(3 + Number(s.dur)).toFixed(2)}s`,
          }}
        />
      ))}
    </div>
  )
}
