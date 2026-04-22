; Custom NSIS script for KaizerIDE context menu integration

!include "MUI2.nsh"
!include "nsDialogs.nsh"

; Variable to store user choice
Var AddToContextMenu
Var Dialog
Var Checkbox

; Custom page to ask about context menu
!macro customInit
  StrCpy $AddToContextMenu ${BST_CHECKED}  ; Default to enabled
!macroend

Function ContextMenuPage
  !insertmacro MUI_HEADER_TEXT "Context Menu Integration" "Choose whether to add KaizerIDE to Windows context menu"
  
  nsDialogs::Create 1018
  Pop $Dialog
  
  ${If} $Dialog == error
    Abort
  ${EndIf}
  
  ${NSD_CreateLabel} 0 0 100% 24u "Add 'Open with KaizerIDE' to the right-click context menu for files and folders?"
  Pop $0
  
  ${NSD_CreateCheckbox} 0 30u 100% 12u "Add to context menu (recommended)"
  Pop $Checkbox
  ${NSD_SetState} $Checkbox ${BST_CHECKED}
  
  nsDialogs::Show
FunctionEnd

Function ContextMenuPageLeave
  ${NSD_GetState} $Checkbox $AddToContextMenu
FunctionEnd

; Add "Open with KaizerIDE" to context menu for files
!macro customInstall
  ; Only add context menu if user selected the option
  ${If} $AddToContextMenu == ${BST_CHECKED}
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
