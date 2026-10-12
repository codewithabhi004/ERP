# Evergreen School ERP

A bilingual-friendly school-management starter for Evergreen Public School. It brings the everyday work of a school into one responsive portal: student and family records, admissions, class attendance, homework and marks, Indian-rupee fee accounts and receipts, notices, staff and visitors.

> **Demo data only.** The included accounts and records are synthetic. Before using real student, staff or financial information, deploy with private databases, HTTPS, access-controlled backups and a school-approved data-retention policy. This project records offline fee collections; it does not take online payments.

## What is included

- Separate dashboards and API permissions for administrators, receptionists, class teachers, teachers, principals, accountants, librarians, HR staff, students and parents.
- PostgreSQL-backed users, student IDs/admissions, classes/sections, parent links, daily attendance, assessment marks, fee invoices, collections and receipts, admission enquiries and visitor sign-ins.
- MongoDB-backed school notices, homework assignments and audit-event records.
- Hashed passwords, short-lived signed JWTs, login rate limiting, request validation, role-scoped records, class-teacher restrictions, security headers and a readiness endpoint.
- React, Vite, Tailwind CSS, Framer Motion and Lucide icons; responsive school dashboard, light/dark mode, Indian numbering/currency, printable student IDs and classroom photographs.
- A Docker Compose file for local PostgreSQL and MongoDB, plus Render and Vercel deployment configuration.

## Project structure

```text
frontend/
  src/App.jsx                    Role-aware SPA routes and session handling
  src/components/Landing.jsx     School home page
  src/components/LoginPage.jsx   Role-selectable sign-in
  src/components/SchoolPortal.jsx Shared responsive portal and school workflows
  src/components/ui/             Shared Tailwind-based interface components
  src/lib/api.js                 API and INR formatting helpers
  vercel.json                    Client-side route fallback for Vercel
backend/
  index.js                       Express API, authentication and RBAC
  prisma/schema.prisma           PostgreSQL relational schema
  prisma/seed.js                 Opt-in synthetic local demo records
  src/models/                    MongoDB notice, homework and audit models
  .env.example                   Backend configuration template
compose.yaml                     Local PostgreSQL and MongoDB services
render.yaml                      Render API + PostgreSQL blueprint
```

## Run locally in VS Code

Requirements: Node.js 24, npm, Docker Desktop with Docker Compose, and VS Code.

### 1. Start PostgreSQL and MongoDB

From the repository root:

```powershell
docker compose up -d
```

### 2. Configure the API

```powershell
Copy-Item backend\.env.example backend\.env
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Open `backend\.env` in VS Code and replace `JWT_SECRET` with the generated random value. Set `DEMO_PASSWORD` to a private local password with at least 12 characters. The sample PostgreSQL URL matches the **local-only** credentials in `compose.yaml`; update both values together if you change them.

The environment template enables `SEED_DEMO_DATA=true` for the local starter. Local seed accounts use the private `DEMO_PASSWORD` in your ignored `.env` file and can exercise the workflows. A public preview is different: use only synthetic records, set `PUBLIC_DEMO_READ_ONLY=true` on its API, and use the shared public password documented in [DEMO-ACCOUNTS.md](./DEMO-ACCOUNTS.md). Never load real student data or use these demo credentials for a real school.

### 3. Install, migrate and seed synthetic records

In a VS Code terminal:

```powershell
Set-Location backend
npm ci
npm run db:generate
npm run db:migrate
npm run db:seed
```

The seed command creates sample PostgreSQL records, plus starter school notices and homework in MongoDB. **All seeded accounts use the `DEMO_PASSWORD` set in `backend\.env`**—the password is hashed before it is stored. Example usernames:

| School role | Username |
|---|---|
| Administrator | `admin1` |
| Reception | `reception1` |
| Class teacher | `classTeacher1` |
| Teacher | `teacher1` |
| Principal | `principal1` |
| Accounts | `accountant1` |
| HR | `hr1` |
| Student | `student1` or `student2` |
| Parent | `parent1` |

### 4. Start the API and web app

Keep the database services running. Open **two terminals** from the repository root:

```powershell
Set-Location backend
npm run dev
```

```powershell
Set-Location frontend
npm ci
npm run dev
```

Open the local Vite URL printed by the frontend (normally `http://localhost:5173`). The backend readiness check is at `http://localhost:4000/api/health`; both database services must report `ready`.

If your API runs somewhere other than `http://localhost:4000`, add `frontend\.env.local` with `VITE_API_URL=https://your-api.example.com/api` and restart Vite. `FRONTEND_URL` on the API must match the complete client origin.

## School workflows

- **Administrator:** create classes from Play to Class 12, create or deactivate staff accounts, assign class teachers, register students, generate school IDs, create invoices and review attendance, notices and analytics.
- **Reception:** log admission enquiries and visitors, search the student directory and record payments against issued invoices.
- **Teacher / class teacher:** access assigned class records, mark daily attendance, post homework and enter student marks.
- **Accounts:** issue student fee invoices and record collections by cash, UPI, card, bank transfer or cheque. A receipt number is saved for every collection.
- **Student / parent:** review linked school records, attendance, classwork, notices and fee balance. An administrator can optionally create a parent login and link it to a student at admission.
- **Principal / HR:** use the permitted overview, notice and staff-directory views. **Librarian:** use the read-only overview and notices; library inventory and circulation are outside this initial release.

