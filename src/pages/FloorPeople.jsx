import { useEffect, useState } from 'react'
import { Trash2, UserPlus, Users, Pencil, Check, X } from 'lucide-react'
import Sparkles from '../Sparkles.jsx'
import EmptyState from '../EmptyState.jsx'

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

export default function FloorPeople() {
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', role: '', phone: '', note: '' })
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', role: '', phone: '', note: '' })
  const [editSaving, setEditSaving] = useState(false)

  const load = () => {
    setLoading(true)
    fetch('/api/floor-people')
      .then((r) => r.json())
      .then((d) => { if (d.success) { setPeople(d.people); setError('') } else setError(d.error) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const addPerson = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/floor-people', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const d = await res.json()
      if (!d.success) throw new Error(d.error)
      setForm({ name: '', role: '', phone: '', note: '' })
      load()
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  const startEdit = (p) => { setEditingId(p.id); setEditForm({ name: p.name, role: p.role, phone: p.phone, note: p.note }) }
  const cancelEdit = () => setEditingId(null)

  const saveEdit = async (id) => {
    if (!editForm.name.trim()) return
    setEditSaving(true)
    try {
      const res = await fetch('/api/floor-people', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...editForm }) })
      const d = await res.json()
      if (!d.success) throw new Error(d.error)
      setEditingId(null)
      load()
    } catch (e) { setError(e.message) } finally { setEditSaving(false) }
  }

  const removePerson = async (id, name) => {
    try {
      const res = await fetch('/api/floor-people', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'remove', id, name }) })
      const d = await res.json()
      if (!d.success) throw new Error(d.error)
      load()
    } catch (e) { setError(e.message) }
  }

  return (
    <div style={pageBg}>
      {/* ---- หัวเรื่อง ---- */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 13, background: 'linear-gradient(135deg, #8E75FF, #6E56CF)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(110,86,207,.3), inset 0 1px 0 rgba(255,255,255,.5)' }}>
          <Users size={19} color="#fff" />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#1C1C28' }}>คนบ้านล่าง</h2>
          <div style={{ fontSize: 12.5, color: '#6C6C80', marginTop: 1 }}>ทีมที่แตงดูแล — รายชื่อ · ตำแหน่ง · เบอร์ติดต่อ</div>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 14, background: 'rgba(255,255,255,.7)', border: '1px solid rgba(225,29,72,.3)', color: '#dc2626', fontSize: 13, fontWeight: 600 }}>
          เกิดข้อผิดพลาด: {error}
        </div>
      )}

      {/* ---- เพิ่มคน ---- */}
      <div style={glass}>
        <Shine />
        <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, color: '#1C1C28' }}>
          <UserPlus size={16} color="#6E56CF" /> เพิ่มคน
        </h3>
        <form onSubmit={addPerson} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.5fr auto', gap: 12, alignItems: 'end' }}>
          <label style={labelStyle}>ชื่อ
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} />
          </label>
          <label style={labelStyle}>ตำแหน่ง
            <input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} style={inputStyle} placeholder="เช่น แพ็ค, ผลิต" />
          </label>
          <label style={labelStyle}>เบอร์โทร
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={inputStyle} />
          </label>
          <label style={labelStyle}>โน้ต
            <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} style={inputStyle} />
          </label>
          <button
            type="submit"
            disabled={saving}
            style={{
              background: 'linear-gradient(135deg, #8E75FF, #6E56CF)', color: '#fff', border: 'none', borderRadius: 12,
              padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', height: 38,
              boxShadow: '0 6px 16px rgba(110,86,207,.32), inset 0 1px 0 rgba(255,255,255,.35)',
            }}
          >
            {saving ? '...' : '+ เพิ่ม'}
          </button>
        </form>
      </div>

      {/* ---- รายชื่อทั้งหมด ---- */}
      <div style={{ ...glass, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Shine /><Sparkles count={6} seed={7} />
        <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#1C1C28' }}>รายชื่อทั้งหมด ({loading ? '—' : people.length} คน)</h3>
        {loading ? (
          <EmptyState title="กำลังโหลดรายชื่อ..." />
        ) : people.length === 0 ? (
          <EmptyState title="ยังไม่มีรายชื่อ" subtitle="เพิ่มคนแรกได้จากฟอร์มด้านบนเลย" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', color: '#6E56CF', fontSize: 11, fontWeight: 700, padding: '0 12px 4px' }}>ชื่อ</th>
                  <th style={{ textAlign: 'left', color: '#6E56CF', fontSize: 11, fontWeight: 700, padding: '0 12px 4px' }}>ตำแหน่ง</th>
                  <th style={{ textAlign: 'left', color: '#6E56CF', fontSize: 11, fontWeight: 700, padding: '0 12px 4px' }}>เบอร์โทร</th>
                  <th style={{ textAlign: 'left', color: '#6E56CF', fontSize: 11, fontWeight: 700, padding: '0 12px 4px' }}>โน้ต</th>
                  <th style={{ padding: '0 12px 4px' }}></th>
                </tr>
              </thead>
              <tbody>
                {people.map((p, i) => {
                  const isEditing = editingId === p.id
                  return (
                    <tr key={p.id} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.28)' }}>
                      {isEditing ? (
                        <>
                          <td style={{ padding: '6px 8px', borderRadius: '10px 0 0 10px' }}>
                            <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} style={{ ...inputStyle, width: '100%', padding: '5px 8px' }} />
                          </td>
                          <td style={{ padding: '6px 8px' }}>
                            <input value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} style={{ ...inputStyle, width: '100%', padding: '5px 8px' }} />
                          </td>
                          <td style={{ padding: '6px 8px' }}>
                            <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} style={{ ...inputStyle, width: '100%', padding: '5px 8px' }} />
                          </td>
                          <td style={{ padding: '6px 8px' }}>
                            <input value={editForm.note} onChange={(e) => setEditForm({ ...editForm, note: e.target.value })} style={{ ...inputStyle, width: '100%', padding: '5px 8px' }} />
                          </td>
                          <td style={{ padding: '6px 8px', borderRadius: '0 10px 10px 0', display: 'flex', gap: 6 }}>
                            <button onClick={() => saveEdit(p.id)} disabled={editSaving} style={{ background: 'rgba(255,255,255,.6)', border: '1px solid rgba(4,120,87,.35)', color: '#047857', borderRadius: 10, padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                              <Check size={13} />
                            </button>
                            <button onClick={cancelEdit} style={{ background: 'rgba(255,255,255,.6)', border: '1px solid #e1d5f7', color: '#6C6C80', borderRadius: 10, padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                              <X size={13} />
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: '10px 12px', borderRadius: '10px 0 0 10px', fontWeight: 700, color: '#1C1C28' }}>{p.name}</td>
                          <td style={{ padding: '10px 12px', color: '#4a4560' }}>{p.role || '-'}</td>
                          <td style={{ padding: '10px 12px', color: '#4a4560' }}>{p.phone || '-'}</td>
                          <td style={{ padding: '10px 12px', color: '#6C6C80' }}>{p.note || '-'}</td>
                          <td style={{ padding: '10px 12px', borderRadius: '0 10px 10px 0', display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => startEdit(p)}
                              style={{
                                background: 'rgba(255,255,255,.6)', border: '1px solid rgba(110,86,207,.35)', color: '#6E56CF',
                                borderRadius: 10, padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600,
                              }}
                            >
                              <Pencil size={13} /> แก้ไข
                            </button>
                            <button
                              onClick={() => removePerson(p.id, p.name)}
                              style={{
                                background: 'rgba(255,255,255,.6)', border: '1px solid rgba(225,29,72,.35)', color: '#dc2626',
                                borderRadius: 10, padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600,
                              }}
                            >
                              <Trash2 size={13} /> ลบ
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
