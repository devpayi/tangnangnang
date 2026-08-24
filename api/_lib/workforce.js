// Manpower & OT — ported from mona-ops api/sheet-tools.js (opWorkforce + its helper functions), 2026-08-21.
// payi-floor has no auth system yet, so all requireAuth/requireAdmin/requireScheduleEditor guards from the
// mona-ops original are stripped entirely (same precedent as claims.js/planner-sales.js in this project).
//
// ★ hr_leave safety boundary ★ — the Sheet's `hr_leave`/`hr_leave_backups` tabs are owned entirely by
// mona-ops (real LINE-bot leave-approval flow wired to it there). This file, and payi-floor in general,
// must NEVER write to hr_leave/hr_leave_backups. Every function below that touches hr_leave calls
// getSheet('hr_leave') only — a plain read. There is no appendRows/overwriteSheet/appendRowsVerified
// targeting 'hr_leave' anywhere in this file. getLeaveReadOnly() at the bottom is the single, obviously-named
// entry point the frontend/API route use to read approved leave rows for calendar display — read-only by
// construction, no POST/write path exists for it.
import { getSheet, appendRows, overwriteSheet, ensureSheets } from './sheets.js'
import { applyScheduleOverrides, LEGACY_OVERRIDE_EXEMPT_CODES } from './scheduleOverrides.js'
import { leaveAbsenceSlots } from './leaveCoverage.js'

export const OT_HEADERS = ['id', 'date', 'employee', 'team', 'task', 'planned_start', 'planned_end', 'planned_minutes', 'actual_start', 'actual_end', 'actual_minutes', 'status', 'reason', 'note', 'created_at', 'closed_at']
export const MANPOWER_HEADERS = ['id', 'date', 'employee', 'team', 'task', 'start_time', 'end_time', 'note', 'created_at']
export const EVENT_HEADERS = ['id', 'title', 'date', 'team', 'note', 'created_at', 'end_date', 'lead_days', 'lag_days']
export const OT_HISTORY_HEADERS = ['id', 'plan_id', 'date', 'employee', 'before_start', 'before_end', 'after_start', 'after_end', 'before_note', 'after_note', 'changed_at', 'changed_by']
export const OT_APPROVAL_HEADERS = ['id', 'month', 'employee', 'actual_minutes', 'approved_at', 'approved_by']
export const PEOPLE_HEADERS = ['code', 'name', 'group', 'active', 'day_off_weekday', 'day_off_effective_from']
export const OT_LIMIT_HEADERS = ['employee', 'limit_hours', 'updated_at', 'updated_by']
export const OT_APPROVAL_HISTORY_HEADERS = ['id', 'month', 'employee', 'before_minutes', 'after_minutes', 'changed_at', 'changed_by']
export const SCHEDULE_SNAPSHOT_HEADERS = ['date', 'code', 'employee', 'group', 'fraction']
export const SCHEDULE_OVERRIDE_HEADERS = ['date', 'entries_json', 'updated_at', 'updated_by']
export const DAYRECORD_HEADERS = ['id', 'date', 'employee', 'team', 'kind', 'reason', 'paid_ot', 'note', 'created_at', 'created_by']
export const HOLIDAY_HEADERS = ['id', 'date', 'name', 'created_at']

