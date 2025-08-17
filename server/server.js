import express from 'express';
import cors from 'cors';
import { exec as execCb } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';
import util from 'util';

const exec = util.promisify(execCb);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json({ limit: '5mb' }));

// Enhanced CORS with better error handling
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || '';
const allowed = allowedOriginsEnv.split(',').map(s => s.trim()).filter(Boolean);

app.use(cors({ 
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return cb(null, true);
    
    // Allow all origins if no specific origins are set (development mode)
    if (allowed.length === 0) return cb(null, true);
    
    // Check if origin is in allowed list
    if (allowed.includes(origin)) return cb(null, true);
    
    console.warn(`CORS: Rejected origin ${origin}`);
    cb(new Error('Not allowed by CORS'));
  }, 
  credentials: true 
}));

// Static file serving
const clientDist = join(__dirname, 'client', 'dist');

if (await fs.pathExists(clientDist)) {
  app.use(express.static(clientDist, {
    maxAge: '1h',
    etag: true,
    lastModified: true
  }));
  console.log(`✅ Serving client from ${clientDist}`);
} else {
  console.warn(`⚠️ Client dist folder not found at ${clientDist}`);
}

// Directory setup
const TEMP_ROOT = join(__dirname, 'temp_files');
const USER_FILES = join(__dirname, 'user_files');
const BACKUP_DIR = join(__dirname, 'backups');

await fs.ensureDir(TEMP_ROOT);
await fs.ensureDir(USER_FILES);
await fs.ensureDir(BACKUP_DIR);

const EXEC_TIMEOUT_MS = Number(process.env.EXEC_TIMEOUT_MS || 15000);
const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE || 1024 * 1024);

// Language configurations
const LANGUAGES = {
  c: {
    compile: 'gcc {sources} -o {output} {flags} -std=c11 -Wall',
    run: './{output}',
    extension: '.c',
    description: 'C Programming Language'
  },
  cpp: {
    compile: 'g++ {sources} -o {output} {flags} -std=c++17 -Wall',
    run: './{output}',
    extension: '.cpp',
    description: 'C++ Programming Language'
  },
  python: {
    run: 'python3 {sources}',
    extension: '.py',
    description: 'Python 3'
  },
  rust: {
    compile: 'rustc {sources} -o {output} {flags}',
    run: './{output}',
    extension: '.rs',
    description: 'Rust Programming Language'
  },
  go: {
    compile: 'go build -o {output} {sources} {flags}',
    run: './{output}',
    extension: '.go',
    description: 'Go Programming Language'
  },
  bash: {
    run: 'bash {sources}',
    extension: '.sh',
    description: 'Bash Shell Script'
  },
  php: {
    run: 'php {sources}',
    extension: '.php',
    description: 'PHP'
  },
  lua: {
    run: 'lua {sources}',
    extension: '.lua',
    description: 'Lua'
  },
  ruby: {
    run: 'ruby {sources}',
    extension: '.rb',
    description: 'Ruby'
  },
  javascript: {
    run: 'node {sources}',
    extension: '.js',
    description: 'JavaScript (Node.js)'
  }
};

// Enhanced security: File path validation
function validatePath(path) {
  if (!path || typeof path !== 'string') {
    return { valid: false, error: 'Path must be a non-empty string' };
  }
  
  if (path === 'null' || path === 'undefined' || path.trim() === '') {
    return { valid: false, error: 'Invalid path value' };
  }
  
  // Prevent path traversal attacks
  if (path.includes('..') || path.includes('/') || path.includes('\\')) {
    return { valid: false, error: 'Invalid characters in path' };
  }
  
  // Prevent dangerous filenames
  const dangerousNames = ['con', 'prn', 'aux', 'nul', 'com1', 'com2', 'lpt1', 'lpt2'];
  if (dangerousNames.includes(path.toLowerCase())) {
    return { valid: false, error: 'Reserved filename' };
  }
  
  // Check file extension
  const ext = extname(path).toLowerCase();
  const allowedExts = ['.js', '.py', '.c', '.cpp', '.rs', '.go', '.sh', '.php', '.lua', '.rb', '.txt', '.md', '.json'];
  if (ext && !allowedExts.includes(ext)) {
    return { valid: false, error: 'Unsupported file extension' };
  }
  
  return { valid: true };
}

function detectLanguageFromFilename(name) {
  const ext = extname(name).toLowerCase();
  for (const [lang, info] of Object.entries(LANGUAGES)) {
    if (info.extension === ext) return lang;
  }
  return null;
}

