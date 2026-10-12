const demoAccounts = [
  { username: 'admin1', name: 'School Administrator', role: 'admin' },
  { username: 'reception1', name: 'Ravi Mehta', role: 'receptionist' },
  { username: 'teacher1', name: 'Anjali Sharma', role: 'teacher' },
  { username: 'classTeacher1', name: 'Neha Verma', role: 'classTeacher' },
  { username: 'principal1', name: 'Dr. Karan Malhotra', role: 'principal' },
  { username: 'accountant1', name: 'Amit Joshi', role: 'accountant' },
  { username: 'librarian1', name: 'Nisha Patel', role: 'librarian' },
  { username: 'hr1', name: 'Priya Sharma', role: 'hr' },
  { username: 'student1', name: 'Ravi Kumar', role: 'student' },
  { username: 'student2', name: 'Priya Jain', role: 'student' },
  { username: 'parent1', name: 'Sunita Kumar', role: 'parent' }
]

const students = [
  { id: 1, studentId: 'STU-2026-00001', name: 'Ravi Kumar', username: 'student1', className: '10A', grade: '10', section: 'A', rollNumber: 12, parentName: 'Sunita Kumar', parentPhone: '+91 98765 43210', status: 'active' },
  { id: 2, studentId: 'STU-2026-00002', name: 'Priya Jain', username: 'student2', className: '12B', grade: '12', section: 'B', rollNumber: 8, parentName: 'Rajesh Jain', parentPhone: '+91 98765 43211', status: 'active' }
]

const classSections = [
  { id: 1, name: '10A', students: 1 },
  { id: 2, name: '12B', students: 1 },
  { id: 3, name: '9A', students: 0 },
  { id: 4, name: '5A', students: 0 },
  { id: 5, name: 'PlayA', students: 0 }
]

const notices = [
  { _id: 'notice-1', title: 'Welcome to your school portal', body: 'Your school updates, classwork, attendance and fee receipts are now together in one place.', audience: 'all', authorName: 'School Administrator', publishedAt: '2026-10-01T09:00:00.000Z' },
  { _id: 'notice-2', title: 'October parent–teacher meeting', body: 'Appointments for the October parent–teacher meeting are open at the school reception.', audience: 'parents', authorName: 'School Administrator', publishedAt: '2026-10-05T09:00:00.000Z' },
  { _id: 'notice-3', title: 'Mid-term assessment calendar', body: 'Please check the class timetable and assessment dates with your class teacher.', audience: 'students', authorName: 'School Administrator', publishedAt: '2026-10-07T09:00:00.000Z' }
]

const invoices = [
  { id: 1, invoiceNumber: 'INV-2026-10001', studentId: 1, studentCode: students[0].studentId, studentName: students[0].name, className: '10A', description: 'September tuition fee', amount: 4500, paidAmount: 4500, dueDate: '2026-09-15T00:00:00.000Z', status: 'paid', payments: [{ id: 1, receiptNumber: 'RCT-2026-10001', amount: 4500, method: 'Cash', paidAt: '2026-09-10T10:00:00.000Z' }] },
  { id: 2, invoiceNumber: 'INV-2026-10002', studentId: 1, studentCode: students[0].studentId, studentName: students[0].name, className: '10A', description: 'October tuition fee', amount: 4500, paidAmount: 0, dueDate: '2026-10-15T00:00:00.000Z', status: 'pending', payments: [] },
  { id: 3, invoiceNumber: 'INV-2026-10003', studentId: 2, studentCode: students[1].studentId, studentName: students[1].name, className: '12B', description: 'October tuition fee', amount: 4700, paidAmount: 2000, dueDate: '2026-10-15T00:00:00.000Z', status: 'partial', payments: [{ id: 2, receiptNumber: 'RCT-2026-10003', amount: 2000, method: 'UPI', paidAt: '2026-10-02T10:00:00.000Z' }] }
]

const today = new Date().toISOString().slice(0, 10)
const attendanceRecords = students.map((student, index) => ({
  id: index + 1,
  studentId: student.id,
  studentCode: student.studentId,
  studentName: student.name,
  rollNumber: student.rollNumber,
  className: student.className,
  classSectionId: index + 1,
  status: index === 1 ? 'absent' : 'present'
}))

const staff = demoAccounts
  .filter(({ role }) => !['student', 'parent'].includes(role))
  .map((account, index) => ({
    id: index + 1,
    username: account.username,
    name: account.name,
    email: `${account.username}@demo.school.invalid`,
    role: account.role,
    taughtSections: account.role === 'classTeacher' ? [{ grade: '10', section: 'A' }] : account.role === 'teacher' ? [{ grade: '12', section: 'B' }] : []
  }))

