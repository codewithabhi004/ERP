import React from 'react'

export default function StudentDashboard({ user, onLogout }){
  return (
    <div className="container">
      <h2>Student Dashboard</h2>
      <p>Welcome, {user?.name || 'Student'}</p>
      <div className="card">
        <h3>Today's Classes</h3>
        <ul>
          <li>Math - 09:00</li>
          <li>Science - 10:30</li>
        </ul>
      </div>
      <div style={{marginTop:12}}>
        <button onClick={onLogout}>Logout</button>
      </div>
    </div>
  )
}
