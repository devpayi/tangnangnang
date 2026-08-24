// GET  /api/floor-people — รายชื่อทีมบ้านล่างที่แตงดูแล
//      base list ดึงจาก workforce_people อัตโนมัติ (ทุกคนยกเว้นออฟฟิศ — คนแพ็ก/คนฟีด/พาร์ทไทม์/อื่นๆ)
//      floor_people sheet เก็บแค่ส่วนเสริม (เบอร์โทร/โน้ต/บทบาทที่แก้เอง) key ด้วย id = code เดียวกับ workforce_people
//      คนที่ไม่ได้อยู่ใน workforce_people (เช่น contact ภายนอก) ยังเพิ่มเองผ่าน POST ได้ตามปกติ (id สุ่ม)
import { getSheet, appendRows, overwriteSheet, ensureSheet } from './_lib/sheets.js'
import { getPersonMap } from './_lib/workforce.js'

const SHEET = 'floor_people'
const HEADERS = ['id', 'name', 'role', 'phone', 'note', 'active', 'created_at', 'updated_at']
const genId = () => `fp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
// Sheets (USER_ENTERED) มองเบอร์โทรที่ขึ้นต้นด้วย 0 เป็นตัวเลข แล้วตัดเลข 0 นำหน้าทิ้ง — บังคับ text ด้วย '
const forceText = (v) => { const s = String(v ?? ''); return s ? `'${s}` : s }

async function loadAll() {
  await ensureSheet(SHEET, HEADERS)
  return getSheet(SHEET)
}

const toRow = (r) => HEADERS.map((h) => (h === 'phone' ? forceText(r[h]) : (r[h] ?? '')))

import { requireAuth } from './_lib/auth.js'
export default async function handler(req, res) {
  if (!requireAuth(req, res)) return
  try {
    if (req.method === 'GET') {
      const [personMap, floorRows] = await Promise.all([getPersonMap().catch(() => ({})), loadAll()])
      const overrideByCode = new Map(floorRows.map((r) => [r.id, r]))
      const includeInactive = req.query.includeInactive === '1'
      const roster = Object.entries(personMap).map(([code, [name, group]]) => {
        const o = overrideByCode.get(code)
        return { id: code, name: o?.name || name, role: o?.role || group, phone: o?.phone || '', note: o?.note || '', active: o ? o.active === '1' : true }
      })
      const extra = floorRows.filter((r) => r.id && !personMap[r.id]).map((r) => ({ id: r.id, name: r.name, role: r.role, phone: r.phone, note: r.note, active: r.active === '1' }))
      const people = [...roster, ...extra].filter((p) => includeInactive || p.active)
      return res.status(200).json({ success: true, people })
    }

    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' })
    const b = req.body || {}

    if (b.action === 'remove') {
      const id = String(b.id || '').trim()
      if (!id) return res.status(400).json({ success: false, error: 'ต้องระบุ id' })
      const rows = await loadAll()
      const now = new Date().toISOString()
      const exists = rows.some((r) => r.id === id)
      // id อาจเป็น code จาก workforce_people ที่ยังไม่เคยมี override row ใน floor_people มาก่อน (roster ล้วนๆ)
      // ต้อง append แถว inactive ใหม่แทนการ map เฉยๆ ไม่งั้นจะ no-op เงียบๆ แล้วคนนั้นยังโผล่อยู่ (มาจาก personMap ใน GET)
      const next = exists
        ? rows.map((r) => (r.id === id ? { ...r, active: '', updated_at: now } : r))
        : [...rows, { id, name: String(b.name || id), role: '', phone: '', note: '', active: '', created_at: now, updated_at: now }]
      await overwriteSheet(SHEET, HEADERS, next.map(toRow))
      return res.status(200).json({ success: true })
    }

    // upsert (default)
    const name = String(b.name || '').trim()
    if (!name) return res.status(400).json({ success: false, error: 'ต้องระบุชื่อ' })
    const rows = await loadAll()
    const id = String(b.id || '').trim() || genId()
    const idx = rows.findIndex((r) => r.id === id)
    const now = new Date().toISOString()
    const record = {
      id, name,
      role: String(b.role || '').trim(),
      phone: String(b.phone || '').trim(),
      note: String(b.note || '').trim(),
      active: '1',
      created_at: idx >= 0 ? rows[idx].created_at : now,
      updated_at: now,
    }
    const next = idx >= 0 ? rows.map((r, i) => (i === idx ? record : r)) : [...rows, record]
    await overwriteSheet(SHEET, HEADERS, next.map(toRow))
    res.status(200).json({ success: true, person: record })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
}
