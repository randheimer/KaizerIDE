import { AgentBase } from '../core/AgentBase';
import { buildSystemPrompt } from '../systemPrompt';
import { TOOLS } from '../tools';
import { executeTool } from '../toolExecutor';
import { compressToolResult, estimateTokens } from '../toolResultCompressor';
import { consumeStream } from '../streamProcessor';
import { indexer } from '../../indexer';

/**
 * PlannerAgent - Planning agent for creating structured plans
 * Read-only mode, focuses on analysis and planning
 */
export class PlannerAgent extends AgentBase {
  constructor(config = {}) {
    super('planner', config);
    this.maxIterations = config.maxIterations || 5; // Fewer iterations for planning
  }

  /**
   * Get agent capabilities - read-only
   */
  getCapabilities() {
    return {
      canRead: true,
      canWrite: false,
      canExecute: false,
      allowedTools: [
        'read_file',
        'list_directory',
        'search_files',
        'search_index',
        'grep_index'
      ]
    };
  }

  /**
   * Get agent-specific system prompt
   */
  getSystemPrompt(context) {
    const basePrompt = buildSystemPrompt(
      context.workspacePath,
      context.settings?.selectedModel?.id,
      context.settings?.systemPrompts
    );

    const plannerPrompt = `

${basePrompt}

PLANNER MODE - SPECIAL INSTRUCTIONS:
You are in PLANNER mode. Your role is to analyze the request and create a detailed, structured plan before any implementation.

CAPABILITIES:
- You can READ files and explore the codebase
- You can SEARCH and analyze code structure
- You CANNOT write files or execute commands
- You CANNOT make changes to the codebase

YOUR TASK:
1. Understand the user's request thoroughly
2. Explore the relevant parts of the codebase
3. Create a detailed, step-by-step plan
4. Present the plan to the user for approval

PLAN FORMAT:
Use this structured format for your plan:

## Plan: [Brief Title]

### Overview
[High-level description of what needs to be done]

### Analysis
[Your analysis of the current codebase and requirements]

### Project Structure (if creating/restructuring project)
When the user asks to create a project or improve structure, provide a detailed folder hierarchy with descriptions.

**Adapt the structure to the project type:**

**For React/JavaScript/TypeScript Projects:**
\`\`\`
project-name/
├── src/                          # Main source code directory
│   ├── components/               # React/UI components
│   │   ├── common/              # Reusable UI components (Button, Input, Modal, etc.)
│   │   │   ├── Button/
│   │   │   │   ├── Button.jsx
│   │   │   │   ├── Button.css
│   │   │   │   └── Button.test.js
│   │   ├── layout/              # Layout components (Header, Footer, Sidebar)
│   │   └── features/            # Feature-specific components grouped by domain
│   ├── hooks/                   # Custom React hooks
│   ├── services/                # API and external service integrations
│   ├── store/                   # State management (Redux/Zustand/Context)
│   ├── utils/                   # Utility functions and helpers
│   ├── styles/                  # Global styles and CSS
│   ├── config/                  # Configuration files
│   ├── types/                   # TypeScript types/interfaces (if using TS)
│   ├── App.jsx                  # Main App component
│   └── main.jsx                 # Entry point
├── public/                      # Static files served directly
├── tests/                       # Test files
├── docs/                        # Documentation
└── package.json                 # Dependencies and scripts
\`\`\`

**For Python Projects:**
\`\`\`
project-name/
├── src/                          # Main source code
│   ├── __init__.py
│   ├── main.py                  # Entry point
│   ├── models/                  # Data models
│   │   ├── __init__.py
│   │   ├── user.py
│   │   └── database.py
│   ├── services/                # Business logic
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   └── user_service.py
│   ├── api/                     # API routes/endpoints
│   │   ├── __init__.py
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   └── users.py
│   │   └── middleware/
│   │       └── auth_middleware.py
│   ├── utils/                   # Utility functions
│   │   ├── __init__.py
│   │   ├── helpers.py
│   │   └── validators.py
│   ├── config/                  # Configuration
│   │   ├── __init__.py
│   │   ├── settings.py
│   │   └── database.py
│   └── schemas/                 # Pydantic schemas/validation
│       ├── __init__.py
│       └── user.py
├── tests/                       # Test files
│   ├── __init__.py
│   ├── unit/
│   ├── integration/
│   └── conftest.py
├── docs/                        # Documentation
├── scripts/                     # Utility scripts
├── requirements.txt             # Python dependencies
├── setup.py                     # Package setup
├── .env.example                 # Environment variables example
└── README.md
\`\`\`

**For C++/C Projects:**
\`\`\`
project-name/
├── src/                          # Source files
│   ├── main.cpp                 # Entry point
│   ├── core/                    # Core functionality
│   │   ├── engine.cpp
│   │   └── engine.h
│   ├── utils/                   # Utility functions
│   │   ├── helpers.cpp
│   │   └── helpers.h
│   ├── models/                  # Data structures
│   │   ├── user.cpp
│   │   └── user.h
│   └── services/                # Business logic
│       ├── auth_service.cpp
│       └── auth_service.h
├── include/                     # Public header files
│   └── project_name/
│       ├── api.h
│       └── types.h
├── lib/                         # External libraries
├── tests/                       # Test files
│   ├── unit/
│   └── integration/
├── docs/                        # Documentation
├── build/                       # Build output (gitignored)
├── CMakeLists.txt              # CMake configuration
├── Makefile                    # Build configuration
└── README.md
\`\`\`

**For Java/Spring Boot Projects:**
\`\`\`
project-name/
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/
│   │   │       └── company/
│   │   │           └── project/
│   │   │               ├── Application.java          # Main entry point
│   │   │               ├── controller/               # REST controllers
│   │   │               │   ├── AuthController.java
│   │   │               │   └── UserController.java
│   │   │               ├── service/                  # Business logic
│   │   │               │   ├── AuthService.java
│   │   │               │   └── UserService.java
│   │   │               ├── repository/               # Data access
│   │   │               │   └── UserRepository.java
│   │   │               ├── model/                    # Entity models
│   │   │               │   ├── User.java
│   │   │               │   └── Role.java
│   │   │               ├── dto/                      # Data transfer objects
│   │   │               │   ├── UserDTO.java
│   │   │               │   └── LoginRequest.java
│   │   │               ├── config/                   # Configuration
│   │   │               │   ├── SecurityConfig.java
│   │   │               │   └── DatabaseConfig.java
│   │   │               ├── exception/                # Custom exceptions
│   │   │               │   └── ResourceNotFoundException.java
│   │   │               └── util/                     # Utility classes
│   │   │                   └── JwtUtil.java
│   │   └── resources/
│   │       ├── application.properties               # App configuration
│   │       ├── application-dev.properties
│   │       ├── application-prod.properties
│   │       └── static/                              # Static resources
│   └── test/
│       └── java/
│           └── com/
│               └── company/
│                   └── project/
│                       ├── controller/
│                       ├── service/
│                       └── repository/
├── docs/                        # Documentation
├── pom.xml                      # Maven dependencies
└── README.md
\`\`\`

**For Go Projects:**
\`\`\`
project-name/
├── cmd/                          # Main applications
│   └── server/
│       └── main.go              # Entry point
├── internal/                    # Private application code
│   ├── api/                     # API handlers
│   │   ├── handlers/
│   │   │   ├── auth.go
│   │   │   └── user.go
│   │   ├── middleware/
│   │   │   └── auth.go
│   │   └── router.go
│   ├── models/                  # Data models
│   │   ├── user.go
│   │   └── database.go
│   ├── services/                # Business logic
│   │   ├── auth_service.go
│   │   └── user_service.go
│   ├── repository/              # Data access
│   │   └── user_repository.go
│   └── config/                  # Configuration
│       └── config.go
├── pkg/                         # Public library code
│   └── utils/
│       └── helpers.go
├── api/                         # API definitions (OpenAPI/Swagger)
│   └── openapi.yaml
├── scripts/                     # Build and deployment scripts
├── tests/                       # Test files
├── docs/                        # Documentation
├── go.mod                       # Go module definition
├── go.sum                       # Go dependencies
├── Makefile                     # Build commands
└── README.md
\`\`\`

**For Rust Projects:**
\`\`\`
project-name/
├── src/
│   ├── main.rs                  # Entry point (for binary)
│   ├── lib.rs                   # Library root (for library)
│   ├── models/                  # Data structures
│   │   ├── mod.rs
│   │   ├── user.rs
│   │   └── database.rs
│   ├── services/                # Business logic
│   │   ├── mod.rs
│   │   ├── auth_service.rs
│   │   └── user_service.rs
│   ├── api/                     # API handlers
│   │   ├── mod.rs
│   │   ├── routes.rs
│   │   └── handlers/
│   │       ├── mod.rs
│   │       ├── auth.rs
│   │       └── users.rs
│   ├── utils/                   # Utility functions
│   │   ├── mod.rs
│   │   └── helpers.rs
│   └── config/                  # Configuration
│       ├── mod.rs
│       └── settings.rs
├── tests/                       # Integration tests
│   └── integration_test.rs
├── benches/                     # Benchmarks
├── examples/                    # Example code
├── docs/                        # Documentation
├── Cargo.toml                   # Package manifest
├── Cargo.lock                   # Dependency lock file
└── README.md
\`\`\`

**For .NET/C# Projects:**
\`\`\`
project-name/
├── src/
│   ├── ProjectName.Api/         # Web API project
│   │   ├── Controllers/
│   │   │   ├── AuthController.cs
│   │   │   └── UsersController.cs
│   │   ├── Middleware/
│   │   │   └── AuthMiddleware.cs
│   │   ├── Program.cs
│   │   └── ProjectName.Api.csproj
│   ├── ProjectName.Core/        # Core business logic
│   │   ├── Entities/
│   │   │   ├── User.cs
│   │   │   └── Role.cs
│   │   ├── Interfaces/
│   │   │   ├── IUserService.cs
│   │   │   └── IAuthService.cs
│   │   ├── Services/
│   │   │   ├── UserService.cs
│   │   │   └── AuthService.cs
│   │   └── ProjectName.Core.csproj
│   ├── ProjectName.Infrastructure/  # Data access
│   │   ├── Data/
│   │   │   ├── ApplicationDbContext.cs
│   │   │   └── Repositories/
│   │   │       └── UserRepository.cs
│   │   ├── Migrations/
│   │   └── ProjectName.Infrastructure.csproj
│   └── ProjectName.Shared/      # Shared code
│       ├── DTOs/
│       ├── Constants/
│       └── ProjectName.Shared.csproj
├── tests/
│   ├── ProjectName.UnitTests/
│   └── ProjectName.IntegrationTests/
├── docs/
├── ProjectName.sln              # Solution file
└── README.md
\`\`\`

**For PHP/Laravel Projects:**
\`\`\`
project-name/
├── app/
│   ├── Http/
│   │   ├── Controllers/         # Controllers
│   │   │   ├── AuthController.php
│   │   │   └── UserController.php
│   │   ├── Middleware/          # Middleware
│   │   └── Requests/            # Form requests
│   ├── Models/                  # Eloquent models
│   │   ├── User.php
│   │   └── Role.php
│   ├── Services/                # Business logic
│   │   ├── AuthService.php
│   │   └── UserService.php
│   ├── Repositories/            # Data access
│   │   └── UserRepository.php
│   └── Helpers/                 # Helper functions
├── database/
│   ├── migrations/              # Database migrations
│   ├── seeders/                 # Database seeders
│   └── factories/               # Model factories
├── routes/
│   ├── web.php                  # Web routes
│   ├── api.php                  # API routes
│   └── console.php              # Console routes
├── resources/
│   ├── views/                   # Blade templates
│   ├── js/                      # JavaScript
│   └── css/                     # Stylesheets
├── tests/
│   ├── Unit/
│   └── Feature/
├── public/                      # Public assets
├── storage/                     # Storage files
├── composer.json                # PHP dependencies
└── README.md
\`\`\`

**Key Principles for ANY Project Structure:**
1. **Separation of Concerns** - Each folder has a single, clear responsibility
2. **Scalability** - Structure supports growth without major refactoring
3. **Discoverability** - Easy to find files based on their purpose
4. **Colocation** - Related files are grouped together
5. **Feature-based Organization** - Features are self-contained modules
6. **Consistent Naming** - Clear, descriptive names following language conventions
7. **Language Conventions** - Follow the standard patterns for the language/framework

**Adapt to the specific technology:**
- Detect the language/framework from user's request or existing files
- Use appropriate file extensions (.js, .py, .cpp, .go, .rs, .cs, .php, etc.)
- Follow language-specific naming conventions (camelCase, snake_case, PascalCase)
- Include language-specific configuration files (package.json, requirements.txt, Cargo.toml, etc.)
- Use standard folder names for the ecosystem (src, lib, pkg, internal, etc.)
- Include appropriate build tools (npm, pip, cargo, maven, make, etc.)

### Implementation Steps
1. **Create Base Project Structure** (*dependencies: none*)
   - Create root folders: \`src/\`, \`public/\`, \`tests/\`, \`docs/\`
   - Create configuration files: \`package.json\`, \`vite.config.js\`, \`.gitignore\`
   - Estimated complexity: Low

2. **Set Up Component Architecture** (*dependencies: step 1*)
   - Create \`src/components/\` with subfolders: \`common/\`, \`layout/\`, \`features/\`
   - Create base components: \`Button\`, \`Input\`, \`Modal\` in \`common/\`
   - Create layout components: \`Header\`, \`Footer\`, \`Sidebar\` in \`layout/\`
   - Files to create: 
     - \`src/components/common/Button/Button.jsx\`
     - \`src/components/common/Button/Button.css\`
     - \`src/components/layout/Header/Header.jsx\`
     - [... list all files]
   - Estimated complexity: Medium

3. **Implement State Management** (*dependencies: step 2*)
   - Create \`src/store/\` folder structure
   - Set up Redux/Zustand store configuration
   - Create initial slices: \`authSlice\`, \`userSlice\`, \`uiSlice\`
   - Files to create:
     - \`src/store/index.js\`
     - \`src/store/slices/authSlice.js\`
     - \`src/store/slices/userSlice.js\`
   - Estimated complexity: Medium

4. **Create Service Layer** (*dependencies: step 3*)
   - Set up \`src/services/api/\` with API client
   - Create API endpoint modules: \`auth.js\`, \`users.js\`
   - Implement request/response interceptors
   - Files to create:
     - \`src/services/api/client.js\`
     - \`src/services/api/auth.js\`
     - \`src/services/api/interceptors.js\`
   - Estimated complexity: Medium

5. **Build Feature Modules** (*dependencies: step 2, 3, 4*)
   - Create \`src/components/features/auth/\` with Login, Register components
   - Create \`src/components/features/dashboard/\` with Dashboard component
   - Implement routing and navigation
   - Files to create:
     - \`src/components/features/auth/Login/Login.jsx\`
     - \`src/components/features/auth/Register/Register.jsx\`
     - \`src/components/features/dashboard/Dashboard.jsx\`
     - \`src/router.jsx\`
   - Estimated complexity: High

6. **Add Utilities and Helpers** (*dependencies: step 1*)
   - Create utility functions in \`src/utils/\`
   - Create custom hooks in \`src/hooks/\`
   - Files to create:
     - \`src/utils/helpers.js\`
     - \`src/utils/validators.js\`
     - \`src/hooks/useAuth.js\`
     - \`src/hooks/useApi.js\`
   - Estimated complexity: Low

7. **Set Up Styling System** (*dependencies: step 1*)
   - Create global styles in \`src/styles/\`
   - Define CSS variables for theming
   - Implement light/dark theme support
   - Files to create:
     - \`src/styles/globals.css\`
     - \`src/styles/variables.css\`
     - \`src/styles/themes/light.css\`
     - \`src/styles/themes/dark.css\`
   - Estimated complexity: Low

8. **Configure Testing Infrastructure** (*dependencies: step 1*)
   - Set up test folders: \`tests/unit/\`, \`tests/integration/\`, \`tests/e2e/\`
   - Configure testing framework (Jest, Vitest, Cypress)
   - Create test setup files
   - Files to create:
     - \`tests/setup.js\`
     - \`tests/unit/components/Button.test.js\`
   - Estimated complexity: Medium

9. **Add Documentation** (*dependencies: all previous steps*)
   - Create comprehensive README.md
   - Document API endpoints in API.md
   - Write architecture overview in ARCHITECTURE.md
   - Files to create:
     - \`docs/README.md\`
     - \`docs/API.md\`
     - \`docs/ARCHITECTURE.md\`
     - \`docs/CONTRIBUTING.md\`
   - Estimated complexity: Low

### Verification Steps
1. Verify folder structure matches the plan
2. Check that all configuration files are present and valid
3. Run \`npm install\` to verify dependencies
4. Run \`npm run dev\` to start development server
5. Verify all components render without errors
6. Run \`npm test\` to verify tests pass
7. Check that routing works correctly
8. Verify API integration works
9. Test theme switching (light/dark)
10. Review documentation for completeness

### Risks & Considerations
- **Complexity** - Large folder structure may be overwhelming initially
- **Over-engineering** - May be too complex for small projects
- **Learning Curve** - Team needs to understand the structure
- **Migration** - Moving existing code to new structure takes time
- **Consistency** - Need to enforce structure through code reviews

### Alternative Approaches
- **Flat Structure**: Keep all components in single folder (simpler but less scalable)
- **Domain-Driven**: Organize by business domain instead of technical layers
- **Monorepo**: Use workspaces for multiple packages (more complex setup)
- **Atomic Design**: Organize components by atoms, molecules, organisms pattern

IMPORTANT FOR PROJECT STRUCTURE:
- When user asks to "create a project" or "improve structure", ALWAYS include a detailed folder hierarchy
- Show nested folders with proper indentation using tree structure (├──, │, └──)
- Include file names with extensions in the tree
- Add inline comments explaining each folder's purpose
- Group related files in logical folders with clear naming
- Use multiple levels of nesting for better organization (3-4 levels deep)
- Consider scalability - structure should support growth to 100+ files
- Follow industry best practices for the specific framework/language
- Include configuration files (.gitignore, package.json, etc.)
- Add testing and documentation folders
- Show example file organization within feature folders

IMPORTANT:
- Be thorough and specific
- Identify dependencies between steps
- Consider edge cases and potential issues
- Provide verification steps
- Do NOT execute the plan - just create it
- Present the plan and ask for user approval before any implementation`;

    return plannerPrompt;
  }