export const WORKFORCE_SHEETS = [
  ['workforce_ot', OT_HEADERS], ['workforce_manpower', MANPOWER_HEADERS], ['workforce_events', EVENT_HEADERS],
  ['workforce_ot_history', OT_HISTORY_HEADERS], ['workforce_ot_approvals', OT_APPROVAL_HEADERS],
  ['workforce_people', PEOPLE_HEADERS], ['workforce_ot_limits', OT_LIMIT_HEADERS],
  ['workforce_ot_approval_history', OT_APPROVAL_HISTORY_HEADERS], ['workforce_schedule_snapshot', SCHEDULE_SNAPSHOT_HEADERS],
  ['workforce_schedule_overrides', SCHEDULE_OVERRIDE_HEADERS], ['workforce_dayrecords', DAYRECORD_HEADERS],
  ['workforce_holidays', HOLIDAY_HEADERS],
]
const DEFAULT_HOLIDAY_ROWS = [
  ['holiday-seed-1', '2026-08-12', 'วันแม่', ''],
  ['holiday-seed-2', '2026-10-13', 'วันนวมินทรมหาราช', ''],
  ['holiday-seed-3', '2026-10-23', 'วันปิยมหาราช', ''],
  ['holiday-seed-4', '2026-12-05', 'วันพ่อ', ''],
  ['holiday-seed-5', '2026-12-31', 'วันสิ้นปี', ''],
]
const DEFAULT_PEOPLE_ROWS = [['TANG', 'แตง', 'คนแพ็ก', '1'], ['PANG', 'แป้ง', 'คนแพ็ก', '1'], ['FAH', 'ฟ้า', 'คนแพ็ก', '1'], ['MII', 'มี่', 'คนแพ็ก', '1'], ['PANID', 'ป้านิด', 'คนฟีด', '1'], ['MOM', 'แม่', 'คนฟีด', '1'], ['MAPRANG', 'มะปราง', 'พาร์ทไทม์', '1'], ['ATOM', 'อะตอม', 'อื่น ๆ', '1'], ['BAS', 'บาส', 'อื่น ๆ', '1'], ['NEOY', 'เนย', 'อื่น ๆ', '1']]
const DEFAULT_OFFICE_ROWS = [['TOON', 'ตูน', '1'], ['KED', 'เกด', '1'], ['MO', 'โม', '1']]

export const rowsToObjects = (values = []) => { const [headers, ...rows] = values; return headers ? rows.map((row) => Object.fromEntries(headers.map((h, i) => [h, row[i] ?? '']))) : [] }
export const latestByKey = (rows, keyFn, timeField) => { const map = new Map(); for (const r of rows) { const k = keyFn(r); const prev = map.get(k); if (!prev || String(r[timeField]) >= String(prev[timeField])) map.set(k, r) } return [...map.values()] }

let workforceEnsurePromise
export const ensureWorkforceSheets = () => workforceEnsurePromise ||= ensureSheets(WORKFORCE_SHEETS)
export let workforceCache = { at: 0, data: null }
export const setWorkforceCache = (data) => { workforceCache = { at: Date.now(), data } }
export const clearWorkforceCache = () => { workforceCache = { at: 0, data: null } }

export async function getPersonMap() {
  const people = await getSheet('workforce_people')
  if (!people.length) { await appendRows('workforce_people', DEFAULT_PEOPLE_ROWS); return getPersonMap() }
  const map = Object.fromEntries(DEFAULT_PEOPLE_ROWS.map(([code, name, group]) => [code, [name, group]]))
  for (const p of people) {
    if (!p.code) continue
    const code = String(p.code).toUpperCase()
    if (String(p.active) === '0') { delete map[code]; continue }
    const forcedName = code === 'PANID' ? 'ป้านิด' : code === 'MOM' ? 'แม่' : ''
    map[code] = [forcedName || p.name || map[code]?.[0] || code, p.group || 'อื่น ๆ']
  }
  return map
}

export async function getDayOffMap() {
  const [people, officePeople] = await Promise.all([getSheet('workforce_people'), getSheet('hr_office_people')])
  const map = {}
  for (const p of [...people, ...officePeople]) {
    if (!p.code || String(p.active) === '0') continue
    const w = String(p.day_off_weekday ?? '').trim()
    if (w !== '') map[String(p.code).toUpperCase()] = { weekday: w, from: String(p.day_off_effective_from ?? '').trim() }
  }
  return map
}

async function getHolidayRows() {
  const rows = await getSheet('workforce_holidays')
  if (!rows.length) { await appendRows('workforce_holidays', DEFAULT_HOLIDAY_ROWS); return getHolidayRows() }
  return rows
}

