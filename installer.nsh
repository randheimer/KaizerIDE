; Custom NSIS script for KaizerIDE context menu integration

; Add "Open with KaizerIDE" to context menu for files (optional, user choice)
!macro customInstall
  ; Only add context menu if user selected the option
  ${If} $AddToContextMenu == "1"
    ; Register context menu for all files
    WriteRegStr HKCR "*\shell\KaizerIDE" "" "Open with KaizerIDE"
    WriteRegStr HKCR "*\shell\KaizerIDE" "Icon" "$INSTDIR\KaizerIDE.exe"
    WriteRegStr HKCR "*\shell\KaizerIDE\command" "" '"$INSTDIR\KaizerIDE.exe" "%1"'
    
    ; Register context menu for folders
    WriteRegStr HKCR "Directory\shell\KaizerIDE" "" "Open Folder in KaizerIDE"
    WriteRegStr HKCR "Directory\shell\KaizerIDE" "Icon" "$INSTDIR\KaizerIDE.exe"
    WriteRegStr HKCR "Directory\shell\KaizerIDE\command" "" '"$INSTDIR\KaizerIDE.exe" "%V"'
    
    ; Register context menu for directory background (right-click in empty space)
    WriteRegStr HKCR "Directory\Background\shell\KaizerIDE" "" "Open in KaizerIDE"
    WriteRegStr HKCR "Directory\Background\shell\KaizerIDE" "Icon" "$INSTDIR\KaizerIDE.exe"
    WriteRegStr HKCR "Directory\Background\shell\KaizerIDE\command" "" '"$INSTDIR\KaizerIDE.exe" "%V"'
  ${EndIf}
!macroend

; Remove context menu entries on uninstall
!macro customUnInstall
  ; Remove file context menu
  DeleteRegKey HKCR "*\shell\KaizerIDE"
  
  ; Remove folder context menu
  DeleteRegKey HKCR "Directory\shell\KaizerIDE"
  
  ; Remove directory background context menu
  DeleteRegKey HKCR "Directory\Background\shell\KaizerIDE"
!macroend
