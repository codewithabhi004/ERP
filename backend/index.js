require('dotenv').config();

const bcrypt = require('bcryptjs');
const cors = require('cors');
const express = require('express');
const { rateLimit } = require('express-rate-limit');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');
const { PrismaClient, Prisma } = require('@prisma/client');
const { z, ZodError } = require('zod');
const AuditLog = require('./src/models/AuditLog');
const Homework = require('./src/models/Homework');
const Notice = require('./src/models/Notice');

const prisma = new PrismaClient();
const app = express();
const PORT = Number(process.env.PORT || 4000);
const roles = ['admin', 'receptionist', 'teacher', 'classTeacher', 'principal', 'accountant', 'librarian', 'hr', 'student', 'parent'];
const schoolStaffRoles = ['teacher', 'classTeacher', 'principal', 'accountant', 'librarian', 'receptionist', 'hr'];
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '1mb' }));

const asyncRoute = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

const requireRoles = (...allowedRoles) => (req, res, next) => {
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: 'You do not have permission to perform this action.' });
  }
  next();
};

const authenticate = asyncRoute(async (req, res, next) => {
  const authorization = req.get('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Sign in to access this resource.' });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
  }

  const userId = Number(payload.sub);
  if (!Number.isInteger(userId)) return res.status(401).json({ message: 'Invalid sign-in session.' });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, name: true, role: true, active: true }
  });
  if (!user?.active || user.role !== payload.role) {
    return res.status(401).json({ message: 'This account can no longer use the current session.' });
  }

  req.user = user;
  next();
});

async function writeAudit(actorId, action, entity, entityId) {
  try {
    await AuditLog.create({ actorId, action, entity, entityId: entityId == null ? undefined : String(entityId) });
  } catch (error) {
    console.error('MongoDB audit log could not be written:', error.message);
  }
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    email: user.email || undefined
  };
}

function studentResponse(student) {
  return {
    id: student.id,
    studentId: student.studentId,
    name: student.user?.name || student.name || 'Student',
    username: student.user?.username,
    className: student.classSection ? `${student.classSection.grade}${student.classSection.section}` : 'Unassigned',
    grade: student.classSection?.grade,
    section: student.classSection?.section,
    rollNumber: student.rollNumber,
    parentName: student.parentName,
    parentPhone: student.parentPhone,
    dateOfBirth: student.dateOfBirth,
    admissionDate: student.admissionDate,
    status: student.status
  };
}

function todayUtc() {
  const dateParts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date()).map(({ type, value }) => [type, value]));
  return new Date(Date.UTC(Number(dateParts.year), Number(dateParts.month) - 1, Number(dateParts.day)));
}

function badRequest(message, statusCode = 400) {
  return Object.assign(new Error(message), { statusCode });
}

function parseDate(value, label = 'date') {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw badRequest(`${label} must use YYYY-MM-DD format.`);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (date.toISOString().slice(0, 10) !== value) throw badRequest(`${label} is not a valid calendar date.`);
  return date;
}

function parseClassName(value) {
  const match = /^(Play|Nursery|LKG|UKG|[1-9]|1[0-2])\s*([A-Z])$/i.exec(value.trim());
  if (!match) throw badRequest('Choose a class and section (for example, 10A).');
  const grade = /^\d+$/.test(match[1]) ? String(Number(match[1])) : match[1][0].toUpperCase() + match[1].slice(1).toLowerCase();
  return { grade, section: match[2].toUpperCase() };
}

function amountToNumber(value) {
  return Number(value || 0);
}

async function assignedSections(user) {
  return prisma.classSection.findMany({
    where: { classTeacherId: user.id },
    include: { _count: { select: { students: true } } },
    orderBy: [{ grade: 'asc' }, { section: 'asc' }]
  });
}

async function permittedStudentIds(user) {
  if (user.role === 'student') {
    const student = await prisma.student.findUnique({ where: { userId: user.id }, select: { id: true } });
    return student ? [student.id] : [];
  }
  if (user.role === 'parent') {
    const links = await prisma.parentStudent.findMany({ where: { parentId: user.id }, select: { studentId: true } });
    return links.map(({ studentId }) => studentId);
  }
  if (user.role === 'teacher' || user.role === 'classTeacher') {
    const sections = await assignedSections(user);
    return (await prisma.student.findMany({
      where: { classSectionId: { in: sections.map(({ id }) => id) }, status: 'active' },
      select: { id: true }
    })).map(({ id }) => id);
  }
  return null;
}

async function accessibleSections(user) {
  if (user.role === 'teacher' || user.role === 'classTeacher') return assignedSections(user);
  if (user.role === 'student' || user.role === 'parent') {
    const studentIds = await permittedStudentIds(user);
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds || [] }, classSectionId: { not: null } },
      select: { classSectionId: true },
      distinct: ['classSectionId']
    });
    return prisma.classSection.findMany({
      where: { id: { in: students.map(({ classSectionId }) => classSectionId) } },
      include: { _count: { select: { students: true } } },
      orderBy: [{ grade: 'asc' }, { section: 'asc' }]
    });
  }
  if (!['admin', 'principal', 'receptionist', 'hr'].includes(user.role)) return [];
  return prisma.classSection.findMany({
    include: { _count: { select: { students: true } } },
    orderBy: [{ grade: 'asc' }, { section: 'asc' }]
  });
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many sign-in attempts. Wait a few minutes and try again.' }
});

