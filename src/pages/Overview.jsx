import { useEffect, useState } from 'react'
import { AlertTriangle, CheckSquare, Square, Users, Boxes, PartyPopper, ClipboardCheck, ClipboardList, TrendingUp, ClipboardPlus, BookOpen, Target, DollarSign, Gem, Percent, Info } from 'lucide-react'
import Sparkles from '../Sparkles.jsx'
import EmptyState from '../EmptyState.jsx'

const MIN_HEADCOUNT = 3

// ปุ่มลัดใช้โทนเดียว (น้ำเงิน) ทั้งหมด — สีสดเก็บไว้เป็น accent เฉพาะจุดแจ้งเตือน/สถานะเท่านั้น ตามฟีดแบ็ก
const QUICK_LINKS = [
  { id: 'claims', label: 'จัดการเคลม', icon: ClipboardList },
  { id: 'planner', label: 'Planner Control', icon: TrendingUp },
  { id: 'workforce', label: 'Manpower และ OT', icon: Users },
  { id: 'events', label: 'บันทึกเหตุการณ์', icon: ClipboardPlus },
  { id: 'sop', label: 'SOP', icon: BookOpen },
  { id: 'goals', label: 'เป้าหมาย', icon: Target },
]

const TINTS = {
  red: { grad: 'linear-gradient(135deg, #fb7185, #e11d48)', text: '#e11d48', ring: '#fb7185' },
  amber: { grad: 'linear-gradient(135deg, #fbbf24, #f59e0b)', text: '#b45309', ring: '#fbbf24' },
  blue: { grad: 'linear-gradient(135deg, #8E75FF, #6E56CF)', text: '#6E56CF', ring: '#8E75FF' },
  green: { grad: 'linear-gradient(135deg, #34d399, #059669)', text: '#047857', ring: '#34d399' },
}

// Liquid Glass — โทนไม้กายสิทธิ์ซากุระ: ลาเวนเดอร์-ชมพู-ซิลเวอร์ ประกายมุก มีความ "เหลว" ไหลเป็นชั้นสี
const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,.96) 0%, rgba(240,232,255,.7) 32%, rgba(255,235,250,.5) 60%, rgba(255,255,255,.94) 100%)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  border: '1px solid rgba(255,255,255,.98)',
  borderRadius: 22,
  padding: 20,
  boxShadow: '0 1px 0 rgba(255,255,255,1) inset, 0 12px 40px rgba(196,164,255,.2), 0 0 0 1px rgba(244,209,247,.4)',
  position: 'relative',
  overflow: 'hidden',
  zIndex: 0,
}
const fmt = (n) => (n == null ? '—' : Number(n).toLocaleString('th-TH'))

// ฟองกระจกตกแต่ง สุ่มขนาด/ตำแหน่ง/สีให้ไม่ซ้ำแต่ละการ์ด — โทนไม้กายสิทธิ์ (ลาเวนเดอร์/ชมพู/ซิลเวอร์มุก)
const BUBBLE_HUES = {
  purple: 'rgba(163,139,255,.36)',
  blue: 'rgba(186,168,255,.30)',
  white: 'rgba(255,255,255,.65)',
  pink: 'rgba(255,181,240,.34)',
  cyan: 'rgba(216,204,255,.40)',
  silver: 'rgba(226,215,245,.46)',
}
function Bubble({ size = 90, top, left, right, bottom, hue = 'purple' }) {
  return (
    <div style={{
      position: 'absolute', width: size, height: size, borderRadius: '50%',
      background: `radial-gradient(circle at 32% 28%, ${BUBBLE_HUES[hue]}, transparent 72%)`,
      top, left, right, bottom, filter: 'blur(1px)', pointerEvents: 'none', zIndex: -1,
    }} />
  )
}
function CardBubbles({ variant = 0 }) {
  const sets = [
    [{ size: 110, top: -30, right: -20, hue: 'cyan' }, { size: 60, bottom: -18, left: 20, hue: 'purple' }],
    [{ size: 80, top: -20, left: -16, hue: 'silver' }, { size: 50, bottom: 10, right: -14, hue: 'blue' }],
    [{ size: 130, bottom: -40, right: -30, hue: 'purple' }, { size: 44, top: 14, left: -10, hue: 'white' }],
    [{ size: 70, top: -22, right: 30, hue: 'cyan' }, { size: 90, bottom: -30, left: -20, hue: 'silver' }],
  ]
  const s = sets[variant % sets.length]
  return <>{s.map((b, i) => <Bubble key={i} {...b} />)}</>
}

