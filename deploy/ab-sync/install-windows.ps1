param(
  [Parameter(Mandatory=$true)][string]$Source,
  [Parameter(Mandatory=$true)][string]$Endpoint,
  [Parameter(Mandatory=$true)][string]$TokenFile,
  [Parameter(Mandatory=$true)][string]$Python,
  [string]$InstallDirectory = 'C:\ProgramData\Fragmento\ab-sync',
  [string]$TaskName = 'Fragmento-AB-Sync'
)
$ErrorActionPreference = 'Stop'
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw 'Run this installer as administrator on the file server.'
}
if ((Get-TimeZone).Id -notin @('Central Europe Standard Time', 'W. Europe Standard Time', 'Central European Standard Time')) {
  throw 'The task requires the file server local timezone to be Central European time with daylight saving.'
}
# Resolve the server's own share to a local directory: mapped user drive letters
# and remote SMB credentials are not available to an unattended service account.
if ($Source -match '^\\\\[^\\]+\\([^\\]+)(.*)$') {
  $shareName = $Matches[1]
  $shareSuffix = $Matches[2].TrimStart('\')
  $share = Get-SmbShare -Name $shareName -ErrorAction Stop
  $Source = Join-Path $share.Path $shareSuffix
}
if (-not (Test-Path -LiteralPath $Source -PathType Container)) { throw 'The AB source folder is unavailable.' }
if (-not (Test-Path -LiteralPath $Python -PathType Leaf)) { throw 'Python executable not found.' }
$token = (Get-Content -LiteralPath $TokenFile -Raw).Trim()
if ($token.Length -lt 32) { throw 'AB sync token is too short.' }
$endpointUri = [Uri]$Endpoint
if ($endpointUri.Scheme -ne 'https' -or $endpointUri.AbsolutePath -ne '/api/internal/ab-sync') { throw 'Use the HTTPS AB sync endpoint.' }
New-Item -ItemType Directory -Path $InstallDirectory -Force | Out-Null
$installPath = (Resolve-Path -LiteralPath $InstallDirectory).Path
if ($installPath -notlike 'C:\ProgramData\Fragmento\*') { throw 'Install beneath C:\ProgramData\Fragmento.' }
# No interactive user/password is stored. LOCAL SERVICE receives only its agent
# directory and uses the file server's local source directory.
& icacls.exe $installPath /inheritance:r /grant:r '*S-1-5-18:(OI)(CI)F' '*S-1-5-32-544:(OI)(CI)F' '*S-1-5-19:(OI)(CI)M' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Unable to protect the agent directory.' }
$scriptRoot = Join-Path $PSScriptRoot '..\..\frontend\scripts'
foreach ($file in @('sync-kitchen-abs.py','extract-ab-specifications.py')) {
  $inputFile = Join-Path $scriptRoot $file
  if (-not (Test-Path -LiteralPath $inputFile)) { $inputFile = Join-Path $PSScriptRoot $file }
  if ([IO.Path]::GetFullPath($inputFile) -ne (Join-Path $installPath $file)) { Copy-Item -LiteralPath $inputFile -Destination $installPath -Force }
}
@{ source=$Source; endpoint=$Endpoint; token=$token; sourceName=$env:COMPUTERNAME; stateFile=(Join-Path $installPath 'state.json') } |
  ConvertTo-Json | Set-Content -LiteralPath (Join-Path $installPath 'config.json') -Encoding UTF8
$runner = @'
$ErrorActionPreference = 'Stop'
& '__PYTHON__' -B '__SCRIPT__' --config '__CONFIG__' *> '__LOG__'
exit $LASTEXITCODE
'@
$runner = $runner.Replace('__PYTHON__',$Python.Replace("'","''")).Replace('__SCRIPT__',(Join-Path $installPath 'sync-kitchen-abs.py')).Replace('__CONFIG__',(Join-Path $installPath 'config.json')).Replace('__LOG__',(Join-Path $installPath 'last-run.log'))
$runner | Set-Content -LiteralPath (Join-Path $installPath 'run.ps1') -Encoding UTF8
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$installPath\run.ps1`"" -WorkingDirectory $installPath
$triggers = @((New-ScheduledTaskTrigger -Daily -At '12:00'), (New-ScheduledTaskTrigger -Daily -At '15:30'))
# Omit UTC offsets so Task Scheduler follows local wall-clock time across DST.
$taskDate = Get-Date -Format 'yyyy-MM-dd'
$triggers[0].StartBoundary = "${taskDate}T12:00:00"
$triggers[1].StartBoundary = "${taskDate}T15:30:00"
$principal = New-ScheduledTaskPrincipal -UserId 'S-1-5-19' -LogonType ServiceAccount
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 2) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $triggers -Principal $principal -Settings $settings -Force | Out-Null
Write-Output "Installed $TaskName at 12:00 and 15:30 Central European local time. Source: $Source"
