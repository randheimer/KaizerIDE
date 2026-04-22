export class WorkspaceIndexer {
  constructor() {
    this.index = []          // array of IndexedFile objects
    this.status = 'idle'     // 'idle' | 'indexing' | 'ready' | 'error' | 'aborted'
    this.progress = 0        // 0-100
    this.totalFiles = 0
    this.indexedFiles = 0
    this.workspacePath = null
    this.listeners = new Set()
    this.enabled = this.loadEnabled()
  }

  // IndexedFile shape:
  // {
  //   path: string,
  //   name: string,
  //   dir: string,           relative dir from workspace root
  //   ext: string,
  //   size: number,          bytes
  //   lines: number,
  //   preview: string,       first 50 lines
  //   symbols: string[],     function/class names extracted via simple regex
  //   indexed: number,       timestamp
  // }

  loadEnabled() {
    try { return JSON.parse(localStorage.getItem('kaizer-indexer-enabled') ?? 'true') }
    catch { return true }
  }

  setEnabled(val) {
    this.enabled = val
    localStorage.setItem('kaizer-indexer-enabled', JSON.stringify(val))
    this.notify()
  }

  subscribe(fn) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  notify() {
    this.listeners.forEach(fn => fn({
      status: this.status,
      progress: this.progress,
      totalFiles: this.totalFiles,
      indexedFiles: this.indexedFiles,
      enabled: this.enabled,
      workspacePath: this.workspacePath,
      fileCount: this.index.length
    }))
  }

  async startIndexing(workspacePath) {
    if (!this.enabled) {
      console.log('[Indexer] Indexing is disabled')
      return
    }
    if (this.status === 'indexing') this.abort()

    console.log('[Indexer] Starting indexing for:', workspacePath)
    this.workspacePath = workspacePath
    this.index = []
    this.status = 'indexing'
    this.progress = 0
    this.indexedFiles = 0
    this.notify()

    try {
      // Collect all file paths recursively
      console.log('[Indexer] Collecting files...')
      const allFiles = await this.collectFiles(workspacePath)
      this.totalFiles = allFiles.length
      console.log('[Indexer] Found', allFiles.length, 'files to index')
      this.notify()

      // Index in batches of 10 to not block UI
      const BATCH = 10
      for (let i = 0; i < allFiles.length; i += BATCH) {
        if (this.status === 'aborted') return
        const batch = allFiles.slice(i, i + BATCH)
        await Promise.all(batch.map(f => this.indexFile(f, workspacePath)))
        this.indexedFiles = Math.min(i + BATCH, allFiles.length)
        this.progress = Math.round((this.indexedFiles / this.totalFiles) * 100)
        this.notify()
        // yield to UI
        await new Promise(r => setTimeout(r, 0))
      }

      this.status = 'ready'
      this.progress = 100
      console.log('[Indexer] Indexing complete!', this.index.length, 'files indexed')
      this.saveToStorage()
      this.notify()
    } catch (e) {
      console.error('[Indexer] Error:', e)
      this.status = 'error'
      this.notify()
    }
  }

  abort() {
    this.status = 'aborted'
    this.notify()
  }

  async collectFiles(dirPath, depth = 0) {
    if (depth > 8) return []
    const IGNORE = new Set(['node_modules','.git','dist','release','build',
      '__pycache__','target','.next','out','.cache','coverage','vendor'])
    
    // Whitelist of code file extensions to index
    const CODE_EXTENSIONS = new Set([
      // Web
      '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.es6',
      '.html', '.htm', '.xhtml', '.shtml',
      '.css', '.scss', '.sass', '.less', '.styl', '.stylus',
      '.vue', '.svelte', '.astro',
      // Systems Programming
      '.c', '.cpp', '.cc', '.cxx', '.c++', '.h', '.hpp', '.hxx', '.hh', '.h++',
      '.rs', '.go', '.zig', '.v', '.nim',
      '.asm', '.s', '.nasm',
      // Scripting
      '.py', '.pyw', '.pyx', '.pyi',
      '.rb', '.rake', '.gemspec',
      '.lua', '.luau',
      '.pl', '.pm', '.t', '.pod',
      '.sh', '.bash', '.zsh', '.fish', '.ksh', '.csh',
      '.ps1', '.psm1', '.psd1',
      '.bat', '.cmd',
      // JVM Languages
      '.java', '.kt', '.kts', '.scala', '.groovy', '.gradle', '.clj', '.cljs',
      // .NET
      '.cs', '.csx', '.fs', '.fsx', '.vb',
      // Functional
      '.ml', '.mli', '.hs', '.lhs', '.elm', '.purs',
      // Mobile
      '.swift', '.m', '.mm', '.dart', '.kt',
      // Web Assembly
      '.wat', '.wasm',
      // Config & Data
      '.json', '.json5', '.jsonc', '.yaml', '.yml', '.toml', '.xml', '.ini', '.conf', '.config',
      '.env', '.properties', '.cfg', '.editorconfig',
      // Markup & Docs
      '.md', '.mdx', '.markdown', '.txt', '.rst', '.adoc', '.tex',
      // Database & Query
      '.sql', '.psql', '.mysql', '.pgsql', '.plsql',
      '.graphql', '.gql',
      // API & Schema
      '.proto', '.thrift', '.avro', '.avsc',
      // Other Languages
      '.php', '.phps', '.phtml',
      '.ex', '.exs', '.eex', '.leex',
      '.erl', '.hrl',
      '.r', '.rmd',
      '.jl',
      '.sol', '.cairo',
      '.vim', '.vimrc',
      '.lisp', '.cl', '.el',
      '.scm', '.ss',
      '.tcl',
      '.awk',
      '.sed',
      '.makefile', '.mk',
      '.cmake',
      '.dockerfile',
      '.tf', '.tfvars',
      '.hcl'
    ])
    
    const MAX_FILE_SIZE = 500 * 1024  // 500KB max per file

    let result = []
    
    console.log('[Indexer] Collecting files from:', dirPath, 'depth:', depth)
    const listResult = await window.electron.listDir(dirPath)
    if (!listResult.success) {
      console.warn('[Indexer] Failed to list directory:', dirPath, listResult.error)
      return result
    }
    
    const entries = listResult.entries || []
    console.log('[Indexer] Found', entries.length, 'entries in', dirPath)
    
    for (const entry of entries) {
      if (this.status === 'aborted') return result
      const name = entry.name
      
      if (entry.type === 'directory' || entry.type === 'dir') {
        if (!IGNORE.has(name)) {
          const children = await this.collectFiles(entry.path, depth + 1)
          result = result.concat(children)
        }
      } else {
        const ext = (name && name.includes('.')) ? '.' + name.split('.').pop().toLowerCase() : ''
        // Only index whitelisted code file extensions
        if (CODE_EXTENSIONS.has(ext)) {
          // Check file size
          const info = await window.electron.getFileInfo(entry.path).catch(() => null)
          if (info && info.success && info.size < MAX_FILE_SIZE) {
            result.push(entry.path)
          }
        }
      }
    }
    return result
  }

  async indexFile(filePath, workspacePath) {
    try {
      if (!filePath || typeof filePath !== 'string') return
      
      const result = await window.electron.readFile(filePath)
      if (result.error || !result.success) return

      const content = result.content || ''
      const lines = content.split('\n')
      const name = filePath.split(/[\\/]/).pop() || 'unknown'
      const ext = name.includes('.') ? '.' + name.split('.').pop().toLowerCase() : ''
      const dir = filePath
        .replace(workspacePath, '')
        .split(/[\\/]/)
        .slice(0, -1)
        .join('/')
        .replace(/^\//, '') || '.'

      // Extract symbols (functions, classes, exports)
      const symbols = this.extractSymbols(content, ext)

      this.index.push({
        path: filePath,
        name,
        dir,
        ext,
        size: content.length,
        lines: lines.length,
        preview: lines.slice(0, 50).join('\n'),
        symbols: symbols || [],
        indexed: Date.now()
      })
    } catch (e) {
      // Skip files that can't be read
    }
  }

  extractSymbols(content, ext) {
    const symbols = []
    const patterns = [
      // JS/TS functions
      /(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\())/gm,
      // Classes
      /class\s+(\w+)/gm,
      // Exports
      /export\s+(?:default\s+)?(?:function|class|const|let)\s+(\w+)/gm,
      // Python defs
      /def\s+(\w+)/gm,
      // Lua functions
      /function\s+(\w+)/gm,
    ]

    for (const pattern of patterns) {
      let match
      while ((match = pattern.exec(content)) !== null) {
        const name = match[1] || match[2]
        if (name && !symbols.includes(name)) symbols.push(name)
        if (symbols.length > 50) break
      }
    }
    return symbols.slice(0, 50)
  }

  // Search index for relevant files
  search(query, limit = 10) {
    if (!query || this.index.length === 0) return []
    const q = query.toLowerCase()
    const words = q.split(/\s+/).filter(w => w.length > 2)

    return this.index
      .map(file => {
        let score = 0
        // filename match = high score
        if (file.name && file.name.toLowerCase().includes(q)) score += 10
        // symbol match = high score
        if (file.symbols && Array.isArray(file.symbols)) {
          file.symbols.forEach(s => {
            if (s && typeof s === 'string' && s.toLowerCase().includes(q)) score += 5
          })
        }
        // word matches in preview
        words.forEach(w => {
          if (file.preview && file.preview.toLowerCase().includes(w)) score += 1
          if (file.dir && file.dir.toLowerCase().includes(w)) score += 2
        })
        return { file, score }
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(x => x.file)
  }

  // Get index summary for AI system prompt
  getIndexSummary() {
    if (this.status !== 'ready' || this.index.length === 0) return null

    // Group by directory
    const dirs = {}
    this.index.forEach(f => {
      if (!f || !f.dir || !f.name) return
      if (!dirs[f.dir]) dirs[f.dir] = []
      dirs[f.dir].push(f.name)
    })

    // Top symbols across codebase
    const allSymbols = [...new Set(this.index.flatMap(f => (f && f.symbols) ? f.symbols : []))].slice(0, 100)

    // File type breakdown
    const extCounts = {}
    this.index.forEach(f => {
      if (!f || !f.ext) return
      extCounts[f.ext] = (extCounts[f.ext] || 0) + 1
    })

    const lines = [
      `WORKSPACE INDEX (${this.index.length} files indexed):`,
      '',
      'PROJECT STRUCTURE:',
      ...Object.entries(dirs).slice(0, 15).map(([dir, files]) =>
        `  ${dir}/: ${files.slice(0,8).join(', ')}${files.length > 8 ? ` +${files.length-8} more` : ''}`
      ),
      '',
      'FILE TYPES: ' + Object.entries(extCounts)
        .sort((a,b) => b[1]-a[1])
        .map(([ext, count]) => `${ext}(${count})`)
        .join(', '),
      '',
      'KEY SYMBOLS: ' + allSymbols.slice(0, 50).join(', '),
    ]

    return lines.join('\n')
  }

  // Get relevant context for a specific query
  getRelevantContext(query) {
    const results = this.search(query, 5)
    if (results.length === 0) return null

    return 'RELEVANT FILES FROM INDEX:\n' + results.map(f =>
      `• ${f.path || 'unknown'} (${f.lines || 0} lines) — symbols: ${(f.symbols && f.symbols.length > 0) ? f.symbols.slice(0,5).join(', ') : 'none'}`
    ).join('\n')
  }

  saveToStorage() {
    try {
      // Only save metadata, not full content (too large)
      const meta = this.index.map(f => ({
        path: f.path, name: f.name, dir: f.dir, ext: f.ext,
        size: f.size, lines: f.lines, symbols: f.symbols, indexed: f.indexed
      }))
      localStorage.setItem(
        `kaizer-index-${btoa(this.workspacePath).slice(0,20)}`,
        JSON.stringify({ meta, workspace: this.workspacePath, ts: Date.now() })
      )
    } catch (e) {
      console.warn('[Indexer] Failed to save to storage:', e)
    }
  }

  loadFromStorage(workspacePath) {
    try {
      const key = `kaizer-index-${btoa(workspacePath).slice(0,20)}`
      const stored = JSON.parse(localStorage.getItem(key) || 'null')
      if (!stored) {
        console.log('[Indexer] No cached index found for:', workspacePath)
        return false
      }

      // Verify the cached workspace matches the requested workspace
      if (stored.workspace !== workspacePath) {
        console.log('[Indexer] Cached workspace mismatch:', stored.workspace, '!==', workspacePath)
        return false
      }

      // Only use if indexed less than 1 hour ago
      const age = Date.now() - stored.ts
      if (age > 60 * 60 * 1000) {
        console.log('[Indexer] Cached index is too old (', Math.round(age / 60000), 'minutes)')
        return false
      }

      console.log('[Indexer] Loaded cached index:', stored.meta.length, 'files from', workspacePath)
      this.index = stored.meta
      this.workspacePath = workspacePath
      this.totalFiles = stored.meta.length
      this.indexedFiles = stored.meta.length
      this.progress = 100
      this.status = 'ready'
      this.notify()
      return true
    } catch (e) {
      console.error('[Indexer] Error loading from storage:', e)
      return false
    }
  }

  reindex(workspacePath) {
    this.index = []
    return this.startIndexing(workspacePath)
  }

  clearStorage() {
    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith('kaizer-index-')) {
          localStorage.removeItem(key)
        }
      })
    } catch (e) {
      console.warn('[Indexer] Failed to clear storage:', e)
    }
  }
}

// Singleton
export const indexer = new WorkspaceIndexer()
