# Run on Windows: powershell -NoProfile -File tests/launcher-check.ps1
# Loads only the two Claude functions, not the HTTP server or browser launcher.
$ErrorActionPreference = 'Stop'
$source = Join-Path $PSScriptRoot '..\launcher\houseplanner.ps1'
$tokens = $null; $errors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($source, [ref]$tokens, [ref]$errors)
if ($errors.Count) { throw ($errors | Out-String) }
foreach ($name in @('Find-ClaudeCli', 'Invoke-AiTrace')) {
    $fn = $ast.Find({ param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq $name }, $true)
    . ([scriptblock]::Create($fn.Extent.Text))
}
function Send-Text($resp, $text, $type, $code = 200) {
    if ($code -ne 200) { throw "$code $text" }
    $script:result = $text
}
$names = @('PATH','APPDATA','USERPROFILE','LOCALAPPDATA','HP_PATH_TEST')
$saved = @{}
foreach ($name in $names) { $saved[$name] = [Environment]::GetEnvironmentVariable($name) }
$work = Join-Path ([IO.Path]::GetTempPath()) ('House Planner & %HP_PATH_TEST% !HP_PATH_TEST! checks ' + [guid]::NewGuid())
try {
    $env:HP_PATH_TEST = 'must-not-expand'
    $env:APPDATA = Join-Path $work 'app data'
    $env:USERPROFILE = Join-Path $work 'user profile'
    $env:LOCALAPPDATA = Join-Path $work 'local data'
    $env:PATH = "$env:SystemRoot\System32" # No Claude on PATH: exercise both fallback locations.
    $npm = Join-Path $env:APPDATA 'npm'
    $bin = Join-Path $env:USERPROFILE '.local\bin'
    New-Item -ItemType Directory -Force $npm,$bin,$env:LOCALAPPDATA | Out-Null
    $cmd = Join-Path $npm 'claude.cmd'
    [IO.File]::WriteAllText($cmd, "@echo off`r`nif not exist floorplan.png exit /b 2`r`nset /p prompt=`r`necho {""result"":""cmd shim""}`r`n")
    $body = '{"png":"AA==","mppx":0.02,"x":0,"y":0}'
    if ((Find-ClaudeCli) -ne $cmd) { throw 'Did not discover npm fallback' }
    Invoke-AiTrace $null $body
    if ($script:result -ne 'cmd shim') { throw 'Did not execute the discovered .cmd' }

    # npm also installs a .ps1 shim; discovery must return a command cmd.exe can run.
    [IO.File]::WriteAllText((Join-Path $npm 'claude.ps1'), "throw 'Wrong shim'")
    $env:PATH = "$npm;$env:PATH"
    if ((Find-ClaudeCli) -ne $cmd) { throw 'Selected the PowerShell shim instead of an application' }
    Invoke-AiTrace $null $body
    if ($script:result -ne 'cmd shim') { throw 'PATH shim failed' }
    $env:PATH = "$env:SystemRoot\System32"
    Remove-Item $cmd

    # Compile a tiny native console stub using Windows PowerShell's installed .NET compiler.
    $exe = Join-Path $bin 'claude.exe'
    Add-Type -TypeDefinition @'
using System;
using System.IO;
public class FakeClaude {
    public static void Main(string[] args) {
        if (!File.Exists("floorplan.png") || Console.In.ReadToEnd().Length == 0) Environment.Exit(2);
        if (String.Join(" ", args) != "-p --output-format json") Environment.Exit(3);
        Console.WriteLine("{\"result\":\"native exe\"}");
    }
}
'@ -OutputAssembly $exe -OutputType ConsoleApplication
    if ((Find-ClaudeCli) -ne $exe) { throw 'Did not discover native fallback' }
    Invoke-AiTrace $null $body
    if ($script:result -ne 'native exe') { throw 'Did not execute the discovered .exe' }
    Write-Host 'PASS: .cmd and .exe outside PATH, spaces/ampersands/literal variable tokens, stdin/stdout, npm shim selection'
} finally {
    foreach ($name in $names) { [Environment]::SetEnvironmentVariable($name, $saved[$name]) }
    Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue
}
