# LabourLink AI - Frontend

**AI-Driven Workforce Allocation Platform for Daily Wage Labourers and Contractors** (B.Tech IT EPICS project)

React + TypeScript + Vite + Tailwind CSS frontend for the existing Spring Boot backend.

## Purpose
Daily-wage hiring is often informal. LabourLink AI lets **workers** register and find jobs, and lets **contractors** post jobs and see eligible workers.

**Matching is rule-based.** The backend matches workers who are available, have the same skill and the same location as the job, ranked by experience. The frontend shows no AI scores or ML predictions. Machine learning is planned for a future version.

## Features
- Home page, worker and contractor registration
- Contractor login (JWT) with protected dashboard pages
- Job list with search (skill, location, min/max wage), job details
- Create job, delete job, matching workers per job
- Worker profile page (look up by registered phone) with jobs matching skill and location
- Loading, empty, error and success states; backend-offline message; form validation
- Responsive layout, large buttons and simple wording for low-literacy users

## Tech stack
React 18, TypeScript, Vite 5, Tailwind CSS 3, React Router 6, lucide-react. Backend: Spring Boot 3.3.5, JWT, MySQL (not part of this ZIP).

## Install and run
```bash
npm install
copy .env.example .env      # Windows (use "cp" on Mac/Linux)
npm run dev                 # http://localhost:5173
npm run build               # production build (type-checks first)
npm run typecheck           # TypeScript check only
npm run preview
```

## Environment variables
| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8080` | Backend URL. Read only in `src/services/api.ts`. |
| `VITE_USE_MOCK_DATA` | `false` | `true` shows clearly labelled sample jobs/workers for UI preview only. |

Do not commit `.env`. The backend must be running and must allow CORS from `http://localhost:5173`.

## Pages
| Route | Page |
|---|---|
| `/` | Home |
| `/worker/register` | Worker registration |
| `/contractor/register` | Contractor registration |
| `/login` | Login (contractor) |
| `/jobs` | Find Work (search) |
| `/jobs/:id` | Job details |
| `/jobs/:id/matches` | Matching workers (login required) |
| `/contractor/dashboard` | Contractor dashboard (login required) |
| `/contractor/jobs/create` | Create job (login required) |
| `/worker/dashboard` | Worker profile and matching jobs |

## Backend endpoints used
`POST /auth/login`, `POST /workers/register`, `GET /workers`, `POST /contractors/register`, `GET /contractors`, `POST /jobs`, `GET /jobs`, `GET /jobs/{id}`, `DELETE /jobs/{id}`, `GET /jobs/search`, `GET /jobs/{id}/matches`.

## Structure
```
src/
  components/  Navbar, Footer, JobCard, WorkerCard, Field, ProtectedRoute, states
  context/     AuthContext
  pages/       one file per route
  services/    api.ts (base URL, JWT header, errors) + worker/contractor/job/auth services
  types/       Worker, Contractor, Job, Auth
  utils/       validation, storage, useFetch
```

## Development notes / assumptions to check against your backend
- **Login** sends `phone` and `password` as form parameters to `/auth/login`. The token is accepted as plain text or as JSON (`token`, `jwt` or `accessToken`). Only the token and basic profile (phone, id, name) are stored in `localStorage`; the password is never stored.
- **Contractor registration** sends JSON `{contractorName, companyName, phone, location, password}`. If your entity uses different field names, change `src/types/Contractor.ts`.
- **Contractor profile** after login is found by matching the phone in `GET /contractors`.
- **Workers have no login** in the current backend, so the worker dashboard looks up the profile by phone via `GET /workers`.
- **Apply / Express Interest** is disabled: there is no application endpoint yet. No fake success is shown.
- Dashboard statistics are calculated from real API responses only.
