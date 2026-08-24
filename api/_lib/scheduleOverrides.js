// Ported verbatim from mona-ops api/_lib/scheduleOverrides.js — pure function, no sheet reads/writes at all
// (operates only on rows already fetched by the caller). Safe to copy as-is.
const LEGACY_OVERRIDE_CUTOFF = '2026-08-04T10:16:00.000Z'
export const LEGACY_OVERRIDE_EXEMPT_CODES = new Set(['ไม้', 'KED'])
const isFixedDayOff = (dayOffMap, code, date) => {
  const entry = dayOffMap[code]
  if (!entry) return false
  if (entry.from && date < entry.from) return false
  return String(new Date(`${date}T00:00:00`).getDay()) === entry.weekday
}

export function applyScheduleOverrides({ baseRows = [], overrideRows = [], personMap = {}, overrideScopeCodes = Object.keys(personMap), officeCodes = [], dayOffMap = {} }) {
  const latestByDate = new Map()
  for (const row of overrideRows) {
    const date = String(row.date || '')
    if (!date) continue
    const previous = latestByDate.get(date)
    if (!previous || String(row.updated_at || '') >= String(previous.updated_at || '')) latestByDate.set(date, row)
  }
  if (!latestByDate.size) return [...baseRows]

  const baseScope = new Set(overrideScopeCodes.map((code) => String(code).toUpperCase()))
  const officeSet = new Set(officeCodes.map((code) => String(code).toUpperCase()))
  const overrideTouchesOffice = new Map()
  for (const [date, override] of latestByDate) {
    let entries = []
    try { entries = JSON.parse(override.entries_json || '[]') } catch { entries = [] }
    const codes = (Array.isArray(entries) ? entries : []).map((entry) => String(entry?.code || '').toUpperCase())
    overrideTouchesOffice.set(date, codes.some((code) => officeSet.has(code)))
  }
  const result = baseRows.filter((row) => {
    const date = String(row.date || '')
    if (!latestByDate.has(date)) return true
    const code = String(row.code || '').toUpperCase()
    const isLegacyOverride = String(latestByDate.get(date)?.updated_at || '') < LEGACY_OVERRIDE_CUTOFF
    if (isLegacyOverride && LEGACY_OVERRIDE_EXEMPT_CODES.has(code)) return true
    const inScope = baseScope.has(code) || (officeSet.has(code) && overrideTouchesOffice.get(date))
    return !inScope
  })
  for (const [date, override] of latestByDate) {
    let entries = []
    try { entries = JSON.parse(override.entries_json || '[]') } catch { entries = [] }
    const seen = new Set()
    const isLegacyOverride = String(override.updated_at || '') < LEGACY_OVERRIDE_CUTOFF
    for (const entry of Array.isArray(entries) ? entries : []) {
      const code = String(entry?.code || '').toUpperCase()
      const person = personMap[code]
      if (!person || seen.has(code)) continue
      if (isLegacyOverride && isFixedDayOff(dayOffMap, code, date)) continue
      seen.add(code)
      result.push({ id: `override-${date}-${code}`, date, employee: person[0], code, group: person[1], fraction: 1, source: 'override' })
    }
  }
  return result
}
