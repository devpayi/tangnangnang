import { ClipboardList, ExternalLink } from 'lucide-react'
import Sparkles from '../Sparkles.jsx'

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
    [{ size: 130, bottom: -40, right: -30, hue: 'purple' }, { size: 44, top: 14, left: -10, hue: 'white' }],
    [{ size: 70, top: -22, right: 30, hue: 'cyan' }, { size: 90, bottom: -30, left: -20, hue: 'silver' }],
  ]
  const s = sets[variant % sets.length]
  return <>{s.map((b, i) => <Bubble key={i} {...b} />)}</>
}

// เติม url จริงในนี้ได้เลย — ปล่อยว่าง [] ไว้ก่อนถ้ายังไม่มีลิงก์อ้างอิงสำหรับหัวข้อนั้น
// ตัวอย่าง: { label: 'คู่มือ OT ฉบับเต็ม (Google Doc)', url: 'https://docs.google.com/...' }
const SOP_SECTIONS = [
  {
    title: 'OT เฉลี่ยไม่เฟ้อ',
    points: [
      'ทุกครั้งที่เปิด OT ให้บันทึกไว้ว่า ทำอะไร, กี่ชั่วโมง, เสร็จอะไรบ้าง',
      'เทียบ OT เดือนนี้กับเดือนก่อน — ถ้าสูงขึ้นเรื่อยๆ โดยไม่มีเหตุผล (ไม่ใช่วันโปร/ของเข้าเยอะ) ต้องทบทวนว่าทำไม',
      'OT ควรมีเหตุผลชัดเจนเสมอ ไม่ใช่เปิดเป็นความเคยชิน',
    ],
    links: [
      { label: 'การบริหาร OT — ข้อดีและข้อเสียของการทำงานล่วงเวลา (มุมมองผู้บริหาร/หัวหน้างาน)', url: 'https://thaiwinner.com/overtime-management/' },
      { label: '8 วิธีง่ายๆ เพื่อลดเวลาทำงานล่วงเวลาของพนักงาน — ByteHR', url: 'https://byte-hr.com/th/blog/8%20%E0%B8%A7%E0%B8%B4%E0%B8%98%E0%B8%B5%E0%B8%87%E0%B9%88%E0%B8%B2%E0%B8%A2%20%E0%B9%86%20%E0%B9%80%E0%B8%9E%E0%B8%B7%E0%B9%88%E0%B8%AD%E0%B8%A5%E0%B8%94%E0%B9%80%E0%B8%A7%E0%B8%A5%E0%B8%B2%E0%B8%97%E0%B8%B3%E0%B8%87%E0%B8%B2%E0%B8%99%E0%B8%A5%E0%B9%88%E0%B8%A7%E0%B8%87%E0%B9%80%E0%B8%A7%E0%B8%A5%E0%B8%B2%E0%B8%82%E0%B8%AD%E0%B8%87%E0%B8%9E%E0%B8%99%E0%B8%B1%E0%B8%81%E0%B8%87%E0%B8%B2%E0%B8%99%20(%E0%B8%95%E0%B8%AD%E0%B8%99%E0%B8%97%E0%B8%B5%E0%B9%88%202)' },
    ],
  },
  {
    title: 'คนลางาน / สลับวัน ไม่ให้คนขาดแพค',
    points: [
      'ก่อนอนุมัติลา/สลับวัน เช็คว่าวันนั้นเหลือคนพอแพค ≥3 คนไหม',
      'ระวังเป็นพิเศษช่วงวันโปร (เช่น 11.11, double day) — คนสลับหยุดเกินวันละ 2 คน เสี่ยงคนไม่พอ',
      'ถ้าคนจะไม่พอ ต้องแพลนขอคนเพิ่มจากพี่หยกล่วงหน้าอย่างน้อย 3 วัน ไม่ใช่รอถึงวันแล้วค่อยขอ',
    ],
    links: [
      { label: '5 วิธีบริหารเวลาทำงานของพนักงาน — JobsDB', url: 'https://th.jobsdb.com/th/career-advice/article/%E0%B8%9A%E0%B8%A3%E0%B8%B4%E0%B8%AB%E0%B8%B2%E0%B8%A3%E0%B9%80%E0%B8%A7%E0%B8%A5%E0%B8%B2%E0%B8%97%E0%B8%B3%E0%B8%87%E0%B8%B2%E0%B8%99%E0%B8%9E%E0%B8%99%E0%B8%B1%E0%B8%81%E0%B8%87%E0%B8%B2%E0%B8%99' },
      { label: 'จัดกะพนักงานให้ลงตัว — HumanSoft', url: 'https://www.humansoft.co.th/th/blog/employee-shift-management-program' },
    ],
  },
  {
    title: 'กระจายงานให้เหมาะสม',
    points: [
      'แบ่งงานตามความถนัด เช่น ฟีด+ปัก แยกคนตามงานที่ทำได้ดี',
      'ดูปริมาณงานแต่ละจุดก่อนมอบหมาย ไม่ให้จุดใดจุดหนึ่งงานล้นจนคนอื่นว่าง',
    ],
    links: [
      { label: '10 เทคนิคกระจายงาน ให้ทีมสร้าง Impact เพิ่มเท่าตัว! — Skooldio', url: 'https://blog.skooldio.com/10-tips-delegate-management/' },
      { label: '5 เทคนิคการมอบหมายงานให้ลูกน้องอย่างมีประสิทธิภาพ', url: 'https://www.qhunter.co.th/ENG/articles-detail/5_techniques_for_effectively_assigning_work_to_subordinates.html' },
    ],
  },
  {
    title: 'บิลกรอบรูป + คุยกับป้าเรื่องส่งแมสแยกต่างๆ',
    points: [
      'เช็คบิลกรอบรูปให้ครบ ไม่ตกหล่น เหมือนของปลาใหญ่',
      'เรื่องส่งแมส (การแยกส่งเป็นล็อตต่างๆ) ต้องคุยกับป้าให้ตรงกันก่อนแพคจริง กันส่งผิดล็อต',
    ],
    links: [
      { label: '5 กลยุทธ์ ในการบริหารจัดการคลังสินค้าให้ตรงเวลาและมีประสิทธิภาพ', url: 'https://www.yasservices.co.th/yas-blog/warehouse-management/' },
      { label: 'การจัดการคลังสินค้าคืออะไร จัดอย่างไรให้มีประสิทธิภาพสูงสุด', url: 'https://www.mac5legacy.com/post/warehouse-management' },
    ],
  },
]