async function which(bin) {
  try {
    await exec(`which ${bin}`);
    return true;
  } catch {
    return false;
  }
}

async function ensureToolchain(lang) {
  const checks = {
    c: () => which('gcc'),
    cpp: () => which('g++'),
    python: () => which('python3'),
    rust: () => which('rustc'),
    go: () => which('go'),
    bash: () => which('bash'),
    php: () => which('php'),
    lua: () => which('lua'),
    ruby: () => which('ruby'),
    javascript: () => which('node')
  };
  
  const check = checks[lang];
  return check ? await check() : false;
}

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;
  
  res.send = function(data) {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    originalSend.call(this, data);
  };
  
  next();
});

// Simple rate limiting
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 100;

app.use('/api', (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;
  
  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, []);
  }
  
  const requests = rateLimitMap.get(ip);
  const recentRequests = requests.filter(timestamp => timestamp > windowStart);
  
  if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({ 
      error: 'Rate limit exceeded. Please slow down your requests.' 
    });
  }
  
  recentRequests.push(now);
  rateLimitMap.set(ip, recentRequests);
  
  next();
});

// API ENDPOINTS

// GET /api/files - List all files
app.get('/api/files', async (req, res) => {
  try {
    console.log('📁 Loading files...');
    const files = [];
    
    // Ensure directory exists
    await fs.ensureDir(USER_FILES);
    const fileNames = await fs.readdir(USER_FILES);
    
    for (const fileName of fileNames) {
      try {
        const filePath = join(USER_FILES, fileName);
        const stats = await fs.stat(filePath);
        
        if (stats.isFile()) {
          const language = detectLanguageFromFilename(fileName);
          files.push({
            path: fileName,
            size: stats.size,
            modified: stats.mtime,
            language: language || 'text',
            description: language ? LANGUAGES[language].description : 'Text file'
          });
        }
      } catch (fileError) {
        console.warn(`Error reading file ${fileName}:`, fileError.message);
        continue;
      }
    }
    
    // Sort by modification time (newest first)
    files.sort((a, b) => new Date(b.modified) - new Date(a.modified));
    
    // Create welcome file if no files exist
    if (files.length === 0) {
      console.log('📝 Creating welcome file...');
      const defaultContent = `// 🚀 Welcome to Enhanced CodeRunner!
console.log("Hello, Enhanced CodeRunner!");
console.log("Ready to code with amazing customizations!");

// Try these features:
// • Click the ⚙️ settings to customize themes
// • Create custom action buttons  
// • Drag and drop files
// • Use keyboard shortcuts (Ctrl/Cmd+S to save)
`;
      
      try {
        await fs.writeFile(join(USER_FILES, 'welcome.js'), defaultContent);
        files.push({ 
          path: 'welcome.js', 
          size: defaultContent.length, 
          modified: new Date(),
          language: 'javascript',
          description: 'JavaScript (Node.js)'
        });
      } catch (createError) {
        console.error('Failed to create welcome file:', createError);
      }
    }
    
    console.log(`✅ Loaded ${files.length} files`);
    res.json(files);
  } catch (error) {
    console.error('❌ Error listing files:', error);
    res.status(500).json({ error: `Failed to list files: ${error.message}` });
  }
});

// GET /api/file?path=filename - Get file content
app.get('/api/file', async (req, res) => {
  try {
    const { path } = req.query;
    console.log(`📄 Reading file: ${path}`);
    
    const validation = validatePath(path);
    if (!validation.valid) {
      console.log(`❌ Invalid path: ${validation.error}`);
      return res.status(400).json({ error: validation.error });
    }
    
    const filePath = join(USER_FILES, path);
    
    // Check if file exists
    if (!(await fs.pathExists(filePath))) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Check file size
    const stats = await fs.stat(filePath);
    if (stats.size > MAX_FILE_SIZE) {
      return res.status(413).json({ error: 'File too large' });
    }
    
    const content = await fs.readFile(filePath, 'utf8');
    console.log(`✅ File read successfully: ${path} (${content.length} chars)`);
    
    // Add metadata headers
    res.set({
      'X-File-Size': stats.size.toString(),
      'X-File-Modified': stats.mtime.toISOString(),
      'X-File-Language': detectLanguageFromFilename(path) || 'text'
    });
    
    res.send(content);
  } catch (error) {
    console.error('❌ Error reading file:', error);
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'File not found' });
    } else if (error.code === 'EACCES') {
      res.status(403).json({ error: 'File access denied' });
    } else {
      res.status(500).json({ error: `Failed to read file: ${error.message}` });
    }
  }
});

