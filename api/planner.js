// GET  /api/planner?date=YYYY-MM-DD
// POST /api/planner  { action: 'save-all', config, daily, updated_by }
// ย้ายมาจาก mona-ops/api/sheet-tools.js?op=planner ตรงๆ (logic เดิมทั้งหมด ไม่แก้)
import { getSheet, overwriteSheet, ensureSheets } from './_lib/sheets.js'

const PLANNER_CONFIG_SHEET = 'planner_config'
const PLANNER_DAILY_SHEET = 'planner_daily'
const PLANNER_CONFIG_HEADERS = ['master_sku', 'enabled', 'reserve_days', 'safety_percent', 'updated_at', 'updated_by']
const PLANNER_DAILY_HEADERS = ['id', 'date', 'master_sku', 'fg', 'sales_average', 'demand_mode', 'recommended_feed', 'planned_feed', 'feeders', 'updated_at', 'updated_by']

export default async function handler(req, res) {
  const text = (value) => String(value ?? '').trim()
  const number = (value) => Math.max(0, Number(value) || 0)
  const truthy = (value) => value === true || value === 1 || ['1', 'true', 'yes'].includes(String(value).toLowerCase())
  try {
    await ensureSheets([[PLANNER_CONFIG_SHEET, PLANNER_CONFIG_HEADERS], [PLANNER_DAILY_SHEET, PLANNER_DAILY_HEADERS]])

    if (req.method === 'GET') {
      const date = text(req.query.date).slice(0, 10)
      const [config, allDaily] = await Promise.all([getSheet(PLANNER_CONFIG_SHEET), getSheet(PLANNER_DAILY_SHEET)])
      const daily = date ? allDaily.filter((row) => row.date === date) : allDaily
      const latestBySku = {}
      if (date) {
        for (const row of allDaily) {
          if (!row.master_sku || row.date > date) continue
          const prev = latestBySku[row.master_sku]
          if (!prev || row.date > prev.date) latestBySku[row.master_sku] = row
        }
      }
      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).json({ success: true, config, daily, latestBySku })
    }

    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' })
    const body = req.body || {}
    if (body.action !== 'save-all') return res.status(400).json({ success: false, error: 'Unknown planner action' })

    const now = new Date().toISOString()
    const updatedBy = text(body.updated_by) || 'Planner'
    const config = (Array.isArray(body.config) ? body.config : []).filter((row) => /^PY/i.test(text(row.master_sku))).map((row) => ({
      master_sku: text(row.master_sku).toUpperCase(),
      enabled: truthy(row.enabled) ? '1' : '0',
      reserve_days: number(row.reserve_days),
      safety_percent: number(row.safety_percent),
      updated_at: now,
      updated_by: updatedBy,
    }))
    const daily = (Array.isArray(body.daily) ? body.daily : []).filter((row) => row.date && /^PY/i.test(text(row.master_sku))).map((row) => ({
      id: `${text(row.date).slice(0, 10)}|${text(row.master_sku).toUpperCase()}`,
      date: text(row.date).slice(0, 10),
      master_sku: text(row.master_sku).toUpperCase(),
      fg: number(row.fg),
      sales_average: number(row.sales_average),
      demand_mode: ['normal', 'surge', 'promo'].includes(row.demand_mode) ? row.demand_mode : 'normal',
      recommended_feed: number(row.recommended_feed),
      planned_feed: number(row.planned_feed),
      feeders: [...new Set(Array.isArray(row.feeders) ? row.feeders.map(text).filter(Boolean) : [])].join(' · '),
      updated_at: now,
      updated_by: updatedBy,
    }))

    const currentDaily = await getSheet(PLANNER_DAILY_SHEET)
    const incomingKeys = new Set(daily.map((row) => row.id))
    const keptDaily = currentDaily.filter((row) => !incomingKeys.has(row.id))
    await overwriteSheet(PLANNER_CONFIG_SHEET, PLANNER_CONFIG_HEADERS, config.map((row) => PLANNER_CONFIG_HEADERS.map((header) => row[header] ?? '')))
    await overwriteSheet(PLANNER_DAILY_SHEET, PLANNER_DAILY_HEADERS, [...keptDaily, ...daily].map((row) => PLANNER_DAILY_HEADERS.map((header) => row[header] ?? '')))
    return res.status(200).json({ success: true, configSaved: config.length, dailySaved: daily.length, updatedAt: now, updatedBy })
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message })
  }
}
