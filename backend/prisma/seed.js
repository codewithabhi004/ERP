require('dotenv').config();

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { PrismaClient } = require('@prisma/client');
const Homework = require('../src/models/Homework');
const Notice = require('../src/models/Notice');

const prisma = new PrismaClient();

async function main() {
  if (process.env.SEED_DEMO_DATA !== 'true') {
    throw new Error('Set SEED_DEMO_DATA=true before creating synthetic demo accounts.');
  }
  if (!process.env.DEMO_PASSWORD || process.env.DEMO_PASSWORD.length < 12) {
    throw new Error('Set DEMO_PASSWORD to a local-only password with at least 12 characters.');
  }
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required to seed MongoDB notices and homework.');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const passwordHash = await bcrypt.hash(process.env.DEMO_PASSWORD, 12);
  const accounts = [
    ['admin1', 'School Administrator', 'admin'],
    ['reception1', 'Ravi Mehta', 'receptionist'],
    ['teacher1', 'Anjali Sharma', 'teacher'],
    ['classTeacher1', 'Neha Verma', 'classTeacher'],
    ['principal1', 'Dr. Karan Malhotra', 'principal'],
    ['accountant1', 'Amit Joshi', 'accountant'],
    ['librarian1', 'Nisha Patel', 'librarian'],
    ['hr1', 'Priya Sharma', 'hr'],
    ['student1', 'Ravi Kumar', 'student'],
    ['student2', 'Priya Jain', 'student'],
    ['parent1', 'Sunita Kumar', 'parent']
  ];

  const users = {};
  for (const [username, name, role] of accounts) {
    users[username] = await prisma.user.upsert({
      where: { username },
      update: { name, role, active: true },
      create: { username, name, role, passwordHash, email: `${username}@demo.school.invalid` }
    });
  }

  const classes = {};
  for (const [grade, section, teacher] of [
    ['10', 'A', users.classTeacher1.id],
    ['12', 'B', users.teacher1.id],
    ['9', 'A', null],
    ['5', 'A', null],
    ['Play', 'A', null]
  ]) {
    classes[`${grade}${section}`] = await prisma.classSection.upsert({
      where: { grade_section: { grade, section } },
      update: { classTeacherId: teacher },
      create: { grade, section, classTeacherId: teacher }
    });
  }

  const students = [
    { username: 'student1', studentId: 'STU-2026-00001', section: '10A', rollNumber: 12, parentName: 'Sunita Kumar', parentPhone: '+91 98765 43210' },
    { username: 'student2', studentId: 'STU-2026-00002', section: '12B', rollNumber: 8, parentName: 'Rajesh Jain', parentPhone: '+91 98765 43211' }
  ];

  for (const entry of students) {
    const student = await prisma.student.upsert({
      where: { userId: users[entry.username].id },
      update: { studentId: entry.studentId, classSectionId: classes[entry.section].id, rollNumber: entry.rollNumber, parentName: entry.parentName, parentPhone: entry.parentPhone },
      create: { userId: users[entry.username].id, studentId: entry.studentId, classSectionId: classes[entry.section].id, rollNumber: entry.rollNumber, parentName: entry.parentName, parentPhone: entry.parentPhone, address: 'Sector 21, New Delhi' }
    });
    entry.record = student;
  }

  await prisma.parentStudent.upsert({
    where: { parentId_studentId: { parentId: users.parent1.id, studentId: students[0].record.id } },
    update: {},
    create: { parentId: users.parent1.id, studentId: students[0].record.id }
  });

  const invoiceSamples = [
    { number: 'INV-2026-10001', student: students[0], description: 'September tuition fee', amount: 4500, paid: 4500, status: 'paid' },
    { number: 'INV-2026-10002', student: students[0], description: 'October tuition fee', amount: 4500, paid: 0, status: 'pending' },
    { number: 'INV-2026-10003', student: students[1], description: 'October tuition fee', amount: 4700, paid: 2000, status: 'partial' }
  ];

  for (const [index, sample] of invoiceSamples.entries()) {
    const invoice = await prisma.feeInvoice.upsert({
      where: { invoiceNumber: sample.number },
      update: {},
      create: {
        invoiceNumber: sample.number,
        studentId: sample.student.record.id,
        description: sample.description,
        amount: sample.amount,
        paidAmount: sample.paid,
        status: sample.status,
        dueDate: new Date(Date.UTC(2026, 8 + index, 15))
      }
    });
    if (sample.paid > 0) {
      await prisma.feePayment.upsert({
        where: { receiptNumber: `RCT-2026-1000${index + 1}` },
        update: {},
        create: {
          receiptNumber: `RCT-2026-1000${index + 1}`,
          invoiceId: invoice.id,
          amount: sample.paid,
          method: 'Cash',
          collectedById: users.accountant1.id
        }
      });
    }
  }

  for (const student of students) {
    const classSection = classes[student.section];
    for (let offset = 0; offset < 5; offset += 1) {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() - offset);
      const dateOnly = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
      await prisma.attendance.upsert({
        where: { studentId_date: { studentId: student.record.id, date: dateOnly } },
        update: {},
        create: {
          studentId: student.record.id,
          classSectionId: classSection.id,
          date: dateOnly,
          status: offset === 3 && student.username === 'student2' ? 'absent' : 'present',
          markedById: classSection.classTeacherId || users.teacher1.id
        }
      });
    }
  }

  const gradeSamples = [
    { student: students[0], subject: 'Mathematics', score: 86, teacher: users.classTeacher1.id },
    { student: students[0], subject: 'Science', score: 78, teacher: users.classTeacher1.id },
    { student: students[1], subject: 'Physics', score: 91, teacher: users.teacher1.id },
    { student: students[1], subject: 'Chemistry', score: 88, teacher: users.teacher1.id }
  ];
  for (const sample of gradeSamples) {
    await prisma.grade.upsert({
      where: {
        studentId_subject_term: {
          studentId: sample.student.record.id,
          subject: sample.subject,
          term: 'Term 1 2026-27'
        }
      },
      update: { score: sample.score, teacherId: sample.teacher },
      create: {
        studentId: sample.student.record.id,
        subject: sample.subject,
        term: 'Term 1 2026-27',
        score: sample.score,
        maxScore: 100,
        teacherId: sample.teacher
      }
    });
  }

  for (const [title, body, audience] of [
    ['Welcome to your school portal', 'Your school updates, classwork, attendance and fee receipts are now together in one place.', 'all'],
    ['October parent–teacher meeting', 'Appointments for the October parent–teacher meeting are open at the school reception.', 'parents'],
    ['Mid-term assessment calendar', 'Please check the class timetable and assessment dates with your class teacher.', 'students']
  ]) {
    await Notice.updateOne(
      { title },
      { $setOnInsert: { title, body, audience, authorId: users.admin1.id, authorName: users.admin1.name } },
      { upsert: true }
    );
  }

  await Homework.updateOne(
    { title: 'Fractions & decimals practice' },
    {
      $setOnInsert: {
        title: 'Fractions & decimals practice',
        description: 'Complete exercises 1–10 in your class workbook.',
        subject: 'Mathematics',
        className: '10A',
        dueDate: new Date('2026-12-01T00:00:00.000Z'),
        authorId: users.classTeacher1.id,
        authorName: users.classTeacher1.name
      }
    },
    { upsert: true }
  );

  const sampleInquiry = await prisma.admissionInquiry.findFirst({ where: { phone: '+91 98765 40001' } });
  if (!sampleInquiry) {
    await prisma.admissionInquiry.create({
      data: { applicantName: 'Aarav Kumar', parentName: 'Suman Kumar', phone: '+91 98765 40001', grade: '9', status: 'new', message: 'Looking for admission for the next school year.' }
    });
  }
  const sampleVisitor = await prisma.visitorLog.findFirst({ where: { phone: '+91 98765 40002' } });
  if (!sampleVisitor) {
    await prisma.visitorLog.create({
      data: { visitorName: 'Mrs. Sharma', phone: '+91 98765 40002', purpose: 'Parent enquiry', loggedById: users.reception1.id }
    });
  }

  console.log('Seeded synthetic school records. Use the local DEMO_PASSWORD from backend/.env for the listed demo usernames.');
}

main()
  .catch((error) => {
    console.error('Database seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.all([prisma.$disconnect(), mongoose.disconnect()]);
  });