// เส้นประกายทแยงบนกระจก เหมือนแสงตกกระทบผิวเพชร/กระจกเจียระไน
function Shine() {
  return (
    <div style={{
      position: 'absolute', inset: '-40% -20%', pointerEvents: 'none', zIndex: -1,
      background: 'linear-gradient(115deg, transparent 38%, rgba(255,255,255,.55) 49%, rgba(255,255,255,.18) 53%, transparent 64%)',
    }} />
  )
}

function QuickLink({ label, icon: Icon, onClick, active = false, fill = false }) {
  const t = TINTS.blue
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
        ...(fill ? { width: '100%' } : { width: 1, flexGrow: 1 }), height: 92, flexShrink: 0, cursor: 'pointer', textAlign: 'center',
        background: 'linear-gradient(160deg, #ffffff 0%, #ffffff 55%, #f7f1fc 100%)', borderRadius: 16,
        border: active ? `1.5px solid ${t.ring}` : '1px solid #d5c2f2',
        boxShadow: '0 6px 16px rgba(110,86,207,.16), 0 1px 0 rgba(255,255,255,.9) inset',
        transition: 'transform .12s ease, box-shadow .12s ease',
      }}
    >
      <Icon size={26} color={t.text} />
      <span style={{ fontSize: 13, fontWeight: 500, color: '#4a4560', lineHeight: 1.25 }}>{label}</span>
    </button>
  )
}

