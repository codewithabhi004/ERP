import React from 'react'

export default function AdminDashboard({ user, onLogout }){
  return (
    <div className="container">
      <h2>Admin Dashboard</h2>
      <p>Welcome, {user?.name || 'Admin'}</p>
      <div className="card">
        <h3>System Overview</h3>
        <ul>
          <li>Total Students: 0</li>
          <li>Total Teachers: 0</li>
        </ul>
      </div>
      <div style={{marginTop:12}}>
        <button onClick={onLogout}>Logout</button>
      </div>
    </div>
  )
}
