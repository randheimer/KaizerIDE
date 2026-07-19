/**
 * Code file extensions whitelist
 * Only files with these extensions will be indexed
 */
export const CODE_EXTENSIONS = new Set([
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
]);
