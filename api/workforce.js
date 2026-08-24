// /api/workforce — Manpower & OT calendar/planning, ported from mona-ops api/sheet-tools.js (opWorkforce).
// payi-floor uses a single shared-password gate (api/_lib/auth.js requireAuth), not mona-ops's per-user
// roles — the requireAdmin/requireScheduleEditor role checks from the mona-ops original are stripped
// entirely (single user, แตง), only the top-level requireAuth guard remains.
//
// GET                       -> full workforce data (rows/manpower/events/people/holidays/otLimits/...)
// GET ?sourceOnly=1         -> just sourceManpower (calendar presence), used by the frontend preview mode
// GET ?view=leave           -> READ-ONLY: approved hr_leave rows, for the "สลับวันหยุด" swap badges only.
//                              No POST/write path exists for hr_leave anywhere in this file — see
//                              api/_lib/workforce.js's getLeaveReadOnly() for the audited-safe read call.
// POST { action: ... }      -> create-plan / update-plan / delete-plan / approve-actual-month / set-ot-limit /
//                              create-manpower / create-event / delete-event / add-holiday / delete-holiday /
//                              add-dayrecord / update-dayrecord / delete-dayrecord / set-schedule-day
import { getSheet, appendRows, overwriteSheet, batchGetValues } from './_lib/sheets.js'
import {
  WORKFORCE_SHEETS, OT_HEADERS, EVENT_HEADERS, OT_APPROVAL_HEADERS, OT_LIMIT_HEADERS, DAYRECORD_HEADERS, HOLIDAY_HEADERS,
  rowsToObjects, latestByKey, ensureWorkforceSheets, workforceCache, setWorkforceCache, clearWorkforceCache,
  getPersonMap, getDayOffMap, getHolidaysWithConflicts, getOfficePeopleMap, getCalendarPresence, getLeaveReadOnly,
  minutesBetween, validTime, clockMinutes, overlaps,
} from './_lib/workforce.js'
import { leaveAbsenceDates } from './_lib/leaveCoverage.js'

import { requireAuth } from './_lib/auth.js'
export default async function handler(req, res) {
  if (!requireAuth(req, res)) return
  try {
    return await workforceInner(req, res)
  } catch (e) {
    console.error('api/workforce:', e)
    return res.status(500).json({ error: e.message })
  }
}