const homework = [{
  _id: 'homework-1',
  title: 'Fractions & decimals practice',
  description: 'Complete exercises 1–10 in your class workbook.',
  subject: 'Mathematics',
  className: '10A',
  dueDate: '2026-12-01T00:00:00.000Z',
  authorName: 'Neha Verma'
}]

const grades = [
  { id: 1, subject: 'Mathematics', term: 'Term 1 2026-27', score: 86, maxScore: 100, studentName: 'Ravi Kumar', studentCode: students[0].studentId },
  { id: 2, subject: 'Science', term: 'Term 1 2026-27', score: 78, maxScore: 100, studentName: 'Ravi Kumar', studentCode: students[0].studentId },
  { id: 3, subject: 'Physics', term: 'Term 1 2026-27', score: 91, maxScore: 100, studentName: 'Priya Jain', studentCode: students[1].studentId },
  { id: 4, subject: 'Chemistry', term: 'Term 1 2026-27', score: 88, maxScore: 100, studentName: 'Priya Jain', studentCode: students[1].studentId }
]

const admissions = [{
  id: 1,
  applicantName: 'Aarav Kumar',
  parentName: 'Suman Kumar',
  phone: '+91 98765 40001',
  grade: '9',
  status: 'new',
  message: 'Looking for admission for the next school year.',
  createdAt: '2026-10-03T10:00:00.000Z'
}]

const visitors = [{
  id: 1,
  visitorName: 'Mrs. Sharma',
  phone: '+91 98765 40002',
  purpose: 'Parent enquiry',
  host: 'Reception',
  checkedInAt: '2026-10-08T10:30:00.000Z'
}]

function visibleStudents(account) {
  if (account.role === 'student') return students.filter(({ username }) => username === account.username)
  if (account.role === 'parent') return students.filter(({ username }) => username === 'student1')
  if (['teacher', 'classTeacher'].includes(account.role)) {
    const className = account.role === 'classTeacher' ? '10A' : '12B'
    return students.filter((student) => student.className === className)
  }
  return students
}

function visibleSections(account) {
  if (account.role === 'classTeacher') return classSections.filter(({ name }) => name === '10A')
  if (account.role === 'teacher') return classSections.filter(({ name }) => name === '12B')
  if (account.role === 'student') return classSections.filter(({ name }) => name === students.find((item) => item.username === account.username)?.className)
  if (account.role === 'parent') return classSections.filter(({ name }) => name === '10A')
  if (['admin', 'principal', 'hr'].includes(account.role)) return classSections
  return []
}

function dashboardFor(account) {
  const accountStudents = visibleStudents(account)
  const accountSections = visibleSections(account)
  const familyInvoices = ['student', 'parent'].includes(account.role)
    ? invoices.filter(({ studentId }) => accountStudents.some((student) => student.id === studentId))
    : []
  const accountInvoices = familyInvoices.length ? familyInvoices
    : ['admin', 'principal', 'accountant', 'receptionist'].includes(account.role) ? invoices.slice(0, 2) : []
  const accountNotices = notices.filter(({ audience }) => audience === 'all'
    || audience === (account.role === 'parent' ? 'parents' : account.role === 'student' ? 'students' : 'staff'))
  const accountHomework = ['admin', 'principal', 'teacher', 'classTeacher', 'student', 'parent'].includes(account.role)
    ? homework.filter(({ className }) => accountSections.some((section) => section.name === className))
    : []
  const total = ['admin', 'principal', 'accountant'].includes(account.role) ? 13700
    : familyInvoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0)
  const paid = ['admin', 'principal', 'accountant'].includes(account.role) ? 6500
    : familyInvoices.reduce((sum, invoice) => sum + Number(invoice.paidAmount), 0)
  const attendanceScope = accountStudents.length
    ? attendanceRecords.filter(({ studentId }) => accountStudents.some((student) => student.id === studentId))
    : attendanceRecords

  return {
    profile: { id: 100 + demoAccounts.indexOf(account), username: account.username, name: account.name, role: account.role },
    metrics: {
      students: ['admin', 'principal', 'hr'].includes(account.role) ? students.length : accountStudents.length,
      staff: ['admin', 'principal', 'hr'].includes(account.role) ? staff.length : null,
      classes: ['admin', 'principal', 'hr'].includes(account.role) ? classSections.length : accountSections.length,
      attendancePercent: attendanceScope.length ? Math.round(attendanceScope.filter(({ status }) => status === 'present').length / attendanceScope.length * 100) : 0,
      presentToday: attendanceScope.filter(({ status }) => status === 'present').length,
      absentToday: attendanceScope.filter(({ status }) => status === 'absent').length,
      attendanceTrend: Array.from({ length: 7 }, (_, index) => {
        const day = new Date()
        day.setDate(day.getDate() - (6 - index))
        return { date: day.toISOString().slice(0, 10), label: new Intl.DateTimeFormat('en-IN', { weekday: 'short' }).format(day), percent: index === 3 ? 92 : 100 }
      }),
      outstandingFees: total - paid,
      collectedFees: paid,
      invoices: ['admin', 'principal', 'accountant'].includes(account.role) ? invoices.length : accountInvoices.length,
      openAdmissions: ['admin', 'principal', 'receptionist'].includes(account.role) ? 1 : null,
      visitorsOnCampus: ['receptionist', 'admin'].includes(account.role) ? 1 : null
    },
    classSections: accountSections,
    recentInvoices: accountInvoices,
    notices: accountNotices.slice(0, 4),
    homework: accountHomework.slice(0, 5)
  }
}

