-- ============================================
-- File Template Generator
-- ============================================
-- Demonstrates:
-- - File creation
-- - Template system
-- - Date/time utilities
-- - Multi-language support
-- ============================================

local templates = {
    lua = [[
-- ============================================
-- File: {filename}
-- Created: {date}
-- Author: {author}
-- Description: {description}
-- ============================================

local module = {}

function module.init()
    -- Initialize module
end

return module
]],
    
    python = [[
"""
File: {filename}
Created: {date}
Author: {author}
Description: {description}
"""

def main():
    pass

if __name__ == "__main__":
    main()
]],
    
    javascript = [[
/**
 * File: {filename}
 * Created: {date}
 * Author: {author}
 * Description: {description}
 */

export default class {classname} {{
    constructor() {{
        // Initialize
    }}
}}
]],
    
    html = [[
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
</head>
<body>
    <h1>Welcome to {title}</h1>
</body>
</html>
]]
}

local generator = {}

function generator.init()
    print("Template Generator loaded")
    
    editor.registerCommand("template.create", function()
        generator.createFromTemplate()
    end)
    
    ui.addMenuItem("File", "New from Template", "template.create")
end

function generator.createFromTemplate()
    -- Ask for template type
    local templateType = ui.showOptions("Select template type:", {
        "Lua Module",
        "Python Script",
        "JavaScript Class",
        "HTML Page"
    })
    
    if not templateType then return end
    
    local templateKey = string.lower(string.match(templateType, "^%w+"))
    local template = templates[templateKey]
    
    if not template then
        ui.showMessage("Template not found", "error")
        return
    end
    
    -- Gather information
    local filename = ui.prompt("Filename:", "untitled." .. templateKey)
    local author = ui.prompt("Author:", "Developer")
    local description = ui.prompt("Description:", "")
    
    -- Generate content
    local content = generator.fillTemplate(template, {
        filename = filename,
        date = os.date("%Y-%m-%d %H:%M:%S"),
        author = author,
        description = description,
        title = string.gsub(filename, "%..+$", ""),
        classname = generator.toClassName(filename)
    })
    
    -- Create new file
    local filepath = project.getCurrentPath() .. "/" .. filename
    fs.writeFile(filepath, content)
    editor.openFile(filepath)
    
    ui.showMessage("Template created: " .. filename, "success")
end

function generator.fillTemplate(template, data)
    local result = template
    for key, value in pairs(data) do
        result = string.gsub(result, "{" .. key .. "}", value)
    end
    return result
end

function generator.toClassName(filename)
    local name = string.gsub(filename, "%..+$", "")
    name = string.gsub(name, "^%l", string.upper)
    name = string.gsub(name, "[-_](%l)", function(c) return string.upper(c) end)
    return name
end

return generator
