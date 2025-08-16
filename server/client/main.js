// Minimal Activity front-end: file CRUD + basic editor + run
// Later we can swap textarea for Monaco/CodeMirror and wire full Discord SDK flows.

// Attempt to initialize Discord Embedded App SDK (non-fatal if not present in plain web dev)
console.log("Reached Client/main.js!");
let discordSdk;
(async () => {
  try {
    // Dynamically import only if available (installed via npm)
    const mod = await import('@discord/embedded-app-sdk');
    discordSdk = new mod.DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID || '');
    console.log("initializing discord sdk");
    await discordSdk.ready();
    console.log("successfully intialized discord sdk");
    console.log("Hello World!");
    // We can expand with authorization if needed:
    const { code } = await discordSdk.commands.authorize({ client_id: import.meta.env.VITE_DISCORD_CLIENT_ID, response_type: 'code', scope: ['identify'] });
  } catch (e) {
    console.warn('Discord SDK not active (dev mode).');
  }
})();

const $ = (sel) => document.querySelector(sel);
const fileListEl = $('#file-list');
const codeEl = $('#codearea');
const termEl = $('#terminal');
const statusEl = $('#status');
const langEl = $('#language');
const flagsEl = $('#flags');
const runBtn = $('#run');

let files = [];
let activePath = null;
let dirty = false;

const extToLang = (p) => {
  if (!p) return '';
  const ext = p.split('.').pop();
  if (ext === 'js' || ext === 'mjs' || ext === 'cjs') return 'javascript';
  if (ext === 'py') return 'python';
  if (ext === 'sh' || ext === 'bash') return 'bash';
  return '';
};

function setStatus(msg) {
  statusEl.textContent = msg;
}

function println(s = '') {
  termEl.textContent += s + '\n';
  termEl.scrollTop = termEl.scrollHeight;
}

async function api(path, opts = {}) {
  const res = await fetch(`/api${path}`, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (!res.ok) throw new Error(await res.text());
  return res.headers.get('content-type')?.includes('application/json') ? res.json() : res.text();
}

async function loadFiles() {
  setStatus('Loading files…');
  files = await api('/files');
  renderFileList();
  setStatus('Ready');
  if (!activePath && files.length) selectFile(files[0].path);
}

function renderFileList() {
  fileListEl.innerHTML = '';
  files.forEach(f => {
    const el = document.createElement('div');
    el.className = 'file' + (f.path === activePath ? ' active' : '');
    el.innerHTML = `<span>${f.path}</span><span class="muted">${f.size} B</span>`;
    el.addEventListener('click', async () => {
      if (dirty && !confirm('Discard unsaved changes?')) return;
      await selectFile(f.path);
    });
    fileListEl.appendChild(el);
  });
}

async function selectFile(path) {
  const content = await api(`/file?path=${encodeURIComponent(path)}`);
  activePath = path;
  codeEl.value = content;
  dirty = false;
  renderFileList();
  const autoLang = extToLang(path);
  if (autoLang && !langEl.value) langEl.value = autoLang;
}

async function saveActive() {
  if (!activePath) return;
  await api('/file', { method: 'PUT', body: JSON.stringify({ path: activePath, content: codeEl.value })});
  dirty = false;
  setStatus('Saved');
}

// File actions
$('#new-file').addEventListener('click', async () => {
  const name = prompt('New file name (e.g., main.js)');
  if (!name) return;
  await api('/file', { method: 'POST', body: JSON.stringify({ path: name, content: '' })});
  await loadFiles();
  await selectFile(name);
});

$('#delete-file').addEventListener('click', async () => {
  if (!activePath) return;
  if (!confirm(`Delete ${activePath}?`)) return;
  await api(`/file?path=${encodeURIComponent(activePath)}`, { method: 'DELETE' });
  activePath = null;
  await loadFiles();
});

// Editor dirty tracking and save (Ctrl/Cmd+S)
codeEl.addEventListener('input', () => { dirty = true; });
window.addEventListener('keydown', async (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    await saveActive();
  }
});

// Run
runBtn.addEventListener('click', async () => {
  if (!activePath) return;
  await saveActive();
  termEl.textContent = '';
  setStatus('Running…');
  println(`$ ${langEl.value || extToLang(activePath) || 'auto'} ${activePath}`);
  try {
    const res = await api('/run', {
      method: 'POST',
      body: JSON.stringify({
        language: langEl.value || extToLang(activePath) || '',
        flags: flagsEl.value || '',
        entry: activePath
      })
    });
    if (res.stdout) println(res.stdout);
    if (res.stderr) println(res.stderr);
    if (res.error) println(`error: ${res.error}`);
    setStatus('Done');
  } catch (err) {
    println(String(err));
    setStatus('Error');
  }
});

// Initial load
loadFiles().catch(err => println(String(err)));
