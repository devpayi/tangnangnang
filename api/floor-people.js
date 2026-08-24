// GET  /api/floor-people — รายชื่อทีมบ้านล่างที่แตงดูแล
// POST /api/floor-people { action: 'upsert'|'remove', ...fields }
import { getSheet, appendRows, overwriteSheet, ensureSheet } from './_lib/sheets.js'

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

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const rows = await loadAll()
      const includeInactive = req.query.includeInactive === '1'
      const people = rows
        .filter((r) => includeInactive || r.active === '1')
        .map((r) => ({ id: r.id, name: r.name, role: r.role, phone: r.phone, note: r.note, active: r.active === '1' }))
      return res.status(200).json({ success: true, people })
    }

    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' })
    const b = req.body || {}

    if (b.action === 'remove') {
      const id = String(b.id || '').trim()
      if (!id) return res.status(400).json({ success: false, error: 'ต้องระบุ id' })
      const rows = await loadAll()
      const next = rows.map((r) => (r.id === id ? { ...r, active: '', updated_at: new Date().toISOString() } : r))
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
