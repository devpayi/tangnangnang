import { useState } from 'react'
import { LayoutDashboard, ClipboardList, TrendingUp, Target, Users, BookOpen, ClipboardPlus, CalendarClock, Gem } from 'lucide-react'
import Overview from './pages/Overview.jsx'
import ClaimsFull from './pages/ClaimsFull.jsx'
import PlannerControl from './pages/PlannerControl.jsx'
import FeedProducts from './pages/FeedProducts.jsx'
import Goals from './pages/Goals.jsx'
import FloorPeople from './pages/FloorPeople.jsx'
import Sop from './pages/Sop.jsx'
import EventLog from './pages/EventLog.jsx'
import WorkforceOT from './pages/WorkforceOT.jsx'
import Sparkles from './Sparkles.jsx'
import capybaraMascot from './assets/capybara-mascot.png'

// โหมดมือถือ (ClaimsPerformance.jsx) พักไว้ก่อน — ทำเว็บเดสก์ท็อปให้ครบทุกงานก่อน ค่อยกลับมาทำมือถือทีหลัง
const TABS = [
  { id: 'overview', label: 'สรุปภาพรวม', icon: LayoutDashboard },
  { id: 'claims', label: 'จัดการเคลม', icon: ClipboardList },
  { id: 'planner', label: 'Planner Control', icon: TrendingUp },
  { id: 'workforce', label: 'Manpower และ OT', icon: CalendarClock },
  { id: 'events', label: 'บันทึกเหตุการณ์', icon: ClipboardPlus },
  { id: 'sop', label: 'SOP', icon: BookOpen },
  { id: 'goals', label: 'เป้าหมาย', icon: Target },
  { id: 'people', label: 'คนบ้านล่าง', icon: Users },
]

const PLANNER_SUBTABS = [['planner', 'แพลนฟีด'], ['feed', 'สินค้าที่ต้องฟีด']]

export default function App() {
  const [tab, setTab] = useState('overview')
  const [plannerSub, setPlannerSub] = useState('planner')
  return (
    <div style={{
      display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'Segoe UI', Inter, system-ui, sans-serif",
      background: `
        radial-gradient(circle at 8% 12%, rgba(216,204,255,.32), transparent 38%),
        radial-gradient(circle at 92% 8%, rgba(255,181,240,.24), transparent 40%),
        radial-gradient(circle at 85% 90%, rgba(226,215,245,.26), transparent 42%),
        linear-gradient(160deg, #F6F1FF 0%, #FBF0FA 50%, #F3EEFC 100%)
      `,
    }}>
      <aside style={{ width: 220, flexShrink: 0, height: '100%', position: 'relative', overflow: 'hidden', zIndex: 0, background: 'linear-gradient(160deg, rgba(255,255,255,.85) 0%, rgba(233,222,255,.55) 55%, rgba(255,222,247,.35) 100%)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', borderRight: '1px solid rgba(255,255,255,.9)', boxShadow: '1px 0 0 rgba(255,255,255,.9) inset, 4px 0 28px rgba(196,164,255,.18)', padding: '18px 12px', display: 'flex', flexDirection: 'column', gap: 4, boxSizing: 'border-box' }}>
        <div style={{ position: 'absolute', width: 120, height: 120, borderRadius: '50%', top: -40, right: -40, background: 'radial-gradient(circle at 32% 28%, rgba(255,181,240,.35), transparent 72%)', filter: 'blur(1px)', pointerEvents: 'none', zIndex: -1 }} />
        <Sparkles count={7} seed={0} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px 14px', position: 'relative', zIndex: 1 }}>
          <div style={{ width: 34, height: 34, borderRadius: 11, background: 'linear-gradient(135deg, #8E75FF, #6E56CF)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(110,86,207,.35), inset 0 1px 0 rgba(255,255,255,.5)' }}>
            <Gem size={16} color="#fff" strokeWidth={2.2} />
          </div>
          <div>
            <div className="chrome-text" style={{ fontSize: 16, fontWeight: 800, letterSpacing: '.2px' }}>PAYI Floor</div>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#6C6C80', marginTop: 1 }}>ของแตง</div>
          </div>
        </div>
        <div style={{ padding: '0 8px 16px', position: 'relative', zIndex: 1 }}>
          <span className="payi-status-pill"><span className="payi-status-dot" />ระบบทำงานปกติ</span>
        </div>
        {TABS.map((t) => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', position: 'relative', zIndex: 1,
                border: 'none', borderRadius: 14, padding: '10px 12px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                background: active ? 'linear-gradient(135deg, #8E75FF, #6E56CF)' : 'transparent',
                boxShadow: active ? '0 6px 16px rgba(110,86,207,.32), inset 0 1px 0 rgba(255,255,255,.35)' : 'none',
                color: active ? '#fff' : '#334155',
                transition: 'background .15s ease, box-shadow .15s ease',
              }}
            >
              <Icon size={17} />
              {t.label}
            </button>
          )
        })}

        {/* มาสคอตคาปิบาร่า ตัวใหญ่เต็มพื้นที่ว่างด้านล่าง sidebar */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
          <img
            src={capybaraMascot}
            alt="คาปิบาร่ามาสคอต"
            style={{ width: '82%', maxWidth: 180, height: 'auto', filter: 'drop-shadow(0 10px 22px rgba(110,86,207,.28))' }}
          />
        </div>
        <div style={{ flexShrink: 0, textAlign: 'center', padding: '0 10px 6px', position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: '#334155' }}>สู้ๆ นะวันนี้</div>
          <div style={{ fontSize: 10.5, fontWeight: 500, color: '#6C6C80', marginTop: 1 }}>คาปิบาร่าเป็นกำลังใจให้</div>
        </div>
      </aside>
      <main style={{ flex: 1, minWidth: 0, height: '100%', overflowY: 'auto', background: '#F8F3FC' }}>
        {tab === 'overview' && <Overview onNavigate={setTab} />}
        {tab === 'claims' && <ClaimsFull />}
        {tab === 'planner' && (
          <div>
            <div style={{ display: 'flex', gap: 8, padding: '14px 20px 0' }}>
              {PLANNER_SUBTABS.map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setPlannerSub(id)}
                  style={{
                    border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    background: plannerSub === id ? 'linear-gradient(135deg, #8E75FF, #6E56CF)' : '#ece4f8', color: plannerSub === id ? '#fff' : '#5c5578',
                    boxShadow: plannerSub === id ? '0 6px 14px rgba(110,86,207,.28)' : 'none',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {plannerSub === 'planner' ? <PlannerControl /> : <FeedProducts />}
          </div>
        )}
        {tab === 'workforce' && <WorkforceOT />}
        {tab === 'events' && <EventLog />}
        {tab === 'sop' && <Sop />}
        {tab === 'goals' && <Goals />}
        {tab === 'people' && <FloorPeople />}
      </main>
    </div>
  )
}
