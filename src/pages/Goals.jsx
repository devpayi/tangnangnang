import { useEffect, useState } from 'react'
import { Target, NotebookPen } from 'lucide-react'
import Sparkles from '../Sparkles.jsx'
import EmptyState from '../EmptyState.jsx'

const fmt = (n) => (n == null ? '—' : Number(n).toLocaleString('th-TH'))

// Liquid Glass — ธีมเดียวกับหน้าแรก: ม่วงชมพูนำ ฟ้าแตะเบาๆ
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
  border: '1px solid #e1d5f7', borderRadius: 10, padding: '8px 10px', fontSize: 13,
  background: 'rgba(255,255,255,.85)', outline: 'none', color: '#3a2f5c',
}
const labelStyle = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11.5, fontWeight: 600, color: '#6E56CF' }

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

// โทนไม้กายสิทธิ์ ม่วงชมพูนำ แบบใสๆ ลอยขึ้น — เหมือนการ์ด Performance หน้าแรก
const pearlCard = {
  background: `
    radial-gradient(circle at 16% 12%, rgba(255,255,255,.95), transparent 30%),
    radial-gradient(circle at 88% 8%, rgba(255,255,255,.75), transparent 28%),
    radial-gradient(circle at 92% 88%, rgba(140,178,245,.32), transparent 38%),
    radial-gradient(circle at 10% 96%, rgba(240,180,230,.26), transparent 38%),
    linear-gradient(155deg, rgba(246,241,254,.82) 0%, rgba(236,220,250,.76) 24%, rgba(243,217,242,.72) 50%, rgba(247,236,249,.8) 78%, rgba(255,255,255,.85) 100%)
  `,
  backdropFilter: 'blur(18px) saturate(180%)',
  WebkitBackdropFilter: 'blur(18px) saturate(180%)',
  borderRadius: 18, padding: '16px 14px', position: 'relative', overflow: 'hidden',
  border: '1px solid rgba(255,255,255,.85)',
  boxShadow: '0 14px 28px rgba(122,73,199,.2), 0 1px 0 rgba(255,255,255,.75) inset, 0 0 0 1px rgba(255,255,255,.5)',
}
const PEARL_LABEL = '#37205e'

function GoalCard({ label, actual, target, suffix = '', lowerIsBetter = true, seed = 0 }) {
  const hasTarget = target != null && target > 0
  const met = hasTarget && actual != null && (lowerIsBetter ? actual <= target : actual >= target)
  const tint = !hasTarget || actual == null ? '#6E56CF' : met ? '#059669' : '#dc2626'
  return (
    <div style={pearlCard}>
      <Shine /><Sparkles count={4} seed={seed} />
      <div style={{ fontSize: 12, fontWeight: 700, color: PEARL_LABEL, opacity: .8, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 25, fontWeight: 800, color: tint, lineHeight: 1.2 }}>{fmt(actual)}{suffix}</div>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(55,32,94,.65)', marginTop: 4 }}>
        {hasTarget ? `เป้า ${lowerIsBetter ? '≤' : '≥'} ${fmt(target)}${suffix}` : 'ยังไม่ตั้งเป้า'}
      </div>
    </div>
  )
}

