// GET  /api/checklist?date=YYYY-MM-DD — เช็คลิสต์รายวัน (รีเซ็ตทุกวัน)
// POST /api/checklist { date, key, checked } — สลับติ๊กรายการ boolean
// POST /api/checklist { date, headcount_today } — บันทึกจำนวนคนแพควันนี้
import { getSheet, overwriteSheet, ensureSheet } from './_lib/sheets.js'

const SHEET = 'floor_checklist'
// รายการ checklist ทั้งหมด (boolean) — เพิ่มรายการใหม่ต่อท้ายเป็นชุดใหม่เสมอ ห้ามแทรกกลาง
// (แต่ละชุดเก็บตำแหน่ง column เดิมไว้ กัน header ขยับทับข้อมูลเก่า)
const BOOL_ITEMS_V1 = ['truck_access', 'cone_placement', 'billing_cutoff']
const BOOL_ITEMS_V2 = ['no_pending_bills']
const BOOL_ITEMS_V3 = ['feed_quality_ok']
const ALL_BOOL_ITEMS = [...BOOL_ITEMS_V1, ...BOOL_ITEMS_V2, ...BOOL_ITEMS_V3]
const NUMBER_FIELDS = ['headcount_today'] // จำนวนคนแพควันนี้ — ไม่ใช่ boolean กรอกเป็นตัวเลข
const HEADERS = ['date', ...BOOL_ITEMS_V1, 'updated_at', ...BOOL_ITEMS_V2, ...BOOL_ITEMS_V3, ...NUMBER_FIELDS]
const MIN_HEADCOUNT = 3 // จากเอกสาร "คนพอแพคอย่างน้อยวันละ 3 คน"

async function loadDay(date) {
  await ensureSheet(SHEET, HEADERS)
  const rows = await getSheet(SHEET)
  return rows.find((r) => r.date === date) || { date }
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const date = String(req.query.date || new Date().toISOString().slice(0, 10))
      const row = await loadDay(date)
      const checked = Object.fromEntries(ALL_BOOL_ITEMS.map((k) => [k, row[k] === '1']))
      const headcountToday = row.headcount_today ? Number(row.headcount_today) : null
      return res.status(200).json({ success: true, date, checked, headcountToday, minHeadcount: MIN_HEADCOUNT })
    }

    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' })
    const b = req.body || {}
    const date = String(b.date || new Date().toISOString().slice(0, 10))

    await ensureSheet(SHEET, HEADERS)
    const rows = await getSheet(SHEET)
    const idx = rows.findIndex((r) => r.date === date)
    const base = idx >= 0 ? rows[idx] : { date }

    let record
    if (b.headcount_today !== undefined) {
      record = { ...base, date, headcount_today: String(Math.max(0, Number(b.headcount_today) || 0)), updated_at: new Date().toISOString() }
    } else {
      const key = String(b.key || '')
      if (!ALL_BOOL_ITEMS.includes(key)) return res.status(400).json({ success: false, error: 'ไม่รู้จักรายการนี้' })
      record = { ...base, date, [key]: b.checked ? '1' : '', updated_at: new Date().toISOString() }
    }

    const next = idx >= 0 ? rows.map((r, i) => (i === idx ? record : r)) : [...rows, record]
    await overwriteSheet(SHEET, HEADERS, next.map((r) => HEADERS.map((h) => r[h] ?? '')))
    const checked = Object.fromEntries(ALL_BOOL_ITEMS.map((k) => [k, record[k] === '1']))
    const headcountToday = record.headcount_today ? Number(record.headcount_today) : null
    res.status(200).json({ success: true, date, checked, headcountToday, minHeadcount: MIN_HEADCOUNT })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
}
