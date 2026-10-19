param(
  [Parameter(Mandatory=$true)][string]$ExistingPythonDirectory,
  [Parameter(Mandatory=$true)][string]$Source,
  [string]$InstallDirectory = 'C:\ProgramData\Fragmento\ab-sync'
)
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Path $InstallDirectory -Force | Out-Null
& icacls.exe $InstallDirectory /inheritance:r /grant:r '*S-1-5-18:(OI)(CI)F' '*S-1-5-32-544:(OI)(CI)F' '*S-1-5-19:(OI)(CI)M' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Agent directory ACL failed.' }
$runtime = Join-Path $InstallDirectory 'python'
# Use the already installed official Python runtime. Exclude other applications'
# packages, credentials and caches when making the service's private copy.
& robocopy.exe $ExistingPythonDirectory $runtime /E /XD site-packages __pycache__ Scripts /XF '*.pyc' /R:1 /W:1 /NFL /NDL /NJH /NJS
if ($LASTEXITCODE -ge 8) { throw 'Unable to copy Python runtime.' }
$python = Join-Path $runtime 'python.exe'
# Windows PowerShell treats harmless native stderr warnings as terminating errors
# when the parent captures all streams. Check native exit codes explicitly.
$savedPreference = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
& $python -m ensurepip --upgrade 2>&1 | ForEach-Object { "$_" }
$ensureExit = $LASTEXITCODE
$ErrorActionPreference = $savedPreference
if ($ensureExit -ne 0) { throw 'Unable to initialize pip.' }
$ErrorActionPreference = 'Continue'
& $python -m pip install --disable-pip-version-check -r (Join-Path $PSScriptRoot 'requirements.txt') 2>&1 | ForEach-Object { "$_" }
$pipExit = $LASTEXITCODE
$ErrorActionPreference = $savedPreference
if ($pipExit -ne 0) { throw 'Unable to install the AB parser.' }
# Grant the scheduled service read access only to the nominated AB tree.
& icacls.exe $Source /grant '*S-1-5-19:(OI)(CI)RX' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Unable to grant the agent read access to the AB folder.' }
Write-Output "AB runtime ready: $python"
