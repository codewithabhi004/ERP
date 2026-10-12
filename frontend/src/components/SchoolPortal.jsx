import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, Bell, BookOpen, CalendarDays,
  Check, ChevronDown, ClipboardCheck, FileClock, FileText, GraduationCap,
  IndianRupee, LayoutDashboard, LogOut, Menu, Moon, Plus, ReceiptText, Search, Sun,
  ShieldCheck, Trash2, Pencil, UserRound, Users, Wallet, X
} from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { apiRequest, indianRupees, shortDate } from '../lib/api'
import Button from './ui/Button'

const navigation = {
  admin: ['overview', 'students', 'fees', 'attendance', 'academics', 'admissions', 'visitors', 'notices', 'staff'],
  principal: ['overview', 'students', 'attendance', 'fees', 'academics', 'notices', 'staff'],
  receptionist: ['overview', 'students', 'admissions', 'visitors', 'fees', 'notices'],
  teacher: ['overview', 'students', 'attendance', 'academics', 'notices'],
  classTeacher: ['overview', 'students', 'attendance', 'academics', 'notices'],
  accountant: ['overview', 'fees'],
  student: ['overview', 'attendance', 'academics', 'fees', 'notices'],
  parent: ['overview', 'attendance', 'academics', 'fees', 'notices'],
  librarian: ['overview', 'notices'],
  hr: ['overview', 'staff', 'notices']
}

const navDetails = {
  overview: { label: 'Overview', icon: LayoutDashboard },
  students: { label: 'Students', icon: Users },
  attendance: { label: 'Attendance', icon: ClipboardCheck },
  academics: { label: 'Academics', icon: BookOpen },
  fees: { label: 'Fees & receipts', icon: Wallet },
  admissions: { label: 'Admissions', icon: GraduationCap },
  visitors: { label: 'Visitor log', icon: UserRound },
  notices: { label: 'Notices', icon: Bell },
  staff: { label: 'Staff directory', icon: ShieldCheck }
}

const roleLabels = {
  admin: 'School administrator',
  principal: 'Principal',
  receptionist: 'Reception',
  teacher: 'Teacher',
  classTeacher: 'Class teacher',
  accountant: 'Accounts',
  student: 'Student',
  parent: 'Parent',
  librarian: 'Librarian',
  hr: 'Human resources'
}

function todayString() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())
}

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

function SectionTitle({ eyebrow, title, description, action }) {
  return (
    <div className="section-title">
      <div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{description && <p>{description}</p>}</div>
      {action}
    </div>
  )
}

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="empty-state">
      <span><Icon size={21} /></span><strong>{title}</strong><p>{description}</p>
    </div>
  )
}

function StatusPill({ value }) {
  const label = value || 'pending'
  return <span className={`status-pill status-${String(label).toLowerCase().replace(/[^a-z]+/g, '-')}`}>{String(label).replaceAll('_', ' ')}</span>
}

function MetricCard({ icon: Icon, label, value, detail, tone = 'green' }) {
  return (
    <article className="metric-card">
      <div className="metric-card-top"><span className={`metric-icon metric-${tone}`}><Icon size={18} /></span><ArrowUpRight className="metric-arrow" size={17} /></div>
      <span className="metric-label">{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  )
}

function DataTable({ columns, rows, empty }) {
  if (!rows?.length) return <EmptyState icon={FileText} title={empty || 'Nothing to show just yet'} description="Records will appear here as the school day moves along." />
  return (
    <div className="table-scroll"><table className="data-table"><thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead><tbody>
      {rows.map((row, index) => <tr key={row.id || row.studentId || row.studentCode || row.receiptNumber || row.invoiceNumber || index}>{columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : row[column.key] ?? '—'}</td>)}</tr>)}
    </tbody></table></div>
  )
}

