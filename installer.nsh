; installer.nsh - KaizerIDE context menu registration

!macro customInstall
  WriteRegStr HKCR "*\shell\KaizerIDE" "" "Open with KaizerIDE"
  WriteRegStr HKCR "*\shell\KaizerIDE" "Icon" "$INSTDIR\KaizerIDE.exe,0"
  WriteRegStr HKCR "*\shell\KaizerIDE\command" "" '"$INSTDIR\KaizerIDE.exe" "%1"'

  WriteRegStr HKCR "Directory\shell\KaizerIDE" "" "Open Folder in KaizerIDE"
  WriteRegStr HKCR "Directory\shell\KaizerIDE" "Icon" "$INSTDIR\KaizerIDE.exe,0"
  WriteRegStr HKCR "Directory\shell\KaizerIDE\command" "" '"$INSTDIR\KaizerIDE.exe" "%V"'

  WriteRegStr HKCR "Directory\Background\shell\KaizerIDE" "" "Open in KaizerIDE"
  WriteRegStr HKCR "Directory\Background\shell\KaizerIDE" "Icon" "$INSTDIR\KaizerIDE.exe,0"
  WriteRegStr HKCR "Directory\Background\shell\KaizerIDE\command" "" '"$INSTDIR\KaizerIDE.exe" "%V"'
!macroend

!macro customUnInstall
  DeleteRegKey HKCR "*\shell\KaizerIDE"
  DeleteRegKey HKCR "Directory\shell\KaizerIDE"
  DeleteRegKey HKCR "Directory\Background\shell\KaizerIDE"
!macroend
