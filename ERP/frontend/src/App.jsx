import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom'
import Landing from './components/Landing'
import LoginPage from './components/LoginPage'
import StudentDashboard from './components/StudentDashboard'
import TeacherDashboard from './components/TeacherDashboard'
import AdminDashboard from './components/AdminDashboard'

function RequireAuth({ user, children }){
  if(!user) return <Navigate to="/login" />
  return children
}

export default function App(){
  const [user, setUser] = useState(null)

  return (
    <BrowserRouter>
      <header className="site-header">
        <Link to="/">ERP</Link>
        <nav>
          <Link to="/">Home</Link>
          <Link to="/login">Login</Link>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Landing/>} />
          <Route path="/login" element={<LoginPage onLogin={setUser}/>} />
          <Route path="/student" element={<RequireAuth user={user}><StudentDashboard user={user} onLogout={()=>setUser(null)}/></RequireAuth>} />
          <Route path="/teacher" element={<RequireAuth user={user}><TeacherDashboard user={user} onLogout={()=>setUser(null)}/></RequireAuth>} />
          <Route path="/admin" element={<RequireAuth user={user}><AdminDashboard user={user} onLogout={()=>setUser(null)}/></RequireAuth>} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
