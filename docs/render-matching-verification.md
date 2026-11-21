# Render matching deployment and verification

## Observed production evidence

The public Render frontend returned HTTP 200. Its compiled bundle uses the HTTPS LabourLink Render backend and includes the recommendations endpoint and skill-match unavailable UI. An OPTIONS request with the deployed Origin and Authorization request header returned HTTP 200 with matching CORS headers. GET without credentials returned HTTP 401. The authenticated failure payload, backend logs, active revisions, database schema, and Render ML inventory were unavailable for this check.

The worker dashboard requests GET /jobs/recommendations/me?details=true with Authorization: Bearer from the saved session and no body. Spring constrains the route to the WORKER role and resolves the account from the JWT principal. The detailed response contains recommendations, exclusions, excludedJobs and compatibility. That response supplies job-card skill and overall scores. GET /jobs and GET /workers/me are independent. A failed detailed response therefore leaves scores unavailable even when jobs and profile load.

Previously the generic RuntimeException advice mapped many unexpected service failures to HTTP 400, which the frontend described as a form error. The worker route now records the exception class and SQL state when available and returns HTTP 500 for an unexpected failure or 503 for an unavailable data resource. A missing worker returns HTTP 404. The frontend retains status for diagnostics and allows retry. A legacy list response is identified as lacking personalized details.

Spring evaluates trade, location, availability, experience, expected wage, capacity, prior applications, and schedule before using the model for eligible jobs. The database reads for matching also use allocation, review, replacement coverage and archive history tables. Missing tables or columns can break matching independently of basic listing. Verify the schema against the existing migration files through a separately authorized schema audit before changing production. The exact live exception was not observed.

## ML deployment on Render

1. After release approval, check the backend and frontend deploy records for their Git revisions and find any existing private ML service in the backend region and workspace. Reuse that service if it is already configured for this model.
2. If the ML service is absent, create a Render Private Service using Docker. Use the same repository and approved branch, leave Root Directory blank, set Dockerfile Path to ./ml/Dockerfile, and set Docker Build Context to ./ml. Use its default container command. The process listens on port 8000. The Dockerfile installs the pinned Python dependencies and includes the original joblib pipeline and metadata. Inference requires no dataset or database.
3. On Spring, use LABOURLINK_ML_URL with the private Render HTTP hostname and port shown on the ML service Connect menu, without a trailing path. Retain the current DB_URL, DB_USERNAME, DB_PASSWORD and JWT_SECRET in backend runtime settings. Confirm SPRING_JPA_HIBERNATE_DDL_AUTO=validate and SPRING_JPA_SHOW_SQL=false for the candidate. Resolve any schema failure through a separately approved procedure. Keep the existing frontend origin in the CORS allowlist.
4. Build the frontend with VITE_API_BASE_URL=https://labourlink-ai-backend.onrender.com and VITE_USE_MOCK_DATA=false. For a Render static site rooted at labourlink-ai-frontend, use npm ci && npm run build and publish dist with an SPA rewrite to /index.html. These settings are applied at build time.
5. Deploy and smoke-check the private ML service first, then deploy Spring and rebuild the frontend at the approved release revision. No migration is bundled with this change.

From the backend service shell, without printing the configured address:

    test -n "$LABOURLINK_ML_URL"
    curl --fail --silent --show-error "${LABOURLINK_ML_URL%/}/health"
    curl --fail --silent --show-error "${LABOURLINK_ML_URL%/}/feature-contract"

Expect model_loaded true and 16 features. Compare the advertised digest with the tracked artifact checksum. The Java loopback test MLPredictionClientTest contains a supported non-personal inference fixture and verifies the response through the production client. To prove deployed Spring-to-ML inference, sign in as an authorized test worker with an eligible pair and supported model attributes. Inspect only the status and method fields for the detailed recommendation request. Confirm method ML and the same percentage in React. RULE_BASED with MODEL_UNAVAILABLE indicates inference or contract failure. RULE_BASED with FEATURES_UNAVAILABLE identifies inputs that could not be encoded.

Check profile, available jobs, recommendations, job details and application status as a test worker, and job-owner recommendations as a test contractor. Perform an apply action only in a separately authorized test environment. For a failed detailed request, correlate its time and status with the backend diagnostic fields without exporting JWTs, profiles or SQL messages.

## Local container smoke check

    docker build --tag labourlink-ml:local-verification ./ml
    docker run --rm -p 127.0.0.1:8000:8000 labourlink-ml:local-verification

In another terminal, GET http://127.0.0.1:8000/health and /feature-contract, then run MLPredictionClientTest with LABOURLINK_ML_TEST_URL=http://127.0.0.1:8000. This service and test require no database.