  /**
   * Main execution logic
   */
  async doExecute(context) {
    const { endpoint, apiKey, selectedModel } = context.settings;
    
    // Create plan file in AppData temp folder
    const planFilePath = await this.createPlanFile(context.workspacePath);
    let accumulatedPlan = '';
    
    // Store planFilePath in context for access in makeApiCall
    context.planFilePath = planFilePath;
    context.accumulatedPlan = { value: '' }; // Use object to pass by reference
    context.lastUpdateTime = 0; // Track last update time for throttling
    
    // Send a message to chat that plan is being created in file
    if (context.onToken) {
      const fileName = planFilePath.split(/[\\/]/).pop();
      context.onToken(`📋 **Creating plan in file:** \`${fileName}\`\n\n`);
      context.onToken(`The plan will open in a preview tab and update in real-time as I generate it.\n\n`);
      context.onToken(`> ⏳ Analyzing and generating plan...\n\n`);
    }
    
    // Process messages
    const processedMessages = await this.processMessages(context);
    
    // Add context
    const messagesWithContext = this.addContext(processedMessages, context);
    
    // Initialize loop messages
    let loopMessages = [
      { 
        role: 'system', 
        content: this.getSystemPrompt(context)
      },
      ...messagesWithContext
    ];
    
    try {
      // Planning loop (fewer iterations)
      for (let iteration = 0; iteration < this.maxIterations; iteration++) {
        context.incrementIteration();
        
        if (context.isAborted()) {
          context.logger?.info('[PlannerAgent] Execution aborted');
          break;
        }
        
        context.logger?.debug(`[PlannerAgent] Iteration ${iteration + 1}/${this.maxIterations}`);
        
        // Make API call
        const { content, thinkingContent, message } = await this.makeApiCall(
          endpoint,
          apiKey,
          selectedModel,
          loopMessages,
          context,
          iteration
        );
        
        // Add assistant message
        loopMessages.push({
          role: 'assistant',
          content: message.content || '',
          tool_calls: message.tool_calls
        });
        
        // If no tool calls, we're done
        if (!message.tool_calls || message.tool_calls.length === 0) {
          context.logger?.info('[PlannerAgent] Plan complete');
          break;
        }
        
        // Execute read-only tools
        const toolResultMessages = await this.executeTools(
          message.tool_calls,
          context
        );
        
        loopMessages.push(...toolResultMessages);
      }
      
      // Final update - write the complete plan one last time and refresh preview
      if (context.planFilePath && context.accumulatedPlan.value && window.electron?.writeFile) {
        await window.electron.writeFile(context.planFilePath, context.accumulatedPlan.value);
        
        // Read the file back to ensure we have the latest content
        const finalContent = await window.electron.readFile(context.planFilePath);
        const contentToShow = finalContent.success ? finalContent.content : context.accumulatedPlan.value;
        
        // Dispatch final event to update preview tab with complete content
        window.dispatchEvent(new CustomEvent('kaizer:file-written', {
          detail: {
            path: context.planFilePath,
            type: 'modified',
            content: contentToShow,
            originalContent: contentToShow
          }
        }));
        
        // Force a refresh of the preview tab
        window.dispatchEvent(new CustomEvent('kaizer:refresh-preview', {
          detail: { path: `${context.planFilePath}:preview` }
        }));
      }
      
      if (context.onDone) {
        context.onDone();
      }
      
    } catch (error) {
      if (error.name === 'AbortError') {
        if (context.onDone) context.onDone();
        return;
      }
      throw error;
    }
  }

