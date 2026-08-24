// รหัสผ่านเดียวใช้ร่วมกันทั้งเว็บ (ไม่มี user แยกรายคน) — ต่างจาก mona-ops ที่มี users sheet + role
// ไม่ตั้ง SITE_PASSWORD/AUTH_SECRET ใน env = auth ปิด (local dev default, เหมือน mona-ops)
import crypto from 'node:crypto'

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 วัน

export const authEnabled = () => Boolean(process.env.AUTH_SECRET && process.env.SITE_PASSWORD)

const secret = () => process.env.AUTH_SECRET || ''

const b64url = (buf) => Buffer.from(buf).toString('base64url')

export function issueToken() {
  const payload = b64url(JSON.stringify({ exp: Date.now() + TOKEN_TTL_MS }))
  const sig = crypto.createHmac('sha256', secret()).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

function verifyToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return false
  const [payload, sig] = token.split('.')
  const expected = crypto.createHmac('sha256', secret()).update(payload).digest('base64url')
  const a = Buffer.from(sig || ''); const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false
  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    return Number(exp) > Date.now()
  } catch { return false }
}

export function checkPassword(password) {
  if (!authEnabled()) return false
  return typeof password === 'string' && password.length > 0 && password === process.env.SITE_PASSWORD
}

// วางไว้บรรทัดแรกของทุก handler ใน api/*.js (ยกเว้น api/auth.js เอง) — คืน false + เขียน 401 ไปแล้วถ้าไม่ผ่าน
export function requireAuth(req, res) {
  if (!authEnabled()) return true
  const header = req.headers?.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (verifyToken(token)) return true
  res.status(401).json({ success: false, error: 'unauthorized' })
  return false
}
