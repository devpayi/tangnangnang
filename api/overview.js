// GET /api/overview — Performance เดือนนี้ (เป้า vs จริง) + งานที่ต้องจัดการด่วน
import { getSheet, getMetaCached, batchGetValues } from './_lib/sheets.js'
import { deriveGroup, buildOverrideMap } from './_lib/productGroup.js'
import { getSkuRedirectMap, getSetRecipeKeySet, resolveSalesSku, resolveRedirect } from './_lib/skuMapping.js'
import { computeSalesStats } from './planner-sales.js'

const num = (v) => parseFloat(String(v ?? '').replace(/,/g, '')) || 0
const round2 = (n) => Math.round(n * 100) / 100
const isCancelled = (s = '') => String(s).includes('ยกเลิก') || String(s).toLowerCase().includes('cancel')
const isReturned = (s = '') => String(s).toLowerCase().includes('return')

const RED = 1.0
const MIN_UNITS = 100

// ── เตือนวันโปรเลขเบิ้ล (9.9 / 11.11 / 12.12 ...) — โผล่เฉพาะตอนใกล้ + ทำนายทีมเลิกงานดึก ──
// สมมติทีมแพ็ค 4 คน เข้า 8:00 เลิกปกติ ~14:30 (6.5 ชม.) เพดานที่รับได้ 17:00
const PACK = { start: 8, normalHours: 6.5, maxFinish: 17 }
const isCampaignDate = (d) => { const [, m, dd] = String(d).split('-'); return m && dd && m === dd }
const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)] }
const hhmm = (h) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`

async function computeCampaignAlert() {
  const meta = await getMetaCached()
  const tabs = meta.sheets.map((s) => s.properties.title).filter((t) => t.startsWith('raw_orders'))
  if (!tabs.length) return null
  const vr = await batchGetValues(tabs.flatMap((t) => [`${t}!B:B`, `${t}!D:D`]))
  const seen = new Set(); const byDay = new Map()
  for (let i = 0; i < tabs.length; i++) {
    const ids = vr[i * 2].values || [], dates = vr[i * 2 + 1].values || []
    for (let j = 1; j < Math.max(ids.length, dates.length); j++) {
      const id = String((ids[j] || [])[0] || '').replace(/^'/, '').trim()
      const date = String((dates[j] || [])[0] || '').slice(0, 10)
      if (!id || !date || seen.has(id)) continue          // นับทุกออเดอร์ (รวมยกเลิก = งานที่แพ็คไปแล้ว)
      seen.add(id)
      byDay.set(date, (byDay.get(date) || 0) + 1)
    }
  }
  const dates = [...byDay.keys()].sort()
  if (dates.length < 20) return null
  const dnum = (s) => new Date(s).getTime() / 86400000
  const campNums = dates.filter(isCampaignDate).map(dnum)
  const nearCamp = (n) => campNums.some((c) => Math.abs(c - n) <= 2)

  const mults = []
  for (const d of dates.filter(isCampaignDate)) {
    const c = dnum(d)
    const base = dates.filter((x) => { const xn = dnum(x); return Math.abs(xn - c) >= 3 && Math.abs(xn - c) <= 12 && !nearCamp(xn) }).map((x) => byDay.get(x)).sort((a, b) => a - b)
    if (base.length < 4) continue
    const b = base[Math.floor(base.length / 2)]
    if (b) mults.push(Math.round((byDay.get(d) / b) * 100) / 100)
  }
  const mult = median(mults.slice(-4).length >= 3 ? mults.slice(-4) : mults)
  if (!mult) return null

  const recent = dates.slice(-30).map((x) => byDay.get(x))
  const recentAvg = Math.round(recent.reduce((a, b) => a + b, 0) / recent.length)

  const todayStr = new Date().toISOString().slice(0, 10)
  const y = +todayStr.slice(0, 4)
  let next = null
  for (const yy of [y, y + 1]) for (let mm = 1; mm <= 12; mm++) {
    const s = `${yy}-${String(mm).padStart(2, '0')}-${String(mm).padStart(2, '0')}`
    if (s >= todayStr && (!next || s < next)) next = s
  }
  if (!next) return null
  const daysUntil = Math.round((new Date(next) - new Date(todayStr)) / 86400000)
  const finishH = PACK.start + PACK.normalHours * mult
  if (daysUntil > 7 || finishH <= PACK.maxFinish) return null   // โผล่เฉพาะใกล้ + จะเลิกดึก

  return {
    date: next, daysUntil, multiplier: mult,
    predictedOrders: Math.round(recentAvg * mult),
    finish: hhmm(finishH),
  }
}
let campaignCache = { date: null, promise: null }
function getCampaignAlertCached(today) {
  if (campaignCache.date === today && campaignCache.promise) return campaignCache.promise
  const p = computeCampaignAlert().catch(() => null)
  campaignCache = { date: today, promise: p }
  return p
}

// ---- แคช redAlerts (สินค้าเคลมสูงผิดปกติ) เป็นรายวัน ----
// ส่วนนี้ต้องสแกนออเดอร์ย้อนหลัง "ทุกเดือน" ซึ่งหนักที่สุดในหน้าแรก แต่ตัวเลขไม่จำเป็นต้องเรียลไทม์
// (เคลม/ยอดขายสะสมไม่เปลี่ยนเร็วขนาดนั้น) เลยคำนวณครั้งเดียวต่อวัน แล้วใช้ซ้ำตลอดวันนั้น
// หมายเหตุ: แคชนี้อยู่ใน memory ของ server จะรีเซ็ตเมื่อ serverless function cold start ใหม่ (เหมือนแคชอื่นๆ ใน sheets.js)
let redAlertsCache = { date: null, promise: null }

async function computeRedAlerts(claims) {
  const [overrideMap, [redirectMap, recipeKeySet], meta] = await Promise.all([
    getSheet('product_aliases').then(buildOverrideMap).catch(() => new Map()),
    Promise.all([getSkuRedirectMap(), getSetRecipeKeySet()]),
    getMetaCached(),
  ])
  const tabs = meta.sheets.map((s) => s.properties.title).filter((t) => t.startsWith('raw_orders'))
  const vr2 = await batchGetValues(tabs.map((t) => `${t}!I:N`))
  const unitsByGroup = new Map()
  for (let i = 0; i < tabs.length; i++) {
    const rows = vr2[i].values || []
    for (let j = 1; j < rows.length; j++) {
      const r = rows[j] || []
      const variationName = r[0], rawMasterSku = r[1], name = r[2], qty = parseInt(r[3], 10) || 0, status = r[5]
      if (isCancelled(status) || isReturned(status)) continue
      const masterSku = resolveSalesSku(rawMasterSku, variationName, redirectMap, recipeKeySet)
      const { key } = deriveGroup(name, masterSku, overrideMap)
      unitsByGroup.set(key, (unitsByGroup.get(key) || 0) + qty)
    }
  }
  const claimsByGroup = new Map()
  for (const c of claims) {
    const claimSku = resolveRedirect(c.master_sku, redirectMap) || c.master_sku
    const { key, label } = deriveGroup(c.display_name || c.product_name, claimSku, overrideMap)
    const x = claimsByGroup.get(key) || { key, label, claims: 0 }
    x.claims++
    claimsByGroup.set(key, x)
  }
  return [...claimsByGroup.values()]
    .map((x) => {
      const units = unitsByGroup.get(x.key) || 0
      const rate = units > 0 ? round2((x.claims / units) * 100) : null
      return { ...x, units, rate }
    })
    .filter((x) => x.units >= MIN_UNITS && x.rate != null && x.rate >= RED)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 5)
}

async function getRedAlertsCached(today, claims) {
  if (redAlertsCache.date === today && redAlertsCache.promise) return redAlertsCache.promise
  const p = computeRedAlerts(claims).catch((e) => {
    redAlertsCache = { date: null, promise: null } // คำนวณพลาด — ล้างแคช ให้ลองใหม่ครั้งหน้า
    throw e
  })
  redAlertsCache = { date: today, promise: p }
  return p
}

import { requireAuth } from './_lib/auth.js'
export default async function handler(req, res) {
  if (!requireAuth(req, res)) return
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' })
  try {
    const today = new Date().toISOString().slice(0, 10)
    const monthPrefix = today.slice(0, 7)
    const tabName = `raw_orders_${monthPrefix.replace('-', '_')}`

    // เดือนก่อนหน้า (สำหรับเทียบ MoM บนการ์ด Performance)
    const prevMonthDate = new Date(`${monthPrefix}-01T00:00:00.000Z`)
    prevMonthDate.setUTCMonth(prevMonthDate.getUTCMonth() - 1)
    const prevMonthPrefix = prevMonthDate.toISOString().slice(0, 7)
    const prevTabName = `raw_orders_${prevMonthPrefix.replace('-', '_')}`

    const countUnits = async (tab) => {
      try {
        const vr = await batchGetValues([`${tab}!L:N`])
        const rows = vr[0].values || []
        let sum = 0
        for (let i = 1; i < rows.length; i++) {
          const r = rows[i] || []
          if (isCancelled(r[2]) || isReturned(r[2])) continue
          sum += parseInt(r[0], 10) || 0
        }
        return sum
      } catch {
        return 0 // ยังไม่มี tab เดือนนั้น
      }
    }

    // ---- ดึงข้อมูลที่ไม่ต้องรอกัน พร้อมกันทีเดียว (เดิมรอทีละอย่าง ทำให้หน้าแรกโหลดช้า) ----
    const [goalsRows, claims, unitsSold, unitsSoldPrev, daily, salesStats, fgConfig] = await Promise.all([
      getSheet('floor_goals').catch(() => []),
      getSheet('claims'),
      countUnits(tabName),
      countUnits(prevTabName),
      getSheet('planner_daily'),
      computeSalesStats(90),
      getSheet('planner_config'),
    ])

    // redAlerts คำนวณครั้งเดียวต่อวัน (ดูคอมเมนต์ที่ redAlertsCache ด้านบน) — คำขอถัดๆ ไปในวันเดียวกันจะได้ผลลัพธ์ที่แคชไว้ทันที
    const redAlerts = await getRedAlertsCached(today, claims)
    const campaignAlert = await getCampaignAlertCached(today)

    // ---- Performance: เป้า vs จริงเดือนนี้ (ย่อจาก /api/goals) ----
    const monthGoal = goalsRows.find((g) => g.month === monthPrefix) || {}
    const claimsThisMonth = claims.filter((c) => String(c.date || '').startsWith(monthPrefix))
    const claimCount = claimsThisMonth.length
    const claimValue = round2(claimsThisMonth.reduce((s, c) => s + num(c.claim_value), 0))
    const claimRate = unitsSold > 0 ? round2((claimCount / unitsSold) * 100) : null

    const dailyThisMonth = daily.filter((r) => String(r.date || '').startsWith(monthPrefix))
    let fulfilled = 0, total = 0
    const stockoutDates = new Set()
    for (const r of dailyThisMonth) {
      const recommended = num(r.recommended_feed), planned = num(r.planned_feed)
      if (recommended <= 0) continue
      total++
      if (planned >= recommended) fulfilled++
      else stockoutDates.add(r.date)
    }
    const feedFulfillment = total > 0 ? round2((fulfilled / total) * 100) : null

    // ---- ตัวเลขเดือนก่อนหน้า (สำหรับเทียบ % ขึ้นลง MoM บนการ์ด) ----
    const claimsPrevMonth = claims.filter((c) => String(c.date || '').startsWith(prevMonthPrefix))
    const claimCountPrev = claimsPrevMonth.length
    const claimValuePrev = round2(claimsPrevMonth.reduce((s, c) => s + num(c.claim_value), 0))
    const claimRatePrev = unitsSoldPrev > 0 ? round2((claimCountPrev / unitsSoldPrev) * 100) : null

    const dailyPrevMonth = daily.filter((r) => String(r.date || '').startsWith(prevMonthPrefix))
    let fulfilledPrev = 0, totalPrev = 0
    const stockoutDatesPrev = new Set()
    for (const r of dailyPrevMonth) {
      const recommended = num(r.recommended_feed), planned = num(r.planned_feed)
      if (recommended <= 0) continue
      totalPrev++
      if (planned >= recommended) fulfilledPrev++
      else stockoutDatesPrev.add(r.date)
    }
    const feedFulfillmentPrev = totalPrev > 0 ? round2((fulfilledPrev / totalPrev) * 100) : null

    // % เปลี่ยนแปลงเทียบเดือนก่อน — เดือนก่อนเป็น 0 พอดีเทียบเป็น % ไม่ได้ความหมาย (หารศูนย์) จึงคืน null แทน
    const momPercent = (actual, prev) => {
      if (actual == null || prev == null) return null
      if (prev === 0) return actual === 0 ? 0 : null
      return round2(((actual - prev) / prev) * 100)
    }

    const performance = {
      claimRate: { actual: claimRate, target: num(monthGoal.claim_rate_target) || null, mom: momPercent(claimRate, claimRatePrev) },
      claimValue: { actual: claimValue, target: num(monthGoal.claim_value_target) || null, mom: momPercent(claimValue, claimValuePrev) },
      feedFulfillment: { actual: feedFulfillment, target: num(monthGoal.feed_fulfillment_target) || null, mom: momPercent(feedFulfillment, feedFulfillmentPrev) },
      stockoutDays: { actual: stockoutDates.size, target: num(monthGoal.stockout_days_target) || null, mom: momPercent(stockoutDates.size, stockoutDatesPrev.size) },
    }

    const todayRows = daily.filter((r) => r.date === today)
    const nameBySku = new Map(salesStats.productMapping.map((p) => [p.masterSku, p.displayName]))

    // ---- FG (finished goods) สรุปรวม + SKU ที่ใกล้หมด (สำหรับการ์ดเล็กหน้าแรก) ----
    const fgConfigBySku = new Map(fgConfig.filter((c) => c.enabled === '1').map((c) => [c.master_sku, c]))
    const latestFgBySku = new Map()
    for (const r of daily) {
      if (!r.master_sku || r.date > today) continue
      const prev = latestFgBySku.get(r.master_sku)
      if (!prev || r.date > prev.date) latestFgBySku.set(r.master_sku, r)
    }
    const salesBySkuForFg = new Map(salesStats.items.map((it) => [it.masterSku, it]))
    let totalFg = 0
    const fgLow = []
    for (const [sku] of fgConfigBySku) {
      const fgQty = num(latestFgBySku.get(sku)?.fg)
      totalFg += fgQty
      const dailyAvg = salesBySkuForFg.get(sku)?.dailyAverage || 0
      // ใกล้หมด = เหลือ FG น้อยกว่ายอดขายเฉลี่ย 1 วัน (หรือ 0 เป๊ะ) — ไม่นับ SKU ที่ไม่มียอดขายเลย (dailyAvg=0) กันขึ้นเป็น "ใกล้หมด" ทั้งที่ไม่มีความต้องการจริง
      if (fgQty <= 0 || (dailyAvg > 0 && fgQty < dailyAvg)) {
        fgLow.push({ sku, name: nameBySku.get(sku) || sku, fg: fgQty })
      }
    }
    const fgSummary = { totalFg, lowCount: fgLow.length, low: fgLow.sort((a, b) => a.fg - b.fg).slice(0, 5) }

    res.status(200).json({
      success: true,
      today,
      month: monthPrefix,
      performance,
      urgent: { redAlerts, planOpenedToday: todayRows.length > 0, campaignAlert },
      fg: fgSummary,
    })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
}