app.get('/api/health', asyncRoute(async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  const mongoReady = mongoose.connection.readyState === 1;
  if (!mongoReady) return res.status(503).json({ status: 'not-ready', databases: { postgresql: 'ready', mongodb: 'disconnected' } });
  res.json({ status: 'ok', databases: { postgresql: 'ready', mongodb: 'ready' } });
}));

app.post('/api/auth/login', loginLimiter, asyncRoute(async (req, res) => {
  const input = z.object({
    username: z.string().trim().min(1).max(80),
    password: z.string().min(1).max(200),
    role: z.enum(roles).optional()
  }).parse(req.body);

  const user = await prisma.user.findUnique({ where: { username: input.username } });
  if (!user?.active || (input.role && user.role !== input.role) || !(await bcrypt.compare(input.password, user.passwordHash))) {
    return res.status(401).json({ message: 'The username, password, or selected role is incorrect.' });
  }
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters.');
  }

  const token = jwt.sign({ role: user.role }, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    subject: String(user.id),
    expiresIn: process.env.JWT_EXPIRES_IN || '8h'
  });
  res.json({ token, user: publicUser(user) });
}));

app.use('/api', (req, res, next) => {
  if (process.env.PUBLIC_DEMO_READ_ONLY !== 'true' || !['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }
  authenticate(req, res, () => {
    res.status(403).json({ message: 'Public demo accounts are read-only.' });
  });
});

app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

app.get('/api/dashboard', authenticate, asyncRoute(async (req, res) => {
  const user = req.user;
  const sections = await accessibleSections(user);
  const studentIds = await permittedStudentIds(user);
  const studentWhere = studentIds === null
    ? { status: 'active' }
    : { status: 'active', id: { in: studentIds } };
  const classIds = sections.map(({ id }) => id);
  const attendanceWhere = {
    date: todayUtc(),
    ...(user.role === 'teacher' || user.role === 'classTeacher' ? { classSectionId: { in: classIds } } : {}),
    ...(studentIds !== null && user.role !== 'teacher' && user.role !== 'classTeacher' ? { studentId: { in: studentIds } } : {})
  };

  const trendStart = new Date(todayUtc().getTime() - 6 * 24 * 60 * 60 * 1000);
  const [studentCount, staffCount, sectionCount, feeTotals, invoices, attendanceRows, trendRows, admissionsCount, noticeDocuments, homeworkDocuments] = await Promise.all([
    prisma.student.count({ where: studentWhere }),
    ['admin', 'principal', 'hr'].includes(user.role) ? prisma.user.count({ where: { role: { in: schoolStaffRoles }, active: true } }) : Promise.resolve(null),
    ['admin', 'principal', 'hr'].includes(user.role) ? prisma.classSection.count() : Promise.resolve(sections.length),
    ['admin', 'principal', 'accountant'].includes(user.role)
      ? prisma.feeInvoice.aggregate({ _sum: { amount: true, paidAmount: true }, _count: { id: true } })
      : Promise.resolve(null),
    ['admin', 'principal', 'accountant', 'receptionist'].includes(user.role)
      ? prisma.feeInvoice.findMany({
        take: 5, orderBy: { createdAt: 'desc' },
        include: { student: { include: { user: { select: { name: true } }, classSection: true } } }
      })
      : user.role === 'student' || user.role === 'parent'
        ? prisma.feeInvoice.findMany({
          where: { studentId: { in: studentIds || [] } }, orderBy: { dueDate: 'desc' },
          include: { student: { include: { user: { select: { name: true } }, classSection: true } }, payments: true }
        })
        : Promise.resolve([]),
    prisma.attendance.findMany({
      where: attendanceWhere,
      select: { status: true }
    }),
    prisma.attendance.groupBy({
      by: ['date', 'status'],
      where: { ...attendanceWhere, date: { gte: trendStart, lte: todayUtc() } },
      _count: { _all: true }
    }),
    ['admin', 'principal', 'receptionist'].includes(user.role) ? prisma.admissionInquiry.count({ where: { status: { not: 'enrolled' } } }) : Promise.resolve(null),
    Notice.find({
      $or: [
        { audience: 'all' },
        { audience: user.role === 'parent' ? 'parents' : user.role === 'student' ? 'students' : 'staff' },
        ...(sections.length ? [{ audience: 'class', className: { $in: sections.map(({ grade, section }) => `${grade}${section}`) } }] : [])
      ]
    })
      .sort({ publishedAt: -1 }).limit(4).lean(),
    ['admin', 'principal', 'teacher', 'classTeacher', 'student', 'parent'].includes(user.role)
      ? Homework.find({ className: { $in: sections.map(({ grade, section }) => `${grade}${section}`) } }).sort({ dueDate: 1 }).limit(5).lean()
      : Promise.resolve([])
  ]);

  const presentToday = attendanceRows.filter(({ status }) => status === 'present').length;
  const attendancePercent = attendanceRows.length ? Math.round((presentToday / attendanceRows.length) * 100) : 0;
  const trendByDate = new Map();
  for (const row of trendRows) {
    const key = row.date.toISOString().slice(0, 10);
    const summary = trendByDate.get(key) || { present: 0, total: 0 };
    summary.total += row._count._all;
    if (row.status === 'present') summary.present += row._count._all;
    trendByDate.set(key, summary);
  }
  const attendanceTrend = Array.from({ length: 7 }, (_value, index) => {
    const date = new Date(trendStart.getTime() + index * 24 * 60 * 60 * 1000);
    const key = date.toISOString().slice(0, 10);
    const summary = trendByDate.get(key) || { present: 0, total: 0 };
    return {
      date: key,
      label: new Intl.DateTimeFormat('en-IN', { weekday: 'short', timeZone: 'UTC' }).format(date),
      percent: summary.total ? Math.round((summary.present / summary.total) * 100) : 0
    };
  });
  const totalAmount = amountToNumber(feeTotals?._sum?.amount);
  const paidAmount = amountToNumber(feeTotals?._sum?.paidAmount);
  const today = new Date(todayUtc().getTime() - 330 * 60 * 1000);
  const visitorCount = user.role === 'receptionist' || user.role === 'admin'
    ? await prisma.visitorLog.count({ where: { checkedInAt: { gte: today }, checkedOutAt: null } })
    : null;

  res.json({
    profile: publicUser(user),
    metrics: {
      students: studentCount,
      staff: staffCount,
      classes: sectionCount,
      attendancePercent,
      presentToday,
      absentToday: attendanceRows.filter(({ status }) => status === 'absent').length,
      attendanceTrend,
      outstandingFees: totalAmount - paidAmount,
      collectedFees: paidAmount,
      invoices: feeTotals?._count.id ?? invoices.length,
      openAdmissions: admissionsCount,
      visitorsOnCampus: visitorCount
    },
    classSections: sections.map((section) => ({
      id: section.id,
      name: `${section.grade}${section.section}`,
      students: section._count.students
    })),
    recentInvoices: invoices.map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      studentName: invoice.student.user?.name || 'Student',
      studentId: invoice.student.studentId,
      description: invoice.description,
      amount: invoice.amount,
      paidAmount: invoice.paidAmount,
      dueDate: invoice.dueDate,
      status: invoice.status,
      payments: invoice.payments
    })),
    notices: noticeDocuments,
    homework: homeworkDocuments
  });
}));

