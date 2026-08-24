// Ported verbatim (read-only pure functions) from mona-ops api/_lib/leaveCoverage.js — used only for
// leaveAbsenceDates/leaveAbsenceSlots (needed by getCalendarPresence's absence math). NEVER writes to hr_leave.
export const WORK_PERIODS = ['am', 'pm']
export const MIN_LOWER_HOUSE_HEADCOUNT = 3

const activeLeave = (leave) => ['pending', 'approved'].includes(String(leave.status || ''))
const codeFromUsername = (username) => String(username || '').startsWith('mp:') ? String(username).slice(3).toUpperCase() : ''
const slotKey = (date, period) => `${date}|${period}`

export function normalizeLeavePeriod(value, days) {
  const period = String(value || '').toLowerCase()
  if (period === 'am' || period === 'pm') return period
  if (Number(days) === 0.5) return 'full'
  return 'full'
}

export function leavePeriodLabel(value) {
  return value === 'am' ? 'ครึ่งวันเช้า' : value === 'pm' ? 'ครึ่งวันบ่าย' : 'เต็มวัน'
}

export function leaveAbsenceDates(leave) {
  if (leave.leave_type === 'สลับวันหยุด') return leave.end_date ? [leave.end_date] : []
  const start = leave.start_date
  const end = leave.end_date || start
  if (!start) return []
  const dates = []
  for (let date = start; date <= end && dates.length <= 366; date = addDay(date)) dates.push(date)
  return dates
}

export function leaveAbsenceSlots(leave) {
  const period = leave.leave_type === 'สลับวันหยุด' ? 'full' : normalizeLeavePeriod(leave.leave_period, leave.days)
  const periods = period === 'full' ? WORK_PERIODS : [period]
  return leaveAbsenceDates(leave).flatMap((date) => periods.map((workPeriod) => ({ date, period: workPeriod })))
}

function addDay(dateString) {
  const date = new Date(`${dateString}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

export function officeLeaveConflicts({ officeCode, proposedLeave, leaveRows = [], backupRows = [] }) {
  const activeLeaves = leaveRows.filter(activeLeave)
  const activeIds = new Set(activeLeaves.map((leave) => String(leave.id)))
  const explicitLeaveIds = new Set(backupRows.map((row) => String(row.leave_id || '')).filter(Boolean))
  const allBackupRows = [...backupRows]
  for (const leave of activeLeaves) {
    if (!leave.backup_office || explicitLeaveIds.has(String(leave.id))) continue
    for (const slot of leaveAbsenceSlots(leave)) {
      allBackupRows.push({ leave_id: leave.id, ...slot, office_code: leave.backup_office })
    }
  }
  const wanted = new Set(leaveAbsenceSlots(proposedLeave).map((slot) => slotKey(slot.date, slot.period)))
  return allBackupRows.filter((row) =>
    activeIds.has(String(row.leave_id || ''))
    && String(row.office_code || '').toUpperCase() === String(officeCode || '').toUpperCase()
    && wanted.has(slotKey(row.date, row.period)),
  )
}
