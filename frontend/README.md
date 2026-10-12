# Evergreen School ERP client

This directory contains the React/Vite school portal. Start the API and both database services before using it; the full local setup, role workflows and Vercel/Render deployment instructions are in the [root README](../README.md).

```powershell
npm ci
npm run dev
```

For a non-local API, set `VITE_API_URL=https://your-api.example.com/api` in `frontend\.env.local` and restart Vite. Build the production client with `npm run build`.
