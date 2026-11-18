# Worker and Contractor UI Restoration

## Restored frontend contributions

The merge history retains Varshini's `163da57` frontend work (role-aware layouts/navigation, Telugu and English localization, profile/search pages, and job pages) and Veda's `55d335d` applications/security work. Those contributions are ancestors of `main`; stabilization changes build on the merged code rather than replacing the architecture.

The current UI uses React Router protected routes, shared role-aware components, the existing Tailwind styles, and the current `AuthContext`.

## Route map

| Route | Access | Page |
|---|---|---|
| `/`, `/jobs`, `/jobs/:id`, `/login` | Public | Home, job browse/details, login |
| `/worker/register`, `/contractor/register` | Guest only | Role-specific registration |
| `/worker/dashboard`, `/worker/profile`, `/worker/applications` | Worker | Worker portal and application history |
| `/contractors/search` | Worker | Contractor directory/search |
| `/contractor/dashboard`, `/contractor/profile`, `/contractor/jobs/create`, `/contractor/jobs/:id/edit` | Contractor | Contractor portal/profile/job creation and editing |
| `/workers/search`, `/jobs/:id/matches` | Contractor | Worker directory and job matches |

Backend `SecurityConfig` provides the corresponding role protections; route hiding is not the only authorization layer.

## Navigation and language

- Public users see public links and login/registration actions.
- Worker and contractor sessions receive separate menu sets; signed-in navigation omits guest account actions.
- The language selector offers English and Telugu in desktop and mobile navigation. Selection persists under `labourlink-language` when browser storage is available.
- Navbar and worker-dashboard logout clear the token/session and update `AuthContext` before returning to public navigation.
- Route guards redirect unauthenticated users to login and wrong-role users to their own dashboard.

## Current workflow UI

- Workers can browse jobs, open job details, apply, and view their applications/statuses.
- Contractors can create/edit jobs, view their own jobs, close jobs, expand applicants, accept/reject pending applications, view matching workers, and request job deletion.
- Loading, empty, and API error components are present in the main dashboard flows.

## Known UI gaps and verification

- Worker dashboard now presents matched open jobs, all available open jobs, and recent application statuses.
- Contractor dashboard summarizes posted/open/closed jobs, available worker matches, pending applicants, and accepted workers; applicant detail remains expandable per job.
- Contractor job edit/close controls use role-protected endpoints; editable requests cannot change job owner or status, and only the owning contractor can edit/close.
- Locale keys were statically checked in both locales and the current production build passes. Browser smoke verified guest route redirection, Telugu switching/persistence, and sample job browsing. Responsive layouts, screen-reader behavior, Telugu text at mobile sizes, and live API actions still need browser/manual verification.

## Design notes

Keep large touch targets and readable status labels for the worker portal; retain the professional card/dashboard pattern for contractors. Build future panels from existing route, service, and card patterns. Do not label rule-based worker matches as ML recommendations.