export default function Sop() {
  return (
    <div style={pageBg}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 13, background: 'linear-gradient(135deg, #8E75FF, #6E56CF)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(110,86,207,.3), inset 0 1px 0 rgba(255,255,255,.5)' }}>
          <ClipboardList size={19} color="#fff" />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#1C1C28' }}>SOP — แนวทางงานที่ต้องใช้วิจารณญาณ</h2>
          <div style={{ fontSize: 12.5, color: '#6C6C80', marginTop: 1 }}>ไม่ใช่เช็คลิสต์ติ๊กทุกวัน — เป็นหลักอ้างอิงเวลาต้องตัดสินใจ</div>
        </div>
      </div>

      {SOP_SECTIONS.map((s, idx) => (
        <div key={s.title} style={glass}>
          <Shine /><CardBubbles variant={idx} /><Sparkles count={4} seed={30 + idx} />
          <h3 style={{ margin: '0 0 12px', fontSize: 14.5, fontWeight: 700, color: '#1C1C28' }}>{s.title}</h3>
          <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 7 }}>
            {s.points.map((p, i) => <li key={i} style={{ fontSize: 13, color: '#3a3450', lineHeight: 1.65 }}>{p}</li>)}
          </ul>
          {s.links.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(148,120,207,.18)' }}>
              {s.links.map((l) => (
                <a
                  key={l.url}
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#6E56CF',
                    background: 'rgba(255,255,255,.7)', border: '1px solid #e1d5f7', borderRadius: 999, padding: '6px 12px',
                    textDecoration: 'none',
                  }}
                >
                  <ExternalLink size={12} /> {l.label}
                </a>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
