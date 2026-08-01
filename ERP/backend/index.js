const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

const users = [
  { id: 1, role: 'student', name: 'Ravi Kumar', username: 'student1', password: 'student1', class: '10A', section: 'A' },
  { id: 2, role: 'teacher', name: 'Anjali Sharma', username: 'teacher1', password: 'teacher1', department: 'Mathematics' },
  { id: 3, role: 'admin', name: 'Pankaj Singh', username: 'admin1', password: 'admin1', department: 'Administration' },
  { id: 4, role: 'student', name: 'Priya Jain', username: 'student2', password: 'student2', class: '12B', section: 'B' }
];

const fees = [
  { id: 1, studentId: 1, month: 'April', amount: 4500, status: 'Paid' },
  { id: 2, studentId: 1, month: 'May', amount: 4500, status: 'Due' },
  { id: 3, studentId: 4, month: 'April', amount: 4700, status: 'Paid' },
  { id: 4, studentId: 4, month: 'May', amount: 4700, status: 'Due' }
];

const announcements = [
  { id: 1, title: 'Exam Schedule Released', description: 'Annual exam dates are available in the academic calendar.' },
  { id: 2, title: 'Fee Reminder', description: 'Please check the fee status and submit pending fees at the office.' }
];

app.get('/api/users', (req, res) => {
  res.json(users.map(({ password, ...rest }) => rest));
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(item => item.username === username && item.password === password);

  if (!user) {
    return res.status(401).json({ message: 'Invalid login details' });
  }

  res.json({ user: { id: user.id, name: user.name, role: user.role, class: user.class, section: user.section, department: user.department } });
});

app.get('/api/dashboard', (req, res) => {
  const { role, userId } = req.query;
  const id = Number(userId);

  if (!role) {
    return res.status(400).json({ message: 'Role is required' });
  }

  if (role === 'student') {
    const student = users.find(u => u.id === id && u.role === 'student');
    const studentFees = fees.filter(f => f.studentId === id);
    return res.json({ profile: student, fees: studentFees, announcements });
  }

  if (role === 'teacher') {
    const students = users.filter(u => u.role === 'student');
    return res.json({ teacher: users.find(u => u.id === id), students, announcements });
  }

  if (role === 'admin') {
    return res.json({ students: users.filter(u => u.role === 'student'), teachers: users.filter(u => u.role === 'teacher'), fees, announcements });
  }

  res.status(400).json({ message: 'Unknown role' });
});

app.get('/api/fees', (req, res) => {
  const { studentId } = req.query;
  if (studentId) {
    const studentFees = fees.filter(item => item.studentId === Number(studentId));
    return res.json(studentFees);
  }
  res.json(fees);
});

app.post('/api/fees/update', (req, res) => {
  const { id, status, amount, studentId, month } = req.body;

  if (id) {
    const fee = fees.find(item => item.id === Number(id));
    if (!fee) {
      return res.status(404).json({ message: 'Fee record not found' });
    }
    fee.status = status || fee.status;
    fee.amount = amount || fee.amount;
    return res.json({ message: 'Fee record updated', fee });
  }

  const newRecord = {
    id: fees.length + 1,
    studentId: Number(studentId),
    month,
    amount: Number(amount),
    status: status || 'Due'
  };
  fees.push(newRecord);
  res.json({ message: 'Fee record added', fee: newRecord });
});

app.listen(PORT, () => {
  console.log(`ERP backend running on http://localhost:${PORT}`);
});
