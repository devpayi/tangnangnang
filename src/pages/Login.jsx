import { useState } from 'react'
import { Gem, Lock, User } from 'lucide-react'

// สไตล์อ้างอิง: การ์ดมืดลอยบนพื้นหลังดาว/หมอกน้ำเงินฟ้าเรืองแสง มีเพชรเรืองแสงขนาบซ้าย-ขวา
// (คอนเซปต์จากไอเดียแท่งไฟเรืองแสง — ใช้ไอคอนเพชรของแอพเองแทน ไม่ใช้โลโก้/ข้อความแบรนด์อื่น)
function GlowGem({ side }) {
  return (
    <div style={{
      position: 'absolute', top: '50%', [side]: '4%', transform: 'translateY(-50%)',
      width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity: 0.85, filter: 'drop-shadow(0 0 24px rgba(125,211,252,.85)) drop-shadow(0 0 50px rgba(96,165,250,.5))',
      zIndex: 0, pointerEvents: 'none',
    }}>
      <Gem size={90} color="#e0f2fe" strokeWidth={1.4} />
    </div>
  )
}

function Stars() {
  const dots = Array.from({ length: 40 }, (_, i) => {
    const x = (i * 53.7) % 100
    const y = (i * 31.3) % 100
    const size = 1 + ((i * 7) % 3)
    const opacity = 0.25 + ((i * 13) % 60) / 100
    return `radial-gradient(${size}px ${size}px at ${x}% ${y}%, rgba(255,255,255,${opacity}), transparent 100%)`
  }).join(',')
  return <div style={{ position: 'absolute', inset: 0, background: dots, pointerEvents: 'none' }} />
}

export default function Login({ onSuccess }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!password) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) })
      const d = await res.json()
      if (!d.success) throw new Error(d.error || 'เข้าสู่ระบบไม่สำเร็จ')
      if (d.token) localStorage.setItem('payi-floor-token', d.token)
      onSuccess?.()
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }

  return (
    <div style={{
      height: '100vh', boxSizing: 'border-box', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24,
      background: `
        radial-gradient(circle at 50% 45%, rgba(125,211,252,.30), transparent 55%),
        radial-gradient(circle at 15% 20%, rgba(96,165,250,.22), transparent 45%),
        radial-gradient(circle at 85% 80%, rgba(56,189,248,.18), transparent 50%),
        linear-gradient(160deg, #0b1f3a 0%, #0e2a4a 45%, #081727 100%)
      `,
      fontFamily: "'Segoe UI', Inter, system-ui, sans-serif",
    }}>
      <Stars />
      <GlowGem side="left" />
      <GlowGem side="right" />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 26 }}>
        <div style={{ width: 58, height: 58, borderRadius: 18, background: 'linear-gradient(135deg, #7dd3fc, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(37,99,235,.4)' }}>
          <Gem size={26} color="#fff" strokeWidth={2.2} />
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>PAYI Floor</div>
        <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.6)' }}>ของแตง — ระบบหลังบ้านทีมแพ็ก</div>
      </div>

      <form onSubmit={submit} style={{
        position: 'relative', zIndex: 1, width: '100%', maxWidth: 360,
        background: 'rgba(20,18,32,.72)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,.08)', borderTop: '2px solid #7dd3fc', borderRadius: 20, padding: 26,
        boxShadow: '0 24px 60px rgba(0,0,0,.35)',
      }}>
        <h3 style={{ margin: '0 0 18px', fontSize: 15, fontWeight: 700, color: '#fff' }}>เข้าสู่ระบบ</h3>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.7)', marginBottom: 14 }}>
          Username
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid rgba(255,255,255,.12)', borderRadius: 10, padding: '10px 12px', background: 'rgba(255,255,255,.06)' }}>
            <User size={15} color="rgba(255,255,255,.5)" />
            <input
              type="text" value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: '#fff', flex: 1 }}
            />
          </div>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.7)' }}>
          Password
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid rgba(255,255,255,.12)', borderRadius: 10, padding: '10px 12px', background: 'rgba(255,255,255,.06)' }}>
            <Lock size={15} color="rgba(255,255,255,.5)" />
            <input
              type="password" value={password} autoFocus
              onChange={(e) => setPassword(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: '#fff', flex: 1 }}
            />
          </div>
        </label>

        {error && <div style={{ marginTop: 10, fontSize: 12.5, color: '#fda4af', fontWeight: 600 }}>{error}</div>}

        <button
          type="submit" disabled={loading || !password}
          style={{
            marginTop: 20, width: '100%', border: 'none', borderRadius: 999, padding: '12px 0', fontSize: 14, fontWeight: 700, cursor: loading ? 'default' : 'pointer',
            background: 'linear-gradient(135deg, #38bdf8, #2563eb)', color: '#fff',
            boxShadow: '0 10px 24px rgba(37,99,235,.4)',
            opacity: loading || !password ? 0.7 : 1,
          }}
        >
          {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
        </button>
      </form>

      <div style={{ position: 'relative', zIndex: 1, marginTop: 22, fontSize: 11, color: 'rgba(255,255,255,.35)' }}>PAYI Health Care © 2026</div>
    </div>
  )
}
