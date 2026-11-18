param(
    [Parameter(Mandatory)][string]$Jar,
    [Parameter(Mandatory)][ValidatePattern('^[a-fA-F0-9]{64}$')][string]$SHA256,
    [ValidateSet(8080, 8081)][int]$Port = 8080,
    [switch]$ReadOnly
)

$ErrorActionPreference = 'Stop'
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$artifact = (Resolve-Path -LiteralPath $Jar).Path
if ((Get-FileHash -LiteralPath $artifact -Algorithm SHA256).Hash -ne $SHA256) {
    throw 'Backend artifact checksum does not match the release manifest.'
}
if (Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue) {
    throw "Port $Port is occupied. This launcher does not stop services."
}

foreach ($line in Get-Content -LiteralPath (Join-Path $root '.env')) {
    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
        [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2].Trim().Trim('"', "'"), 'Process')
    }
}
if ($env:DB_URL -notmatch '^jdbc:mysql://localhost:3307/labourlinkai(?:\?|$)' -or
    [string]::IsNullOrWhiteSpace($env:DB_USERNAME) -or
    [string]::IsNullOrWhiteSpace($env:DB_PASSWORD) -or
    [string]::IsNullOrWhiteSpace($env:JWT_SECRET)) {
    throw 'The local database or JWT configuration is missing or points at an unexpected target.'
}

$arguments = @(
    '-jar', $artifact, "--server.port=$Port", '--server.address=127.0.0.1',
    '--spring.jpa.hibernate.ddl-auto=validate', '--spring.jpa.show-sql=false',
    '--spring.sql.init.mode=never', '--labourlink.ml.url=http://127.0.0.1:8000'
)
if ($ReadOnly) { $arguments += '--spring.datasource.hikari.read-only=true' }
Push-Location -LiteralPath $root
try {
    & java @arguments
    exit $LASTEXITCODE
} finally {
    Pop-Location
}