// POST /api/file - Create new file
app.post('/api/file', async (req, res) => {
  try {
    const { path, content = '' } = req.body;
    console.log(`📝 Creating file: ${path}`);
    
    const validation = validatePath(path);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    
    // Check content size
    if (content.length > MAX_FILE_SIZE) {
      return res.status(413).json({ error: 'File content too large' });
    }
    
    const filePath = join(USER_FILES, path);
    
    // Check if file already exists
    if (await fs.pathExists(filePath)) {
      return res.status(409).json({ error: 'File already exists' });
    }
    
    // Create backup if needed
    await createBackup(path, content);
    
    await fs.writeFile(filePath, content, 'utf8');
    
    console.log(`✅ File created: ${path} (${content.length} bytes)`);
    res.json({ success: true, message: `File '${path}' created successfully` });
  } catch (error) {
    console.error('❌ Error creating file:', error);
    if (error.code === 'ENOSPC') {
      res.status(507).json({ error: 'Insufficient storage space' });
    } else if (error.code === 'EACCES') {
      res.status(403).json({ error: 'Permission denied' });
    } else {
      res.status(500).json({ error: `Failed to create file: ${error.message}` });
    }
  }
});

// PUT /api/file - Update file content
app.put('/api/file', async (req, res) => {
  try {
    const { path, content } = req.body;
    console.log(`💾 Updating file: ${path}`);
    
    const validation = validatePath(path);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    
    if (content === undefined) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    if (content.length > MAX_FILE_SIZE) {
      return res.status(413).json({ error: 'File content too large' });
    }
    
    const filePath = join(USER_FILES, path);
    
    // Check if file exists
    if (!(await fs.pathExists(filePath))) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Create backup before modifying
    try {
      const oldContent = await fs.readFile(filePath, 'utf8');
      await createBackup(path, oldContent);
    } catch (backupError) {
      console.warn('Backup failed:', backupError.message);
    }
    
    await fs.writeFile(filePath, content, 'utf8');
    
    console.log(`✅ File updated: ${path} (${content.length} bytes)`);
    res.json({ success: true, message: `File '${path}' updated successfully` });
  } catch (error) {
    console.error('❌ Error updating file:', error);
    if (error.code === 'ENOSPC') {
      res.status(507).json({ error: 'Insufficient storage space' });
    } else if (error.code === 'EACCES') {
      res.status(403).json({ error: 'Permission denied' });
    } else {
      res.status(500).json({ error: `Failed to update file: ${error.message}` });
    }
  }
});

// DELETE /api/file?path=filename - Delete file
app.delete('/api/file', async (req, res) => {
  try {
    const { path } = req.query;
    console.log(`🗑️ Deleting file: ${path}`);
    
    const validation = validatePath(path);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    
    const filePath = join(USER_FILES, path);
    
    // Check if file exists
    if (!(await fs.pathExists(filePath))) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Create backup before deleting
    try {
      const content = await fs.readFile(filePath, 'utf8');
      await createBackup(path, content, 'deleted');
    } catch (backupError) {
      console.warn('Backup failed:', backupError.message);
    }
    
    await fs.remove(filePath);
    
    console.log(`✅ File deleted: ${path}`);
    res.json({ success: true, message: `File '${path}' deleted successfully` });
  } catch (error) {
    console.error('❌ Error deleting file:', error);
    if (error.code === 'EACCES') {
      res.status(403).json({ error: 'Permission denied' });
    } else {
      res.status(500).json({ error: `Failed to delete file: ${error.message}` });
    }
  }
});

// Backup system
async function createBackup(filename, content, operation = 'backup') {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilename = `${filename}.${operation}.${timestamp}.bak`;
    const backupPath = join(BACKUP_DIR, backupFilename);
    
    await fs.writeFile(backupPath, content, 'utf8');
    
    // Clean old backups (keep only last 5 per file)
    const backups = (await fs.readdir(BACKUP_DIR))
      .filter(f => f.startsWith(filename))
      .sort()
      .reverse();
    
    if (backups.length > 5) {
      const oldBackups = backups.slice(5);
      for (const oldBackup of oldBackups) {
        await fs.remove(join(BACKUP_DIR, oldBackup));
      }
    }
  } catch (error) {
    console.warn('Failed to create backup:', error.message);
  }
}