  /**
   * Create a plan file in .kaizer/plans folder
   */
  async createPlanFile(workspacePath) {
    if (!workspacePath) {
      throw new Error('No workspace path provided');
    }
    
    const isWindows = navigator.platform.toLowerCase().includes('win');
    const separator = isWindows ? '\\' : '/';
    const kaizerDir = `${workspacePath}${separator}.kaizer`;
    const plansDir = `${kaizerDir}${separator}plans`;
    
    // Ensure .kaizer/plans directory exists
    if (window.electron?.runCommand) {
      const mkdirCmd = isWindows 
        ? `if not exist "${plansDir}" mkdir "${plansDir}"` 
        : `mkdir -p "${plansDir}"`;
      await window.electron.runCommand(mkdirCmd, workspacePath);
    }
    
    // Create plan file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const workspaceName = workspacePath.split(/[\\/]/).pop();
    const planFileName = `plan-${workspaceName}-${timestamp}.md`;
    const planFilePath = `${plansDir}${separator}${planFileName}`;
    
    // Create initial plan file
    const initialContent = `# Plan: [In Progress...]

*Generated: ${new Date().toLocaleString()}*
*Workspace: ${workspacePath}*

---

## Overview
Analyzing your request and creating a detailed plan...

`;
    
    if (window.electron?.writeFile) {
      await window.electron.writeFile(planFilePath, initialContent);
    }
    
    // Open the plan file in preview only
    window.dispatchEvent(new CustomEvent('kaizer:open-file', {
      detail: { path: planFilePath, showPreview: true }
    }));
    
    return planFilePath;
  }

