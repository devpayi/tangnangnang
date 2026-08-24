import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './style.css'

// แนบ token จาก localStorage ทุก fetch อัตโนมัติ + เคลียร์+reload เมื่อ token หมดอายุ/ไม่ถูกต้อง (401)
const _fetch = window.fetch.bind(window)
window.fetch = (input, init = {}) => {
  const token = localStorage.getItem('payi-floor-token')
  const headers = new Headers(init.headers || {})
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const url = typeof input === 'string' ? input : input?.url || ''
  return _fetch(input, { ...init, headers }).then((res) => {
    // ยกเว้น /api/auth เอง — 401 ตรงนั้นคือ "รหัสผ่านผิด" ไม่ใช่ token หมดอายุ ให้ Login.jsx จัดการ error เอง
    if (res.status === 401 && !url.includes('/api/auth')) {
      localStorage.removeItem('payi-floor-token')
      window.location.reload()
    }
    return res
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
