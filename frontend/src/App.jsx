import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import Landing from './components/Landing'
import LoginPage from './components/LoginPage'
import SchoolPortal from './components/SchoolPortal'

const roles = ['admin', 'receptionist', 'teacher', 'classTeacher', 'principal', 'accountant', 'librarian', 'hr', 'student', 'parent']

function PortalRoute({ auth, onLogout }) {
  const { role } = useParams()
  if (!auth?.token || !auth?.user) return <Navigate to="/login" replace />
  if (!roles.includes(role) || auth.user.role !== role) {
    return <Navigate to={`/${auth.user.role}`} replace />
  }
  return <SchoolPortal auth={auth} onLogout={onLogout} />
}

function Application() {
  const [auth, setAuth] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const stored = localStorage.getItem('erpAuth')
    if (!stored) return
    try {
      const parsed = JSON.parse(stored)
      if (parsed?.token && roles.includes(parsed?.user?.role)) {
        setAuth(parsed)
      } else {
        localStorage.removeItem('erpAuth')
      }
    } catch {
      localStorage.removeItem('erpAuth')
    }
  }, [])

  function handleLogin(session) {
    setAuth(session)
    localStorage.setItem('erpAuth', JSON.stringify(session))
    navigate(`/${session.user.role}`, { replace: true })
  }

  function handleLogout() {
    setAuth(null)
    localStorage.removeItem('erpAuth')
    navigate('/', { replace: true })
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={auth?.token ? <Navigate to={`/${auth.user.role}`} replace /> : <LoginPage onLogin={handleLogin} />} />
      <Route path="/:role/*" element={<PortalRoute auth={auth} onLogout={handleLogout} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Application />
    </BrowserRouter>
  )
}
