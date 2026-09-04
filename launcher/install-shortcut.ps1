# Creates "House Planner" shortcuts on the Desktop and in the Start Menu.
$ErrorActionPreference = 'Stop'
$launcher = Join-Path $PSScriptRoot 'houseplanner.ps1'
$icon = Join-Path $PSScriptRoot 'houseplanner.ico'
$sh = New-Object -ComObject WScript.Shell
foreach ($dir in @([Environment]::GetFolderPath('Desktop'),
                   (Join-Path ([Environment]::GetFolderPath('StartMenu')) 'Programs'))) {
    $lnk = $sh.CreateShortcut((Join-Path $dir 'House Planner.lnk'))
    $lnk.TargetPath = 'powershell.exe'
    $lnk.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$launcher`""
    $lnk.WorkingDirectory = Split-Path -Parent $PSScriptRoot
    if (Test-Path $icon) { $lnk.IconLocation = "$icon,0" }
    $lnk.Description = 'House Planner - plan your house and every idea you have for it'
    $lnk.Save()
}
Write-Host 'Shortcuts created on the Desktop and in the Start Menu.'
