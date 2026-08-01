import React from 'react'

export default function TeacherDashboard({ user, onLogout }){
  return (
    <div className="container">
      <h2>Teacher Dashboard</h2>
      <p>Welcome, {user?.name || 'Teacher'}</p>
      <div className="card">
        <h3>Assigned Classes</h3>
        <ul>
          <li>Class 8 - Science</li>
          <li>Class 9 - Physics</li>
        </ul>
      </div>
      <div style={{marginTop:12}}>
        <button onClick={onLogout}>Logout</button>
      </div>
    </div>
  )
}