function FormDialog({ dialog, busy, onClose, onSubmit, classes, students }) {
  if (!dialog) return null
  if (dialog.kind === 'id-card') {
    const student = dialog.student
    return (
      <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
        <motion.section className="dialog-card student-id-card" role="dialog" aria-modal="true" aria-label="Student identity card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="id-card-head"><span className="brand-mark"><GraduationCap size={23} /></span><div><strong>EVERGREEN PUBLIC SCHOOL</strong><small>STUDENT IDENTITY CARD</small></div><Button variant="ghost" onClick={onClose} aria-label="Close"><X size={17} /></Button></div>
          <div className="id-card-body"><div className="student-avatar">{initials(student.name)}</div><div><h3>{student.name}</h3><p>{student.className} · Roll {student.rollNumber || '—'}</p></div></div>
          <div className="id-card-number"><span>STUDENT ID</span><strong>{student.studentId}</strong></div>
          <p className="id-card-parent">Parent / guardian: {student.parentName || '—'}<br />Contact: {student.parentPhone || '—'}</p>
          <Button onClick={() => window.print()}><FileText size={16} /> Print ID card</Button>
        </motion.section>
      </div>
    )
  }

  const dialogs = {
    student: {
      title: 'Add a student',
      subtitle: 'Create a student login and issue a unique school ID.',
      fields: [
        ['name', 'Student name', 'text', true],
        ['username', 'Login username', 'text', true],
        ['password', 'Temporary password (10+ characters)', 'password', true],
        ['className', 'Class & section', 'select', true],
        ['rollNumber', 'Roll number', 'number', false],
        ['parentName', 'Parent / guardian name', 'text', true],
        ['parentPhone', 'Parent / guardian phone', 'tel', true],
        ['parentUsername', 'Parent portal username (optional)', 'text', false],
        ['parentPassword', 'Parent portal password (optional, 10+ characters)', 'password', false],
        ['dateOfBirth', 'Date of birth', 'date', false]
      ]
    },
    'student-edit': {
      title: 'Update student profile',
      subtitle: 'Keep this student’s class and parent details up to date.',
      fields: [['name', 'Student name', 'text', true], ['className', 'Class & section', 'select', true], ['rollNumber', 'Roll number', 'number', false], ['parentName', 'Parent / guardian name', 'text', false], ['parentPhone', 'Parent / guardian phone', 'tel', false]]
    },
    class: {
      title: 'Add a class section',
      subtitle: 'Create a section for any grade from Play through Class 12.',
      fields: [['grade', 'Grade', 'grade-select', true], ['section', 'Section (A–F)', 'section-select', true]]
    },
    invoice: {
      title: 'Create a fee invoice',
      subtitle: 'Amounts are recorded in Indian rupees (₹).',
      fields: [['studentId', 'Student', 'student-select', true], ['description', 'Fee description', 'text', true], ['amount', 'Amount (₹)', 'number', true], ['dueDate', 'Due date', 'date', true]]
    },
    payment: {
      title: 'Collect a fee payment',
      subtitle: `Outstanding balance: ${indianRupees(dialog.outstanding)}`,
      fields: [['amount', `Collect up to ${indianRupees(dialog.outstanding)}`, 'number', true], ['method', 'Payment method', 'select-method', true]]
    },
    admission: {
      title: 'Record an admission enquiry',
      subtitle: 'Add a family enquiry so reception can follow up.',
      fields: [['applicantName', 'Student / applicant name', 'text', true], ['parentName', 'Parent / guardian name', 'text', true], ['phone', 'Contact number', 'tel', true], ['email', 'Email address (optional)', 'email', false], ['grade', 'Class applying for', 'grade-select', true], ['message', 'Notes', 'textarea', false]]
    },
    visitor: {
      title: 'Check in a visitor',
      subtitle: 'A small note helps the school office keep track.',
      fields: [['visitorName', 'Visitor name', 'text', true], ['phone', 'Contact number', 'tel', false], ['purpose', 'Reason for visit', 'text', true], ['host', 'Meeting with', 'text', false]]
    },
    notice: {
      title: 'Share a school notice',
      subtitle: 'Write a clear update for the right audience.',
      fields: [['title', 'Notice title', 'text', true], ['body', 'Message', 'textarea', true], ['audience', 'Who should see this?', 'audience-select', true]]
    },
    homework: {
      title: 'Post classwork',
      subtitle: 'Add an assignment for your assigned class.',
      fields: [['title', 'Assignment title', 'text', true], ['subject', 'Subject', 'text', true], ['classId', 'Class section', 'class-select', true], ['dueDate', 'Due date', 'date', true], ['description', 'Instructions', 'textarea', false]]
    },
    grade: {
      title: 'Record a student mark',
      subtitle: 'Save the score in the student academic record.',
      fields: [['studentId', 'Student', 'student-select', true], ['subject', 'Subject', 'text', true], ['term', 'Term / assessment', 'text', true], ['score', 'Marks earned', 'number', true], ['maxScore', 'Maximum marks', 'number', true]]
    },
    staff: {
      title: 'Create a staff account',
      subtitle: 'A separate, password-protected sign-in for a colleague.',
      fields: [['name', 'Staff member name', 'text', true], ['username', 'Login username', 'text', true], ['email', 'Work email (optional)', 'email', false], ['password', 'Temporary password (10+ characters)', 'password', true], ['role', 'School role', 'staff-role-select', true], ['className', 'Assigned class (optional)', 'select', false]]
    }
  }
  const current = dialogs[dialog.kind]
  if (!current) return null

  function renderField([name, label, type, required]) {
    const id = `dialog-${name}`
    const existing = dialog.student?.[name]
    const defaultValue = name === 'dateOfBirth' && existing
      ? new Date(existing).toISOString().slice(0, 10)
      : existing ?? ''
    const props = { id, name, required, defaultValue, ...(name === 'amount' ? { min: 1, step: '0.01' } : {}) }
    if (type === 'textarea') return <label className="form-field" key={name} htmlFor={id}>{label}<textarea {...props} rows={3} /></label>
    if (type === 'select') {
      return <label className="form-field" key={name} htmlFor={id}>{label}<select {...props}><option value="">Select class</option>{classes.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}</select></label>
    }
    if (type === 'student-select') {
      return <label className="form-field" key={name} htmlFor={id}>{label}<select {...props}><option value="">Select student</option>{students.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.studentId}</option>)}</select></label>
    }
    if (type === 'class-select') {
      return <label className="form-field" key={name} htmlFor={id}>{label}<select {...props}><option value="">Select class</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    }
    if (type === 'select-method') {
      return <label className="form-field" key={name} htmlFor={id}>{label}<select {...props}><option value="Cash">Cash</option><option value="UPI">UPI</option><option value="Card">Card</option><option value="Bank transfer">Bank transfer</option><option value="Cheque">Cheque</option></select></label>
    }
    if (type === 'audience-select') {
      return <label className="form-field" key={name} htmlFor={id}>{label}<select {...props}><option value="all">Everyone</option><option value="students">Students</option><option value="parents">Parents</option><option value="staff">Staff</option></select></label>
    }
    if (type === 'grade-select') {
      return <label className="form-field" key={name} htmlFor={id}>{label}<select {...props}><option value="">Choose class</option>{['Play', 'Nursery', 'LKG', 'UKG', ...Array.from({ length: 12 }, (_value, index) => String(index + 1))].map((grade) => <option key={grade} value={grade}>{grade}</option>)}</select></label>
    }
    if (type === 'section-select') {
      return <label className="form-field" key={name} htmlFor={id}>{label}<select {...props}><option value="">Choose section</option>{['A', 'B', 'C', 'D', 'E', 'F'].map((section) => <option key={section} value={section}>{section}</option>)}</select></label>
    }
    if (type === 'staff-role-select') {
      return <label className="form-field" key={name} htmlFor={id}>{label}<select {...props}>{[['receptionist', 'Reception'], ['teacher', 'Teacher'], ['classTeacher', 'Class teacher'], ['principal', 'Principal'], ['accountant', 'Accounts'], ['librarian', 'Library'], ['hr', 'Human resources']].map(([value, title]) => <option key={value} value={value}>{title}</option>)}</select></label>
    }
    return <label className="form-field" key={name} htmlFor={id}>{label}<input {...props} type={type} autoComplete={type === 'password' ? 'new-password' : 'off'} /></label>
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <motion.section className="dialog-card" role="dialog" aria-modal="true" aria-labelledby="dialog-title" initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }}>
        <div className="dialog-heading"><div><span className="eyebrow">EVERGREEN SCHOOL PORTAL</span><h2 id="dialog-title">{current.title}</h2><p>{current.subtitle}</p></div><Button variant="ghost" onClick={onClose} aria-label="Close dialog"><X size={19} /></Button></div>
        <form className="dialog-form" onSubmit={onSubmit}>
          <div className="form-grid">{current.fields.map(renderField)}</div>
          {dialog.error && <p className="form-error" role="alert">{dialog.error}</p>}
          <div className="dialog-actions"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save securely'}</Button></div>
        </form>
      </motion.section>
    </div>
  )
}