async function workforceInner(req, res) {
  if (req.method === 'GET' && String(req.query.view || '') === 'leave') {
    // READ-ONLY — see file header. Only approved "สลับวันหยุด" rows, exactly what the calendar swap badges need.
    const rows = await getLeaveReadOnly()
    const swapLeaves = rows.filter((l) => l.leave_type === 'สลับวันหยุด' && l.status === 'approved')
    return res.status(200).json({ success: true, leave: swapLeaves })
  }

  if (req.method === 'GET' && String(req.query.sourceOnly || '') === '1') {
    await ensureWorkforceSheets()
    const [personMap, officeMap] = await Promise.all([getPersonMap(), getOfficePeopleMap()])
    const sourceManpower = await getCalendarPresence({ ...personMap, ...officeMap }, Object.keys(personMap), true, Object.keys(officeMap))
    return res.status(200).json({ success: true, sourceManpower, sourceYear: '2026' })
  }

  await ensureWorkforceSheets()

  if (req.method === 'GET') {
    if (workforceCache.data && Date.now() - workforceCache.at < 20000) return res.status(200).json(workforceCache.data)
    const ranges = WORKFORCE_SHEETS.map(([name]) => `${name}!A:Z`)
    const values = await batchGetValues(ranges)
    const [rows, manpower, events, history, rawApprovals, people, rawLimits, approvalHistory] = values.map((range) => rowsToObjects(range.values || []))
    const dayRecords = rowsToObjects(values[WORKFORCE_SHEETS.findIndex(([name]) => name === 'workforce_dayrecords')].values || [])
    const approvals = latestByKey(rawApprovals, (r) => `${r.month}|${r.employee}`, 'approved_at')
    const limits = latestByKey(rawLimits, (r) => r.employee, 'updated_at')
    const personMap = await getPersonMap()
    const otLimits = Object.fromEntries(limits.filter((l) => l.employee).map((l) => [l.employee, l.limit_hours]))
    let sourceManpower = []
    let officePeople = []; let officeAbsences = []; let officeMap = {}
    let dayOffMapForSchedule = {}
    try {
      const [leaveRows, officeMapResult, dayOffMapResult] = await Promise.all([getSheet('hr_leave'), getOfficePeopleMap(), getDayOffMap()])
      officeMap = officeMapResult
      dayOffMapForSchedule = dayOffMapResult
      sourceManpower = await getCalendarPresence({ ...personMap, ...officeMap }, Object.keys(personMap), true, Object.keys(officeMap))
      officePeople = Object.entries(officeMap).map(([code, [name]]) => ({ code, name }))
      for (const l of leaveRows) {
        if (l.status !== 'approved') continue
        if (!String(l.username || '').startsWith('mp:')) continue
        const code = l.username.slice(3)
        if (!officeMap[code]) continue
        for (const date of leaveAbsenceDates(l)) officeAbsences.push({ code, date })
      }
    } catch (e) { console.error('office presence:', e.message) }
    const withDayOff = (code) => ({ day_off_weekday: dayOffMapForSchedule[code]?.weekday ?? '', day_off_effective_from: dayOffMapForSchedule[code]?.from ?? '' })
    const schedulePeople = [
      ...Object.entries(personMap).map(([code, [name, group]]) => ({ code, name, group, ...withDayOff(code) })),
      ...Object.entries(officeMap).map(([code, [name]]) => ({ code, name, group: 'ออฟฟิศ', ...withDayOff(code) })),
    ]
    const holidays = await getHolidaysWithConflicts({ ...personMap, ...officeMap }).catch((e) => { console.error('holidays:', e.message); return [] })
    const data = { success: true, rows: rows.sort((a, b) => String(b.date).localeCompare(String(a.date))), manpower, sourceManpower, events, history, approvals, approvalHistory, otLimits, people, schedulePeople, officePeople, officeAbsences, holidays, sourceYear: '2026', dayRecords: dayRecords.sort((a, b) => String(b.date).localeCompare(String(a.date))) }
    setWorkforceCache(data)
    return res.status(200).json(data)
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const body = req.body || {}
  const action = String(body.action || '').trim().toLowerCase()
  const actorName = () => body.changed_by || body.created_by || body.approved_by || body.updated_by || 'แตง'

  if (action === 'set-schedule-day') {
    const date = String(body.date || '')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) return res.status(400).json({ error: 'วันที่ไม่ถูกต้อง' })
    const [personMap, officeMap] = await Promise.all([getPersonMap(), getOfficePeopleMap()])
    const combinedMap = { ...personMap, ...officeMap }
    const requestedCodes = Array.isArray(body.codes) ? body.codes.map((code) => String(code || '').toUpperCase()).filter(Boolean) : []
    const codes = [...new Set(requestedCodes)]
    const unknown = codes.filter((code) => !combinedMap[code])
    if (unknown.length) return res.status(400).json({ error: `ไม่พบพนักงานในระบบ: ${unknown.join(', ')}` })
    const updatedAt = new Date().toISOString()
    const updatedBy = actorName()
    const entriesJson = JSON.stringify(codes.map((code) => ({ code })))
    await appendRows('workforce_schedule_overrides', [[date, entriesJson, updatedAt, updatedBy]])
    clearWorkforceCache()
    return res.status(200).json({ success: true, date, codes, updated_at: updatedAt, updated_by: updatedBy })
  }

  if (action === 'create-plan') {
    const employees = Array.isArray(body.employees) ? body.employees.filter(Boolean) : []
    if (!body.date || !employees.length || !body.planned_start || !body.planned_end) return res.status(400).json({ error: 'กรุณาระบุวันที่ รายชื่อ และเวลา OT' })
    if (!validTime(body.planned_start) || !validTime(body.planned_end) || clockMinutes(body.planned_end) <= clockMinutes(body.planned_start)) return res.status(400).json({ error: 'เวลาจบต้องมากกว่าเวลาเริ่มและอยู่ในวันเดียวกัน' })
    const current = await getSheet('workforce_ot')
    const conflicts = employees.filter((employee) => current.some((r) => r.date === body.date && r.employee === employee && r.status !== 'cancelled' && overlaps(body.planned_start, body.planned_end, r.planned_start, r.planned_end)))
    if (conflicts.length) return res.status(409).json({ error: `แผน OT ซ้ำหรือเวลาชนกัน: ${conflicts.join(', ')}` })
    const now = new Date().toISOString(); const plannedMinutes = minutesBetween(body.planned_start, body.planned_end)
    const createdBy = actorName()
    const rows = employees.map((employee, index) => [`${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`, body.date, employee, body.team || 'บ้านล่าง', body.task || 'แพ็ก', body.planned_start, body.planned_end, plannedMinutes, '', '', '', 'planned', body.reason || '', body.note || '', now, ''])
    await appendRows('workforce_ot', rows)
    await appendRows('workforce_ot_history', rows.map((row, index) => [`hist-${Date.now()}-c${index}`, row[0], body.date, row[2], '', '', body.planned_start, body.planned_end, '', body.note || '', now, createdBy]))
    clearWorkforceCache()
    return res.status(200).json({ success: true, created: rows.length })
  }

  if (action === 'update-plan') {
    const updates = Array.isArray(body.updates) ? body.updates : []
    if (!updates.length) return res.status(200).json({ success: true, updated: 0, action: 'update-plan' })
    const current = await getSheet('workforce_ot'); const updateMap = new Map(updates.map((u) => [String(u.id), u]))
    for (const row of current) {
      const u = updateMap.get(String(row.id)); if (!u) continue
      if (!validTime(u.planned_start) || !validTime(u.planned_end) || clockMinutes(u.planned_end) <= clockMinutes(u.planned_start)) return res.status(400).json({ error: `เวลาไม่ถูกต้อง: ${row.employee}` })
      if (u.actual_minutes !== '' && u.actual_minutes != null && (!Number.isFinite(Number(u.actual_minutes)) || Number(u.actual_minutes) < 0)) return res.status(400).json({ error: `ชั่วโมงที่ทำจริงไม่ถูกต้อง: ${row.employee}` })
      const conflict = current.some((other) => String(other.id) !== String(row.id) && other.date === row.date && other.employee === row.employee && other.status !== 'cancelled' && overlaps(u.planned_start, u.planned_end, other.planned_start, other.planned_end))
      if (conflict) return res.status(409).json({ error: `เวลาชนกับแผนเดิม: ${row.employee}` })
    }
    const changedAt = new Date().toISOString()
    const changedBy = actorName()
    const changedRows = current.filter((row) => { const u = updateMap.get(String(row.id)); return u && (u.planned_start !== row.planned_start || u.planned_end !== row.planned_end || String(u.note ?? '') !== String(row.note ?? '')) })
    if (changedRows.length) await appendRows('workforce_ot_history', changedRows.map((row, index) => { const u = updateMap.get(String(row.id)); return [`hist-${Date.now()}-${index}`, row.id, row.date, row.employee, row.planned_start, row.planned_end, u.planned_start, u.planned_end, row.note || '', u.note ?? row.note ?? '', changedAt, changedBy] }))
    const next = current.map((row) => { const u = updateMap.get(String(row.id)); const merged = u ? { ...row, planned_start: u.planned_start, planned_end: u.planned_end, planned_minutes: minutesBetween(u.planned_start, u.planned_end), actual_minutes: u.actual_minutes === '' || u.actual_minutes == null ? '' : Math.round(Number(u.actual_minutes)), note: u.note ?? row.note, status: 'planned' } : row; return OT_HEADERS.map((h) => merged[h] ?? '') })
    await overwriteSheet('workforce_ot', OT_HEADERS, next); clearWorkforceCache(); return res.status(200).json({ success: true, updated: updates.length })
  }

  if (action === 'delete-plan') {
    const ids = new Set((Array.isArray(body.ids) ? body.ids : []).map(String)); const current = await getSheet('workforce_ot')
    const kept = current.filter((r) => !ids.has(String(r.id))).map((r) => OT_HEADERS.map((h) => r[h] ?? ''))
    await overwriteSheet('workforce_ot', OT_HEADERS, kept); clearWorkforceCache(); return res.status(200).json({ success: true, deleted: current.length - kept.length })
  }

  if (action === 'approve-actual-month') {
    if (!/^\d{4}-\d{2}$/.test(String(body.month || '')) || !body.employee || !Number.isFinite(Number(body.actual_minutes)) || Number(body.actual_minutes) < 0) return res.status(400).json({ error: 'ข้อมูลชั่วโมงจริงไม่ถูกต้อง' })
    const current = await getSheet('workforce_ot_approvals'); const now = new Date().toISOString()
    const changedBy = actorName()
    const record = { id: `approve-${body.month}-${body.employee}-${Date.now()}`, month: body.month, employee: body.employee, actual_minutes: Math.round(Number(body.actual_minutes)), approved_at: now, approved_by: changedBy }
    const existing = latestByKey(current, (r) => `${r.month}|${r.employee}`, 'approved_at').find((r) => r.month === body.month && r.employee === body.employee)
    if (existing) {
      await appendRows('workforce_ot_approval_history', [[`apphist-${Date.now()}`, body.month, body.employee, existing.actual_minutes, record.actual_minutes, now, changedBy]])
    }
    await appendRows('workforce_ot_approvals', [OT_APPROVAL_HEADERS.map((h) => record[h] ?? '')])
    clearWorkforceCache()
    return res.status(200).json({ success: true, approval: record })
  }

  if (action === 'set-ot-limit') {
    if (!body.employee) return res.status(400).json({ error: 'กรุณาระบุชื่อพนักงาน' })
    const limitHours = body.limit_hours === '' || body.limit_hours == null ? '' : Number(body.limit_hours)
    if (limitHours !== '' && (!Number.isFinite(limitHours) || limitHours < 0)) return res.status(400).json({ error: 'ลิมิตชั่วโมงไม่ถูกต้อง' })
    const current = await getSheet('workforce_ot_limits'); const now = new Date().toISOString()
    const record = { employee: body.employee, limit_hours: limitHours, updated_at: now, updated_by: actorName() }
    await appendRows('workforce_ot_limits', [OT_LIMIT_HEADERS.map((h) => record[h] ?? '')])
    clearWorkforceCache()
    const latest = latestByKey([...current, record], (r) => r.employee, 'updated_at')
    return res.status(200).json({ success: true, otLimits: Object.fromEntries(latest.filter((r) => r.employee).map((r) => [r.employee, r.limit_hours])) })
  }

  if (action === 'create-manpower') {
    const employees = Array.isArray(body.employees) ? body.employees.filter(Boolean) : []
    if (!body.date || !employees.length) return res.status(400).json({ error: 'กรุณาระบุวันที่และรายชื่อ' })
    const now = new Date().toISOString()
    const rows = employees.map((employee, index) => [`mp-${Date.now()}-${index}`, body.date, employee, body.team || 'บ้านล่าง', body.task || 'แพ็ก', body.start_time || '09:00', body.end_time || '17:00', body.note || '', now])
    await appendRows('workforce_manpower', rows)
    clearWorkforceCache()
    return res.status(200).json({ success: true, created: rows.length })
  }

  if (action === 'create-event') {
    if (!body.date || !body.title) return res.status(400).json({ error: 'กรุณาระบุวันและชื่อโปร' })
    const endDate = body.end_date || body.date
    if (endDate < body.date) return res.status(400).json({ error: 'วันสิ้นสุดต้องไม่ก่อนวันเริ่ม' })
    const leadDays = Math.max(0, Math.round(Number(body.lead_days) || 0))
    const lagDays = Math.max(0, Math.round(Number(body.lag_days) || 0))
    await appendRows('workforce_events', [[`event-${Date.now()}`, body.title, body.date, body.team || 'ทุกทีม', body.note || '', new Date().toISOString(), endDate, leadDays, lagDays]])
    clearWorkforceCache()
    return res.status(200).json({ success: true })
  }

  if (action === 'delete-event') {
    if (!body.id) return res.status(400).json({ error: 'กรุณาระบุ id' })
    const current = await getSheet('workforce_events')
    const kept = current.filter((r) => String(r.id) !== String(body.id)).map((r) => EVENT_HEADERS.map((h) => r[h] ?? ''))
    await overwriteSheet('workforce_events', EVENT_HEADERS, kept)
    clearWorkforceCache()
    return res.status(200).json({ success: true, deleted: current.length - kept.length })
  }

  if (action === 'add-holiday') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.date || '')) || !String(body.name || '').trim()) return res.status(400).json({ error: 'กรุณาระบุวันที่และชื่อวันหยุด' })
    await appendRows('workforce_holidays', [[`holiday-${Date.now()}`, body.date, String(body.name).trim(), new Date().toISOString()]])
    clearWorkforceCache()
    return res.status(200).json({ success: true })
  }

  if (action === 'delete-holiday') {
    if (!body.id) return res.status(400).json({ error: 'กรุณาระบุ id' })
    const current = await getSheet('workforce_holidays')
    const kept = current.filter((r) => String(r.id) !== String(body.id)).map((r) => HOLIDAY_HEADERS.map((h) => r[h] ?? ''))
    await overwriteSheet('workforce_holidays', HOLIDAY_HEADERS, kept)
    clearWorkforceCache()
    return res.status(200).json({ success: true, deleted: current.length - kept.length })
  }

  if (action === 'add-dayrecord') {
    const employees = Array.isArray(body.employees) ? body.employees.filter(Boolean) : []
    if (!body.date || !employees.length) return res.status(400).json({ error: 'กรุณาระบุวันที่และรายชื่อ' })
    if (!['ot_full', 'comp', 'sched_add', 'sched_remove'].includes(body.kind)) return res.status(400).json({ error: 'ประเภทไม่ถูกต้อง' })
    const now = new Date().toISOString()
    const createdBy = actorName()
    const paidOt = body.kind === 'ot_full' ? (body.paid_ot === false ? '0' : '1') : '0'
    const rows = employees.map((employee, index) => [`dr-${Date.now()}-${index}`, body.date, employee, body.team || 'บ้านล่าง', body.kind, body.reason || '', paidOt, body.note || '', now, createdBy])
    await appendRows('workforce_dayrecords', rows)
    clearWorkforceCache()
    return res.status(200).json({ success: true, created: rows.length })
  }

  if (action === 'update-dayrecord') {
    if (!body.id) return res.status(400).json({ error: 'กรุณาระบุ id' })
    const current = await getSheet('workforce_dayrecords')
    const target = current.find((r) => String(r.id) === String(body.id))
    if (!target) return res.status(404).json({ error: 'ไม่พบรายการนี้' })
    const merged = { ...target, date: body.date ?? target.date, employee: body.employee ?? target.employee, team: body.team ?? target.team, kind: body.kind ?? target.kind, reason: body.reason ?? target.reason, paid_ot: body.paid_ot === undefined ? target.paid_ot : (body.paid_ot === false || body.paid_ot === '0' ? '0' : '1'), note: body.note ?? target.note }
    const next = current.map((r) => String(r.id) === String(body.id) ? merged : r).map((r) => DAYRECORD_HEADERS.map((h) => r[h] ?? ''))
    await overwriteSheet('workforce_dayrecords', DAYRECORD_HEADERS, next)
    clearWorkforceCache()
    return res.status(200).json({ success: true })
  }

  if (action === 'delete-dayrecord') {
    if (!body.id) return res.status(400).json({ error: 'กรุณาระบุ id' })
    const current = await getSheet('workforce_dayrecords')
    const kept = current.filter((r) => String(r.id) !== String(body.id)).map((r) => DAYRECORD_HEADERS.map((h) => r[h] ?? ''))
    await overwriteSheet('workforce_dayrecords', DAYRECORD_HEADERS, kept)
    clearWorkforceCache()
    return res.status(200).json({ success: true, deleted: current.length - kept.length })
  }

  return res.status(400).json({ error: `Unknown workforce action: ${action || '(empty)'}` })
}
