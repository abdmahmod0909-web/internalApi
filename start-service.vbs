' InternalAPI Silent Background Service Runner
' Starts the backend service completely invisibly without opening any command prompt window.
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strPath = fso.GetParentFolderName(WScript.ScriptFullName)

WshShell.CurrentDirectory = strPath
WshShell.Run "node packages/server/dist/index.js", 0, False