Currency is stored and displayed in Indian rupees (`INR`, `₹`). Student and account data is accessed through the authenticated backend; frontend route checks are only for navigation and are **not** a substitute for API authorization.

## Database changes and useful commands

Run these in `backend\`:

```powershell
npm run db:generate    # Rebuild the Prisma client after schema changes
npm run db:migrate     # Create/apply a development migration
npm run db:deploy      # Apply committed migrations in production
npm run db:seed        # Create synthetic sample accounts and school records
npm run db:create-admin # Bootstrap a single administrator from ADMIN_* variables
npm run db:studio      # Open the Prisma database browser
```

Production accounts must be provisioned deliberately: set `ADMIN_USERNAME`, `ADMIN_NAME` and a unique `ADMIN_PASSWORD` of at least 14 characters in the secured API service environment, then run `npm run db:create-admin` once from `backend\`. Remove the temporary `ADMIN_*` variables after bootstrap. Do not run the development seed command against a real school database. Online payment-gateway integration, SMS/email delivery, file uploads, automated report cards, transport and library inventory are outside this initial release.

## Public demo deployment: GitHub Pages + Render + free-tier databases

The frontend is a static site and can be published at **`https://codewithabhi004.github.io/ERP/`** using GitHub Pages. That is GitHub's free `github.io` subdomain, not a separately registered `.io` custom domain. The API runs on Render; PostgreSQL and MongoDB remain managed services on Neon and MongoDB Atlas. The frontend workflow deploys the site, but those external services still need to be created and configured once.

Use this only for a public, synthetic-data demo. Free hosting may sleep, have resource limits, or change its free-tier terms; it is not an availability or backup guarantee for a live school ERP.

The GitHub Pages site publishes the frontend only. Until the Render API and hosted databases are configured and seeded, public sign-in cannot authenticate; the demo usernames/password are not yet active against a live backend.

1. **Create databases.** Create a PostgreSQL database/project in Neon and a MongoDB Atlas cluster. Use Neon's direct (non-pooled) PostgreSQL URI for `DATABASE_URL`, which is used by Prisma migrations. Save each provider's connection URI privately. Create a dedicated database user with a strong unique password for MongoDB; restrict access where possible. Atlas may require allowing Render's outbound network, which can be broad on a free Render instance.
2. **Create the API.** Import this public GitHub repository into Render as a Blueprint and deploy `render.yaml`. In the Render service environment, set:
   - `DATABASE_URL`: the Neon PostgreSQL connection URI.
   - `MONGODB_URI`: the Atlas `mongodb+srv://...` URI.
   - `FRONTEND_URL`: `https://codewithabhi004.github.io`.
   - `PUBLIC_DEMO_READ_ONLY`: `true` (the Blueprint defaults to this).

   Render generates `JWT_SECRET`. Do not publish any database URI or secret in GitHub, source code, or the demo accounts file. The API readiness endpoint is `https://<render-service>.onrender.com/api/health`.
3. **Initialize synthetic records.** On your own computer, configure `backend\.env` with the same Neon and Atlas URIs, `SEED_DEMO_DATA=true`, and `DEMO_PASSWORD=EvergreenDemo2026!`. Then run from the repository root:

   ```powershell
   Set-Location backend
   npm ci
   npm run db:generate
   npm run db:deploy
   npm run db:seed
   ```

   Seeding writes fictional student/staff records and the shared demo login accounts into your hosted demo databases. Do not run this against real school data. Keep `.env` on your computer; `.env` files are ignored by Git.
4. **Publish the frontend.** In GitHub, open **Settings → Pages** and choose **GitHub Actions** as the build/deployment source. The workflow defaults to the API hostname in `render.yaml`; if Render gives the service a different URL, add `VITE_API_URL` under **Settings → Secrets and variables → Actions → Variables** with the actual API URL ending in `/api`. Run the **Deploy GitHub Pages** workflow (or push to `main`). After it succeeds, open `https://codewithabhi004.github.io/ERP/` and use the synthetic logins in [DEMO-ACCOUNTS.md](./DEMO-ACCOUNTS.md).
5. **Keep the demo read-only.** Leave `PUBLIC_DEMO_READ_ONLY=true` on Render. Authenticated write requests return HTTP 403; login and reading demo screens continue to work. Never set the public demo password on a school/production deployment.

### Where to see and manage the data

- **Students, users, attendance, classes, fees, admissions and visitors (PostgreSQL):** sign in to the Neon Console and open the project's SQL Editor or Tables view. For a local SQL browser, configure `backend\.env` with `DATABASE_URL`, then run `Set-Location backend; npm run db:studio`.
- **Notices, homework and audit logs (MongoDB):** open the cluster in MongoDB Atlas and use **Browse Collections / Data Explorer**.
- **API health and runtime logs:** open the Render service dashboard and inspect **Logs**. `/api/health` reports database connectivity; it does not expose records or credentials.
- **Backups:** use the database providers' export/backup tools and retain protected backups separately. A free demo plan may not include automatic backups.

The application does not upload or save visitor browser data to GitHub; records are sent to the configured API and stored in those databases. Anyone with database credentials can inspect the synthetic demo data, so keep credentials private and rotate them if exposed.

The school and classroom photos are loaded from Unsplash's image CDN. Replace them with school-approved, privacy-reviewed images for a branded public site; avoid publishing identifiable student photos without permission.

## Validation

Run the focused project checks from each workspace:

```powershell
Set-Location backend
npm test
npx prisma validate
```

```powershell
Set-Location frontend
npm run build
```