export default function SchoolPortal({ auth, onLogout }) {
  const location = useLocation()
  const navigate = useNavigate()
  const role = auth.user.role
  const roleNavigation = navigation[role] || navigation.student
  const routeSection = location.pathname.split('/')[2] || 'overview'
  const activeSection = roleNavigation.includes(routeSection) ? routeSection : 'overview'
  const [mobileNav, setMobileNav] = useState(false)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('erpTheme') === 'dark')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [flash, setFlash] = useState('')
  const [dialog, setDialog] = useState(null)
  const [refresh, setRefresh] = useState(0)
  const [search, setSearch] = useState('')
  const [selectedDate, setSelectedDate] = useState(todayString())
  const [selectedClassId, setSelectedClassId] = useState('')
  const [attendanceDraft, setAttendanceDraft] = useState({})
  const [data, setData] = useState({
    dashboard: null, students: [], fees: [], attendance: { records: [], classes: [] },
    academics: { homework: [], grades: [], classes: [] }, admissions: [], visitors: [], notices: [], staff: []
  })

  useEffect(() => {
    let current = true
    async function loadSection() {
      setLoading(true)
      setLoadError('')
      try {
        const dashboardResponse = await apiRequest('/dashboard', auth.token)
        const jobs = [Promise.resolve(['dashboard', dashboardResponse])]
        const sections = dashboardResponse.classSections || []
        const nextClassId = selectedClassId || sections[0]?.id || ''

        if (['students', 'fees', 'attendance', 'academics'].includes(activeSection)) {
          jobs.push(apiRequest(`/students${search && activeSection === 'students' ? `?search=${encodeURIComponent(search)}` : ''}`, auth.token).then((response) => ['students', response.students]))
        }
        if (activeSection === 'fees') jobs.push(apiRequest('/fees', auth.token).then((response) => ['fees', response.invoices]))
        if (activeSection === 'attendance') {
          const query = new URLSearchParams({ date: selectedDate })
          if (nextClassId) query.set('classId', nextClassId)
          jobs.push(apiRequest(`/attendance?${query}`, auth.token).then((response) => ['attendance', response]))
        }
        if (activeSection === 'academics') jobs.push(apiRequest('/academics', auth.token).then((response) => ['academics', response]))
        if (activeSection === 'admissions') jobs.push(apiRequest('/admissions', auth.token).then((response) => ['admissions', response.inquiries]))
        if (activeSection === 'visitors') jobs.push(apiRequest('/visitors', auth.token).then((response) => ['visitors', response.visitors]))
        if (activeSection === 'notices') jobs.push(apiRequest('/notices', auth.token).then((response) => ['notices', response.notices]))
        if (activeSection === 'staff') jobs.push(apiRequest('/users', auth.token).then((response) => ['staff', response.users]))

        const results = await Promise.all(jobs)
        if (!current) return
        setData((previous) => results.reduce((next, [key, value]) => ({ ...next, [key]: value }), previous))
        if (!selectedClassId && nextClassId) setSelectedClassId(String(nextClassId))
      } catch (error) {
        if (current) setLoadError(error.message)
      } finally {
        if (current) setLoading(false)
      }
    }
    loadSection()
    return () => { current = false }
  }, [activeSection, auth.token, refresh, search, selectedClassId, selectedDate])

  useEffect(() => {
    setAttendanceDraft(Object.fromEntries(data.attendance.records.map((record) => [record.studentId, record.status])))
  }, [data.attendance.records])

  const filteredStudents = useMemo(() => data.students.filter((student) => (
    !search || `${student.name} ${student.studentId} ${student.className}`.toLowerCase().includes(search.toLowerCase())
  )), [data.students, search])
  const displayName = auth.user.name || auth.user.username
  const todayLabel = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())

  function goToSection(section) {
    navigate(section === 'overview' ? `/${role}` : `/${role}/${section}`)
    setMobileNav(false)
    setFlash('')
  }

  async function submitDialog(event) {
    event.preventDefault()
    setBusy(true)
    setDialog((previous) => ({ ...previous, error: '' }))
    const values = Object.fromEntries(new FormData(event.currentTarget).entries())
    try {
      const json = (value) => JSON.stringify(value)
      switch (dialog.kind) {
        case 'student':
          await apiRequest('/students', auth.token, { method: 'POST', body: json({
            ...values,
            parentUsername: values.parentUsername || undefined,
            parentPassword: values.parentPassword || undefined,
            rollNumber: values.rollNumber ? Number(values.rollNumber) : undefined
          }) })
          setFlash('Student profile created and school ID issued.')
          break
        case 'student-edit':
          await apiRequest(`/students/${dialog.student.id}`, auth.token, { method: 'PATCH', body: json({ ...values, rollNumber: values.rollNumber ? Number(values.rollNumber) : undefined }) })
          setFlash('Student profile updated.')
          break
        case 'class':
          await apiRequest('/classes', auth.token, { method: 'POST', body: json(values) })
          setFlash('Class section created successfully.')
          break
        case 'invoice':
          await apiRequest('/fees', auth.token, { method: 'POST', body: json({ ...values, studentId: Number(values.studentId), amount: Number(values.amount) }) })
          setFlash('Fee invoice created successfully.')
          break
        case 'payment': {
          const result = await apiRequest(`/fees/${dialog.invoice.id}/payments`, auth.token, { method: 'POST', body: json({ amount: Number(values.amount), method: values.method }) })
          setFlash(`Payment recorded. Receipt ${result.payment.receiptNumber} is ready.`)
          break
        }
        case 'admission':
          await apiRequest('/admissions', auth.token, { method: 'POST', body: json(values) })
          setFlash('Admission enquiry added to the follow-up list.')
          break
        case 'visitor':
          await apiRequest('/visitors', auth.token, { method: 'POST', body: json(values) })
          setFlash('Visitor checked in at reception.')
          break
        case 'notice':
          await apiRequest('/notices', auth.token, { method: 'POST', body: json(values) })
          setFlash('School notice published.')
          break
        case 'homework':
          await apiRequest('/homework', auth.token, { method: 'POST', body: json({ ...values, classId: Number(values.classId) }) })
          setFlash('Classwork assigned successfully.')
          break
        case 'grade':
          await apiRequest('/grades', auth.token, { method: 'POST', body: json({ ...values, studentId: Number(values.studentId), score: Number(values.score), maxScore: Number(values.maxScore) }) })
          setFlash('Student marks saved to the academic record.')
          break
        case 'staff':
          await apiRequest('/users', auth.token, { method: 'POST', body: json({ ...values, email: values.email || undefined, className: values.className || undefined }) })
          setFlash('Staff account created.')
          break
        default:
          break
      }
      setDialog(null)
      setRefresh((value) => value + 1)
    } catch (error) {
      setDialog((previous) => ({ ...previous, error: error.message }))
    } finally {
      setBusy(false)
    }
  }

  async function saveAttendance() {
    const classId = Number(selectedClassId)
    const className = data.dashboard?.classSections.find((item) => Number(item.id) === classId)?.name
    const records = data.students.filter((student) => student.className === className && attendanceDraft[student.id])
      .map((student) => ({ studentId: student.id, status: attendanceDraft[student.id] }))
    if (!classId || !records.length) {
      setLoadError('Choose a class and mark at least one student before saving attendance.')
      return
    }
    setBusy(true)
    setLoadError('')
    setFlash('')
    try {
      const result = await apiRequest('/attendance', auth.token, {
        method: 'POST',
        body: JSON.stringify({ classId, date: selectedDate, records })
      })
      setFlash(`${result.count} attendance record${result.count === 1 ? '' : 's'} saved.`)
      setRefresh((value) => value + 1)
    } catch (error) {
      setLoadError(error.message)
    } finally {
      setBusy(false)
    }
  }

  async function updateAdmission(id, status) {
    setBusy(true)
    setFlash('')
    try {
      await apiRequest(`/admissions/${id}`, auth.token, { method: 'PATCH', body: JSON.stringify({ status }) })
      setFlash('Admission follow-up updated.')
      setRefresh((value) => value + 1)
    } catch (error) {
      setLoadError(error.message)
    } finally {
      setBusy(false)
    }
  }

  async function withdrawStudent(student) {
    if (!window.confirm(`Withdraw ${student.name} from the active school register? Their record will be retained for school history.`)) return
    try {
      await apiRequest(`/students/${student.id}`, auth.token, { method: 'DELETE' })
      setFlash(`${student.name} is no longer on the active register.`)
      setRefresh((value) => value + 1)
    } catch (error) {
      setLoadError(error.message)
    }
  }

  async function deactivateStaff(user) {
    if (!window.confirm(`Deactivate ${user.name}'s sign-in? Existing school records will be retained.`)) return
    try {
      await apiRequest(`/users/${user.id}`, auth.token, { method: 'DELETE' })
      setFlash(`${user.name}'s account was deactivated.`)
      setRefresh((value) => value + 1)
    } catch (error) {
      setLoadError(error.message)
    }
  }

  function toggleTheme() {
    const nextTheme = darkMode ? 'light' : 'dark'
    localStorage.setItem('erpTheme', nextTheme)
    setDarkMode(nextTheme === 'dark')
  }

  const dashboard = data.dashboard
  const metrics = dashboard?.metrics || {}
  const canManageStudents = role === 'admin'
  const canCollectFees = ['admin', 'accountant', 'receptionist'].includes(role)
  const canCreateInvoice = ['admin', 'accountant'].includes(role)
  const canMarkAttendance = ['teacher', 'classTeacher'].includes(role)
  const canCreateNotice = ['admin', 'principal', 'teacher', 'classTeacher'].includes(role)
  const canCreateHomework = ['teacher', 'classTeacher'].includes(role)
  const canCreateStaff = role === 'admin'
  const outstandingTotal = data.fees.reduce((total, invoice) => total + Number(invoice.amount) - Number(invoice.paidAmount), 0)
  const collectedTotal = data.fees.reduce((total, invoice) => total + Number(invoice.paidAmount), 0)

  return (
    <div className={`portal-shell ${darkMode ? 'dark-mode' : ''}`}>
      {mobileNav && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
      <aside className={`portal-sidebar ${mobileNav ? 'sidebar-mobile-open' : ''}`}>
        <Link to={`/${role}`} onClick={() => goToSection('overview')} className="portal-brand">
          <span className="portal-brand-icon"><GraduationCap size={21} /></span>
          <span><strong>EVERGREEN</strong><small>PUBLIC SCHOOL</small></span>
        </Link>
        <div className="school-switcher"><span className="switcher-icon"><ShieldCheck size={15} /></span><span><strong>Evergreen Public School</strong><small>New Delhi, India</small></span><ChevronDown size={14} /></div>
        <span className="sidebar-caption">SCHOOL WORKSPACE</span>
        <nav className="portal-nav" aria-label="School portal sections">
          {roleNavigation.map((section) => {
            const item = navDetails[section]
            const Icon = item.icon
            return <button key={section} className={`nav-item ${activeSection === section ? 'nav-item-active' : ''}`} onClick={() => goToSection(section)}><Icon size={18} /><span>{item.label}</span>{activeSection === section && <span className="nav-indicator" />}</button>
          })}
        </nav>
        <div className="sidebar-tip">
          <span className="tip-icon"><Bell size={16} /></span>
          <strong>A small note, a big difference.</strong>
          <p>Keep your school community in the loop.</p>
          {canCreateNotice && <button onClick={() => setDialog({ kind: 'notice' })}>Write a notice <ArrowRight size={14} /></button>}
        </div>
        <div className="sidebar-user">
          <span className="user-avatar">{initials(displayName)}</span>
          <span className="sidebar-user-copy"><strong>{displayName}</strong><small>{roleLabels[role] || role}</small></span>
          <button className="logout-icon" title="Sign out" onClick={onLogout}><LogOut size={17} /></button>
        </div>
      </aside>

      <main className="portal-main">
        <header className="portal-topbar">
          <div className="topbar-left">
            <Button className="mobile-menu-button" variant="ghost" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={19} /></Button>
            <span className="breadcrumb">School workspace <ChevronDown size={14} /> <strong>{navDetails[activeSection]?.label}</strong></span>
          </div>
          <div className="topbar-right"><span className="school-day"><span /> School day</span><span className="topbar-date"><CalendarDays size={16} />{todayLabel}</span><Button variant="ghost" className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${darkMode ? 'light' : 'dark'} mode`} title={`Switch to ${darkMode ? 'light' : 'dark'} mode`}>{darkMode ? <Sun size={17} /> : <Moon size={17} />}</Button><span className="topbar-avatar">{initials(displayName)}</span></div>
        </header>

        <div className="portal-content">
          {auth.demo && <div className="demo-readonly-banner" role="status">Public read-only demo · Fictional records · Changes are not saved</div>}
          {loadError && <div className="inline-alert" role="alert"><span>{loadError}</span><button onClick={() => setLoadError('')} aria-label="Dismiss message"><X size={16} /></button></div>}
          {flash && <div className="inline-success" role="status"><Check size={16} /><span>{flash}</span><button onClick={() => setFlash('')} aria-label="Dismiss message"><X size={16} /></button></div>}
          {loading && !dashboard && <div className="loading-panel"><span className="loading-spinner" /> Getting your school day ready…</div>}

          {activeSection === 'overview' && !loading && dashboard && (
            <Overview
              dashboard={dashboard}
              role={role}
              name={displayName}
              sections={roleNavigation}
              goToSection={goToSection}
              openDialog={setDialog}
            />
          )}

          {activeSection === 'students' && (
            <section>
              <SectionTitle eyebrow="STUDENT DIRECTORY" title="Our students" description="Search the school register and student profiles." action={canManageStudents && <Button onClick={() => setDialog({ kind: 'student' })}><Plus size={16} /> Add student</Button>} />
              <div className="toolbar-card"><label className="search-field"><Search size={17} /><input aria-label="Search students" placeholder="Search by name, class or student ID…" value={search} onChange={(event) => setSearch(event.target.value)} /></label><span>{filteredStudents.length} student{filteredStudents.length === 1 ? '' : 's'}</span></div>
              <div className="data-card"><DataTable empty="No student profiles found" columns={[
                { key: 'student', label: 'Student', render: (item) => <span className="table-person"><span className="person-avatar">{initials(item.name)}</span><span><strong>{item.name}</strong><small>{item.studentId}</small></span></span> },
                { key: 'className', label: 'Class & section' },
                { key: 'rollNumber', label: 'Roll no.' },
                { key: 'parentName', label: 'Parent / guardian', render: (item) => <span>{item.parentName || '—'}<small className="table-subline">{item.parentPhone}</small></span> },
                { key: 'status', label: 'Status', render: (item) => <StatusPill value={item.status} /> },
                { key: 'actions', label: '', render: (item) => <span className="table-actions"><Button variant="ghost" className="small-action" onClick={() => setDialog({ kind: 'id-card', student: item })}><FileText size={15} /> ID card</Button>{canManageStudents && <Button variant="ghost" className="small-action" onClick={() => setDialog({ kind: 'student-edit', student: item })} aria-label={`Edit ${item.name}`}><Pencil size={14} /></Button>}{canManageStudents && <Button variant="ghost" className="small-action action-danger" onClick={() => withdrawStudent(item)} aria-label={`Withdraw ${item.name}`}><Trash2 size={14} /></Button>}</span> }
              ]} rows={filteredStudents} /></div>
            </section>
          )}

          {activeSection === 'fees' && (
            <section>
              <SectionTitle eyebrow="SCHOOL ACCOUNTS" title={role === 'student' || role === 'parent' ? 'Fee account' : 'Fees & receipts'} description="Clear balances and a proper paper trail, always in Indian rupees." action={canCreateInvoice && <Button onClick={() => setDialog({ kind: 'invoice' })}><Plus size={16} /> New invoice</Button>} />
              <div className="fee-summary-row">
                <div className="summary-strip"><span className="metric-icon metric-amber"><ReceiptText size={18} /></span><span><small>Outstanding balance</small><strong>{indianRupees(outstandingTotal)}</strong></span></div>
                <div className="summary-strip"><span className="metric-icon metric-green"><IndianRupee size={18} /></span><span><small>Collected to date</small><strong>{indianRupees(collectedTotal)}</strong></span></div>
              </div>
              <div className="data-card"><DataTable empty="No fee invoices have been issued" columns={[
                { key: 'invoiceNumber', label: 'Invoice' },
                { key: 'student', label: 'Student', render: (item) => <span><strong>{item.studentName}</strong><small className="table-subline">{item.studentCode} · {item.className}</small></span> },
                { key: 'description', label: 'Description' },
                { key: 'amount', label: 'Total', render: (item) => <strong>{indianRupees(item.amount)}</strong> },
                { key: 'paidAmount', label: 'Due', render: (item) => indianRupees(Number(item.amount) - Number(item.paidAmount)) },
                { key: 'dueDate', label: 'Due date', render: (item) => shortDate(item.dueDate) },
                { key: 'status', label: 'Status', render: (item) => <StatusPill value={item.status} /> },
                { key: 'collect', label: '', render: (item) => canCollectFees && Number(item.amount) > Number(item.paidAmount) && <Button variant="secondary" className="small-action" onClick={() => setDialog({ kind: 'payment', invoice: item, outstanding: Number(item.amount) - Number(item.paidAmount) })}><IndianRupee size={15} /> Collect</Button> }
              ]} rows={data.fees} /></div>
              {data.fees.some((invoice) => invoice.payments?.length) && <PaymentReceipts invoices={data.fees} />}
            </section>
          )}

          {activeSection === 'attendance' && (
            <section>
              <SectionTitle eyebrow="CLASS REGISTER" title="Daily attendance" description={canMarkAttendance ? 'Mark the register for a class you are assigned to.' : 'A quick, clear view of recorded attendance.'} action={canMarkAttendance && <Button onClick={saveAttendance} disabled={busy}><Check size={16} /> Save register</Button>} />
              <div className="toolbar-card">
                <label className="toolbar-filter">Class section<select value={selectedClassId} onChange={(event) => setSelectedClassId(event.target.value)}>{(dashboard?.classSections || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label className="toolbar-filter">School date<input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /></label>
                <span className="attendance-legend"><i className="legend-present" /> Present <i className="legend-absent" /> Absent</span>
              </div>
              <div className="data-card"><DataTable empty="No students are assigned to this class yet" columns={[
                { key: 'rollNumber', label: 'Roll no.' },
                { key: 'student', label: 'Student', render: (item) => <span className="table-person"><span className="person-avatar">{initials(item.name)}</span><span><strong>{item.name}</strong><small>{item.studentId}</small></span></span> },
                { key: 'className', label: 'Class' },
                { key: 'status', label: 'Register', render: (item) => canMarkAttendance
                  ? <select aria-label={`Attendance status for ${item.name}`} className={`attendance-select attendance-${attendanceDraft[item.id] || 'unmarked'}`} value={attendanceDraft[item.id] || ''} onChange={(event) => setAttendanceDraft((previous) => ({ ...previous, [item.id]: event.target.value }))}><option value="">Not marked</option><option value="present">Present</option><option value="absent">Absent</option><option value="late">Late</option><option value="excused">Excused</option></select>
                  : <StatusPill value={data.attendance.records.find((record) => record.studentId === item.id)?.status || 'not marked'} /> }
              ]} rows={data.students.filter((student) => student.className === dashboard?.classSections.find((item) => Number(item.id) === Number(selectedClassId))?.name)} /></div>
            </section>
          )}

          {activeSection === 'academics' && (
            <section>
              <SectionTitle eyebrow="CLASSROOM & LEARNING" title="Academics" description="Class assignments, homework and marks for your school." action={role === 'admin' ? <Button onClick={() => setDialog({ kind: 'class' })}><Plus size={16} /> Add class section</Button> : canCreateHomework && <Button onClick={() => setDialog({ kind: 'homework' })}><Plus size={16} /> Assign homework</Button>} />
              {canCreateHomework && <div className="quick-action-bar"><span><ClipboardCheck size={18} /><strong>Marks & assessments</strong><small>Keep a student's progress up to date.</small></span><Button variant="secondary" onClick={() => setDialog({ kind: 'grade' })}>Enter marks <ArrowRight size={15} /></Button></div>}
              <div className="academics-grid">
                <div className="panel-card"><div className="panel-heading"><span><BookOpen size={18} /></span><div><h3>Homework & assignments</h3><p>Upcoming classroom work</p></div></div>
                  {data.academics.homework.length ? <div className="assignment-list">{data.academics.homework.map((item) => <article className="assignment-item" key={item._id}><span className="assignment-icon"><FileClock size={17} /></span><div><strong>{item.title}</strong><small>{item.subject} · Class {item.className} · Due {shortDate(item.dueDate)}</small>{item.description && <p>{item.description}</p>}</div></article>)}</div> : <EmptyState icon={BookOpen} title="No classwork yet" description="Assignments from your teachers will appear here." />}
                </div>
                <div className="panel-card"><div className="panel-heading"><span><GraduationCap size={18} /></span><div><h3>Marks & progress</h3><p>Recorded assessment results</p></div></div>
                  {data.academics.grades.length ? <DataTable columns={[
                    { key: 'studentName', label: 'Student' },
                    { key: 'subject', label: 'Subject' },
                    { key: 'term', label: 'Assessment' },
                    { key: 'score', label: 'Score', render: (item) => `${item.score} / ${item.maxScore}` }
                  ]} rows={data.academics.grades} empty="No marks recorded" /> : <EmptyState icon={GraduationCap} title="A fresh start" description="Student marks and progress records will show up here." />}
                </div>
              </div>
            </section>
          )}

          {activeSection === 'admissions' && (
            <section>
              <SectionTitle eyebrow="FRONT OFFICE" title="Admission enquiries" description="Follow every family enquiry from first hello to enrolment." action={<Button onClick={() => setDialog({ kind: 'admission' })}><Plus size={16} /> New enquiry</Button>} />
              <div className="data-card"><DataTable empty="No admission enquiries yet" columns={[
                { key: 'applicantName', label: 'Applicant', render: (item) => <span><strong>{item.applicantName}</strong><small className="table-subline">Applying for class {item.grade}</small></span> },
                { key: 'parentName', label: 'Parent / guardian' },
                { key: 'phone', label: 'Contact' },
                { key: 'createdAt', label: 'Received', render: (item) => shortDate(item.createdAt) },
                { key: 'status', label: 'Follow-up', render: (item) => <select className="inline-select" disabled={busy} value={item.status} onChange={(event) => updateAdmission(item.id, event.target.value)} aria-label={`Update ${item.applicantName} admission follow-up`}><option value="new">New enquiry</option><option value="contacted">Contacted</option><option value="tour_scheduled">Tour scheduled</option><option value="enrolled">Enrolled</option><option value="declined">Closed</option></select> }
              ]} rows={data.admissions} /></div>
            </section>
          )}

          {activeSection === 'visitors' && (
            <section>
              <SectionTitle eyebrow="SCHOOL FRONT DESK" title="Visitor register" description="See who is on campus and keep a clear front-desk record." action={<Button onClick={() => setDialog({ kind: 'visitor' })}><Plus size={16} /> Check in visitor</Button>} />
              <div className="data-card"><DataTable empty="Your visitor register is clear" columns={[
                { key: 'visitorName', label: 'Visitor', render: (item) => <span className="table-person"><span className="person-avatar">{initials(item.visitorName)}</span><span><strong>{item.visitorName}</strong><small>{item.phone}</small></span></span> },
                { key: 'purpose', label: 'Reason for visit' },
                { key: 'host', label: 'Meeting with' },
                { key: 'checkedInAt', label: 'Checked in', render: (item) => new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short' }).format(new Date(item.checkedInAt)) },
                { key: 'status', label: 'Status', render: (item) => <StatusPill value={item.checkedOutAt ? 'checked out' : 'on campus'} /> }
              ]} rows={data.visitors} /></div>
            </section>
          )}

          {activeSection === 'notices' && (
            <section>
              <SectionTitle eyebrow="SCHOOL COMMUNITY" title="Notices & updates" description="A shared place for the messages that matter." action={canCreateNotice && <Button onClick={() => setDialog({ kind: 'notice' })}><Plus size={16} /> Write a notice</Button>} />
              {data.notices.length ? <div className="notice-grid">{data.notices.map((notice) => <article className="notice-card" key={notice._id}><span className="notice-symbol"><Bell size={17} /></span><span className="notice-date">{shortDate(notice.publishedAt || notice.createdAt)}</span><h3>{notice.title}</h3><p>{notice.body}</p><small>Shared by {notice.authorName}</small></article>)}</div> : <div className="data-card"><EmptyState icon={Bell} title="A little quiet for now" description="School announcements and classroom updates will appear here." /></div>}
            </section>
          )}

          {activeSection === 'staff' && (
            <section>
              <SectionTitle eyebrow="PEOPLE WHO MAKE SCHOOL HAPPEN" title="Staff directory" description="Find the right person across Evergreen school." action={canCreateStaff && <Button onClick={() => setDialog({ kind: 'staff' })}><Plus size={16} /> Add staff account</Button>} />
              <div className="data-card"><DataTable empty="No staff profiles found" columns={[
                { key: 'person', label: 'Colleague', render: (item) => <span className="table-person"><span className="person-avatar person-green">{initials(item.name)}</span><span><strong>{item.name}</strong><small>{item.username}</small></span></span> },
                { key: 'role', label: 'School role', render: (item) => <span>{roleLabels[item.role] || item.role}{item.taughtSections?.length > 0 && <small className="table-subline">Class {item.taughtSections.map((section) => `${section.grade}${section.section}`).join(', ')}</small>}</span> },
                { key: 'email', label: 'Work email' },
                { key: 'actions', label: '', render: (item) => canCreateStaff && item.id !== auth.user.id && <Button variant="ghost" className="small-action action-danger" onClick={() => deactivateStaff(item)} aria-label={`Deactivate ${item.name}`}><Trash2 size={14} /> Deactivate</Button> }
              ]} rows={data.staff} /></div>
            </section>
          )}
          {loading && dashboard && <div className="section-loading"><span className="loading-spinner" /> Refreshing your records…</div>}
        </div>
        <footer className="portal-footer"><span>EVERGREEN PUBLIC SCHOOL</span><span>Growing together, every day.</span><span>All amounts in ₹ INR</span></footer>
      </main>

      <AnimatePresence><FormDialog key={dialog?.kind || 'closed'} dialog={dialog} busy={busy} onClose={() => setDialog(null)} onSubmit={submitDialog} classes={dashboard?.classSections || []} students={data.students} /></AnimatePresence>
    </div>
  )
}

function Overview({ dashboard, role, name, sections, goToSection, openDialog }) {
  const metrics = dashboard.metrics || {}
  const roleIsFamily = role === 'parent' || role === 'student'
  const isAdmin = role === 'admin' || role === 'principal'
  const isAccounts = role === 'accountant'
  const isTeacher = role === 'teacher' || role === 'classTeacher'
  const isReception = role === 'receptionist'
  const cards = roleIsFamily ? [
    { icon: ClipboardCheck, label: 'Attendance this month', value: `${metrics.attendancePercent || 0}%`, detail: 'Based on recorded class attendance', tone: 'green' },
    { icon: Wallet, label: 'Fee balance', value: indianRupees(dashboard.recentInvoices.reduce((total, invoice) => total + Number(invoice.amount) - Number(invoice.paidAmount), 0)), detail: 'Your remaining fee balance', tone: 'amber' },
    { icon: BookOpen, label: 'Upcoming homework', value: dashboard.homework.length, detail: 'Class assignments to keep an eye on', tone: 'blue' }
  ] : isAdmin ? [
    { icon: Users, label: 'Enrolled students', value: metrics.students ?? 0, detail: 'Active student profiles', tone: 'green' },
    { icon: UserRound, label: 'School staff', value: metrics.staff ?? 0, detail: 'People supporting the school', tone: 'blue' },
    { icon: ClipboardCheck, label: 'Attendance today', value: `${metrics.attendancePercent ?? 0}%`, detail: `${metrics.presentToday ?? 0} present in the register`, tone: 'amber' },
    { icon: IndianRupee, label: 'Fees outstanding', value: indianRupees(metrics.outstandingFees), detail: `${indianRupees(metrics.collectedFees)} collected to date`, tone: 'rose' }
  ] : isAccounts ? [
    { icon: IndianRupee, label: 'Collected to date', value: indianRupees(metrics.collectedFees), detail: 'Recorded school collections', tone: 'green' },
    { icon: Wallet, label: 'Fees outstanding', value: indianRupees(metrics.outstandingFees), detail: 'Across issued school invoices', tone: 'amber' },
    { icon: ReceiptText, label: 'Invoices issued', value: metrics.invoices ?? 0, detail: 'Student accounts on record', tone: 'blue' }
  ] : isTeacher ? [
    { icon: Users, label: 'Students in my classes', value: metrics.students ?? 0, detail: `${dashboard.classSections.length} assigned class section${dashboard.classSections.length === 1 ? '' : 's'}`, tone: 'green' },
    { icon: ClipboardCheck, label: 'Attendance today', value: `${metrics.attendancePercent ?? 0}%`, detail: `${metrics.presentToday ?? 0} students marked present`, tone: 'amber' },
    { icon: BookOpen, label: 'Upcoming classwork', value: dashboard.homework.length, detail: 'Assignments assigned to your classes', tone: 'blue' }
  ] : isReception ? [
    { icon: GraduationCap, label: 'New enquiries', value: metrics.openAdmissions ?? 0, detail: 'Families awaiting follow-up', tone: 'green' },
    { icon: UserRound, label: 'Visitors today', value: metrics.visitorsOnCampus ?? 0, detail: 'Currently signed in at reception', tone: 'blue' },
    { icon: Users, label: 'Student directory', value: metrics.students ?? 0, detail: 'Active student profiles', tone: 'amber' }
  ] : [
    { icon: Users, label: 'Students', value: metrics.students ?? '—', detail: 'The people at the heart of our school', tone: 'green' },
    { icon: ClipboardCheck, label: 'Attendance today', value: `${metrics.attendancePercent ?? 0}%`, detail: 'From today’s class registers', tone: 'amber' },
    { icon: Bell, label: 'School notices', value: dashboard.notices.length, detail: 'Recent school community updates', tone: 'blue' }
  ]

  const quickActions = [
    sections.includes('students') && { label: 'Find a student', icon: Users, target: 'students' },
    sections.includes('attendance') && { label: 'Class register', icon: ClipboardCheck, target: 'attendance' },
    sections.includes('fees') && { label: 'Review fees', icon: Wallet, target: 'fees' },
    sections.includes('admissions') && { label: 'Admission enquiries', icon: GraduationCap, target: 'admissions' }
  ].filter(Boolean)

  return (
    <motion.section className="overview-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32 }}>
      <div className="welcome-row"><div><span className="eyebrow">YOUR SCHOOL, AT A GLANCE</span><h1>Good morning, {name.split(' ')[0]} <span>✳</span></h1><p>{new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())} <span>·</span> Here’s what’s happening at Evergreen.</p></div><span className="overview-role">{roleLabels[role]}</span></div>
      <div className="overview-hero">
        <div className="overview-hero-text"><span className="overview-hero-tag"><span /> A GOOD DAY TO GROW</span><h2>Every small step<br />makes a <em>big difference.</em></h2><p>A more connected school day starts with the people in it.</p></div>
        <div className="overview-hero-photo" role="img" aria-label="A sunlit classroom ready for the school day" />
        <div className="overview-hero-stamp"><GraduationCap size={23} /><span>Grow<br />together.</span></div>
      </div>
      <div className={`metric-grid metric-grid-${cards.length}`}>{cards.map((card) => <MetricCard key={card.label} {...card} />)}</div>
      {dashboard.metrics.attendanceTrend && <AttendanceChart trend={dashboard.metrics.attendanceTrend} />}
      <div className="overview-lower">
        <section className="panel-card quick-panel"><div className="panel-title-row"><div><span className="eyebrow">A GOOD PLACE TO START</span><h3>Quick links</h3></div><ArrowDownRight size={19} /></div>
          <div className="quick-links">{quickActions.map(({ label, icon: Icon, target }) => <button key={target} onClick={() => goToSection(target)}><span><Icon size={17} /></span>{label}<ArrowRight size={15} /></button>)}</div>
          {(role === 'admin' || role === 'accountant') && <button className="quick-create-invoice" onClick={() => openDialog(role === 'admin' ? { kind: 'student' } : { kind: 'invoice' })}><span><Plus size={16} /></span>{role === 'admin' ? 'Add a student profile' : 'Create a fee invoice'}<ArrowRight size={15} /></button>}
          {role === 'receptionist' && <button className="quick-create-invoice" onClick={() => openDialog({ kind: 'visitor' })}><span><Plus size={16} /></span>Check in a visitor<ArrowRight size={15} /></button>}
          {isTeacher && <button className="quick-create-invoice" onClick={() => openDialog({ kind: 'homework' })}><span><Plus size={16} /></span>Assign classwork<ArrowRight size={15} /></button>}
        </section>
        <section className="panel-card update-panel"><div className="panel-title-row"><div><span className="eyebrow">FROM THE SCHOOL</span><h3>Notices & updates</h3></div><button className="text-link" onClick={() => goToSection('notices')}>View all <ArrowRight size={14} /></button></div>
          {dashboard.notices.length ? <div className="recent-notices">{dashboard.notices.slice(0, 3).map((notice) => <article key={notice._id}><span className="mini-notice-icon"><Bell size={14} /></span><div><strong>{notice.title}</strong><small>{shortDate(notice.publishedAt || notice.createdAt)}</small></div></article>)}</div> : <p className="no-updates">A quieter day in the school notice board.</p>}
        </section>
      </div>
      {dashboard.classSections.length > 0 && <div className="section-chips"><span>YOUR CLASS SECTIONS</span>{dashboard.classSections.map((item) => <button onClick={() => goToSection('attendance')} key={item.id}>{item.name}<small>{item.students} students</small><ArrowRight size={13} /></button>)}</div>}
      {dashboard.recentInvoices.length > 0 && <section className="panel-card overview-fees"><div className="panel-title-row"><div><span className="eyebrow">{roleIsFamily ? 'YOUR SCHOOL ACCOUNT' : 'SCHOOL ACCOUNTS'}</span><h3>Recent fee invoices</h3></div><button className="text-link" onClick={() => goToSection('fees')}>All invoices <ArrowRight size={14} /></button></div><DataTable columns={[
        { key: 'invoiceNumber', label: 'Invoice' },
        { key: 'studentName', label: 'Student' },
        { key: 'description', label: 'Fee details' },
        { key: 'amount', label: 'Amount', render: (item) => indianRupees(item.amount) },
        { key: 'status', label: 'Status', render: (item) => <StatusPill value={item.status} /> }
      ]} rows={dashboard.recentInvoices} empty="No fee invoices to display" /></section>}
      {dashboard.homework.length > 0 && roleIsFamily && <div className="student-homework-strip"><span><BookOpen size={18} /><strong>Coming up in class</strong></span>{dashboard.homework.slice(0, 2).map((item) => <span key={item._id}>{item.title}<small>{item.subject} · {shortDate(item.dueDate)}</small></span>)}</div>}
    </motion.section>
  )
}

function PaymentReceipts({ invoices }) {
  const payments = invoices.flatMap((invoice) => (invoice.payments || []).map((payment) => ({ ...payment, invoiceNumber: invoice.invoiceNumber, description: invoice.description })))
  if (!payments.length) return null
  return <section className="panel-card receipts-panel"><div className="panel-title-row"><div><span className="eyebrow">COUNTER COLLECTIONS</span><h3>Payment receipts</h3></div><ReceiptText size={19} /></div><DataTable columns={[
    { key: 'receiptNumber', label: 'Receipt' },
    { key: 'invoiceNumber', label: 'Invoice' },
    { key: 'amount', label: 'Collected', render: (item) => <strong>{indianRupees(item.amount)}</strong> },
    { key: 'method', label: 'Method' },
    { key: 'paidAt', label: 'Date', render: (item) => shortDate(item.paidAt) }
  ]} rows={payments} /></section>
}

function AttendanceChart({ trend }) {
  return (
    <section className="panel-card attendance-chart">
      <div className="panel-title-row"><div><span className="eyebrow">A STEADY SCHOOL DAY</span><h3>Attendance this week</h3></div><span className="chart-legend"><i /> Students present</span></div>
      <div className="attendance-bars" role="img" aria-label={`Attendance for the past seven days: ${trend.map((day) => `${day.label} ${day.percent}%`).join(', ')}`}>
        {trend.map((day) => <div className="attendance-bar-column" key={day.date} title={`${day.label}: ${day.percent}%`}>
          <strong>{day.percent > 0 ? `${day.percent}%` : ''}</strong>
          <span className="attendance-bar-track"><i style={{ height: `${Math.max(day.percent, 4)}%` }} /></span>
          <small>{day.label}</small>
        </div>)}
      </div>
    </section>
  )
}
