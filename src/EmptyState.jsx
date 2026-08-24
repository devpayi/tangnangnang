import capybaraEmpty from './assets/capybara-empty.png'

// การ์ดคาปิบาร่า ใช้ตอนหน้ากำลังโหลด / ไม่มีข้อมูล / error — แทนข้อความเปล่าๆ ให้ดูน่ารักขึ้น
export default function EmptyState({ title = 'กำลังโหลด...', subtitle, tone = 'neutral' }) {
  const color = tone === 'error' ? '#e11d48' : '#334155'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24, textAlign: 'center' }}>
      <img
        src={capybaraEmpty}
        alt=""
        style={{ width: 96, height: 'auto', animation: tone === 'error' ? 'none' : 'payi-drift 4s ease-in-out infinite' }}
      />
      <div style={{ fontSize: 14, fontWeight: 700, color }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: '#6C6C80' }}>{subtitle}</div>}
    </div>
  )
}
