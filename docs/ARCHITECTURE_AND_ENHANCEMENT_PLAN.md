# LabourLinkAI architecture and enhancement plan

## Verified architecture

- Frontend: React 18.3, TypeScript 5.6, Vite 5.4, React Router 6, Tailwind CSS 3; English and Telugu translations are configured.
- Backend: Java 17, Spring Boot 3.3.5, Spring MVC, Spring Data JPA, Spring Security, Jakarta Validation, JWT, Maven.
- Database: MySQL Connector/J; connection settings come from `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD`. Hibernate currently uses `ddl-auto=update`.
- Authentication: stateless JWT filter and role-specific endpoint rules. Worker and contractor registration/login exist; current-session APIs and protected route workflows exist.
- Existing features: worker profiles and skill/location search, contractor search, job creation and browsing, worker applications, job matching, dashboards, profile pages, role-aware navigation, and a mock-data preview option.
- Tests: JUnit/Spring Boot tests cover application context, auth, and application workflows. Frontend has build/typecheck scripts but no test script or test framework.

## Feature status before enhancement

| Area | Status |
|---|---|
| Authentication and roles | Implemented with JWT; preserve existing behavior. |
| Worker discovery | Implemented for exact skill and text location; no distance or coordinates. |
| Worker location | Text field only. No geocoder, GPS picker, or map. |
| AI assistant | Missing. |
| Text-to-speech / speech input | Missing. |
| Google Maps | Missing. |

## Planned implementation

- Added a validated `/api/chat` endpoint with a platform-specific local response fallback and optional server-side OpenAI-compatible provider configuration. It does not have access to private worker/customer data.
- Added an accessible floating chat panel with session history, loading/errors, clear, navigation suggestions, speech synthesis controls, and optional browser speech recognition.
- Contractor chat requests now use the authenticated JWT role and existing worker search service for real skill/area searches. Returned worker details are limited to directory data; links open worker search with filters prefilled. Guests and workers do not receive contractor-only search results.
- Added reusable read-aloud controls to worker and job cards.
- Added explicit device-location permission controls for customer radius search and worker service-area sharing.
- Added nullable worker coordinates and opt-in flag; API updates worker location under worker JWT ownership, rounds coordinates to two decimal places, and clears coordinates on opt-out.
- Added Haversine radius filtering and map pins only for workers who opted in. Map view degrades to a clear message when no restricted Maps key is configured.

## Files to change

- Backend: `application.properties`; `SecurityConfig.java`; `Worker.java`; worker controller/service; new chat and worker-location DTOs/services.
- Frontend: `App.tsx`; chatbot, map, and location picker components; chat/worker services; worker search/profile; frontend `.env.example`.
- Docs: this report and run/configuration instructions.

## Services, credentials, and dependencies

- Chat works in local fallback mode without external credentials. Optional AI mode uses an API key and model configured only on the backend. No frontend key is needed.
- Text-to-speech and optional speech recognition use browser Web Speech APIs without a paid service; browser/device support varies.
- Google Maps requires a Google Cloud project, billing, and an HTTP-referrer-restricted Maps JavaScript API key. No Maps key is currently configured. The Maps JavaScript API is used when the key is supplied. Places/Geocoding are not required for GPS-based selection; Routes API is not needed.
- No new runtime dependency was needed.

## Risks and limits

- The checkout already contains extensive uncommitted user changes. Those changes must be preserved; new edits are limited to the integration points above.
- Chat provider output is untrusted and never supplies verified worker data or performs hiring/contact actions.
- Worker map sharing is opt-in. Coordinates are rounded before storage and marker info does not show phone numbers. Existing text locations are not geocoded or converted automatically.
- The checked-in development configuration uses `ddl-auto=update` and SQL logging; production deployments should use reviewed migrations and disable SQL logging.

## Delivered and verification

- Added `/api/chat` with request limits, Jakarta validation, platform-focused local fallback, optional OpenAI-compatible server-side provider, and suggested in-app navigation. Chat does not perform a worker search and never returns fabricated worker data.
- Added a responsive floating assistant with in-memory conversation, clear/error/loading states, browser speech synthesis controls, and optional speech recognition.
- Added opt-in device GPS selection, worker location preference updates, approximate coordinates, Haversine radius filtering, and worker map markers through the Maps JavaScript API.
- Hibernate's existing `ddl-auto=update` will add nullable coordinate fields. Existing rows stay unshared (a null flag is treated as false). No destructive schema changes or dependencies were added.
- Frontend `npm run build` passed.
- Backend compilation passed. Focused unit tests passed: 5 tests (chat fallback/live-directory mapping and worker location/radius), 0 failures.
- The full integration suite still cannot run: `TEST_DB_URL`, `TEST_DB_USERNAME`, and `TEST_DB_PASSWORD` are unset. Existing test safety checks require the separate disposable database `localhost:3307/labourlinkai_test`; do not point tests at the development database.
- Local runtime connection verified: WAMP MariaDB on 3307, backend on 8080, frontend on 5173; `POST /api/chat` returned a response, `GET /jobs` returned HTTP 200 from the database, and the frontend CORS preflight returned HTTP 200 for `http://localhost:5173`.

## Configuration and manual checks

1. Configure the existing database and JWT environment variables documented in `.env.example` for the backend.
2. Optional AI: set `CHAT_API_KEY` on the backend environment. `CHAT_API_URL` and `CHAT_MODEL` can select an OpenAI-compatible endpoint/model. Without a key, platform fallback responses remain available.
3. Google Maps: create a Google Cloud project, enable Maps JavaScript API, configure billing, restrict the browser key to your frontend origins, then set `VITE_GOOGLE_MAPS_API_KEY` in `labourlink-ai-frontend/.env`. Without this key, worker search and radius filtering work but the interactive map does not load.
4. Start the configured WAMP MariaDB service first (the supplied `.env` uses port 3307). The separate MySQL80 service detected on port 3306 does not accept the credentials in `.env`. For this local WAMP install with its default passwordless root, start the backend with `./run-backend.ps1 -UseLocalWamp`, which loads `.env` without printing secrets. The absent `labourlinkai` schema was created empty on that WAMP instance and Hibernate created the existing entity tables; no data was migrated from the separate MySQL80 instance. Start the frontend with `npm run dev` from `labourlink-ai-frontend` (`VITE_API_BASE_URL` is `http://localhost:8080`).
5. Manual checks: open the floating assistant; send platform questions; check loading, response and clear; click navigation suggestions; try listen/pause/resume/stop and microphone input in a supported browser. As a worker, select device location and opt in, then save; verify opt-out clears sharing. As a contractor, select device location, choose radius, search, and verify list/map pins include only opted-in workers within range. Test once without a Maps key (graceful fallback) and once with a restricted key.

For manually managed MySQL migrations, the additive equivalent is `ALTER TABLE workers ADD COLUMN latitude DOUBLE NULL, ADD COLUMN longitude DOUBLE NULL, ADD COLUMN location_shared BOOLEAN NULL;`. Apply it once only if your deployment does not use Hibernate schema update. Existing records remain unshared.