  /**
   * Process messages to include attached file contents
   * Note: User messages are NOT compressed, only attached file context
   */
  async processMessages(context) {
    return await Promise.all(context.messages.map(async (msg) => {
      if (msg.role === 'user' && msg.context && msg.context.length > 0) {
        let contextContent = '';
        
        for (const ctx of msg.context) {
          if (ctx.type === 'file' && ctx.data) {
            try {
              const result = await window.electron.readFile(ctx.data);
              if (result && result.success && result.content !== null) {
                const fileContent = result.content;
                
                // Compress attached file content if too large
                const tokens = estimateTokens(fileContent);
                let compressedFileContent = fileContent;
                
                if (tokens > 3000) {
                  const lines = fileContent.split('\n');
                  const maxLines = 150;
                  if (lines.length > maxLines) {
                    const head = lines.slice(0, 75).join('\n');
                    const tail = lines.slice(-75).join('\n');
                    compressedFileContent = `${head}\n\n[... ${lines.length - maxLines} lines omitted ...]\n\n${tail}`;
                  }
                }
                
                contextContent += `\n\n<attached_file path="${ctx.data}">\n${compressedFileContent}\n</attached_file>`;
              }
            } catch (e) {
              context.logger?.error('[PlannerAgent] Failed to read attached file:', ctx.data, e);
            }
          }
        }
        
        if (contextContent) {
          return {
            role: 'user',
            content: (msg.content || '') + contextContent
          };
        }
      }
      
      return {
        role: msg.role,
        content: msg.content || ''
      };
    }));
  }

