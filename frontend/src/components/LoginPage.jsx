import { useState } from 'react'
import { ArrowLeft, Eye, EyeOff, GraduationCap, LockKeyhole } from 'lucide-react'
import { Link } from 'react-router-dom'
import { isDemoEnabled, loginRequest } from '../lib/api'
import { demoAccounts, getDemoPassword } from '../lib/demo'
import Button from './ui/Button'

const roles = [
  ['admin', 'School administrator'],
  ['receptionist', 'Reception'],
  ['teacher', 'Teacher'],
  ['classTeacher', 'Class teacher'],
  ['principal', 'Principal'],
  ['accountant', 'Accounts'],
  ['librarian', 'Library'],
  ['hr', 'Human resources'],
  ['student', 'Student'],
  ['parent', 'Parent']
]

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const demoEnabled = isDemoEnabled()

  function selectRole(value) {
    setRole(value)
    if (demoEnabled) {
      const account = demoAccounts.find((item) => item.role === value)
      setUsername(account?.username || '')
      setPassword(value ? getDemoPassword() : '')
    }
  }

  function selectDemoUsername(value) {
    const account = demoAccounts.find((item) => item.username === value)
    setUsername(value)
    setRole(account?.role || '')
    setPassword(value ? getDemoPassword() : '')
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const data = await loginRequest({ username, password, ...(role ? { role } : {}) })
      onLogin(data)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-photo" aria-label="Students learning in a bright classroom">
        <Link to="/" className="login-brand">
          <span className="brand-mark"><GraduationCap size={23} /></span>
          <span>Evergreen<span className="brand-light"> Public School</span></span>
        </Link>
        <div className="login-photo-copy">
          <span className="eyebrow light-eyebrow">LEARNING, TOGETHER</span>
          <h1>A little more connected.<br />A lot more school.</h1>
          <p>One friendly place for classrooms, families and the people who make school happen.</p>
        </div>
        <span className="photo-credit">A new school day starts here</span>
      </section>

      <section className="login-panel">
        <Link to="/" className="back-link"><ArrowLeft size={16} /> Back to home</Link>
        <div className="login-card">
          <span className="eyebrow">WELCOME BACK</span>
          <h2>Sign in to your portal</h2>
          <p className="muted-copy">{demoEnabled ? 'Choose a role or username to fill in the public read-only demo credentials.' : 'Use the account provided by your school.'}</p>
          {demoEnabled && (
            <div className="demo-credentials">
              <strong>Public demo password: {getDemoPassword()}</strong>
              <span>Choose a role below to fill in its demo account automatically.</span>
              <small>Sample data only. Demo changes are not saved.</small>
            </div>
          )}
          <form className="login-form" onSubmit={submit}>
            <label htmlFor="role">I am signing in as</label>
            <select id="role" value={role} onChange={(event) => selectRole(event.target.value)}>
              <option value="">Choose your role (optional)</option>
              {roles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>

            <label htmlFor="username">Username</label>
            {demoEnabled ? (
              <select id="username" autoComplete="username" required value={username} onChange={(event) => selectDemoUsername(event.target.value)}>
                <option value="">Choose a demo username</option>
                {demoAccounts.map(({ username: accountUsername, name }) => (
                  <option key={accountUsername} value={accountUsername}>{accountUsername} — {name}</option>
                ))}
              </select>
            ) : (
              <input
                id="username"
                autoComplete="username"
                autoCapitalize="none"
                placeholder="e.g. teacher1"
                required
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            )}

            <div className="password-label">
              <label htmlFor="password">Password</label>
              <LockKeyhole size={15} aria-hidden="true" />
            </div>
            <div className="password-control">
              <input
                id="password"
                autoComplete="current-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <Button type="submit" className="login-submit" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in to Evergreen'}
            </Button>
          </form>
          <div className="login-help">
            <span className="help-dot" />
            <p>Need help signing in? Please contact the school office.</p>
          </div>
        </div>
        <p className="login-footer">A calm, connected school day starts here.</p>
      </section>
    </main>
  )
}