export default function Goals() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ claim_rate_target: '', claim_value_target: '', feed_fulfillment_target: '', stockout_days_target: '' })
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  const load = () => {
    setLoading(true)
    fetch(`/api/goals?month=${month}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error(d.error)
        setData(d)
        setForm({
          claim_rate_target: d.targets.claimRate ?? '',
          claim_value_target: d.targets.claimValue ?? '',
          feed_fulfillment_target: d.targets.feedFulfillment ?? '',
          stockout_days_target: d.targets.stockoutDays ?? '',
        })
        setNote(d.targets.reviewNote || '')
        setError('')
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(load, [month])

  const saveTargets = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/goals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, month }) })
      const d = await res.json()
      if (!d.success) throw new Error(d.error)
      load()
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  const saveNote = async (e) => {
    e.preventDefault()
    setSavingNote(true)
    try {
      // ส่ง form (เป้าปัจจุบัน) ไปด้วยเสมอ กันไม่ให้บันทึกโน้ตอย่างเดียวไปทับเป้าที่ตั้งไว้เป็น 0 โดยไม่ตั้งใจ
      const res = await fetch('/api/goals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, month, review_note: note }) })
      const d = await res.json()
      if (!d.success) throw new Error(d.error)
      load()
    } catch (e) { setError(e.message) } finally { setSavingNote(false) }
  }

  if (loading) return <div style={{ ...pageBg, alignItems: 'center', justifyContent: 'center' }}><EmptyState title="กำลังโหลดข้อมูล..." /></div>
  if (error) return <div style={{ ...pageBg, alignItems: 'center', justifyContent: 'center' }}><div style={glass}><EmptyState title="เกิดข้อผิดพลาด" subtitle={error} tone="error" /></div></div>
  if (!data) return null

  return (
    <div style={pageBg}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 13, background: 'linear-gradient(135deg, #8E75FF, #6E56CF)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(110,86,207,.3), inset 0 1px 0 rgba(255,255,255,.5)' }}>
            <Target size={19} color="#fff" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#1C1C28' }}>เป้าหมาย · {data.month}</h2>
            <div style={{ fontSize: 12.5, color: '#6C6C80', marginTop: 1 }}>เทียบเป้ากับผลจริงของเดือนที่เลือก — คำนวณจากข้อมูลเคลม+ผลิตจริง ไม่ต้องกรอกผลเอง</div>
          </div>
        </div>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={{ ...inputStyle, fontWeight: 600 }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <GoalCard label="อัตราเคลม" actual={data.actual.claimRate} target={data.targets.claimRate} suffix="%" seed={21} />
        <GoalCard label="มูลค่าเสียหายจากเคลม" actual={data.actual.claimValue} target={data.targets.claimValue} suffix=" ฿" seed={22} />
        <GoalCard label="Feed Fulfillment" actual={data.actual.feedFulfillment} target={data.targets.feedFulfillment} lowerIsBetter={false} suffix="%" seed={23} />
        <GoalCard label="วันที่ของขาด (Stockout)" actual={data.actual.stockoutDays} target={data.targets.stockoutDays} suffix=" วัน" seed={24} />
      </div>

      <div style={{ fontSize: 11.5, color: '#6C6C80', padding: '0 4px' }}>
        เคลม {fmt(data.actual.claimCount)} ครั้ง จากยอดขาย {fmt(data.actual.unitsSold)} ชิ้น · ฟีดครบตามแผน {fmt(data.actual.totalFeedDays)} วันที่ต้องฟีด
      </div>

      <div style={glass}>
        <Shine /><CardBubbles variant={1} />
        <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#1C1C28' }}>
          ตั้งเป้าหมายเดือน {month} <span style={{ fontWeight: 400, color: '#6C6C80', fontSize: 12 }}>เว้นว่าง = ยังไม่ตั้งเป้าตัวนั้น</span>
        </h3>
        <form onSubmit={saveTargets} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, alignItems: 'end' }}>
          <label style={labelStyle}>
            อัตราเคลม ≤ (%)
            <input type="number" step="0.01" value={form.claim_rate_target} onChange={(e) => setForm({ ...form, claim_rate_target: e.target.value })} style={inputStyle} />
          </label>
          <label style={labelStyle}>
            มูลค่าเสียหาย ≤ (฿/เดือน)
            <input type="number" value={form.claim_value_target} onChange={(e) => setForm({ ...form, claim_value_target: e.target.value })} style={inputStyle} />
          </label>
          <label style={labelStyle}>
            Feed Fulfillment ≥ (%)
            <input type="number" step="0.1" value={form.feed_fulfillment_target} onChange={(e) => setForm({ ...form, feed_fulfillment_target: e.target.value })} style={inputStyle} />
          </label>
          <label style={labelStyle}>
            Stockout ≤ (วัน/เดือน)
            <input type="number" value={form.stockout_days_target} onChange={(e) => setForm({ ...form, stockout_days_target: e.target.value })} style={inputStyle} />
          </label>
          <button
            type="submit"
            disabled={saving}
            style={{
              gridColumn: '1 / -1', justifySelf: 'start', background: 'linear-gradient(135deg, #8E75FF, #6E56CF)', color: '#fff',
              border: 'none', borderRadius: 12, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 6px 16px rgba(110,86,207,.32), inset 0 1px 0 rgba(255,255,255,.35)',
            }}
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึกเป้าหมาย'}
          </button>
        </form>
      </div>

      <div style={glass}>
        <Shine /><CardBubbles variant={2} />
        <h3 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: '#1C1C28', display: 'flex', alignItems: 'center', gap: 6 }}>
          <NotebookPen size={15} color="#6E56CF" /> บันทึกทบทวนเดือน {month}
        </h3>
        <div style={{ fontSize: 12, color: '#6C6C80', marginBottom: 10 }}>เขียนเองสั้นๆ ว่าทำไมตัวเลขขึ้น/ลง — ใช้คุยรีวิวกันตอนสิ้นเดือนได้เลย</div>
        <form onSubmit={saveNote} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            placeholder="เช่น เดือนนี้เคลมเยอะเพราะ... / ของขาดบ่อยเพราะ..."
            style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }}
          />
          <button
            type="submit"
            disabled={savingNote}
            style={{
              alignSelf: 'flex-start', background: 'linear-gradient(135deg, #34d399, #059669)', color: '#fff',
              border: 'none', borderRadius: 12, padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 6px 16px rgba(5,150,105,.28), inset 0 1px 0 rgba(255,255,255,.35)',
            }}
          >
            {savingNote ? 'กำลังบันทึก...' : 'บันทึกโน้ต'}
          </button>
        </form>
      </div>
    </div>
  )
}

function CardBubbles({ variant = 0 }) {
  const sets = [
    [{ size: 110, top: -30, right: -20, hue: 'cyan' }, { size: 60, bottom: -18, left: 20, hue: 'purple' }],
    [{ size: 80, top: -20, left: -16, hue: 'silver' }, { size: 50, bottom: 10, right: -14, hue: 'pink' }],
    [{ size: 130, bottom: -40, right: -30, hue: 'purple' }, { size: 44, top: 14, left: -10, hue: 'white' }],
  ]
  const s = sets[variant % sets.length]
  return <>{s.map((b, i) => <Bubble key={i} {...b} />)}</>
}
