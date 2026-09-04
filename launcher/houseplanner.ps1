# House Planner desktop launcher.
# Serves the app folder on http://localhost:8642 and opens it in an Edge/Chrome
# app-mode window (own window, no browser UI). The server also exposes a small
# /blender API so the app can render with a locally installed Blender.
# Run via "House Planner.cmd" (hidden window) or directly for a console log.
param([int]$Port = 8642, [switch]$NoBrowser)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot   # repo root (this file lives in launcher\)
$appUrl = "http://localhost:$Port/index.html"

function Find-Browser {
    $cands = @(
        "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
        "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
        "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
        "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
        "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
    )
    foreach ($c in $cands) { if (Test-Path $c) { return $c } }
    throw 'Neither Chrome nor Edge was found - House Planner needs one of them.'
}

function Find-Blender {
    if ($env:HOUSEPLANNER_BLENDER -and (Test-Path $env:HOUSEPLANNER_BLENDER)) { return $env:HOUSEPLANNER_BLENDER }
    $hits = @()
    foreach ($base in @("$env:ProgramFiles\Blender Foundation", "${env:ProgramFiles(x86)}\Blender Foundation")) {
        if (Test-Path $base) {
            $hits += Get-ChildItem $base -Directory | ForEach-Object { Join-Path $_.FullName 'blender.exe' } | Where-Object { Test-Path $_ }
        }
    }
    # Steam / Microsoft Store installs land on PATH
    $onPath = Get-Command blender.exe -ErrorAction SilentlyContinue
    if ($onPath) { $hits += $onPath.Source }
    if ($hits) { return ($hits | Sort-Object -Descending | Select-Object -First 1) }
    return $null
}

function Find-ClaudeCli {
    $c = Get-Command claude -ErrorAction SilentlyContinue
    if ($c) { return $c.Source }
    foreach ($x in @("$env:APPDATA\npm\claude.cmd", "$env:USERPROFILE\.local\bin\claude.exe")) {
        if (Test-Path $x) { return $x }
    }
    return $null
}

function Invoke-AiTrace($resp, [string]$jsonBody) {
    $claude = Find-ClaudeCli
    if (-not $claude) { Send-Text $resp 'claude CLI not found on this machine.' 'text/plain' 404; return }
    $req2 = $jsonBody | ConvertFrom-Json
    $work = Join-Path $env:LOCALAPPDATA ('HousePlanner\trace-' + [guid]::NewGuid().ToString('n').Substring(0, 8))
    New-Item -ItemType Directory -Force $work | Out-Null
    try {
        $b64 = $req2.png
        if ($b64 -match '^data:') { $b64 = ($b64 -split ',', 2)[1] }
        [System.IO.File]::WriteAllBytes((Join-Path $work 'floorplan.png'), [Convert]::FromBase64String($b64))
        $pxm = [math]::Round(1 / [double]$req2.mppx, 2)
        $prompt = @"
Read the image file floorplan.png in the current directory. It is a scanned/photographed architectural floor plan (often a hand-drawn Danish 'byggesag' drawing).

Coordinate mapping: the image's top-left pixel is world coordinate ($($req2.x), $($req2.y)) in metres. world_x = $($req2.x) + pixel_x * $($req2.mppx); world_y = $($req2.y) + pixel_y * $($req2.mppx). (Scale: $pxm pixels per metre. x grows east/right, y grows south/down.)

Identify every WALL of the buildings on the plan: outer walls (often hatched bands or double parallel lines ~0.3-0.4 m thick) and interior partition walls (thin single or double lines, ~0.1 m). Include attached garages/outbuildings.

Do NOT include: roof-overhang outlines (thin lines running just outside and parallel to the facades), dimension/measurement lines and their numbers, dashed module/axis grid lines, door swing arcs, window symbols, furniture and fixture symbols (stoves, sinks, cupboards, beds), terrace/patio edges and posts, stairs, text, the sheet border, stamps and title blocks.

Doors and windows are openings IN a wall: output the full wall run straight through them, not fragments. Walls are axis-aligned unless clearly diagonal. Read dimension numbers on the drawing to sanity-check your coordinates where possible.

Reply with ONLY a JSON object, nothing else:
{"walls":[{"from":[x1,y1],"to":[x2,y2],"t":0.35}, ...]}
Coordinates in world metres rounded to 2 decimals; t = estimated thickness in metres (~0.35 outer, ~0.1 inner).
"@
        [System.IO.File]::WriteAllText((Join-Path $work 'prompt.txt'), $prompt)
        $p = Start-Process cmd -ArgumentList '/c', 'claude -p --output-format json < prompt.txt > out.json 2> err.txt' `
            -WorkingDirectory $work -PassThru -WindowStyle Hidden
        if (-not $p.WaitForExit(6 * 60 * 1000)) {
            try { $p.Kill() } catch {}
            Send-Text $resp 'AI trace timed out after 6 minutes.' 'text/plain' 500
            return
        }
        $outFile = Join-Path $work 'out.json'
        if (-not (Test-Path $outFile) -or (Get-Item $outFile).Length -eq 0) {
            $err = ''; $ef = Join-Path $work 'err.txt'
            if (Test-Path $ef) { $err = (Get-Content $ef -Tail 10) -join "`n" }
            Send-Text $resp "claude produced no output.`n$err" 'text/plain' 500
            return
        }
        $out = Get-Content $outFile -Raw | ConvertFrom-Json
        Send-Text $resp ([string]$out.result) 'text/plain; charset=utf-8'
    } catch {
        Send-Text $resp ("AI trace failed: " + $_.Exception.Message) 'text/plain' 500
    } finally {
        try { Remove-Item $work -Recurse -Force } catch {}
    }
}