// GET /api/system/info - System information
app.get('/api/system/info', async (req, res) => {
  try {
    const info = {
      languages: {},
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        uptime: Math.round(process.uptime()),
        memory: process.memoryUsage()
      }
    };
    
    // Check available toolchains
    for (const [lang, config] of Object.entries(LANGUAGES)) {
      const available = await ensureToolchain(lang);
      info.languages[lang] = {
        ...config,
        available
      };
    }
    
    res.json(info);
  } catch (error) {
    console.error('Error getting system info:', error);
    res.status(500).json({ error: 'Failed to get system information' });
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const stats = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      memory: process.memoryUsage(),
      directories: {
        userFiles: (await fs.readdir(USER_FILES)).length,
        tempFiles: (await fs.readdir(TEMP_ROOT)).length,
        backups: (await fs.readdir(BACKUP_DIR)).length
      }
    };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/run - Execute code
app.post('/api/run', async (req, res) => {
  const { language: langIn, flags = '', entry, code, files = [] } = req.body || {};
  
  // Create session directory
  const sessionId = uuidv4();
  const workdir = join(TEMP_ROOT, `session_${sessionId}`);
  await fs.ensureDir(workdir);

  let language = (langIn || '').toLowerCase() || null;
  const createdFiles = [];
  const startTime = Date.now();

  console.log(`🚀 [${sessionId}] Starting execution: language=${language}, entry=${entry}`);

  try {
    // Handle entry file
    if (entry) {
      const validation = validatePath(entry);
      if (!validation.valid) {
        throw new Error(`Invalid entry file: ${validation.error}`);
      }
      
      const sourceFile = join(USER_FILES, entry);
      const destFile = join(workdir, entry);
      
      if (!(await fs.pathExists(sourceFile))) {
        throw new Error(`Entry file not found: ${entry}`);
      }
      
      const content = await fs.readFile(sourceFile, 'utf8');
      await fs.writeFile(destFile, content, 'utf8');
      createdFiles.push(destFile);
      if (!language) language = detectLanguageFromFilename(entry);
    }

    // Process additional files
    for (const f of files) {
      if (!f.name || f.content === undefined) continue;
      
      const validation = validatePath(f.name);
      if (!validation.valid) {
        console.warn(`Skipping invalid file: ${f.name} - ${validation.error}`);
        continue;
      }
      
      const filepath = join(workdir, f.name);
      await fs.ensureDir(dirname(filepath));
      await fs.writeFile(filepath, f.content, 'utf8');
      createdFiles.push(filepath);
      if (!language) language = detectLanguageFromFilename(f.name);
    }

    // Handle inline code
    if (code) {
      if (!language) throw new Error('Language required when using inline code');
      const ext = LANGUAGES[language]?.extension;
      if (!ext) throw new Error(`Unsupported language: ${language}`);
      const mainName = `main${ext}`;
      const mainPath = join(workdir, mainName);
      await fs.writeFile(mainPath, code, 'utf8');
      createdFiles.push(mainPath);
    }

    if (createdFiles.length === 0) {
      throw new Error('No code provided to execute');
    }

    if (!language) {
      throw new Error('Could not detect language. Please specify a language or use a file with a known extension.');
    }

    const info = LANGUAGES[language];
    if (!info) {
      const supportedLangs = Object.keys(LANGUAGES).join(', ');
      throw new Error(`Unsupported language: ${language}. Supported: ${supportedLangs}`);
    }

    // Check toolchain
    const toolchainOk = await ensureToolchain(language);
    if (!toolchainOk) {
      const languageList = Object.entries(LANGUAGES)
        .map(([lang, conf]) => `  • ${lang}: ${conf.description}`)
        .join('\n');
      
      return res.status(200).json({ 
        stdout: '', 
        stderr: `❌ Missing toolchain for ${language}.\n\nSupported languages:\n${languageList}`,
        error: `Toolchain not available for ${language}`,
        executionTime: Date.now() - startTime
      });
    }

    const outputName = 'program';
    const sources = createdFiles.map(p => `"${p}"`).join(' ');

    let runCmd;
    let compileTime = 0;

    // Compilation step
    if (info.compile) {
      const compileStart = Date.now();
      const compileCmd = info.compile
        .replace('{sources}', sources)
        .replace('{output}', outputName)
        .replace('{flags}', flags || '');

      console.log(`🔨 [${sessionId}] Compiling: ${compileCmd}`);

      try {
        const { stdout: cOut, stderr: cErr } = await exec(compileCmd, { 
          cwd: workdir, 
          timeout: EXEC_TIMEOUT_MS,
          maxBuffer: 2 * 1024 * 1024 // 2MB buffer
        });
        
        compileTime = Date.now() - compileStart;
        
        if (cErr && cErr.trim()) {
          // Check if compilation failed
          if (cErr.toLowerCase().includes('error') && !(await fs.pathExists(join(workdir, outputName)))) {
            return res.json({ 
              stdout: cOut || '', 
              stderr: `💥 Compilation failed:\n${cErr}`, 
              error: 'Compilation failed',
              compileTime,
              executionTime: Date.now() - startTime
            });
          }
          console.log(`⚠️ [${sessionId}] Compilation warnings: ${cErr.substring(0, 200)}`);
        }
      } catch (compileError) {
        return res.json({
          stdout: compileError.stdout || '',
          stderr: `💥 Compilation error:\n${compileError.message}`,
          error: 'Compilation failed',
          compileTime: Date.now() - compileStart,
          executionTime: Date.now() - startTime
        });
      }

      runCmd = info.run.replace('{output}', outputName);
    } else {
      runCmd = info.run.replace('{sources}', sources);
    }

    console.log(`⚡ [${sessionId}] Running: ${runCmd}`);

    // Execution step
    const { stdout, stderr } = await exec(runCmd, { 
      cwd: workdir, 
      timeout: EXEC_TIMEOUT_MS,
      maxBuffer: 2 * 1024 * 1024,
      env: {
        ...process.env,
        // Security: Limit environment
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        USER: process.env.USER
      }
    });

    const executionTime = Date.now() - startTime;
    
    console.log(`✅ [${sessionId}] Execution completed in ${executionTime}ms`);

    const result = {
      stdout: stdout || '',
      stderr: stderr || '',
      executionTime,
      language,
      success: true
    };

    if (compileTime > 0) {
      result.compileTime = compileTime;
    }

    res.json(result);

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(`❌ [${sessionId}] Execution error:`, error.message);
    
    let errorMessage = error.message || String(error);
    let errorType = 'Runtime error';

    if (error.killed && error.signal === 'SIGTERM') {
      errorMessage = `⏱️ Execution timed out after ${EXEC_TIMEOUT_MS}ms`;
      errorType = 'Timeout';
    } else if (error.code === 'ENOENT') {
      errorMessage = '❌ Command not found. Please check if the required compiler/interpreter is installed.';
      errorType = 'Missing toolchain';
    } else if (error.stderr) {
      errorMessage = error.stderr;
    }

    res.status(200).json({ 
      stdout: error.stdout || '', 
      stderr: `💥 ${errorType}:\n${errorMessage}`,
      error: errorType,
      executionTime,
      language
    });
  } finally {
    // Cleanup with delay
    setTimeout(async () => {
      try {
        await fs.remove(workdir);
        console.log(`🧹 [${sessionId}] Cleanup completed`);
      } catch (cleanupErr) {
        console.warn(`⚠️ [${sessionId}] Cleanup failed:`, cleanupErr.message);
        // Retry cleanup
        setTimeout(() => fs.remove(workdir).catch(() => {}), 5000);
      }
    }, 1000);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err.message);
  
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request too large' });
  }
  
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS policy violation' });
  }
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler - serve client for SPA routing
app.get('*', async (req, res) => {
  const indexPath = join(clientDist, 'index.html');
  if (await fs.pathExists(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ 
      error: 'Not found',
      message: 'Client not built. Run: npm run build in the client directory',
      availableEndpoints: [
        'GET /health',
        'GET /api/files',
        'GET /api/file?path=filename',
        'POST /api/file',
        'PUT /api/file',
        'DELETE /api/file?path=filename',
        'POST /api/run',
        'GET /api/system/info'
      ]
    });
  }
});

// Server startup
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 Enhanced CodeRunner Server Started!`);
  console.log(`📡 Server: http://${HOST}:${PORT}`);
  console.log(`📁 Files: ${USER_FILES}`);
  console.log(`🔧 Temp: ${TEMP_ROOT}`);
  console.log(`💾 Backups: ${BACKUP_DIR}`);
  
  // Check toolchains on startup
  setTimeout(async () => {
    console.log('\n🔧 Checking available toolchains...');
    for (const [lang, config] of Object.entries(LANGUAGES)) {
      const available = await ensureToolchain(lang);
      const status = available ? '✅' : '❌';
      console.log(`   ${status} ${lang.padEnd(12)} - ${config.description}`);
    }
    console.log('');
  }, 1000);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
