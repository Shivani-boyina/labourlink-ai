# LabourLink AI GitHub deployment readiness

## Publication decision

Publish the reviewed source snapshot only after resolving the historical JWT exposure below. The working tree contains private inputs and unrelated work. Use the explicit path list. No files were deleted, and the real Git index and branch history were left untouched.

## What to commit

| Category | Publish |
|---|---|
| Application | Spring Boot source and resources in `src/main`, React/Vite source, public assets, lockfile and build configuration in `labourlink-ai-frontend`, plus `pom.xml`, the Maven wrapper scripts, and `.mvn/wrapper/maven-wrapper.properties`. The tracked review snapshot has been redacted. |
| Python ML | `ml/api/main.py`, `ml/requirements.txt`, `ml/models/labourlinkai_final_model.joblib` and `ml/models/labourlinkai_model_metadata.json`. FastAPI loads the joblib file and metadata at these exact paths. Model SHA-256 is `ea57ff5513a99263abc182725e67b889e7c72266f6b255f33b3169c14f1995d0`. |
| Configuration and migrations | Root and frontend `.env.example`, `.gitignore`, `.gitattributes`, `src/main/resources/db/migration`, the reviewed deployment launcher and attendance trigger SQL, and the reconciliation scripts under `docs/step-101-reconciliation` for the legacy upgrade path. |
| Tests | `src/test`, including synthetic fixture tests and the isolated browser harness. MySQL integration tests require an explicitly verified scratch database. |
| Documentation | This readiness report and the public deployment checklist. Local release reports, screenshots, and fixture-based demo guides can be reviewed separately before publication. |

## What stays local

- Historical CSVs including `labourlink_ai_1000.csv`, `labourlink_ai_construction_matching_1000.csv`, other root dataset variants, and the archives or notebooks in `dataset/`. The retired 1,000-worker and 1,000-job input remains excluded from deployment.
- `data/LabourLinkAI_200_Worker_Registrations.csv` and `data/LabourLinkAI_200_Contractor_Registrations.csv` have phone and password columns. The worker file also has names. The local job preview contains contractor phone numbers. Keep them private. The `data/ml/` templates and source manifest are research inputs, outside the runtime staging list.
- `ml_training/`, `raw_sources/`, `processed_sources/`, the dataset research report and generator, and the nested `labourlinkai/` workspace. None is needed to load the shipped model.
- The team-share ZIP, other archives, database exports and backup directories, internal screenshots and reports, generated validation JSON, and the local cleanup, import, and account-based demo smoke scripts. The inspected team archive contains CSVs. Keep it private as a whole.
- `.env` files, local application properties, import credentials and manifests, key files, Eclipse metadata, caches, `target/`, frontend dependencies, and build outputs. The repository now ignores these paths and retains the deployed model explicitly.

## Security findings

- **Confirmed historical JWT exposure.** The hard-coded signing literal is in `src/main/java/com/labourlink/labourlinkai/security/JwtUtil.java` in commit `de73286` and the tracked `src/main/java/com/labourlink/labourlinkai/project-review.txt` snapshot. That initial commit is an ancestor of the checked GitHub `main` tip. The application now uses environment-based signing, and the working-tree snapshot is redacted. The redaction affects future commits. Treat the historical key as compromised. Rotate it and invalidate sessions wherever it was used. The literal was absent from the current local root `.env` at audit time. Coordinate any remote history cleanup separately with repository maintainers.
- The audit reviewed 15 locally reachable/reflogged commits and 270 historical blobs using path and content signatures, followed by focused checks of authentication and configuration history. No other production database credentials, API tokens, or private keys were confirmed. Test credential matches were fixture values or registration field names. Signature scanning cannot establish the absence of every secret.
- GitHub branch tips were read without uploading any changes. The checked remote `main` tip was `ca3cb1b`. Private registration files and local environment values remain outside the staging list.

## Deployment dependencies

Java 17 and the Maven wrapper build Spring Boot. Node.js 22 and the checked-in npm lockfile build React/Vite. Python 3.13 and `ml/requirements.txt` load the pinned model. MySQL 9.7 requires durable storage, a least-privilege runtime account, and a reviewed schema baseline. The existing versioned SQL assumes base tables and does not constitute an automatic clean-database installation. Establish a sanitized baseline and rehearse migration on a fresh instance before public deployment.

Provide backend database variables, a new `JWT_SECRET`, and the private `LABOURLINK_ML_URL` through the hosting environment. Set `SPRING_JPA_HIBERNATE_DDL_AUTO=validate` and disable SQL logging. Provide an absolute HTTPS frontend API origin with mock mode disabled. The current CORS allowlist is for localhost. Use a same-origin proxy or prepare an explicit public allowlist. A free deployment needs persistent MySQL and enough memory for both Java and Python. Hosting, pricing, and public-network operation have not been verified. See the [JWT security remediation report](JWT-SECURITY-REMEDIATION.md).

## Review and stage

### Validation results

| Check | Result |
|---|---|
| Backend | 72 tests passed after JWT remediation with zero failures, errors, or skips. Database integration used a TCP-disabled schema-only scratch instance. The Java client also received a real ML test prediction. |
| Frontend | TypeScript and the production build passed. The build used a reserved example HTTPS API host with mock mode and Maps key disabled. |
| Python ML | Import loaded the pinned original model and its 16-feature contract. The existing FastAPI health endpoint responded successfully. |
| Staging rehearsal | A temporary Git index and separate object directory held the 226-file proposed snapshot with 190 changed paths. The scan excluded private environment files, data and build artifacts, checked known local and historical credential literals and common token patterns, and retained the expected joblib model. The real index remained empty. |

### Commands

Run from the project root after reviewing the findings. This uses an allowlist and keeps registration and historical import inputs local.

```powershell
git status --short
git add -- .gitignore .gitattributes .env.example pom.xml mvnw mvnw.cmd .mvn/wrapper/maven-wrapper.properties
git add -- labourlink-ai-frontend src/main src/test
git add -- ml/api/main.py ml/requirements.txt ml/models/labourlinkai_final_model.joblib ml/models/labourlinkai_model_metadata.json
git add -- run-backend.ps1 scripts/deployment/start-backend-release.ps1 scripts/deployment/attendance-journal-guards.sql
git add -- docs/GITHUB-DEPLOYMENT-READINESS.md docs/JWT-SECURITY-REMEDIATION.md docs/PRODUCTION-DEPLOYMENT-CHECKLIST.md docs/step-101-reconciliation
git diff --cached --check
git diff --cached --name-status
```

Review staged paths and run a credentials scan against the staged snapshot. Do not stage registration CSVs, data backups or the retired input. After reviewing the remaining security and hosting gates, commit the reviewed snapshot:

```powershell
git commit -m "Prepare LabourLink AI application and model for deployment"
```

Push only after the historical JWT key has been addressed and the destination branch has been reviewed. This audit did not commit, push, merge, delete files, modify live MySQL, or stop any running service.