function Start-AppWindow {
    param([string]$Browser, [string]$Url)
    $profileDir = Join-Path $env:LOCALAPPDATA 'HousePlanner\browser-profile'
    New-Item -ItemType Directory -Force $profileDir | Out-Null
    # dedicated profile => own process we can wait on + own taskbar identity
    return Start-Process $Browser -ArgumentList @(
        "--app=$Url", "--user-data-dir=$profileDir",
        '--no-first-run', '--no-default-browser-check', '--window-size=1500,950'
    ) -PassThru
}

# Already running? Just open another window against the existing server.
$alreadyUp = $false
try {
    Invoke-WebRequest "http://localhost:$Port/ping" -TimeoutSec 1 -UseBasicParsing | Out-Null
    $alreadyUp = $true
} catch {}
if ($alreadyUp) {
    if (-not $NoBrowser) { (Start-AppWindow -Browser (Find-Browser) -Url $appUrl).WaitForExit() }
    exit 0
}

$mime = @{
    '.html'='text/html; charset=utf-8'; '.htm'='text/html; charset=utf-8'
    '.js'='text/javascript'; '.mjs'='text/javascript'; '.css'='text/css'
    '.json'='application/json'; '.glb'='model/gltf-binary'; '.gltf'='model/gltf+json'
    '.png'='image/png'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'; '.svg'='image/svg+xml'
    '.ico'='image/x-icon'; '.txt'='text/plain; charset=utf-8'; '.md'='text/plain; charset=utf-8'
    '.py'='text/x-python'; '.wasm'='application/wasm'
}

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "House Planner serving $root on http://localhost:$Port/"

$browserProc = if ($NoBrowser) { $null } else { Start-AppWindow -Browser (Find-Browser) -Url $appUrl }

function Send-Bytes($resp, [byte[]]$bytes, [string]$type, [int]$code = 200) {
    $resp.StatusCode = $code
    $resp.ContentType = $type
    $resp.Headers['Cache-Control'] = 'no-cache'   # local files: always revalidate, never stale
    $resp.ContentLength64 = $bytes.Length
    $resp.OutputStream.Write($bytes, 0, $bytes.Length)
    $resp.Close()
}
function Send-Text($resp, [string]$text, [string]$type = 'text/plain; charset=utf-8', [int]$code = 200) {
    Send-Bytes $resp ([System.Text.Encoding]::UTF8.GetBytes($text)) $type $code
}

