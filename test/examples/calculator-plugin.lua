-- ============================================
-- Simple Calculator Plugin
-- ============================================
-- A basic calculator demonstrating:
-- - User input handling
-- - Mathematical operations
-- - Error handling
-- - Result display
-- ============================================

local calculator = {}

function calculator.init()
    print("Calculator Plugin loaded")
    
    -- Register calculator command
    editor.registerCommand("calculator.open", function()
        calculator.showCalculator()
    end)
    
    -- Add to Tools menu
    ui.addMenuItem("Tools", "Calculator", "calculator.open")
end

function calculator.showCalculator()
    local expression = ui.prompt("Enter expression (e.g., 2 + 2, 10 * 5):", "")
    
    if not expression or expression == "" then
        return
    end
    
    local result, error = calculator.evaluate(expression)
    
    if error then
        ui.showMessage("Error: " .. error, "error")
    else
        ui.showMessage("Result: " .. result, "success")
        
        -- Ask if user wants to insert result into editor
        local insert = ui.confirm("Insert result into editor?")
        if insert then
            editor.insertTextAtCursor(tostring(result))
        end
    end
end

function calculator.evaluate(expr)
    -- Remove whitespace
    expr = string.gsub(expr, "%s+", "")
    
    -- Basic validation
    if not string.match(expr, "^[0-9+%-%*/%.%(%)]+$") then
        return nil, "Invalid characters in expression"
    end
    
    -- Evaluate using Lua's load function (safe for math expressions)
    local func, err = load("return " .. expr)
    
    if not func then
        return nil, "Invalid expression"
    end
    
    local success, result = pcall(func)
    
    if not success then
        return nil, "Calculation error"
    end
    
    return result, nil
end

return calculator