function IconBadge({ icon: Icon, tint }) {
  const t = TINTS[tint] || TINTS.blue
  return (
    <div style={{ width: 40, height: 40, borderRadius: 13, background: t.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 10px ${t.ring}55, inset 0 1px 0 rgba(255,255,255,.6), inset 0 -6px 10px rgba(0,0,0,.08)` }}>
      <Icon size={18} color="#fff" />
    </div>
  )
}

// วงแหวน % แบบ conic-gradient — ไม่ต้องพึ่ง SVG library เพิ่ม
function Ring({ percent, tint, size = 88, thickness = 9, children }) {
  const t = TINTS[tint] || TINTS.blue
  const pct = Math.max(0, Math.min(100, percent ?? 0))
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `conic-gradient(${t.ring} ${pct * 3.6}deg, rgba(148,163,184,.18) 0deg)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <div style={{
        width: size - thickness * 2, height: size - thickness * 2, borderRadius: '50%',
        background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', boxShadow: 'inset 0 1px 3px rgba(15,23,42,.06)',
      }}>
        {children}
      </div>
    </div>
  )
}

const CHECKLIST_ITEMS = [
  { key: 'truck_access', label: 'รถหน้าบ้านให้ขนส่งเข้ารับได้ (ไม่มีรถขวาง)' },
  { key: 'cone_placement', label: 'วางกรวยหน้าบ้าน ไม่ให้รถอื่นมาจอด' },
  { key: 'billing_cutoff', label: 'ตัดรอบบิลส่งด่วน ไม่เกินเวลา' },
  { key: 'no_pending_bills', label: 'ไม่มีบิลตกค้าง (ปลาใหญ่ + กรอบรูป)' },
  { key: 'feed_quality_ok', label: 'ฟีดของถูกต้อง สวยงาม ได้มาตรฐาน' },
]

function ChecklistBody({ headcount, horizontal = false }) {
  const [checked, setChecked] = useState({})
  const [loading, setLoading] = useState(true)

  const load = () => {
    fetch('/api/checklist')
      .then((r) => r.json())
      .then((d) => { if (d.success) setChecked(d.checked) })
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const toggle = async (key) => {
    const next = !checked[key]
    setChecked((c) => ({ ...c, [key]: next })) // optimistic
    try {
      const res = await fetch('/api/checklist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, checked: next }) })
      const d = await res.json()
      if (d.success) setChecked(d.checked)
    } catch { setChecked((c) => ({ ...c, [key]: !next })) } // rollback ถ้าพัง
  }

  const doneCount = CHECKLIST_ITEMS.filter((it) => checked[it.key]).length
  const belowMin = headcount != null && headcount.count < MIN_HEADCOUNT

  if (horizontal) {
    return (
      <>
        {headcount != null && (
          <div style={{ flexShrink: 0, paddingRight: 20, borderRight: '1px solid rgba(148,163,184,.25)' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: belowMin ? '#e11d48' : '#1C1C28', lineHeight: 1.2, whiteSpace: 'nowrap' }}>วันนี้มีคนแพ็ค {headcount.count} คน</div>
            {headcount.names.length > 0 && <div style={{ fontSize: 11.5, color: '#6C6C80', marginTop: 2 }}>{headcount.names.join(' ')}</div>}
            {belowMin && <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', marginTop: 3 }}>⚠️ ต่ำกว่าขั้นต่ำ ({MIN_HEADCOUNT} คน)</div>}
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', flex: 1, minWidth: 0 }}>
          {CHECKLIST_ITEMS.map((it) => {
            const isChecked = Boolean(checked[it.key])
            return (
              <button key={it.key} onClick={() => toggle(it.key)} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', padding: '3px 0', fontSize: 12, color: isChecked ? '#059669' : '#334155', whiteSpace: 'nowrap' }}>
                {isChecked ? <CheckSquare size={16} color="#059669" /> : <Square size={16} color="#64748b" />}
                <span style={{ textDecoration: isChecked ? 'line-through' : 'none' }}>{it.label}</span>
              </button>
            )
          })}
        </div>
        <div style={{ fontSize: 11, color: '#6C6C80', flexShrink: 0, whiteSpace: 'nowrap' }}>{loading ? '' : `${doneCount}/${CHECKLIST_ITEMS.length}`}</div>
      </>
    )
  }

  return (
    <>
      {headcount != null && (
        <div style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid rgba(148,163,184,.25)', flexShrink: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: belowMin ? '#e11d48' : '#1C1C28', lineHeight: 1.2 }}>วันนี้มีคนแพ็ค {headcount.count} คน</div>
          {headcount.names.length > 0 && <div style={{ fontSize: 12, color: '#6C6C80', marginTop: 2 }}>{headcount.names.join(' ')}</div>}
          {belowMin && <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', marginTop: 3 }}>⚠️ ต่ำกว่าขั้นต่ำ ({MIN_HEADCOUNT} คน)</div>}
        </div>
      )}
      <div style={{ fontSize: 11, color: '#6C6C80', marginBottom: 6, flexShrink: 0 }}>{loading ? '' : `${doneCount}/${CHECKLIST_ITEMS.length} เสร็จแล้ว`}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {CHECKLIST_ITEMS.map((it) => {
          const isChecked = Boolean(checked[it.key])
          return (
            <button key={it.key} onClick={() => toggle(it.key)} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', padding: '3px 0', fontSize: 12, color: isChecked ? '#059669' : '#334155' }}>
              {isChecked ? <CheckSquare size={16} color="#059669" /> : <Square size={16} color="#64748b" />}
              <span style={{ textDecoration: isChecked ? 'line-through' : 'none' }}>{it.label}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}

// โทนไม้กายสิทธิ์ ม่วงชมพูนำ ฟ้าแตะเบาๆ — ใช้กับการ์ด Performance ทั้งกล่อง แบบใสๆ ลอยขึ้นจากพื้นหลัง (ไม่มีไอคอนสี่เหลี่ยม)
const pearlCard = {
  background: `
    radial-gradient(circle at 16% 12%, rgba(255,255,255,1), transparent 34%),
    radial-gradient(circle at 88% 8%, rgba(255,255,255,.92), transparent 32%),
    radial-gradient(circle at 92% 88%, rgba(140,178,245,.26), transparent 40%),
    radial-gradient(circle at 10% 96%, rgba(240,180,230,.2), transparent 40%),
    linear-gradient(155deg, rgba(255,255,255,.94) 0%, rgba(245,238,255,.88) 26%, rgba(250,235,250,.84) 52%, rgba(252,247,253,.92) 78%, rgba(255,255,255,.96) 100%)
  `,
  backdropFilter: 'blur(18px) saturate(180%)',
  WebkitBackdropFilter: 'blur(18px) saturate(180%)',
  borderRadius: 18, padding: '16px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 8,
  border: '1px solid rgba(255,255,255,.95)',
  boxShadow: '0 0 26px rgba(255,255,255,.55), 0 16px 32px rgba(122,73,199,.22), 0 3px 8px rgba(122,73,199,.12), 0 1px 0 rgba(255,255,255,.9) inset, 0 0 0 1px rgba(255,255,255,.65)',
  position: 'relative', overflow: 'hidden',
}
const PEARL_LABEL = '#37205e'
const PEARL_SUB = 'rgba(55,32,94,.72)'
const PEARL_TEXT_SHADOW = '0 1px 0 rgba(255,255,255,.55)'

// ฟองฟุ้งๆ ลอยในการ์ด pearl — วนสีตาม seed ให้แต่ละการ์ดไม่เหมือนกัน
function PearlBubbles({ seed = 0 }) {
  const sets = [
    [{ size: 56, top: -18, right: -14, hue: 'pink' }, { size: 34, bottom: -10, left: -6, hue: 'silver' }],
    [{ size: 44, top: -12, left: -10, hue: 'cyan' }, { size: 40, bottom: -16, right: 6, hue: 'white' }],
    [{ size: 60, bottom: -20, right: -16, hue: 'purple' }, { size: 28, top: 8, left: -8, hue: 'pink' }],
    [{ size: 38, top: -10, right: 20, hue: 'silver' }, { size: 52, bottom: -18, left: -14, hue: 'cyan' }],
  ]
  const s = sets[seed % sets.length]
  return <>{s.map((b, i) => <Bubble key={i} {...b} />)}</>
}

// ป้ายเทียบเดือนก่อน (MoM) — ▲/▼ เขียวถ้าดีขึ้น แดงถ้าแย่ลง ตาม lowerIsBetter ของตัวชี้วัดนั้นๆ
function MoMBadge({ mom, lowerIsBetter = true }) {
  if (mom == null) return null
  const flat = Math.abs(mom) < 0.05
  const improved = !flat && (lowerIsBetter ? mom < 0 : mom > 0)
  const color = flat ? '#6b5f8a' : improved ? '#059669' : '#dc2626'
  const bg = flat ? 'rgba(107,95,138,.12)' : improved ? 'rgba(5,150,105,.12)' : 'rgba(220,38,38,.12)'
  const arrow = flat ? '–' : mom > 0 ? '▲' : '▼'
  return (
    <div
      title={`เปลี่ยนแปลง ${Math.abs(mom).toFixed(0)}% เทียบกับเดือนที่แล้ว (MoM = Month over Month) ${improved ? '— ดีขึ้น' : flat ? '— ใกล้เคียงเดิม' : '— แย่ลง'}`}
      style={{ position: 'absolute', top: 9, right: 9, zIndex: 1, display: 'flex', alignItems: 'center', gap: 2, fontSize: 10, fontWeight: 800, color, background: bg, borderRadius: 999, padding: '2px 7px', whiteSpace: 'nowrap', cursor: 'help' }}
    >
      {arrow} {Math.abs(mom).toFixed(0)}% MoM
    </div>
  )
}

// ไอคอนคำอธิบาย — เดิมใช้ native title tooltip (ต้อง hover ค้าง ~1 วิ และแตะบนมือถือไม่ทำงานเลย)
// เปลี่ยนเป็น click/tap toggle แทน กดที่ไอคอนเห็นทันที กดซ้ำ/กดที่อื่นเพื่อปิด
function HintIcon({ text }) {
  const [open, setOpen] = useState(false)
  if (!text) return null
  return (
    <span style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
      <span
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
        style={{ display: 'inline-flex', cursor: 'pointer', opacity: .55 }}
      >
        <Info size={13} color={PEARL_LABEL} />
      </span>
      {open && (
        <>
          <span onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 30 }} />
          <span style={{
            position: 'absolute', bottom: '130%', left: '50%', transform: 'translateX(-50%)',
            width: 200, background: 'rgba(28,28,40,.95)', color: '#fff', fontSize: 11, fontWeight: 500,
            lineHeight: 1.4, borderRadius: 10, padding: '8px 10px', zIndex: 31, textAlign: 'left',
            boxShadow: '0 8px 24px rgba(0,0,0,.25)', whiteSpace: 'normal',
          }}>
            {text}
          </span>
        </>
      )}
    </span>
  )
}

function RingCard({ label, hint, actual, target, mom, lowerIsBetter = true, seed = 0 }) {
  const hasTarget = target != null && target > 0
  const met = hasTarget && actual != null && (lowerIsBetter ? actual <= target : actual >= target)
  const tint = !hasTarget || actual == null ? 'blue' : met ? 'green' : 'red'
  const t = TINTS[tint]
  return (
    <div style={pearlCard}>
      <Shine /><PearlBubbles seed={seed} /><Sparkles count={5} seed={seed} /><MoMBadge mom={mom} lowerIsBetter={lowerIsBetter} />
      {actual == null ? (
        <div style={{ fontSize: 28, fontWeight: 800, color: PEARL_LABEL }}>—</div>
      ) : (
        <Ring percent={actual} tint={tint} size={76} thickness={8}>
          <span style={{ fontSize: 20, fontWeight: 800, color: t.text }}>{fmt(actual)}%</span>
        </Ring>
      )}
      <div style={{ minWidth: 0, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 16, fontWeight: 800, color: PEARL_LABEL, textShadow: PEARL_TEXT_SHADOW }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span><HintIcon text={hint} />
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: PEARL_SUB, marginTop: 3 }}>{hasTarget ? `เป้า ${lowerIsBetter ? '≤' : '≥'} ${fmt(target)}%` : (actual == null ? 'ยังไม่มีข้อมูล' : ' ')}</div>
      </div>
    </div>
  )
}

function NumberCard({ label, hint, actual, target, unit = '', mom, lowerIsBetter = true, seed = 0 }) {
  const hasTarget = target != null && target > 0
  const met = hasTarget && actual != null && (lowerIsBetter ? actual <= target : actual >= target)
  const tint = !hasTarget || actual == null ? 'blue' : met ? 'green' : 'red'
  const t = TINTS[tint]
  return (
    <div style={pearlCard}>
      <Shine /><PearlBubbles seed={seed} /><Sparkles count={5} seed={seed} /><MoMBadge mom={mom} lowerIsBetter={lowerIsBetter} />
      <div style={{ minWidth: 0, width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1 }}>
        <div style={{ fontSize: 30, fontWeight: 800, color: t.ring, lineHeight: 1.2, textShadow: PEARL_TEXT_SHADOW }}>{fmt(actual)}{unit}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 16, fontWeight: 800, color: PEARL_LABEL, textShadow: PEARL_TEXT_SHADOW, marginTop: 6 }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span><HintIcon text={hint} />
        </div>
      </div>
    </div>
  )
}

export default function Overview({ onNavigate, isMobile = false }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [headcount, setHeadcount] = useState(null)

  useEffect(() => {
    fetch('/api/overview')
      .then((r) => r.json())
      .then((d) => { if (d.success) setData(d); else setError(d.error || 'โหลดไม่สำเร็จ') })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
    fetch('/api/workforce?sourceOnly=1')
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) return
        const todayRows = (d.sourceManpower || []).filter((r) => r.date === today && r.group !== 'ออฟฟิศ' && !['PANID', 'MOM'].includes(String(r.code || '').toUpperCase()))
        const count = Math.round(todayRows.reduce((s, r) => s + Number(r.fraction || 1), 0))
        setHeadcount({ count, names: todayRows.map((r) => r.employee) })
      })
      .catch(() => {})
  }, [])

  // Soft Bubble Glass — พื้นม่วงเทาอ่อน มีบับเบิลเบลอจางๆ ให้ความรู้สึกนุ่ม ไม่แข็งแบน
  const pageBg = {
    background: `
      radial-gradient(circle at 8% 12%, rgba(216,204,255,.30), transparent 38%),
      radial-gradient(circle at 92% 8%, rgba(255,181,240,.22), transparent 40%),
      radial-gradient(circle at 85% 90%, rgba(226,215,245,.28), transparent 42%),
      radial-gradient(circle at 15% 88%, rgba(186,168,255,.20), transparent 40%),
      linear-gradient(160deg, #F6F1FF 0%, #FBF0FA 50%, #F3EEFC 100%)
    `,
    height: isMobile ? 'auto' : '100%', minHeight: '100%', boxSizing: 'border-box', padding: isMobile ? 14 : 20, overflow: isMobile ? 'visible' : 'hidden',
    display: 'grid', gridTemplateRows: isMobile ? 'auto' : 'minmax(0, 1fr)', gap: isMobile ? 12 : 14,
  }
  const rowStyle = (i) => ({ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', columnGap: 14, fontSize: 13, padding: '3px 10px', borderRadius: 9, background: i % 2 === 0 ? 'rgba(255,255,255,.4)' : 'transparent' })

  if (loading) return <div style={{ ...pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><EmptyState title="กำลังโหลดข้อมูล..." subtitle="รอแป๊บนึงนะ" /></div>
  if (error) return <div style={{ ...pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={glass}><EmptyState title="เกิดข้อผิดพลาด" subtitle={error} tone="error" /></div></div>
  if (!data) return <div style={{ ...pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><EmptyState title="ยังไม่มีข้อมูล" /></div>

  const { performance: p, urgent, fg } = data
  const headcountLow = headcount != null && headcount.count < MIN_HEADCOUNT
  const fgLowCount = fg?.lowCount || 0
  const hasUrgent = urgent.redAlerts.length > 0 || headcountLow || fgLowCount > 0
  const scrollCol = { ...glass, height: '100%', boxSizing: 'border-box', overflowY: 'auto', display: 'flex', flexDirection: 'column' }

  return (
    <div style={pageBg}>
      <style>{`
        .thin-scroll::-webkit-scrollbar { width: 6px; }
        .thin-scroll::-webkit-scrollbar-track { background: transparent; }
        .thin-scroll::-webkit-scrollbar-thumb { background: rgba(110,86,207,.25); border-radius: 999px; }
        .thin-scroll::-webkit-scrollbar-thumb:hover { background: rgba(110,86,207,.4); }
        .thin-scroll { scrollbar-width: thin; scrollbar-color: rgba(110,86,207,.25) transparent; }
      `}</style>
      <div style={{ display: 'grid', gridTemplateRows: isMobile ? 'auto' : 'auto auto auto minmax(0, 1fr)', gap: isMobile ? 12 : 14, minHeight: 0, height: isMobile ? 'auto' : '100%' }}>
          <div style={{ flexShrink: 0, position: 'relative', overflow: 'hidden', background: 'linear-gradient(120deg, #3d2f66 0%, #8E75FF 38%, #d9a9f0 68%, #f4c9ef 100%)', borderRadius: 20, padding: isMobile ? '13px 16px' : '13px 20px', color: '#fff', boxShadow: '0 10px 30px rgba(160,110,220,.30), inset 0 1px 0 rgba(255,255,255,.3)', display: 'flex', flexWrap: isMobile ? 'wrap' : 'nowrap', alignItems: 'center', justifyContent: 'space-between', gap: isMobile ? 8 : 14 }}>
            <Sparkles count={10} seed={1} />
            <Bubble size={140} top={-50} right={-30} hue="white" />
            <Bubble size={70} bottom={-30} left={100} hue="pink" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, zIndex: 1, minWidth: 0 }}>
              <div style={{ width: 34, height: 34, borderRadius: 11, background: 'rgba(255,255,255,.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Gem size={17} color="#6E56CF" strokeWidth={2.2} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="chrome-text" style={{ fontSize: 10.5, letterSpacing: 1.8, fontWeight: 800 }}>PAYI FLOOR · ของแตง</div>
                <h2 style={{ margin: '1px 0 0', fontSize: 16.5, fontWeight: 700 }}>สรุปภาพรวม · {data.today}</h2>
                <div style={{ fontSize: 11, color: '#ede9fe', marginTop: 2 }}>กำลังคน · เคลม · FG · แผนผลิต</div>
              </div>
            </div>
            <span className="payi-status-pill" style={{ zIndex: 1, background: 'rgba(255,255,255,.16)', border: '1px solid rgba(255,255,255,.35)', color: '#fff', flexShrink: 0 }}>
              <span className="payi-status-dot" />ระบบทำงานปกติ
            </span>
          </div>

          {/* ---- Performance แนวนอน อยู่เหนือแถวปุ่มลัด ---- */}
          <div style={{ ...glass, flexShrink: 0, padding: '14px 16px' }}>
            <Shine /><CardBubbles variant={3} /><Sparkles count={5} seed={5} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <h3 style={{ fontSize: 13.5, fontWeight: 600, margin: 0, color: '#1C1C28' }}>📊 Performance</h3>
              <button onClick={() => onNavigate?.('goals')} style={{ background: 'transparent', border: 'none', color: '#6E56CF', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', padding: 0 }}>ตั้งเป้า →</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? 10 : 14 }}>
              <RingCard label="อัตราเคลม" hint="% ของออเดอร์ที่ถูกเคลม เทียบกับจำนวนชิ้นที่ขายได้เดือนนี้ ยิ่งน้อยยิ่งดี" actual={p.claimRate.actual} target={p.claimRate.target} mom={p.claimRate.mom} seed={11} />
              <NumberCard label="มูลค่าเสียหาย" hint="มูลค่ารวมของเคลมทั้งหมดที่เกิดขึ้นเดือนนี้ (บาท) ยิ่งน้อยยิ่งดี" actual={p.claimValue.actual} target={p.claimValue.target} mom={p.claimValue.mom} unit=" ฿" seed={12} />
              <RingCard label="Feed Fulfillment" hint="% ของวันที่ฟีดของครบตามจำนวนที่ระบบแนะนำ เดือนนี้ ยิ่งมากยิ่งดี" actual={p.feedFulfillment.actual} target={p.feedFulfillment.target} mom={p.feedFulfillment.mom} lowerIsBetter={false} seed={13} />
              <NumberCard label="Stockout" hint="จำนวนวันเดือนนี้ที่ฟีดของ 'ไม่ครบ' ตามที่ระบบแนะนำ (ของขาด) ยิ่งน้อยยิ่งดี — คู่กับ Feed Fulfillment ข้างๆ ที่บอกเป็น % แทน" actual={p.stockoutDays.actual} target={p.stockoutDays.target} mom={p.stockoutDays.mom} unit=" วัน" seed={14} />
            </div>
          </div>

          <div style={{ ...glass, flexShrink: 0, padding: isMobile ? '10px' : '8px 10px', display: isMobile ? 'grid' : 'flex', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : undefined, alignItems: 'center', gap: 10 }}>
            <Shine /><CardBubbles variant={0} /><Sparkles count={5} seed={2} />
            {QUICK_LINKS.map((q) => <QuickLink key={q.id} label={q.label} icon={q.icon} onClick={() => onNavigate?.(q.id)} fill={isMobile} />)}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 12 : 14, minHeight: 0 }}>
            {/* ---- ต้องจัดการด่วน (ย้ายมาซ้าย ให้เห็นก่อน) ---- */}
            <div style={{ ...glass, padding: '14px 16px', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <Shine /><CardBubbles variant={1} /><Sparkles count={5} seed={3} />
              <h3 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6, color: '#1C1C28', flexShrink: 0 }}>🔥 ต้องจัดการด่วน</h3>

              {!urgent.planOpenedToday && (
                <button onClick={() => onNavigate?.('planner')} style={{ background: 'linear-gradient(135deg, rgba(255,255,255,.75), rgba(255,232,163,.35))', border: '1px solid rgba(245,158,11,.35)', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', cursor: 'pointer', padding: '8px 10px', marginBottom: 8, flexShrink: 0, boxShadow: '0 2px 8px rgba(180,83,9,.08)' }}>
                  <IconBadge icon={AlertTriangle} tint="amber" />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#92400e' }}>ยังไม่ได้เปิดแผนผลิตวันนี้</div>
                    <div style={{ fontSize: 10.5, color: '#b45309' }}>เปิด Planner Control ก่อนเริ่มงาน →</div>
                  </div>
                </button>
              )}

              {!hasUrgent && urgent.planOpenedToday && (
                <div style={{ background: 'linear-gradient(135deg, rgba(255,255,255,.75), rgba(167,243,208,.3))', border: '1px solid rgba(5,150,105,.3)', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', fontSize: 12, fontWeight: 600, color: '#15803d', boxShadow: '0 2px 8px rgba(5,150,105,.08)' }}>
                  <IconBadge icon={PartyPopper} tint="green" />
                  ไม่มีอะไรต้องจัดการด่วนตอนนี้
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {headcountLow && (
                  <button onClick={() => onNavigate?.('workforce')} style={{ background: 'rgba(255,255,255,.8)', borderRadius: 14, textAlign: 'left', cursor: 'pointer', border: 'none', padding: 10, boxShadow: '0 2px 8px rgba(15,23,42,.05)', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}><IconBadge icon={Users} tint="red" /><span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>กำลังคนวันนี้ต่ำกว่าขั้นต่ำ</span></div>
                    <div style={{ fontSize: 11, color: '#334155' }}>คนแพ็กวันนี้ {headcount.count} คน (ขั้นต่ำ {MIN_HEADCOUNT})</div>
                    {headcount.names.length > 0 && <div style={{ fontSize: 10.5, color: '#6C6C80', marginTop: 2 }}>{headcount.names.join(', ')}</div>}
                  </button>
                )}
                {fgLowCount > 0 && (
                  <button onClick={() => onNavigate?.('planner')} style={{ background: 'rgba(255,255,255,.8)', borderRadius: 14, textAlign: 'left', cursor: 'pointer', border: 'none', padding: 10, boxShadow: '0 2px 8px rgba(15,23,42,.05)', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}><IconBadge icon={Boxes} tint="amber" /><span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>FG ใกล้หมด ({fgLowCount})</span></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {fg.low.map((it, i) => (
                        <div key={it.sku} style={rowStyle(i)}>
                          <span style={{ color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</span>
                          <span style={{ fontWeight: 700, color: '#b45309', textAlign: 'right' }}>{fmt(it.fg)} ชิ้น</span>
                        </div>
                      ))}
                    </div>
                  </button>
                )}
                {urgent.redAlerts.length > 0 && (
                  <button onClick={() => onNavigate?.('claims')} style={{ background: 'rgba(255,255,255,.8)', borderRadius: 14, textAlign: 'left', cursor: 'pointer', border: 'none', padding: 10, boxShadow: '0 2px 8px rgba(15,23,42,.05)', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}><IconBadge icon={AlertTriangle} tint="red" /><span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>สินค้าเคลมสูงผิดปกติ ({urgent.redAlerts.length})</span></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {urgent.redAlerts.map((a, i) => (
                        <div key={a.key} style={rowStyle(i)}>
                          <span style={{ color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.label}</span>
                          <span style={{ fontWeight: 700, color: '#dc2626', textAlign: 'right' }}>{a.rate}%</span>
                        </div>
                      ))}
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* ---- เช็คลิสต์รายวัน ---- */}
            <div style={{ ...glass, padding: '14px 16px', position: 'relative', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <Shine /><CardBubbles variant={2} /><Sparkles count={5} seed={4} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexShrink: 0 }}>
                <IconBadge icon={ClipboardCheck} tint="blue" />
                <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1C1C28' }}>เช็คลิสต์รายวัน</h3>
              </div>
              <ChecklistBody headcount={headcount} />
            </div>
          </div>
      </div>
    </div>
  )
}