function Invoke-BlenderRender($resp, [string]$script) {
    $blender = Find-Blender
    if (-not $blender) { Send-Text $resp 'Blender not found on this machine.' 'text/plain' 404; return }
    $work = Join-Path $env:LOCALAPPDATA ('HousePlanner\render-' + [guid]::NewGuid().ToString('n').Substring(0, 8))
    New-Item -ItemType Directory -Force $work | Out-Null
    try {
        $scriptPath = Join-Path $work 'render.py'
        [System.IO.File]::WriteAllText($scriptPath, $script)
        $log = Join-Path $work 'blender.log'
        $p = Start-Process $blender -ArgumentList @('--background', '--python', $scriptPath) `
            -WorkingDirectory $work -PassThru -WindowStyle Hidden `
            -RedirectStandardOutput $log -RedirectStandardError (Join-Path $work 'blender.err')
        if (-not $p.WaitForExit(15 * 60 * 1000)) {
            try { $p.Kill() } catch {}
            Send-Text $resp 'Blender render timed out after 15 minutes.' 'text/plain' 500
            return
        }
        $png = Join-Path $work 'house-render.png'
        if (Test-Path $png) {
            Send-Bytes $resp ([System.IO.File]::ReadAllBytes($png)) 'image/png'
        } else {
            $tail = ''
            if (Test-Path $log) { $tail = (Get-Content $log -Tail 40) -join "`n" }
            Send-Text $resp "Blender did not produce an image.`n$tail" 'text/plain' 500
        }
    } finally {
        try { Remove-Item $work -Recurse -Force } catch {}
    }
}

try {
    while ($listener.IsListening) {
        $ctxTask = $listener.GetContextAsync()
        while (-not $ctxTask.Wait(500)) {
            if ($browserProc -and $browserProc.HasExited) { exit 0 }   # app window closed -> shut down
        }
        $ctx = $ctxTask.Result
        $req = $ctx.Request
        $resp = $ctx.Response
        try {
            $path = [uri]::UnescapeDataString($req.Url.AbsolutePath)
            if ($path -eq '/ping') { Send-Text $resp 'houseplanner'; continue }
            if ($path -eq '/blender/check') {
                $b = Find-Blender
                $json = if ($b) { '{"blender":' + ($b | ConvertTo-Json) + '}' } else { '{"blender":null}' }
                Send-Text $resp $json 'application/json'
                continue
            }
            if ($path -eq '/trace/check') {
                $cl = Find-ClaudeCli
                $json = if ($cl) { '{"claude":' + ($cl | ConvertTo-Json) + '}' } else { '{"claude":null}' }
                Send-Text $resp $json 'application/json'
                continue
            }
            if ($path -eq '/trace' -and $req.HttpMethod -eq 'POST') {
                $reader = [System.IO.StreamReader]::new($req.InputStream, $req.ContentEncoding)
                Invoke-AiTrace $resp $reader.ReadToEnd()
                continue
            }
            if ($path -eq '/blender/render' -and $req.HttpMethod -eq 'POST') {
                $reader = [System.IO.StreamReader]::new($req.InputStream, $req.ContentEncoding)
                $body = $reader.ReadToEnd()
                Invoke-BlenderRender $resp $body
                continue
            }
            if ($path -eq '/') { $path = '/index.html' }
            $file = Join-Path $root ($path.TrimStart('/') -replace '/', '\')
            $full = [System.IO.Path]::GetFullPath($file)
            if (-not $full.StartsWith([System.IO.Path]::GetFullPath($root), [System.StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path $full -PathType Leaf)) {
                Send-Text $resp 'not found' 'text/plain' 404
                continue
            }
            $ext = [System.IO.Path]::GetExtension($full).ToLowerInvariant()
            $type = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
            Send-Bytes $resp ([System.IO.File]::ReadAllBytes($full)) $type
        } catch {
            try { Send-Text $resp ("server error: " + $_.Exception.Message) 'text/plain' 500 } catch {}
        }
    }
} finally {
    try { $listener.Stop() } catch {}
}
