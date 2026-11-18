param([switch]$UseLocalWamp)

$ErrorActionPreference = 'Stop'
$environmentFile = Join-Path $PSScriptRoot '.env'

if (-not (Test-Path -LiteralPath $environmentFile)) {
    throw 'Missing .env. Copy .env.example to .env and fill in the local database and JWT settings.'
}

foreach ($configLine in Get-Content -LiteralPath $environmentFile) {
    $entry = [regex]::Match($configLine, '^\s*(?<key>[A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?<value>.*)$')
    if (-not $entry.Success) { continue }

    $key = $entry.Groups['key'].Value
    $value = $entry.Groups['value'].Value.Trim()
    if ($value.Length -ge 2 -and
        (($value.StartsWith('"') -and $value.EndsWith('"')) -or
         ($value.StartsWith("'") -and $value.EndsWith("'")))) {
        $value = $value.Substring(1, $value.Length - 2)
    }
    [Environment]::SetEnvironmentVariable($key, $value, 'Process')
}

$required = @('DB_URL', 'DB_USERNAME', 'DB_PASSWORD')
foreach ($key in $required) {
    if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($key))) {
        throw "Missing $key in .env."
    }
}
if ([string]::IsNullOrWhiteSpace($env:JWT_SECRET)) {
    throw 'Missing JWT_SECRET in .env.'
}
if ($UseLocalWamp) {
    $env:DB_PASSWORD = ''
    $env:SPRING_JPA_DATABASE_PLATFORM = 'org.hibernate.dialect.MariaDBDialect'
}

& (Join-Path $PSScriptRoot 'mvnw.cmd') spring-boot:run
exit $LASTEXITCODE
