// GET  /api/auth?action=status         -> { enabled }
// POST /api/auth { password }          -> { success, token } หรือ 401
// จงใจไม่ใส่ requireAuth ตรงนี้ — นี่คือทางเข้า auth เอง
import { authEnabled, checkPassword, issueToken } from './_lib/auth.js'

export default async function handler(req, res) {
  try {
    if (req.method === 'GET' && req.query.action === 'status') {
      return res.status(200).json({ success: true, enabled: authEnabled() })
    }
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' })
    const { password } = req.body || {}
    if (!authEnabled()) return res.status(200).json({ success: true, token: null })
    if (!checkPassword(password)) return res.status(401).json({ success: false, error: 'รหัสผ่านไม่ถูกต้อง' })
    return res.status(200).json({ success: true, token: issueToken() })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
}
