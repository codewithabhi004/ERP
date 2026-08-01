import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function LoginPage({ onLogin }){
  const [role, setRole] = useState('student')
  const [name, setName] = useState('')
  const nav = useNavigate()

  function submit(e){
    e.preventDefault()
    const user = { name: name||role, role }
    onLogin(user)
    nav(`/${role}`)
  }

  return (
    <div className="container">
      <h2>Login (Mock)</h2>
      <form onSubmit={submit} className="card">
        <label>Role</label>
        <select value={role} onChange={e=>setRole(e.target.value)}>
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
          <option value="admin">Admin</option>
        </select>
        <label>Name</label>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name (optional)" />
        <div style={{marginTop:12}}>
          <button type="submit">Login</button>
        </div>
      </form>
    </div>
  )
}
