// GET  /api/events — ประวัติบันทึกเหตุการณ์รายรอบ (ล่าสุดก่อน)
// POST /api/events { type, detail, what_happened, problem, fix, result }
import { getSheet, appendRows, ensureSheet } from './_lib/sheets.js'

const SHEET = 'floor_events'
const HEADERS = ['id', 'date', 'type', 'detail', 'what_happened', 'problem', 'fix', 'result', 'created_at']

export const EVENT_TYPES = [
  { key: 'china_goods', label: 'ของจีนมาส่ง' },
  { key: 'frame_goods', label: 'กรอบรูปมาลงของ' },
  { key: 'ming_package', label: 'แพคเกจหมิงมาส่ง' },
  { key: 'box_delivery', label: 'ลังมาส่ง' },
  { key: 'termite_spray', label: 'ฉีดปลวกกันลัง' },
  { key: 'claim_item', label: 'ของเคลม (ป๊อก/แท่นยืน/กะลา)' },
  { key: 'need_more_people', label: 'ขอคนเพิ่มจากพี่หยก' },
  { key: 'promo_day', label: 'วันโปร/double day' },
]
const TYPE_KEYS = EVENT_TYPES.map((t) => t.key)

import { requireAuth } from './_lib/auth.js'
export default async function handler(req, res) {
  if (!requireAuth(req, res)) return
  try {
    if (req.method === 'GET') {
      await ensureSheet(SHEET, HEADERS)
      const rows = await getSheet(SHEET)
      const events = rows.slice(-100).reverse().map((r) => ({
        id: r.id, date: r.date, type: r.type, detail: r.detail,
        whatHappened: r.what_happened, problem: r.problem, fix: r.fix, result: r.result,
      }))
      return res.status(200).json({ success: true, events, types: EVENT_TYPES })
    }

    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' })
    const b = req.body || {}
    const type = String(b.type || '')
    if (!TYPE_KEYS.includes(type)) return res.status(400).json({ success: false, error: 'ไม่รู้จักประเภทนี้' })

    await ensureSheet(SHEET, HEADERS)
    const id = `ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
    const record = {
      id,
      date: String(b.date || new Date().toISOString().slice(0, 10)),
      type,
      detail: String(b.detail || '').trim(),
      what_happened: String(b.what_happened || '').trim(),
      problem: String(b.problem || '').trim(),
      fix: String(b.fix || '').trim(),
      result: String(b.result || '').trim(),
      created_at: new Date().toISOString(),
    }
    await appendRows(SHEET, [HEADERS.map((h) => record[h] ?? '')])
    res.status(200).json({ success: true, event: record })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
}
