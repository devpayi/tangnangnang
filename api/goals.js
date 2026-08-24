// GET  /api/goals — เป้าหมาย 4 ตัว (อัตราเคลม, มูลค่าเคลม, feed fulfillment, stockout days) เทียบผลจริงเดือนนี้
// POST /api/goals { claim_rate_target, claim_value_target, feed_fulfillment_target, stockout_days_target }
import { getSheet, overwriteSheet, ensureSheet, batchGetValues } from './_lib/sheets.js'

const GOALS_SHEET = 'floor_goals'
const GOALS_HEADERS = ['month', 'claim_rate_target', 'claim_value_target', 'feed_fulfillment_target', 'stockout_days_target', 'updated_at', 'updated_by', 'review_note']

const num = (v) => parseFloat(String(v ?? '').replace(/,/g, '')) || 0
const round2 = (n) => Math.round(n * 100) / 100
const isCancelled = (s = '') => String(s).includes('ยกเลิก') || String(s).toLowerCase().includes('cancel')
const isReturned = (s = '') => String(s).toLowerCase().includes('return')

async function loadTargets(monthPrefix) {
  await ensureSheet(GOALS_SHEET, GOALS_HEADERS)
  const rows = await getSheet(GOALS_SHEET)
  return rows.find((r) => r.month === monthPrefix) || {}
}

// เคลม + มูลค่า + ยอดขาย(หน่วย) เดือนนี้ → อัตราเคลม = เคลม ÷ หน่วยขาย
async function claimActuals(monthPrefix) {
  const claims = await getSheet('claims')
  let count = 0, value = 0
  for (const c of claims) {
    if (!String(c.date || '').startsWith(monthPrefix)) continue
    count++
    value += num(c.claim_value)
  }
  // raw_orders tab ชื่อ raw_orders_YYYY_MM — สร้างชื่อ tab ตรงเดือนนี้ตรงๆ
  const tabName = `raw_orders_${monthPrefix.replace('-', '_')}`
  let units = 0
  try {
    const vr = await batchGetValues([`${tabName}!L:N`]) // L=qty, N=order_status (relative to full A:R, L index11,N index13 offset from L: L=0,M=1,N=2)
    const rows = vr[0].values || []
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i] || []
      const qty = parseInt(r[0], 10) || 0
      const status = r[2]
      if (isCancelled(status) || isReturned(status)) continue
      units += qty
    }
  } catch { /* เดือนนี้ยังไม่มี tab หรืออ่านไม่ได้ */ }
  const rate = units > 0 ? round2((count / units) * 100) : null
  return { count, value: round2(value), units, rate }
}

// feed fulfillment + stockout days จาก planner_daily เดือนนี้
async function plannerActuals(monthPrefix) {
  const rows = await getSheet('planner_daily')
  const thisMonth = rows.filter((r) => String(r.date || '').startsWith(monthPrefix))
  let fulfilled = 0, total = 0
  const stockoutDates = new Set()
  for (const r of thisMonth) {
    const recommended = num(r.recommended_feed)
    const planned = num(r.planned_feed)
    if (recommended <= 0) continue // ไม่ต้องฟีดวันนั้น ไม่นับเข้าตัวหาร
    total++
    if (planned >= recommended) fulfilled++
    else stockoutDates.add(r.date)
  }
  const fulfillmentPct = total > 0 ? round2((fulfilled / total) * 100) : null
  return { fulfillmentPct, stockoutDays: stockoutDates.size, totalFeedDays: total }
}

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      const b = req.body || {}
      const month = String(b.month || new Date().toISOString().slice(0, 7))
      await ensureSheet(GOALS_SHEET, GOALS_HEADERS)
      const rows = await getSheet(GOALS_SHEET)
      const existing = rows.find((r) => r.month === month)
      const record = {
        month,
        claim_rate_target: String(num(b.claim_rate_target)),
        claim_value_target: String(num(b.claim_value_target)),
        feed_fulfillment_target: String(num(b.feed_fulfillment_target)),
        stockout_days_target: String(num(b.stockout_days_target)),
        updated_at: new Date().toISOString(),
        updated_by: String(b.updated_by || '').trim() || 'แตง',
        // review_note ส่งมาก็อัปเดตตามนั้น ไม่ส่งมา (undefined) ก็คงของเดิมไว้ — กันฟอร์มตั้งเป้าทับข้อความรีวิวที่เคยเขียนไว้ทิ้งเงียบๆ
        review_note: b.review_note !== undefined ? String(b.review_note).trim() : (existing?.review_note || ''),
      }
      const idx = rows.findIndex((r) => r.month === month)
      const next = idx >= 0 ? rows.map((r, i) => (i === idx ? record : r)) : [...rows, record]
      await overwriteSheet(GOALS_SHEET, GOALS_HEADERS, next.map((r) => GOALS_HEADERS.map((h) => r[h] ?? '')))
      return res.status(200).json({ success: true, targets: record })
    }

    if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' })

    const monthPrefix = String(req.query.month || new Date().toISOString().slice(0, 7))
    const targets = await loadTargets(monthPrefix)
    const [claim, planner] = await Promise.all([claimActuals(monthPrefix), plannerActuals(monthPrefix)])

    res.status(200).json({
      success: true,
      month: monthPrefix,
      targets: {
        claimRate: num(targets.claim_rate_target) || null,
        claimValue: num(targets.claim_value_target) || null,
        feedFulfillment: num(targets.feed_fulfillment_target) || null,
        stockoutDays: num(targets.stockout_days_target) || null,
        reviewNote: targets.review_note || '',
      },
      actual: {
        claimRate: claim.rate,
        claimCount: claim.count,
        claimValue: claim.value,
        unitsSold: claim.units,
        feedFulfillment: planner.fulfillmentPct,
        stockoutDays: planner.stockoutDays,
        totalFeedDays: planner.totalFeedDays,
      },
    })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
}