export async function getHolidaysWithConflicts(personMap) {
  const [holidayRows, dayOffMap] = await Promise.all([getHolidayRows(), getDayOffMap()])
  return holidayRows.map((h) => {
    const weekday = String(new Date(`${h.date}T00:00:00`).getDay())
    const conflictCodes = Object.keys(dayOffMap).filter((code) => {
      const entry = dayOffMap[code]
      if (entry.weekday !== weekday) return false
      if (entry.from && h.date < entry.from) return false
      return true
    })
    const conflictNames = conflictCodes.map((code) => personMap[code]?.[0]).filter(Boolean)
    return { id: h.id, date: h.date, name: h.name, conflictCodes, conflictNames }
  })
}

export async function getOfficePeopleMap() {
  const rows = await getSheet('hr_office_people')
  if (!rows.length) { await appendRows('hr_office_people', DEFAULT_OFFICE_ROWS); return getOfficePeopleMap() }
  const map = {}
  for (const r of rows) {
    if (!r.code) continue
    if (String(r.active) === '0') continue
    map[String(r.code).toUpperCase()] = [r.name || r.code, 'ออฟฟิศ']
  }
  return map
}

// ── hr_leave read-only helpers below — buildLeaveAbsenceMap/buildSwapBackDates only ever call getSheet('hr_leave'),
// never appendRows/overwriteSheet against it. Audited line-by-line against the mona-ops source. ──
function buildLeaveAbsenceMap(leaveRows) {
  const absenceByCode = {}
  for (const l of leaveRows) {
    if (l.status !== 'approved') continue
    if (!String(l.username || '').startsWith('mp:')) continue
    const code = l.username.slice(3)
    for (const slot of leaveAbsenceSlots(l)) {
      absenceByCode[code] ||= {}
      absenceByCode[code][slot.date] ||= new Set()
      absenceByCode[code][slot.date].add(slot.period)
    }
  }
  return absenceByCode
}
const absenceFraction = (absenceByCode, code, date) => (absenceByCode[code]?.[date]?.size || 0) / 2

function buildSwapBackDates(leaveRows) {
  const map = {}
  for (const l of leaveRows) {
    if (l.status !== 'approved' || l.leave_type !== 'สลับวันหยุด') continue
    if (!String(l.username || '').startsWith('mp:')) continue
    const code = l.username.slice(3)
    const date = String(l.start_date || '')
    if (!date) continue
    map[code] ||= new Set()
    map[code].add(date)
  }
  return map
}

const isFixedDayOff = (dayOffMap, code, date, swapBackMap = {}) => {
  if (swapBackMap[code]?.has(date)) return false
  const entry = dayOffMap[code]
  if (!entry) return false
  if (entry.from && date < entry.from) return false
  return String(new Date(`${date}T00:00:00`).getDay()) === entry.weekday
}

const todayStr = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })

function generateCalendarPresence(personMap, leaveRows, dayOffMap = {}, onlyCodes = null, swapBackMap = {}) {
  const absenceByCode = buildLeaveAbsenceMap(leaveRows)
  const roster = Object.entries(personMap)
    .filter(([code]) => !onlyCodes || onlyCodes.has(code))
    .map(([code, [name, group]]) => ({ code, name, group }))
  const start = new Date(`${todayStr()}T00:00:00`); start.setDate(start.getDate() - 90)
  const end = new Date(`${todayStr()}T00:00:00`); end.setDate(end.getDate() + 180)
  const result = []
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    for (const p of roster) {
      if (isFixedDayOff(dayOffMap, p.code, date, swapBackMap)) continue
      const fraction = Math.max(0, 1 - absenceFraction(absenceByCode, p.code, date))
      if (!fraction) continue
      result.push({ id: `internal-${date}-${p.code}`, date, employee: p.name, code: p.code, group: p.group, fraction, source: 'internal' })
    }
  }
  return result
}

