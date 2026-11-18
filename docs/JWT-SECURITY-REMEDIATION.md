# LabourLink AI JWT security remediation

## Current implementation and local configuration

The backend now requires `JWT_SECRET` directly, including in production. It refuses startup when the value is missing, blank, or shorter than 32 UTF-8 bytes. The signing key is initialized once and used for both HS256 signing and verification. There is no default signing key or legacy `APP_JWT_SECRET` fallback. Both Windows launchers enforce the new variable name. Contractor and worker login continue to validate BCrypt passwords before issuing a token, and protected routes verify the signature before constructing an authenticated identity.

A 48-byte cryptographically random value was generated locally and stored only in the Git-ignored root `.env` as `JWT_SECRET`. Other settings were preserved. No credential value appears in this report. The historical literal was absent from the inspected root, frontend and nested environment files, Eclipse properties, and Spring application properties. The tracked review snapshot was redacted in the preceding audit.

This change does not change the signing key of a running JVM. The currently running localhost backend requires a separate approved restart or rollout to load the rotated build and key. Other machines, hosted environments and secret stores are outside the available inventory.

## Verification and localhost rollout

| Check | Result |
|---|---|
| JWT startup tests | Production-context startup rejected a missing key even when the old aliases were supplied, and rejected a weak key. The valid configuration issued and validated a token and rejected a token from a different key. |
| Backend regression suite | 72 tests passed with zero failures, errors, or skips. Database tests used a schema-only TCP-disabled scratch instance. |
| Rotated localhost JAR | A separate production-profile instance on 8082 used a read-only datasource. Worker and contractor login and protected profile retrieval returned HTTP 200. Its issued token signatures matched the new ignored-file key. |
| Historical and displaced tokens | HTTP 401 from the updated JAR for a correctly formed token signed with the published historical key and for a current session issued by the running 8081 preview. The preview itself also rejected the historical key, and accepted its own session. |
| Live data and services | The existing 8081 listener kept its original PID. The temporary 8082 instance was stopped after verification. No live database changes were made. |
| Proposed Git snapshot | The isolated index scan found neither signing literal in the proposed blobs. The root environment is ignored and untracked, and the real index is empty. |

The rotated artifact is `target/jwt-rotation-20261118/labourlinkai-jwt-rotated-20261118.jar`, SHA-256 `F934D16D7D8961D1E16B80FB050E3CF4C6DF224269FC6A09DEFD225702E03BA9`. The HTTP evidence is in `target/jwt-rotation-20261118/jwt-http-verification.log`.

After approval to replace the running preview, stop only its identified 8081 process and launch the rotated JAR with the ignored configuration:

```powershell
$jar = 'target/jwt-rotation-20261118/labourlinkai-jwt-rotated-20261118.jar'
$sha = (Get-Content "$jar.sha256" -Raw).Trim()
./scripts/deployment/start-backend-release.ps1 -Jar $jar -SHA256 $sha -Port 8081
```

In a separate PowerShell window, run `python -B scripts/deployment/smoke_backend_release.py --port 8081 --expect candidate`. Users need to sign in again. Before a hosted rollout, replace any legacy alias in the deployment's configured secret store with `JWT_SECRET` and confirm each serving process adopted its new key.

## Public exposure and scope

GitHub's anonymous API reported public visibility on 18 November 2026. The original literal was committed in `de73286` in:

- `src/main/java/com/labourlink/labourlinkai/security/JwtUtil.java`
- `src/main/java/com/labourlink/labourlinkai/project-review.txt`

All advertised GitHub branch tips contained that commit: `main`, `feature/varshini-job-management`, and `feature/veda-applications-qa`. GitHub also advertised `refs/pull/4/head`, which points at the affected Varshini branch tip. There were no advertised remote tags. The local safety tag, stash, both backup branches, integration branch, current branch and local main also retained the commit. GitHub reported zero forks at audit time. Downloaded copies and caches can still exist.

## Rotate every affected environment

1. Inventory each Spring deployment, CI/CD environment and secret store, local or shared demo instance, standby, and rollback image. Compare its effective signing key with the compromised value in a restricted local process and record only whether it matches. Configuration files that were replaced after startup do not establish a running process's key.
2. For each affected environment, generate an independent key with the platform secret generator or Python's `secrets.token_urlsafe(48)`. Send it directly to the approved secret store or ignored environment file without stdout, command-line arguments, or a committed template value. Configure the backend as `JWT_SECRET`.
3. During an approved rollout, update every backend instance in that environment together. Coordinate session invalidation and require all affected users to sign in again. Smoke-test contractor and worker login, protected routes for the new token, and HTTP 401 for the old token. Review authentication logs for unexpected activity during the exposure window.
4. Keep the new signing key when rolling back application code. Binaries or configurations using the compromised key are ineligible rollback targets.

## GitHub history cleanup plan — approval required

Credential rotation is the security control. History cleanup can reduce discoverability of the old copies. This plan was prepared only. No rewrite or push has been executed. [GitHub guidance on removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)

1. Obtain maintainer approval and schedule a write freeze. Inventory branch and tag tips, protected branches, open pull requests, GitHub releases and other references. Save a restricted backup of Git refs and preserve current uncommitted work separately. Keep the backup private because it contains the old history.
2. Use a fresh private mirror and `git-filter-repo` 2.47 or later. Prepare a restricted replacement file outside the clone using one line of the form `literal:<historical value>==><redaction marker>`, with no terminal output. Use literal replacement to preserve the source files and edits.

   ```powershell
   git clone --mirror https://github.com/Shivani-boyina/labourlink-ai.git labourlink-ai-history-cleanup.git
   Set-Location labourlink-ai-history-cleanup.git
   git filter-repo --sensitive-data-removal --replace-text $privateReplacementFile
   ```

3. Scan all rewritten reachable blobs and inspect the changed-ref map. Verify that the old literal is absent, expected refs and content remain, and all affected pull-request refs are recorded. Check the resulting application snapshot. The replacement file must stay private throughout.
4. After explicit force-push approval, restore the remote URL if the tool removed it, then update only the reviewed branch and tag refs. Use an explicit lease per updated ref against its recorded pre-freeze tip and arrange any required branch-protection exception with the owners. Stop on a changed remote tip. GitHub pull refs are managed by GitHub. Coordinate open PRs before the rewrite and contact GitHub Support about eligible cached views or PR references that still expose the old material. Review release artifacts separately.
5. Ask collaborators to reclone and reapply reviewed uncommitted changes onto the new history. Unpublished commits should be rebased or selectively reapplied from a clean base. Merging old branches can reintroduce the exposed objects. The rewrite changes commit IDs, can invalidate signatures, and can break existing PR diffs and links. Existing clones, caches, forks, and downloaded copies may retain the original key even after the repository is cleaned.
