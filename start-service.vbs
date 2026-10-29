' InternalAPI Silent Background Service Runner
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strPath = fso.GetParentFolderName(WScript.ScriptFullName)

WshShell.CurrentDirectory = strPath
WshShell.Run "powershell.exe -WindowStyle Hidden -Command ""Start-Process -FilePath 'node' -ArgumentList 'packages/server/dist/index.js' -WorkingDirectory '" & strPath & "' -WindowStyle Hidden""", 0, False