// ปฏิทินบ้านล่าง — ใช้ตารางพนักงานปี 2026 ในระบบ + hr_leave (อ่านอย่างเดียว) เพื่อคำนวณคนที่มาทำงานจริงต่อวัน
export async function getCalendarPresence(personMap, overrideScopeCodes = Object.keys(personMap), applyLeaves = true, officeCodes = []) {
  const [snapshotRows, overrideRows, leaveRows, dayOffMap] = await Promise.all([
    getSheet('workforce_schedule_snapshot'), getSheet('workforce_schedule_overrides'), getSheet('hr_leave'), getDayOffMap(),
  ])
  const swapBackMap = buildSwapBackDates(leaveRows)
  let baseRows = (snapshotRows.length ? snapshotRows : generateCalendarPresence(personMap, [], dayOffMap, null, swapBackMap))
    .filter((r) => personMap[String(r.code || '').toUpperCase()])
    .map((r) => ({ id: `stored-${r.date}-${r.code}`, date: r.date, employee: r.employee, code: String(r.code || '').toUpperCase(), group: r.group, fraction: Number(r.fraction) || 1, source: 'stored' }))
    .filter((r) => !isFixedDayOff(dayOffMap, r.code, r.date, swapBackMap))
  if (snapshotRows.length) {
    const codesWithRows = new Set(baseRows.map((r) => r.code))
    const missingCodes = new Set(Object.keys(personMap).filter((code) => !codesWithRows.has(code)))
    if (missingCodes.size) baseRows = [...baseRows, ...generateCalendarPresence(personMap, [], dayOffMap, missingCodes, swapBackMap)]
    const partialExemptCodes = new Set([...codesWithRows].filter((code) => LEGACY_OVERRIDE_EXEMPT_CODES.has(code)))
    if (partialExemptCodes.size) {
      const existingKeys = new Set(baseRows.map((r) => `${r.date}|${r.code}`))
      const filler = generateCalendarPresence(personMap, [], dayOffMap, partialExemptCodes, swapBackMap).filter((r) => !existingKeys.has(`${r.date}|${r.code}`))
      baseRows = [...baseRows, ...filler]
    }
  }
  baseRows = applyScheduleOverrides({ baseRows, overrideRows, personMap, overrideScopeCodes, officeCodes, dayOffMap })
  {
    const presentKeys = new Set(baseRows.map((r) => `${r.date}|${r.code}`))
    for (const [code, dates] of Object.entries(swapBackMap)) {
      const person = personMap[code]
      if (!person) continue
      for (const date of dates) {
        const key = `${date}|${code}`
        if (presentKeys.has(key)) continue
        presentKeys.add(key)
        baseRows.push({ id: `swapback-${date}-${code}`, date, employee: person[0], code, group: person[1], fraction: 1, source: 'swapback' })
      }
    }
  }
  if (!applyLeaves) return baseRows
  const absenceByCode = buildLeaveAbsenceMap(leaveRows)
  return baseRows.map((row) => ({ ...row, fraction: Math.max(0, row.fraction - absenceFraction(absenceByCode, row.code, row.date)) })).filter((row) => row.fraction > 0)
}

export const minutesBetween = (start, end) => {
  if (!start || !end) return 0
  const [sh, sm] = start.split(':').map(Number); const [eh, em] = end.split(':').map(Number)
  let n = (eh * 60 + em) - (sh * 60 + sm)
  if (n < 0) n += 1440
  return Math.max(0, n)
}
export const validTime = (v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(v || ''))
export const clockMinutes = (v) => { const [h, m] = String(v).split(':').map(Number); return h * 60 + m }
export const overlaps = (aStart, aEnd, bStart, bEnd) => clockMinutes(aStart) < clockMinutes(bEnd) && clockMinutes(bStart) < clockMinutes(aEnd)

// ★ Read-only leave endpoint helper — the ONLY place this app reads hr_leave for the frontend's swap-leave
// badges. Named getLeaveReadOnly deliberately so it's obviously audited-safe: it is a plain getSheet('hr_leave')
// call with no write code path anywhere near it, structurally incapable of writing back.
export async function getLeaveReadOnly() {
  const rows = await getSheet('hr_leave')
  return rows
}
