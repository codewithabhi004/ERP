# ERP Project

A fullstack ERP website for students, teachers, and admin department.

## Structure

- `backend/` - Node.js + Express API serving users, dashboards, and fee information.
- `frontend/` - React + Vite application with separate views for students, teachers, and admin.

## Features

- Role-based login and dashboard views
- Student fee status and history
- Teacher student list and class overview
- Admin user management and fee records
- No online payment or external submission feature

## Run locally

### Backend

1. Open a terminal in `backend/`
2. Run `npm install`
3. Run `npm start`

### Frontend

1. Open a terminal in `frontend/`
2. Run `npm install`
3. Run `npm run dev`

## Notes

The frontend expects the backend at `http://localhost:4000`.