export function isDemoEnabled() {
  return import.meta.env.VITE_PUBLIC_DEMO === 'true'
}

export function signInToDemo({ username, password, role }) {
  const expectedPassword = import.meta.env.VITE_DEMO_PASSWORD || 'EvergreenDemo2026!'
  if (password !== expectedPassword) throw new Error('Demo password is incorrect. Use the public demo password shown on this page.')
  const account = demoAccounts.find((item) => item.username === username && (!role || item.role === role))
  if (!account) throw new Error('Choose a valid demo username and matching role.')
  return {
    token: `demo:${account.role}:${account.username}`,
    user: { id: 100 + demoAccounts.indexOf(account), username: account.username, name: account.name, role: account.role },
    demo: true
  }
}

export function demoRequest(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase()
  if (!['GET', 'HEAD'].includes(method)) throw new Error('Public demo is read-only. Changes are not saved.')

  const [pathname, query = ''] = path.split('?')
  const account = demoAccounts.find(({ username, role }) => options.token === `demo:${role}:${username}`)
  if (!account) throw new Error('Demo session is invalid. Please sign in again.')
  const accountStudents = visibleStudents(account)
  const accountSections = visibleSections(account)

  if (pathname === '/dashboard') return dashboardFor(account)
  if (pathname === '/students') {
    const search = new URLSearchParams(query).get('search')?.toLowerCase()
    return { students: accountStudents.filter((student) => !search || `${student.name} ${student.studentId} ${student.className}`.toLowerCase().includes(search)) }
  }
  if (pathname === '/fees') {
    return { invoices: ['student', 'parent'].includes(account.role)
      ? invoices.filter(({ studentId }) => accountStudents.some((student) => student.id === studentId))
      : ['admin', 'principal', 'accountant', 'receptionist'].includes(account.role) ? invoices : [] }
  }
  if (pathname === '/attendance') {
    const classId = Number(new URLSearchParams(query).get('classId'))
    const allowedNames = new Set(accountSections.map(({ name }) => name))
    return {
      date: new URLSearchParams(query).get('date') || today,
      classes: accountSections,
      records: attendanceRecords.filter((record) => allowedNames.has(record.className) && (!classId || record.classSectionId === classId))
    }
  }
  if (pathname === '/academics') return {
    classes: accountSections,
    homework: homework.filter(({ className }) => accountSections.some((section) => section.name === className)),
    grades: grades.filter(({ studentCode }) => accountStudents.some((student) => student.studentId === studentCode))
  }
  if (pathname === '/admissions') return { inquiries: ['admin', 'principal', 'receptionist'].includes(account.role) ? admissions : [] }
  if (pathname === '/visitors') return { visitors: ['admin', 'principal', 'receptionist'].includes(account.role) ? visitors : [] }
  if (pathname === '/notices') return { notices: notices.filter(({ audience }) => audience === 'all'
    || audience === (account.role === 'parent' ? 'parents' : account.role === 'student' ? 'students' : 'staff')) }
  if (pathname === '/users') return { users: ['admin', 'principal', 'hr'].includes(account.role) ? staff : [] }
  if (pathname === '/auth/me') return { user: { id: account.id, username: account.username, name: account.name, role: account.role } }
  throw new Error('This demo screen is not available.')
}