app.get('/api/students', authenticate, asyncRoute(async (req, res) => {
  if (!['admin', 'principal', 'receptionist', 'teacher', 'classTeacher', 'student', 'parent', 'hr'].includes(req.user.role)) {
    return res.status(403).json({ message: 'You do not have permission to view student records.' });
  }

  const scopedIds = await permittedStudentIds(req.user);
  const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';
  const students = await prisma.student.findMany({
    where: {
      status: { not: 'withdrawn' },
      ...(scopedIds !== null ? { id: { in: scopedIds } } : {}),
      ...(search ? {
        OR: [
          { studentId: { contains: search, mode: 'insensitive' } },
          { user: { name: { contains: search, mode: 'insensitive' } } },
          { parentName: { contains: search, mode: 'insensitive' } }
        ]
      } : {})
    },
    include: {
      user: { select: { name: true, username: true } },
      classSection: true
    },
    orderBy: [{ classSection: { grade: 'asc' } }, { rollNumber: 'asc' }],
    take: 200
  });
  res.json({ students: students.map(studentResponse) });
}));

app.post('/api/students', authenticate, requireRoles('admin'), asyncRoute(async (req, res) => {
  const input = z.object({
    name: z.string().trim().min(2).max(120),
    username: z.string().trim().min(3).max(80).regex(/^[a-zA-Z0-9_.-]+$/),
    password: z.string().min(10).max(200),
    className: z.string().min(2).max(20),
    parentName: z.string().trim().min(2).max(120),
    parentPhone: z.string().trim().min(7).max(25),
    parentUsername: z.string().trim().min(3).max(80).regex(/^[a-zA-Z0-9_.-]+$/).optional(),
    parentPassword: z.string().min(10).max(200).optional(),
    rollNumber: z.number().int().positive().optional(),
    dateOfBirth: z.string().optional()
  }).refine((value) => Boolean(value.parentUsername) === Boolean(value.parentPassword), {
    path: ['parentPassword'],
    message: 'Enter both parent login fields, or leave both empty.'
  }).parse(req.body);
  const group = parseClassName(input.className);
  const classSection = await prisma.classSection.findUnique({ where: { grade_section: group } });
  if (!classSection) return res.status(400).json({ message: 'This class section has not been created yet.' });
  const passwordHash = await bcrypt.hash(input.password, 12);

  const student = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { username: input.username, name: input.name, role: 'student', passwordHash }
    });
    const record = await tx.student.create({
      data: {
        userId: user.id,
        studentId: `pending-${randomUUID()}`,
        classSectionId: classSection.id,
        parentName: input.parentName,
        parentPhone: input.parentPhone,
        rollNumber: input.rollNumber,
        dateOfBirth: input.dateOfBirth ? parseDate(input.dateOfBirth, 'dateOfBirth') : undefined
      },
      include: { user: { select: { name: true, username: true } }, classSection: true }
    });
    const createdStudent = await tx.student.update({
      where: { id: record.id },
      data: { studentId: `STU-${new Date().getFullYear()}-${String(record.id).padStart(5, '0')}` },
      include: { user: { select: { name: true, username: true } }, classSection: true }
    });
    if (input.parentUsername) {
      let parent = await tx.user.findUnique({ where: { username: input.parentUsername } });
      if (parent && (parent.role !== 'parent' || !parent.active)) {
        throw badRequest('That username is already in use by another or inactive account.', 409);
      }
      if (!parent) {
        parent = await tx.user.create({
          data: {
            username: input.parentUsername,
            name: input.parentName,
            role: 'parent',
            passwordHash: await bcrypt.hash(input.parentPassword, 12)
          }
        });
      }
      await tx.parentStudent.create({ data: { parentId: parent.id, studentId: createdStudent.id } });
    }
    return createdStudent;
  });

  await writeAudit(req.user.id, 'student.created', 'student', student.id);
  res.status(201).json({ student: studentResponse(student) });
}));

