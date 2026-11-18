# LabourLink AI localhost startup

Use the updated preview at **http://localhost:3000**. It calls the verified Spring Boot release at **http://localhost:8081** and uses the original model service at **http://127.0.0.1:8000/health**. The original frontend and backend on 5173 and 8080 passed the initial check but were no longer listening at the final check. They were not replaced or rerouted.

## Requirements and MySQL

Use Windows PowerShell, Java 17, Node.js 22 with npm, Python 3.13, and MySQL 9.7. Start the existing local MySQL instance for the `labourlinkai` schema. Keep the existing root-project `.env` private. Its JDBC URL must select `labourlinkai` at `localhost:3307`.

From the project root:

```powershell
Test-NetConnection localhost -Port 3307
Get-Service | Where-Object { $_.Name -match 'mysql|maria' } | Select-Object Name, Status
```

If MySQL is stopped, use Windows Services to start the service configured for port 3307, or run `Start-Service -Name '<verified service name>'` from an authorized PowerShell session. Confirm the port again before continuing. Use the existing MySQL data directory and configuration.

## Start or restart after Windows reboots

Open a separate PowerShell window for each service. Start only services whose ports are free.

**1. Original Python model**

```powershell
if (!(Test-Path '.venv-ml/Scripts/python.exe')) {
    python -m venv .venv-ml
    .venv-ml/Scripts/python.exe -m pip install -r ml/requirements.txt
}
.venv-ml/Scripts/python.exe -m uvicorn ml.api.main:app --host 127.0.0.1 --port 8000
```

Verify before launching Spring Boot:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
```

**2. Verified backend**

```powershell
$jar = 'target/epics-deployment-20261118/labourlinkai-epics-verified-20261118.jar'
$sha = '1E1F4EB22390FBDE6C5F764599D4515FAB6DFD34F3A49395BDAD036065D69706'
./scripts/deployment/start-backend-release.ps1 -Jar $jar -SHA256 $sha -Port 8081
```

The launcher reads the existing `.env`, validates the schema, skips SQL initialization, and leaves port 8080 alone. Preserve the versioned JAR before cleaning Maven output. The older 8080 JVM can serve as a fallback only while that process is alive. A Windows restart ends it, and no exact artifact is available to restart that build.

**3. Separate frontend**

```powershell
Set-Location labourlink-ai-frontend
$env:VITE_API_BASE_URL = 'http://localhost:8081'
$env:VITE_USE_MOCK_DATA = 'false'
npm.cmd run dev -- --host localhost --port 3000 --strictPort
```

If the checked-in lockfile exists and dependencies have yet to be installed, first run `npm.cmd ci`. Open **http://localhost:3000**.

## Verify the updated connection

```powershell
Invoke-WebRequest http://localhost:8081/jobs
python -B scripts/deployment/smoke_backend_release.py --port 8081 --expect candidate
```

Run these commands from the project root. Browser DevTools should show requests such as `http://localhost:8081/jobs/recommendations/me`. The preview requires the matching method field, and the smoke script validates it.

Use the approved local accounts from the [demo execution guide](epics-demo-execution-guide.md). Worker 1124 can view job 1027 and its recommendation. Worker 1193 can view accepted application 30 and allocation 2. Contractor 64 can view the matching worker, application and allocation, including empty attendance. Allocation 2 starts on 20 November 2026. Perform attendance, completion and review mutations only when there is genuine work evidence or in an isolated fixture database. The Apply button submits a real application.

## Safe shutdown and troubleshooting

- For services started in your own PowerShell windows, press **Ctrl+C** in the preview frontend window, then the 8081 backend window. Stop the ML shell only if no other backend needs it. Leave the original 8080 backend and MySQL running while the original demo is in use.
- For the background preview started during verification, inspect the current listeners before issuing commands. Match the PID to the expected process and file before stopping it:

  ```powershell
  Get-NetTCPConnection -State Listen -LocalPort 3000,8081 |
      Select-Object LocalPort, OwningProcess
  $preview = Get-Content 'target/epics-deployment-20261118/localhost-preview-processes.json' | ConvertFrom-Json
  $front = Get-CimInstance Win32_Process -Filter "ProcessId=$($preview.frontendPid)"
  $back = Get-CimInstance Win32_Process -Filter "ProcessId=$($preview.backendPid)"
  if ($front.Name -eq 'node.exe' -and $front.CommandLine -match 'vite\.js.*--port 3000' -and
      (Get-NetTCPConnection -State Listen -LocalPort 3000 -ErrorAction SilentlyContinue).OwningProcess -contains $front.ProcessId) {
      Stop-Process -Id $front.ProcessId
  }
  if ($back.Name -eq 'java.exe' -and $back.CommandLine -match 'labourlinkai-epics-verified-20261118\.jar.*--server\.port=8081' -and
      (Get-NetTCPConnection -State Listen -LocalPort 8081 -ErrorAction SilentlyContinue).OwningProcess -contains $back.ProcessId) {
      Stop-Process -Id $back.ProcessId
  }
  ```

- **Backend fails to start:** Check port 3307, the verified JDBC target, and the JAR hash. Review the locally saved preview logs under `target/epics-deployment-20261118/`. Keep secrets out of exported logs.
- **Browser connects to 8080 or reports CORS:** Open the preview on `http://localhost:3000` and check its DevTools Network tab. Start Vite in the shell where `VITE_API_BASE_URL` points to 8081. The current CORS allowlist expects the hostname `localhost`.
- **Rules-based score appears:** Job 1027 contains categories or regions outside the trained vocabulary. This is expected even when ML health passes. The model test vector in the smoke script proves real predictions separately.
