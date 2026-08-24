import { useEffect, useState } from 'react'
import { ClipboardPlus, ChevronDown, ChevronUp, History } from 'lucide-react'
import Sparkles from '../Sparkles.jsx'
import EmptyState from '../EmptyState.jsx'

// Liquid Glass — ธีมเดียวกับหน้าแรก (เวอร์ชันขาวขึ้นนิดนึง เหมือนหน้าคนบ้านล่าง/เป้าหมาย/SOP)
const pageBg = {
  minHeight: '100%', boxSizing: 'border-box', padding: 20,
  background: `
    radial-gradient(circle at 8% 12%, rgba(216,204,255,.30), transparent 38%),
    radial-gradient(circle at 92% 8%, rgba(255,181,240,.22), transparent 40%),
    radial-gradient(circle at 85% 90%, rgba(226,215,245,.28), transparent 42%),
    linear-gradient(160deg, #F6F1FF 0%, #FBF0FA 50%, #F3EEFC 100%)
  `,
  display: 'flex', flexDirection: 'column', gap: 16,
}
const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,.95) 0%, rgba(233,222,255,.46) 32%, rgba(255,222,247,.3) 60%, rgba(255,255,255,.93) 100%)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  border: '1px solid rgba(255,255,255,.95)',
  borderRadius: 22,
  padding: 20,
  boxShadow: '0 1px 0 rgba(255,255,255,.95) inset, 0 12px 40px rgba(196,164,255,.24), 0 0 0 1px rgba(244,209,247,.5)',
  position: 'relative', overflow: 'hidden',
}
const inputStyle = {
  border: '1px solid #e1d5f7', borderRadius: 10, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit',
  background: 'rgba(255,255,255,.85)', outline: 'none', color: '#3a2f5c',
}
const labelStyle = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11.5, fontWeight: 600, color: '#6E56CF' }
const EMPTY_FORM = { type: '', detail: '', what_happened: '', problem: '', fix: '', result: '' }

function Shine() {
  return (
    <div style={{
      position: 'absolute', inset: '-40% -20%', pointerEvents: 'none', zIndex: -1,
      background: 'linear-gradient(115deg, transparent 38%, rgba(255,255,255,.55) 49%, rgba(255,255,255,.18) 53%, transparent 64%)',
    }} />
  )
}
function Bubble({ size = 90, top, left, right, bottom, hue = 'purple' }) {
  const hues = { purple: 'rgba(163,139,255,.36)', pink: 'rgba(255,181,240,.34)', cyan: 'rgba(216,204,255,.40)', silver: 'rgba(226,215,245,.46)', white: 'rgba(255,255,255,.65)' }
  return (
    <div style={{
      position: 'absolute', width: size, height: size, borderRadius: '50%',
      background: `radial-gradient(circle at 32% 28%, ${hues[hue]}, transparent 72%)`,
      top, left, right, bottom, filter: 'blur(1px)', pointerEvents: 'none', zIndex: -1,
    }} />
  )
}
function CardBubbles({ variant = 0 }) {
  const sets = [
    [{ size: 110, top: -30, right: -20, hue: 'cyan' }, { size: 60, bottom: -18, left: 20, hue: 'purple' }],
    [{ size: 80, top: -20, left: -16, hue: 'silver' }, { size: 50, bottom: 10, right: -14, hue: 'pink' }],
  ]
  const s = sets[variant % sets.length]
  return <>{s.map((b, i) => <Bubble key={i} {...b} />)}</>
}