app.get('/api/classes', authenticate, asyncRoute(async (req, res) => {
  const sections = await accessibleSections(req.user);
  res.json({
    classes: sections.map(({ id, grade, section, _count }) => ({
      id,
      name: `${grade}${section}`,
      grade,
      section,
      students: _count.students
    }))
  });
}));

app.post('/api/classes', authenticate, requireRoles('admin'), asyncRoute(async (req, res) => {
  const input = z.object({
    grade: z.enum(['Play', 'Nursery', 'LKG', 'UKG', ...Array.from({ length: 12 }, (_value, index) => String(index + 1))]),
    section: z.string().trim().toUpperCase().regex(/^[A-F]$/)
  }).parse(req.body);
  const section = await prisma.classSection.create({ data: input });
  await writeAudit(req.user.id, 'class.created', 'classSection', section.id);
  res.status(201).json({ classSection: section });
}));

app.patch('/api/classes/:id', authenticate, requireRoles('admin'), asyncRoute(async (req, res) => {
  const id = z.coerce.number().int().positive().parse(req.params.id);
  const input = z.object({ classTeacherId: z.number().int().positive().nullable() }).parse(req.body);
  if (input.classTeacherId) {
    const teacher = await prisma.user.findUnique({ where: { id: input.classTeacherId }, select: { role: true, active: true } });
    if (!teacher?.active || !['teacher', 'classTeacher'].includes(teacher.role)) {
      return res.status(400).json({ message: 'Assign an active teacher or class teacher to this section.' });
    }
  }
  const classSection = await prisma.classSection.update({ where: { id }, data: input });
  await writeAudit(req.user.id, 'class.teacher_assigned', 'classSection', classSection.id);
  res.json({ classSection });
}));

app.get('/api/users', authenticate, requireRoles('admin', 'principal', 'hr'), asyncRoute(async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { role: { in: schoolStaffRoles }, active: true },
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      role: true,
      taughtSections: { select: { grade: true, section: true } }
    },
    orderBy: [{ role: 'asc' }, { name: 'asc' }]
  });
  res.json({ users });
}));

app.post('/api/users', authenticate, requireRoles('admin'), asyncRoute(async (req, res) => {
  const input = z.object({
    name: z.string().trim().min(2).max(120),
    username: z.string().trim().min(3).max(80).regex(/^[a-zA-Z0-9_.-]+$/),
    email: z.string().email().optional(),
    password: z.string().min(10).max(200),
    role: z.enum(roles.filter((role) => !['student', 'parent'].includes(role))),
    className: z.string().trim().max(20).optional()
  }).parse(req.body);
  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        username: input.username,
        name: input.name,
        email: input.email,
        role: input.role,
        passwordHash
      },
      select: { id: true, username: true, email: true, name: true, role: true }
    });
    if (input.className && ['teacher', 'classTeacher'].includes(input.role)) {
      const { grade, section } = parseClassName(input.className);
      const targetClass = await tx.classSection.findUnique({ where: { grade_section: { grade, section } } });
      if (!targetClass) throw badRequest('Create this class section before assigning its teacher.');
      await tx.classSection.update({ where: { id: targetClass.id }, data: { classTeacherId: created.id } });
    }
    return created;
  });
  await writeAudit(req.user.id, 'user.created', 'user', user.id);
  res.status(201).json({ user });
}));

