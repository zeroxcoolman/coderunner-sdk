import express from 'express';
import cors from 'cors';
import path from 'path';
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
app.use(express.json({ limit: '2mb' }));

// CORS
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || '';
const allowed = allowedOriginsEnv.split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({ origin: (origin, cb) => cb(null, !origin || allowed.length === 0 || allowed.includes(origin)), credentials: true }));

// Serve client (after build) from ../client/dist
const clientDist = join(__dirname, '..', 'client', 'dist');
if (await fs.pathExists(clientDist)) {
  app.use(express.static(clientDist));
}

const TEMP_ROOT = join(__dirname, 'temp_files');
await fs.ensureDir(TEMP_ROOT);

const EXEC_TIMEOUT_MS = Number(process.env.EXEC_TIMEOUT_MS || 10000);

// Map of languages to compile/run commands
const LANGUAGES = {
  c: {
    compile: 'gcc {sources} -o {output} {flags}',
    run: './{output}',
    extension: '.c'
  },
  cpp: {
    compile: 'g++ {sources} -o {output} {flags}',
    run: './{output}',
    extension: '.cpp'
  },
  python: {
    run: 'python3 {sources}',
    extension: '.py'
  },
  rust: {
    compile: 'rustc {sources} -o {output} {flags}',
    run: './{output}',
    extension: '.rs'
  },
  go: {
    compile: 'go build -o {output} {sources} {flags}',
    run: './{output}',
    extension: '.go'
  },
  bash: {
    run: 'bash {sources}',
    extension: '.sh'
  },
  php: {
    run: 'php {sources}',
    extension: '.php'
  },
  lua: {
    run: 'lua {sources}',
    extension: '.lua'
  },
  ruby: {
    run: 'ruby {sources}',
    extension: '.rb'
  },
  javascript: {
    run: 'node {sources}',
    extension: '.js'
  }
};

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
  // Quick availability checks to avoid confusing errors on Railway
  switch (lang) {
    case 'c': return which('gcc');
    case 'cpp': return which('g++');
    case 'python': return which('python3');
    case 'rust': return which('rustc');
    case 'go': return which('go');
    case 'bash': return which('bash');
    case 'php': return which('php');
    case 'lua': return which('lua');
    case 'ruby': return which('ruby');
    case 'javascript': return which('node');
    default: return false;
  }
}

app.get('/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// POST /api/run { language?, flags?, code?, files?: [{name, content}] }
app.post('/api/run', async (req, res) => {
  const { language: langIn, flags = '', code, files = [] } = req.body || {};

  // Create temp working dir
  const workdir = join(TEMP_ROOT, uuidv4());
  await fs.ensureDir(workdir);

  let language = (langIn || '').toLowerCase() || null;
  const createdFiles = [];

  try {
    // Write provided files
    for (const f of files) {
      const filepath = join(workdir, f.name);
      await fs.ensureDir(dirname(filepath));
      await fs.writeFile(filepath, f.content, 'utf8');
      createdFiles.push(filepath);
      if (!language) language = detectLanguageFromFilename(f.name) || language;
    }

    // If inline code provided, require language
    if (code) {
      if (!language) throw new Error('Language required when using inline code.');
      const ext = LANGUAGES[language]?.extension;
      if (!ext) throw new Error(`Unsupported language: ${language}`);
      const mainName = `main${ext}`;
      const mainPath = join(workdir, mainName);
      await fs.writeFile(mainPath, code, 'utf8');
      createdFiles.push(mainPath);
    }

    if (!language) throw new Error('Could not detect language. Provide a language or file with known extension.');
    const info = LANGUAGES[language];
    if (!info) throw new Error(`Unsupported language: ${language}`);

    const toolchainOk = await ensureToolchain(language);
    if (!toolchainOk) {
      return res.status(400).json({ stdout: '', stderr: `Missing toolchain for ${language}. Install the required compiler/interpreter on Railway or limit to supported languages.` });
    }

    const outputName = 'program.out';
    const sources = createdFiles.map(p => p.replaceAll(' ', '\\ ')).join(' ');

    let runCmd;
    if (info.compile) {
      const compileCmd = info.compile
        .replace('{sources}', sources)
        .replace('{output}', outputName)
        .replace('{flags}', flags || '');

      const { stdout: cOut, stderr: cErr } = await exec(compileCmd, { cwd: workdir, timeout: EXEC_TIMEOUT_MS, maxBuffer: 2 * 1024 * 1024 });
      if (cErr && cErr.trim()) {
        // If gcc/g++ emits warnings to stderr but exits 0, include them in response
        // We proceed; non-zero exit throws from exec
      }
      runCmd = info.run.replace('{output}', outputName);
    } else {
      runCmd = info.run.replace('{sources}', sources);
    }

    const { stdout, stderr } = await exec(runCmd, { cwd: workdir, timeout: EXEC_TIMEOUT_MS, maxBuffer: 2 * 1024 * 1024, shell: '/bin/bash' });

    res.json({ stdout, stderr });
  } catch (err) {
    const msg = err.killed && err.signal === 'SIGTERM' ? 'Execution timed out' : (err.stderr || err.message || String(err));
    res.status(200).json({ stdout: err.stdout || '', stderr: msg });
  } finally {
    // Cleanup
    try { await fs.remove(workdir); } catch {}
  }
});

// Fallback to client index.html for Activity hosting after build
app.get('*', async (req, res) => {
  if (await fs.pathExists(join(clientDist, 'index.html'))) {
    res.sendFile(join(clientDist, 'index.html'));
  } else {
    res.status(404).send('Not built yet.');
  }
});

// Serve frontend build
app.use(express.static(path.join(__dirname, "client/dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "client/dist/index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[server] listening on :${PORT}`);
});
