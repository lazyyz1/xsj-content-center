$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptRoot
$envFile = Join-Path $repoRoot ".env.local-real"
$stateRoot = Join-Path $env:LOCALAPPDATA "ContentCenter\dev"
$logRoot = Join-Path $stateRoot "logs"
$stateFile = Join-Path $stateRoot "services.json"
$script:serviceState = [ordered]@{}
if (Test-Path -LiteralPath $stateFile) {
  try {
    $previousState = Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json
    foreach ($entry in $previousState.PSObject.Properties) { $script:serviceState[$entry.Name] = $entry.Value }
  } catch {
    $script:serviceState = [ordered]@{}
  }
}

function Fail([string]$Message) {
  Write-Output "[FAIL] $Message"
  exit 1
}

function Test-LocalPort([int]$Port) {
  $client = [System.Net.Sockets.TcpClient]::new()
  try {
    $attempt = $client.ConnectAsync("127.0.0.1", $Port)
    if (-not $attempt.Wait(1000)) { return $false }
    return $client.Connected
  } catch {
    return $false
  } finally {
    $client.Dispose()
  }
}

function Wait-LocalPort([int]$Port, [int]$Seconds) {
  for ($index = 0; $index -lt $Seconds; $index += 1) {
    if (Test-LocalPort $Port) { return $true }
    Start-Sleep -Seconds 1
  }
  return (Test-LocalPort $Port)
}

function Start-DevService([string]$Name, [string]$CommandLine, [int]$Port, [string]$Description) {
  if (Test-LocalPort $Port) {
    Write-Output "[OK] $Description - port $Port already listening"
    return
  }

  $stdout = Join-Path $logRoot "$Name.out.log"
  $stderr = Join-Path $logRoot "$Name.err.log"
  $process = Start-Process -FilePath $env:ComSpec -ArgumentList @("/d", "/s", "/c", $CommandLine) -WorkingDirectory $repoRoot -RedirectStandardOutput $stdout -RedirectStandardError $stderr -WindowStyle Hidden -PassThru
  $script:serviceState[$Name] = [ordered]@{
    pid = $process.Id
    command = $CommandLine
    port = $Port
    stdout = $stdout
    stderr = $stderr
    startedAt = (Get-Date).ToString("o")
  }
  Write-Output "[START] $Description - logs: $stdout"
}

if (-not (Test-Path -LiteralPath $envFile)) {
  Fail "Missing .env.local-real. Copy config\environments\local-real.env.example first."
}
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { Fail "Docker CLI not found." }
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) { Fail "pnpm not found." }
$asrPython = Join-Path $repoRoot "services\local-asr\.venv\Scripts\python.exe"
$asrServer = Join-Path $repoRoot "services\local-asr\server.py"
if (-not (Test-Path -LiteralPath $asrPython)) { Fail "Local ASR Python environment missing: services\local-asr\.venv" }

New-Item -ItemType Directory -Path $logRoot -Force | Out-Null
Push-Location $repoRoot
try {
  Write-Output "[STEP] Starting Docker Desktop"
  & docker desktop start 2>&1 | ForEach-Object { Write-Output $_ }
  if ($LASTEXITCODE -ne 0) { Fail "Docker Desktop failed to start." }

  Write-Output "[STEP] Starting PostgreSQL, Redis and MinIO (existing volumes preserved)"
  & docker compose -f docker-compose.dev.yml up -d
  if ($LASTEXITCODE -ne 0) { Fail "Docker Compose failed to start." }

  foreach ($dependency in @(@{ name = "PostgreSQL"; port = 55432 }, @{ name = "Redis"; port = 6379 }, @{ name = "MinIO"; port = 9000 })) {
    if (-not (Wait-LocalPort $dependency.port 30)) { Fail "$($dependency.name) did not become reachable on port $($dependency.port)." }
  }

  Write-Output "[STEP] Checking and applying pending Prisma migrations"
  & pnpm db:migrate
  if ($LASTEXITCODE -ne 0) { Fail "Database migration deploy failed; no reset was run." }

  Start-DevService "asr" "services\local-asr\.venv\Scripts\python.exe services\local-asr\server.py" 8765 "Local ASR"
  Start-DevService "worker" "pnpm dev:worker" 3010 "Worker"
  Start-DevService "web" "pnpm dev:web" 3000 "Web"

  $script:serviceState | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $stateFile -Encoding utf8
  foreach ($service in @(@{ name = "Local ASR"; port = 8765; seconds = 45 }, @{ name = "Worker"; port = 3010; seconds = 45 }, @{ name = "Web"; port = 3000; seconds = 60 })) {
    if (Wait-LocalPort $service.port $service.seconds) {
      Write-Output "[OK] $($service.name) listening on $($service.port)"
    } else {
      Write-Output "[WARN] $($service.name) did not open port $($service.port); inspect $logRoot"
    }
  }
  Write-Output "[DONE] Development environment started. Run pnpm run doctor for service checks."
  Write-Output "[INFO] Service logs: $logRoot"
} finally {
  Pop-Location
}