app.patch('/api/users/:id', authenticate, requireRoles('admin'), asyncRoute(async (req, res) => {
  const id = z.coerce.number().int().positive().parse(req.params.id);
  const input = z.object({
    name: z.string().trim().min(2).max(120).optional(),
    email: z.union([z.string().email(), z.null()]).optional(),
    password: z.string().min(10).max(200).optional(),
    active: z.boolean().optional()
  }).refine((value) => Object.keys(value).length > 0, { message: 'Update at least one account field.' }).parse(req.body);
  if (id === req.user.id && input.active === false) return res.status(400).json({ message: 'You cannot deactivate your own sign-in.' });
  if (input.active === false) {
    const target = await prisma.user.findUnique({ where: { id }, select: { role: true, active: true } });
    if (target?.role === 'admin' && target.active) {
      const activeAdmins = await prisma.user.count({ where: { role: 'admin', active: true } });
      if (activeAdmins <= 1) return res.status(400).json({ message: 'Keep at least one active administrator account.' });
    }
  }
  const { password, ...fields } = input;
  const user = await prisma.user.update({
    where: { id },
    data: { ...fields, ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}) },
    select: { id: true, username: true, email: true, name: true, role: true, active: true }
  });
  await writeAudit(req.user.id, 'user.updated', 'user', user.id);
  res.json({ user });
}));

app.delete('/api/users/:id', authenticate, requireRoles('admin'), asyncRoute(async (req, res) => {
  const id = z.coerce.number().int().positive().parse(req.params.id);
  if (id === req.user.id) return res.status(400).json({ message: 'You cannot deactivate your own sign-in.' });
  const target = await prisma.user.findUnique({ where: { id }, select: { role: true, active: true } });
  if (target?.role === 'admin' && target.active) {
    const activeAdmins = await prisma.user.count({ where: { role: 'admin', active: true } });
    if (activeAdmins <= 1) return res.status(400).json({ message: 'Keep at least one active administrator account.' });
  }
  await prisma.user.update({ where: { id }, data: { active: false } });
  await writeAudit(req.user.id, 'user.deactivated', 'user', id);
  res.status(204).end();
}));

app.patch('/api/students/:id', authenticate, requireRoles('admin'), asyncRoute(async (req, res) => {
  const id = z.coerce.number().int().positive().parse(req.params.id);
  const input = z.object({
    name: z.string().trim().min(2).max(120).optional(),
    className: z.string().trim().max(20).optional(),
    rollNumber: z.number().int().positive().nullable().optional(),
    parentName: z.string().trim().max(120).optional(),
    parentPhone: z.string().trim().max(25).optional(),
    status: z.enum(['active', 'inactive', 'withdrawn']).optional()
  }).refine((value) => Object.keys(value).length > 0, { message: 'Update at least one student field.' }).parse(req.body);
  const { name, className, ...studentFields } = input;
  const classSectionId = className ? (await prisma.classSection.findUnique({
    where: { grade_section: parseClassName(className) }, select: { id: true }
  }))?.id : undefined;
  if (className && !classSectionId) return res.status(400).json({ message: 'This class section has not been created yet.' });
  const student = await prisma.student.update({
    where: { id },
    data: {
      ...studentFields,
      ...(classSectionId ? { classSectionId } : {}),
      ...(name ? { user: { update: { name } } } : {})
    },
    include: { user: { select: { name: true, username: true } }, classSection: true }
  });
  await writeAudit(req.user.id, 'student.updated', 'student', id);
  res.json({ student: studentResponse(student) });
}));

app.delete('/api/students/:id', authenticate, requireRoles('admin'), asyncRoute(async (req, res) => {
  const id = z.coerce.number().int().positive().parse(req.params.id);
  const student = await prisma.student.update({
    where: { id },
    data: { status: 'withdrawn', user: { update: { active: false } } }
  });
  await writeAudit(req.user.id, 'student.withdrawn', 'student', id);
  res.json({ studentId: student.studentId, status: student.status });
}));

app.get('/api/attendance', authenticate, asyncRoute(async (req, res) => {
  if (!['admin', 'principal', 'teacher', 'classTeacher', 'student', 'parent', 'receptionist', 'hr'].includes(req.user.role)) {
    return res.status(403).json({ message: 'You do not have permission to view attendance.' });
  }
  const classId = req.query.classId ? Number(req.query.classId) : undefined;
  const date = req.query.date ? parseDate(String(req.query.date)) : todayUtc();
  const studentIds = await permittedStudentIds(req.user);
  const sections = ['teacher', 'classTeacher'].includes(req.user.role) ? await assignedSections(req.user) : [];
  const where = {
    date,
    ...(studentIds !== null ? { studentId: { in: studentIds } } : {}),
    ...(classId ? { classSectionId: classId } : {}),
    ...(sections.length ? { classSectionId: { in: sections.map(({ id }) => id) } } : {})
  };
  const [records, classes] = await Promise.all([
    prisma.attendance.findMany({
      where, orderBy: [{ student: { rollNumber: 'asc' } }],
      include: { student: { include: { user: { select: { name: true } } } }, classSection: true }
    }),
    accessibleSections(req.user)
  ]);
  res.json({
    date: date.toISOString().slice(0, 10),
    classes: classes.map(({ id, grade, section, _count }) => ({ id, name: `${grade}${section}`, students: _count.students })),
    records: records.map((record) => ({
      id: record.id,
      studentId: record.studentId,
      studentCode: record.student.studentId,
      studentName: record.student.user?.name || 'Student',
      rollNumber: record.student.rollNumber,
      className: `${record.classSection.grade}${record.classSection.section}`,
      classSectionId: record.classSectionId,
      status: record.status
    }))
  });
}));