  /**
   * Add context to messages
   * Compresses large files and context to save tokens
   */
  addContext(messages, context) {
    if (messages.length === 0) return messages;

    // Add active file context with compression
    if (context.activeFile && context.activeFileContent) {
      const firstUserMsgIndex = messages.findIndex(m => m.role === 'user');
      if (firstUserMsgIndex !== -1) {
        const fileName = context.activeFile.split(/[\\/]/).pop();
        
        // Compress active file content if too large
        const tokens = estimateTokens(context.activeFileContent);
        let compressedContent = context.activeFileContent;
        
        if (tokens > 3000) {
          const lines = context.activeFileContent.split('\n');
          const maxLines = 150;
          if (lines.length > maxLines) {
            const head = lines.slice(0, 75).join('\n');
            const tail = lines.slice(-75).join('\n');
            compressedContent = `${head}\n\n[... ${lines.length - maxLines} lines omitted ...]\n\n${tail}`;
          }
        }
        
        const openFileContext = `\n\n<currently_open_file path="${context.activeFile}">\n${compressedContent}\n</currently_open_file>`;
        
        messages[firstUserMsgIndex] = {
          ...messages[firstUserMsgIndex],
          content: (messages[firstUserMsgIndex].content || '') + openFileContext
        };
      }
    }

    // Add indexer context
    const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content || '';
    const relevantContext = indexer.getRelevantContext(lastUserMsg);
    
    if (relevantContext) {
      const lastUserMsgIndex = messages.length - 1;
      if (messages[lastUserMsgIndex]?.role === 'user') {
        messages[lastUserMsgIndex] = {
          ...messages[lastUserMsgIndex],
          content: relevantContext + '\n\n' + (messages[lastUserMsgIndex].content || '')
        };
      }
    }

    return messages;
  }

