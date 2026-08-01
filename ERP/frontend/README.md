Quick start (frontend)

Install and run dev server:

```bash
cd frontend
npm install
npm run dev
```

Build for production:

```bash
cd frontend
npm ci
npm run build
```

Deployment:
- Push to GitHub `main` branch. The Actions workflow `.github/workflows/deploy-frontend.yml` will build `frontend` and publish `frontend/dist` to GitHub Pages (gh-pages branch via action).
- In GitHub repo Settings → Pages, set source to `gh-pages` branch if needed.