app.post('/api/attendance', authenticate, requireRoles('teacher', 'classTeacher'), asyncRoute(async (req, res) => {
  const input = z.object({
    classId: z.number().int().positive(),
    date: z.string(),
    records: z.array(z.object({
      studentId: z.number().int().positive(),
      status: z.enum(['present', 'absent', 'late', 'excused'])
    })).min(1).max(200)
  }).parse(req.body);
  const uniqueStudents = new Set(input.records.map(({ studentId }) => studentId));
  if (uniqueStudents.size !== input.records.length) return res.status(400).json({ message: 'Each student can only appear once in a register.' });
  const date = parseDate(input.date);
  const classSection = await prisma.classSection.findUnique({
    where: { id: input.classId },
    include: { students: { where: { status: 'active' }, select: { id: true } } }
  });
  if (!classSection) return res.status(404).json({ message: 'Class section not found.' });
  if (classSection.classTeacherId !== req.user.id) return res.status(403).json({ message: 'You can only mark attendance for your assigned class.' });
  if (input.records.some(({ studentId }) => !classSection.students.some(({ id }) => id === studentId))) {
    return res.status(400).json({ message: 'One or more students do not belong to this class.' });
  }

  await prisma.$transaction(input.records.map(({ studentId, status }) => prisma.attendance.upsert({
    where: { studentId_date: { studentId, date } },
    update: { status, markedById: req.user.id, classSectionId: classSection.id },
    create: { studentId, date, status, markedById: req.user.id, classSectionId: classSection.id }
  })));
  await writeAudit(req.user.id, 'attendance.saved', 'classSection', classSection.id);
  res.json({ message: 'Attendance saved successfully.', count: input.records.length });
}));

app.get('/api/fees', authenticate, asyncRoute(async (req, res) => {
  if (!['admin', 'principal', 'accountant', 'receptionist', 'student', 'parent'].includes(req.user.role)) {
    return res.status(403).json({ message: 'You do not have permission to view fee records.' });
  }
  const studentIds = await permittedStudentIds(req.user);
  const invoices = await prisma.feeInvoice.findMany({
    where: studentIds === null ? {} : { studentId: { in: studentIds } },
    include: {
      student: { include: { user: { select: { name: true } }, classSection: true } },
      payments: { orderBy: { paidAt: 'desc' } }
    },
    orderBy: { dueDate: 'desc' },
    take: 200
  });
  res.json({
    invoices: invoices.map((invoice) => ({
      ...invoice,
      studentName: invoice.student.user?.name || 'Student',
      studentCode: invoice.student.studentId,
      className: invoice.student.classSection ? `${invoice.student.classSection.grade}${invoice.student.classSection.section}` : 'Unassigned'
    }))
  });
}));

app.post('/api/fees', authenticate, requireRoles('admin', 'accountant'), asyncRoute(async (req, res) => {
  const input = z.object({
    studentId: z.number().int().positive(),
    description: z.string().trim().min(2).max(160),
    amount: z.number().positive().max(10000000),
    dueDate: z.string()
  }).parse(req.body);
  const student = await prisma.student.findUnique({ where: { id: input.studentId } });
  if (!student) return res.status(404).json({ message: 'Student record not found.' });
  const invoice = await prisma.feeInvoice.create({
    data: {
      invoiceNumber: `INV-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`,
      studentId: student.id,
      description: input.description,
      amount: input.amount,
      dueDate: parseDate(input.dueDate)
    }
  });
  await writeAudit(req.user.id, 'fee.invoice_created', 'feeInvoice', invoice.id);
  res.status(201).json({ invoice });
}));