  /**
   * Make API call
   */
  async makeApiCall(endpoint, apiKey, selectedModel, loopMessages, context, iteration) {
    const headers = {
      'Content-Type': 'application/json',
      'anthropic-beta': 'interleaved-thinking-2025-05-14'
    };
    
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    // Filter tools to only read-only ones
    const allowedTools = TOOLS.filter(tool => 
      this.canUseTool(tool.function.name)
    );
    
    const body = {
      model: selectedModel.id,
      messages: loopMessages,
      tools: allowedTools,
      tool_choice: 'auto',
      stream: true,
      max_tokens: selectedModel.maxOutputTokens
    };
    
    if (selectedModel.thinking) {
      body.thinking = { type: 'enabled', budget_tokens: 8000 };
    }
    
    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: context.abortSignal
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API ${response.status}: ${errorText}`);
    }
    
    return await consumeStream(
      response, 
      async (token) => {
        context.accumulatedPlan.value += token;
        
        // Update plan file in real-time with throttling (every 500ms)
        const now = Date.now();
        if (context.planFilePath && window.electron?.writeFile && (now - context.lastUpdateTime > 500)) {
          context.lastUpdateTime = now;
          
          await window.electron.writeFile(context.planFilePath, context.accumulatedPlan.value);
          
          // Dispatch event to update preview tab in real-time
          window.dispatchEvent(new CustomEvent('kaizer:file-written', {
            detail: {
              path: context.planFilePath,
              type: 'modified',
              content: context.accumulatedPlan.value,
              originalContent: context.accumulatedPlan.value
            }
          }));
        }
        
        // Don't send tokens to chat - plan is only in the file
        // if (context.onToken) context.onToken(token);
      }, 
      context.onThinkingToken, 
      iteration > 0
    );
  }

  /**
   * Execute tools (read-only)
   */
  async executeTools(toolCalls, context) {
    const toolResultMessages = [];
    
    for (const toolCall of toolCalls) {
      const toolName = toolCall.function.name;
      let args;
      
      try {
        args = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        args = {};
      }
      
      // Check if tool is allowed
      if (!this.canUseTool(toolName)) {
        context.logger?.warn(`[PlannerAgent] Tool not allowed: ${toolName}`);
        toolResultMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: `Error: Tool '${toolName}' is not allowed in Planner mode. Only read-only tools are available.`
        });
        continue;
      }
      
      if (context.onToolCall) {
        context.onToolCall({
          id: toolCall.id,
          name: toolName,
          args: args
        });
      }
      
      let result;
      try {
        const startTime = Date.now();
        result = await executeTool(toolName, args, context.workspacePath);
        const duration = Date.now() - startTime;
        context.metrics?.recordToolExecution(toolName, duration, true);
      } catch (error) {
        context.logger?.error(`[PlannerAgent] Tool execution failed: ${toolName}`, error);
        result = `Error executing tool: ${error.message}`;
        context.metrics?.recordToolExecution(toolName, 0, false);
      }
      
      const rawContent = typeof result === 'string' ? result : JSON.stringify(result);
      const compressedContent = compressToolResult(
        toolName,
        args,
        result,
        context.settings?.tokenSaver
      );
      const compressed = compressedContent !== rawContent;

      if (context.onToolResult) {
        context.onToolResult({
          id: toolCall.id,
          name: toolName,
          result: result,
          compressed,
          modelResult: compressed ? compressedContent : null
        });
      }
      
      toolResultMessages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: compressedContent
      });
    }
    
    return toolResultMessages;
  }
}
