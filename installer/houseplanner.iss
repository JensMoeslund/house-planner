; House Planner Windows installer (built by Inno Setup — see .github/workflows/release.yml)
; Per-user install: no admin prompt, lands in %LOCALAPPDATA%\HousePlanner.

#ifndef AppVer
#define AppVer "0.0.0-dev"
#endif

[Setup]
AppName=House Planner
AppVersion={#AppVer}
AppPublisher=Jens Moeslund
AppPublisherURL=https://github.com/JensMoeslund/house-planner
DefaultDirName={localappdata}\HousePlannerApp
PrivilegesRequired=lowest
DisableProgramGroupPage=yes
DisableDirPage=yes
OutputBaseFilename=HousePlannerSetup
SetupIconFile=..\launcher\houseplanner.ico
UninstallDisplayIcon={app}\launcher\houseplanner.ico
Compression=lzma2
SolidCompression=yes
WizardStyle=modern

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop icon"; GroupDescription: "Additional icons:"

[Files]
Source: "..\index.html"; DestDir: "{app}"
Source: "..\manifest.webmanifest"; DestDir: "{app}"
Source: "..\sw.js"; DestDir: "{app}"
Source: "..\README.md"; DestDir: "{app}"
Source: "..\LICENSE"; DestDir: "{app}"
Source: "..\House Planner.cmd"; DestDir: "{app}"
Source: "..\catalog\*"; DestDir: "{app}\catalog"; Flags: recursesubdirs
Source: "..\demo\*"; DestDir: "{app}\demo"; Flags: recursesubdirs
Source: "..\docs\*"; DestDir: "{app}\docs"; Flags: recursesubdirs
Source: "..\launcher\*"; DestDir: "{app}\launcher"; Flags: recursesubdirs
Source: "..\icons\*"; DestDir: "{app}\icons"; Flags: recursesubdirs

[Icons]
Name: "{userprograms}\House Planner"; Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""{app}\launcher\houseplanner.ps1"""; WorkingDir: "{app}"; IconFilename: "{app}\launcher\houseplanner.ico"; Comment: "Plan your house — and every idea you have for it"
Name: "{userdesktop}\House Planner"; Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""{app}\launcher\houseplanner.ps1"""; WorkingDir: "{app}"; IconFilename: "{app}\launcher\houseplanner.ico"; Tasks: desktopicon

[Run]
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""{app}\launcher\houseplanner.ps1"""; WorkingDir: "{app}"; Description: "Launch House Planner"; Flags: nowait postinstall skipifsilent