app.post('/api/fees/:id/payments', authenticate, requireRoles('admin', 'accountant', 'receptionist'), asyncRoute(async (req, res) => {
  const invoiceId = z.coerce.number().int().positive().parse(req.params.id);
  const input = z.object({
    amount: z.number().positive().max(10000000),
    method: z.enum(['Cash', 'UPI', 'Card', 'Bank transfer', 'Cheque'])
  }).parse(req.body);

  const payment = await prisma.$transaction(async (tx) => {
    const invoice = await tx.feeInvoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) return null;
    const outstanding = amountToNumber(invoice.amount) - amountToNumber(invoice.paidAmount);
    if (input.amount > outstanding) throw Object.assign(new Error('The collection cannot exceed the remaining invoice balance.'), { statusCode: 400 });

    const receipt = await tx.feePayment.create({
      data: {
        receiptNumber: `RCT-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`,
        invoiceId,
        amount: input.amount,
        method: input.method,
        collectedById: req.user.id
      }
    });
    const paidAmount = amountToNumber(invoice.paidAmount) + input.amount;
    await tx.feeInvoice.update({
      where: { id: invoiceId },
      data: { paidAmount, status: paidAmount >= amountToNumber(invoice.amount) ? 'paid' : 'partial' }
    });
    return receipt;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  if (!payment) return res.status(404).json({ message: 'Fee invoice not found.' });
  await writeAudit(req.user.id, 'fee.payment_collected', 'feePayment', payment.id);
  res.status(201).json({ payment, message: 'Payment recorded and receipt generated.' });
}));

app.get('/api/academics', authenticate, asyncRoute(async (req, res) => {
  if (!['admin', 'principal', 'teacher', 'classTeacher', 'student', 'parent'].includes(req.user.role)) {
    return res.status(403).json({ message: 'You do not have permission to view classwork.' });
  }
  const classList = await accessibleSections(req.user);
  const classNames = classList.map(({ grade, section }) => `${grade}${section}`);
  const studentIds = await permittedStudentIds(req.user);
  const [homework, grades] = await Promise.all([
    Homework.find({ className: { $in: classNames } }).sort({ dueDate: 1 }).lean(),
    studentIds && studentIds.length
      ? prisma.grade.findMany({
        where: { studentId: { in: studentIds } },
        include: { student: { include: { user: { select: { name: true } } } } },
        orderBy: { createdAt: 'desc' },
        take: 100
      })
      : req.user.role === 'admin' || req.user.role === 'principal'
        ? prisma.grade.findMany({
          include: { student: { include: { user: { select: { name: true } } } } },
          orderBy: { createdAt: 'desc' },
          take: 100
        })
        : Promise.resolve([])
  ]);
  res.json({
    classes: classList.map(({ id, grade, section, _count }) => ({ id, name: `${grade}${section}`, students: _count.students })),
    homework,
    grades: grades.map(({ id, subject, term, score, maxScore, student }) => ({
      id, subject, term, score, maxScore, studentName: student.user?.name || 'Student', studentCode: student.studentId
    }))
  });
}));

app.post('/api/homework', authenticate, requireRoles('teacher', 'classTeacher'), asyncRoute(async (req, res) => {
  const input = z.object({
    title: z.string().trim().min(2).max(160),
    description: z.string().trim().max(5000).optional(),
    subject: z.string().trim().min(2).max(80),
    classId: z.number().int().positive(),
    dueDate: z.string()
  }).parse(req.body);
  const classSection = await prisma.classSection.findUnique({ where: { id: input.classId } });
  if (!classSection) return res.status(404).json({ message: 'Class section not found.' });
  if (classSection.classTeacherId !== req.user.id) return res.status(403).json({ message: 'You can only post work to your assigned class.' });
  const homework = await Homework.create({
    title: input.title,
    description: input.description,
    subject: input.subject,
    className: `${classSection.grade}${classSection.section}`,
    dueDate: parseDate(input.dueDate),
    authorId: req.user.id,
    authorName: req.user.name
  });
  await writeAudit(req.user.id, 'homework.created', 'homework', homework.id);
  res.status(201).json({ homework });
}));

app.post('/api/grades', authenticate, requireRoles('teacher', 'classTeacher'), asyncRoute(async (req, res) => {
  const input = z.object({
    studentId: z.number().int().positive(),
    subject: z.string().trim().min(2).max(80),
    term: z.string().trim().min(2).max(80),
    score: z.number().min(0).max(1000),
    maxScore: z.number().positive().max(1000)
  }).refine(({ score, maxScore }) => score <= maxScore, { message: 'Score cannot exceed maximum marks.' }).parse(req.body);
  const student = await prisma.student.findUnique({ where: { id: input.studentId }, include: { classSection: true } });
  if (!student?.classSection || student.classSection.classTeacherId !== req.user.id) {
    return res.status(403).json({ message: 'You can only enter marks for students in your assigned class.' });
  }
  const grade = await prisma.grade.upsert({
    where: { studentId_subject_term: { studentId: student.id, subject: input.subject, term: input.term } },
    update: { score: input.score, maxScore: input.maxScore, teacherId: req.user.id },
    create: { ...input, teacherId: req.user.id }
  });
  await writeAudit(req.user.id, 'grade.saved', 'grade', grade.id);
  res.status(201).json({ grade });
}));

app.get('/api/notices', authenticate, asyncRoute(async (req, res) => {
  const audiences = ['all', req.user.role === 'parent' ? 'parents' : req.user.role === 'student' ? 'students' : 'staff'];
  const classes = await accessibleSections(req.user);
  const notices = await Notice.find({
    $or: [
      { audience: { $in: audiences } },
      ...(classes.length ? [{ audience: 'class', className: { $in: classes.map(({ grade, section }) => `${grade}${section}`) } }] : [])
    ]
  }).sort({ publishedAt: -1 }).limit(100).lean();
  res.json({ notices });
}));

app.post('/api/notices', authenticate, requireRoles('admin', 'principal', 'teacher', 'classTeacher'), asyncRoute(async (req, res) => {
  const input = z.object({
    title: z.string().trim().min(2).max(160),
    body: z.string().trim().min(2).max(10000),
    audience: z.enum(['all', 'students', 'parents', 'staff', 'class']).default('all'),
    className: z.string().trim().max(20).optional()
  }).parse(req.body);
  if (input.audience === 'class' && !input.className) {
    return res.status(400).json({ message: 'Choose a class section for a class-only notice.' });
  }
  if (input.audience === 'class' && ['teacher', 'classTeacher'].includes(req.user.role)) {
    const classes = await assignedSections(req.user);
    if (!classes.some((classSection) => `${classSection.grade}${classSection.section}` === input.className)) {
      return res.status(403).json({ message: 'You can only publish to a class section assigned to you.' });
    }
  }
  const notice = await Notice.create({ ...input, authorId: req.user.id, authorName: req.user.name });
  await writeAudit(req.user.id, 'notice.created', 'notice', notice.id);
  res.status(201).json({ notice });
}));

app.get('/api/admissions', authenticate, requireRoles('admin', 'principal', 'receptionist'), asyncRoute(async (_req, res) => {
  const inquiries = await prisma.admissionInquiry.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
  res.json({ inquiries });
}));

app.post('/api/admissions', authenticate, requireRoles('admin', 'receptionist'), asyncRoute(async (req, res) => {
  const input = z.object({
    applicantName: z.string().trim().min(2).max(120),
    parentName: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(7).max(25),
    email: z.string().email().optional(),
    grade: z.string().trim().min(1).max(20),
    message: z.string().trim().max(2000).optional()
  }).parse(req.body);
  const inquiry = await prisma.admissionInquiry.create({ data: { ...input, handledById: req.user.id } });
  await writeAudit(req.user.id, 'admission.created', 'admissionInquiry', inquiry.id);
  res.status(201).json({ inquiry });
}));

app.patch('/api/admissions/:id', authenticate, requireRoles('admin', 'receptionist'), asyncRoute(async (req, res) => {
  const id = z.coerce.number().int().positive().parse(req.params.id);
  const input = z.object({ status: z.enum(['new', 'contacted', 'tour_scheduled', 'enrolled', 'declined']) }).parse(req.body);
  const inquiry = await prisma.admissionInquiry.update({ where: { id }, data: { ...input, handledById: req.user.id } });
  await writeAudit(req.user.id, 'admission.updated', 'admissionInquiry', inquiry.id);
  res.json({ inquiry });
}));

app.get('/api/visitors', authenticate, requireRoles('admin', 'principal', 'receptionist'), asyncRoute(async (_req, res) => {
  const visitors = await prisma.visitorLog.findMany({ orderBy: { checkedInAt: 'desc' }, take: 200 });
  res.json({ visitors });
}));

app.post('/api/visitors', authenticate, requireRoles('admin', 'receptionist'), asyncRoute(async (req, res) => {
  const input = z.object({
    visitorName: z.string().trim().min(2).max(120),
    phone: z.string().trim().max(25).optional(),
    purpose: z.string().trim().min(2).max(160),
    host: z.string().trim().max(120).optional()
  }).parse(req.body);
  const visitor = await prisma.visitorLog.create({ data: { ...input, loggedById: req.user.id } });
  await writeAudit(req.user.id, 'visitor.checked_in', 'visitorLog', visitor.id);
  res.status(201).json({ visitor });
}));

app.use((_req, res) => res.status(404).json({ message: 'API endpoint not found.' }));
app.use((error, _req, res, _next) => {
  if (error instanceof ZodError) {
    return res.status(400).json({
      message: 'Please check the submitted information.',
      fields: error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message }))
    });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') return res.status(409).json({ message: 'That username or record already exists.' });
    if (error.code === 'P2025') return res.status(404).json({ message: 'The requested record was not found.' });
    if (error.code === 'P2034') return res.status(409).json({ message: 'This record changed while you were saving. Refresh and try again.' });
  }
  if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
  console.error('Request failed:', error.message);
  res.status(500).json({ message: 'The request could not be completed. Please try again.' });
});

async function startServer() {
  for (const key of ['JWT_SECRET', 'DATABASE_URL', 'MONGODB_URI']) {
    if (!process.env[key]) throw new Error(`${key} is required. Copy backend/.env.example to backend/.env and configure it.`);
  }
  if (process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters.');

  await Promise.all([prisma.$connect(), mongoose.connect(process.env.MONGODB_URI)]);
  const server = app.listen(PORT, () => console.log(`School ERP API ready at http://localhost:${PORT}`));
  const shutdown = async () => {
    server.close();
    await Promise.all([prisma.$disconnect(), mongoose.disconnect()]);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error('Unable to start the School ERP API:', error.message);
    process.exitCode = 1;
  });
}

module.exports = { app, prisma };