export default function EventLog() {
  const [events, setEvents] = useState([])
  const [types, setTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [openId, setOpenId] = useState(null)

  const load = () => {
    setLoading(true)
    fetch('/api/events')
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error(d.error)
        setEvents(d.events)
        setTypes(d.types)
        setForm((f) => (f.type ? f : { ...f, type: d.types[0]?.key || '' }))
        setError('')
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const submit = async (e) => {
    e.preventDefault()
    if (!form.type) return
    setSaving(true)
    try {
      const res = await fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const d = await res.json()
      if (!d.success) throw new Error(d.error)
      setForm({ ...EMPTY_FORM, type: form.type })
      load()
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  const labelOf = (key) => types.find((t) => t.key === key)?.label || key
  const field = (key, label, placeholder) => (
    <label style={labelStyle}>
      {label}
      <textarea rows={2} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} placeholder={placeholder} />
    </label>
  )

  return (
    <div style={pageBg}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 13, background: 'linear-gradient(135deg, #8E75FF, #6E56CF)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(110,86,207,.3), inset 0 1px 0 rgba(255,255,255,.5)' }}>
          <ClipboardPlus size={19} color="#fff" />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#1C1C28' }}>บันทึกเหตุการณ์รายรอบ</h2>
          <div style={{ fontSize: 12.5, color: '#6C6C80', marginTop: 1 }}>ของมาส่ง, ฉีดปลวก, ขอคนเพิ่ม ฯลฯ — กดบันทึกทุกครั้งที่เกิดขึ้นจริง ไม่ใช่ทุกวัน</div>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 14, background: 'rgba(255,255,255,.7)', border: '1px solid rgba(225,29,72,.3)', color: '#dc2626', fontSize: 13, fontWeight: 600 }}>
          เกิดข้อผิดพลาด: {error}
        </div>
      )}

      <div style={glass}>
        <Shine /><CardBubbles variant={0} />
        <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, color: '#1C1C28' }}>
          <ClipboardPlus size={16} color="#6E56CF" /> บันทึกใหม่
        </h3>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ ...labelStyle, maxWidth: 280 }}>
            งาน
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={inputStyle}>
              {types.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {field('detail', 'รายละเอียด', 'เช่น ล็อตของจีนรอบวันที่ 20 ส.ค.')}
            {field('what_happened', 'เกิดอะไรขึ้น', 'เช่น ของมาส่งไม่ครบตามบิล')}
            {field('problem', 'ปัญหาคืออะไร', 'เช่น ขาดไป 20 ชิ้น')}
            {field('fix', 'แก้ไขอย่างไร', 'เช่น แจ้งซัพพลายเออร์ให้ส่งเพิ่ม')}
          </div>
          {field('result', 'ผลลัพธ์หลังแก้ปัญหา', 'เช่น ได้ของครบภายในวันถัดไป')}
          <button
            type="submit"
            disabled={saving}
            style={{
              alignSelf: 'flex-start', background: 'linear-gradient(135deg, #8E75FF, #6E56CF)', color: '#fff',
              border: 'none', borderRadius: 12, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 6px 16px rgba(110,86,207,.32), inset 0 1px 0 rgba(255,255,255,.35)',
            }}
          >
            {saving ? 'กำลังบันทึก...' : '+ บันทึก'}
          </button>
        </form>
      </div>

      <div style={glass}>
        <Shine /><CardBubbles variant={1} /><Sparkles count={5} seed={8} />
        <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#1C1C28', display: 'flex', alignItems: 'center', gap: 6 }}>
          <History size={15} color="#6E56CF" /> ประวัติล่าสุด
        </h3>
        {loading ? (
          <EmptyState title="กำลังโหลดประวัติ..." />
        ) : events.length === 0 ? (
          <EmptyState title="ยังไม่มีบันทึก" subtitle="กดบันทึกใหม่จากฟอร์มด้านบนเมื่อมีเหตุการณ์เกิดขึ้น" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {events.map((ev) => {
              const open = openId === ev.id
              return (
                <div key={ev.id} style={{ background: 'rgba(255,255,255,.55)', border: '1px solid rgba(225,213,247,.8)', borderRadius: 14, overflow: 'hidden' }}>
                  <button
                    onClick={() => setOpenId(open ? null : ev.id)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'transparent', border: 'none', padding: '10px 14px', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <span style={{ fontSize: 13, color: '#3a3450' }}><b style={{ color: '#1C1C28' }}>{ev.date}</b> · {labelOf(ev.type)} {ev.detail ? `— ${ev.detail}` : ''}</span>
                    {open ? <ChevronUp size={16} color="#6E56CF" /> : <ChevronDown size={16} color="#8b87a0" />}
                  </button>
                  {open && (
                    <div style={{ padding: '0 14px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12.5 }}>
                      <div><b style={{ color: '#6E56CF' }}>เกิดอะไรขึ้น:</b> <span style={{ color: '#4a4560' }}>{ev.whatHappened || '-'}</span></div>
                      <div><b style={{ color: '#6E56CF' }}>ปัญหา:</b> <span style={{ color: '#4a4560' }}>{ev.problem || '-'}</span></div>
                      <div><b style={{ color: '#6E56CF' }}>แก้ไข:</b> <span style={{ color: '#4a4560' }}>{ev.fix || '-'}</span></div>
                      <div><b style={{ color: '#6E56CF' }}>ผลลัพธ์:</b> <span style={{ color: '#4a4560' }}>{ev.result || '-'}</span></div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
