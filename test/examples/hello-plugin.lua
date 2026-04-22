-- ============================================
-- Hello Plugin - KaizerIDE Example
-- ============================================
-- This plugin demonstrates core functionality:
-- - Registering commands
-- - Creating UI elements
-- - Handling events
-- - File operations
-- ============================================

local plugin = {
    name = "Hello Plugin",
    version = "1.0.0",
    author = "KaizerIDE Team"
}

-- Initialize plugin
function plugin.init()
    print("Hello Plugin loaded successfully!")
    
    -- Register a command in the command palette
    editor.registerCommand("hello.greet", function()
        ui.showMessage("Hello from KaizerIDE!", "info")
    end)
    
    -- Register a command with user input
    editor.registerCommand("hello.greetUser", function()
        local name = ui.prompt("What's your name?", "Developer")
        if name then
            ui.showMessage("Hello, " .. name .. "! Welcome to KaizerIDE.", "success")
        end
    end)
    
    -- Add menu item
    ui.addMenuItem("Tools", "Say Hello", "hello.greet")
    ui.addMenuItem("Tools", "Greet User", "hello.greetUser")
    
    -- Register keyboard shortcut
    editor.registerKeybinding("Ctrl+Shift+H", "hello.greet")
end

-- Event: When a file is opened
function plugin.onFileOpen(filepath)
    local filename = fs.getFileName(filepath)
    print("Opened file: " .. filename)
    
    -- Show notification for Lua files
    if fs.getExtension(filepath) == ".lua" then
        ui.showNotification("Lua file detected!", "Ready for scripting")
    end
end

-- Event: When text is changed in the editor
function plugin.onTextChanged(text)
    local lineCount = editor.getLineCount()
    local wordCount = countWords(text)
    
    -- Update status bar
    ui.setStatusBar("Lines: " .. lineCount .. " | Words: " .. wordCount)
end

-- Event: Before file is saved
function plugin.onBeforeSave(filepath)
    -- Auto-format Lua files before saving
    if fs.getExtension(filepath) == ".lua" then
        local content = editor.getText()
        local formatted = formatLuaCode(content)
        editor.setText(formatted)
        print("Auto-formatted Lua file")
    end
    return true -- Allow save to proceed
end

-- Custom command: Insert header comment
editor.registerCommand("hello.insertHeader", function()
    local filename = fs.getFileName(editor.getCurrentFile())
    local date = os.date("%Y-%m-%d")
    
    local header = string.format([[
-- ============================================
-- File: %s
-- Created: %s
-- Author: %s
-- ============================================

]], filename, date, "Developer")
    
    editor.insertText(0, header)
    ui.showMessage("Header inserted!", "success")
end)

-- Custom command: Count code statistics
editor.registerCommand("hello.codeStats", function()
    local text = editor.getText()
    local lines = editor.getLineCount()
    local words = countWords(text)
    local chars = string.len(text)
    
    local stats = string.format([[
Code Statistics:
- Lines: %d
- Words: %d
- Characters: %d
- File: %s
]], lines, words, chars, fs.getFileName(editor.getCurrentFile()))
    
    ui.showDialog("Code Statistics", stats, {"OK"})
end)

-- Utility: Count words in text
function countWords(text)
    local count = 0
    for word in string.gmatch(text, "%S+") do
        count = count + 1
    end
    return count
end

-- Utility: Basic Lua code formatter
function formatLuaCode(code)
    -- Simple formatting: ensure consistent spacing
    code = string.gsub(code, "%s+\n", "\n") -- Remove trailing whitespace
    code = string.gsub(code, "\n\n\n+", "\n\n") -- Max 2 consecutive newlines
    return code
end

-- Context menu integration
function plugin.onContextMenu(filepath)
    return {
        {label = "Say Hello", command = "hello.greet"},
        {label = "Insert Header", command = "hello.insertHeader"},
        {label = "Code Statistics", command = "hello.codeStats"}
    }
end

-- Settings panel
function plugin.getSettings()
    return {
        {
            id = "hello.autoGreet",
            label = "Auto-greet on startup",
            type = "checkbox",
            default = true
        },
        {
            id = "hello.greetMessage",
            label = "Custom greeting message",
            type = "text",
            default = "Hello from KaizerIDE!"
        }
    }
end

-- Cleanup when plugin is unloaded
function plugin.cleanup()
    print("Hello Plugin unloaded")
end

-- Export plugin
return plugin
