// Minimal Activity front-end: file CRUD + basic editor + run
// Later we can swap textarea for Monaco/CodeMirror and wire full Discord SDK flows.

// Attempt to initialize Discord Embedded App SDK (non-fatal if not present in plain web dev)
let discordSdk;
(async () => {
  try {
    // Dynamically import only if available (installed via npm)
    const mod = await import('@discord/embedded-app-sdk');
    discordSdk = new mod.DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID || '');
    await discordSdk.ready();
    // We can expand with authorization if needed:
    // const { code } = await discordSdk.commands.authorize({ client_id: import.meta.env.VITE_DISCORD_CLIENT_ID, response_type: 'code', scope: ['identify'] });
  } catch (e) {
    console.warn('Discord SDK not active (dev mode).');
  }
})();

const $ = (sel) => document.querySelector(sel);

// Wait for DOM to be ready before getting elements
let fileListEl, codeEl, termEl, statusEl, langEl, flagsEl, runBtn;
let newFileModal, newFileNameInput, modalCancel, modalCreate;
let deleteFileModal, deleteFileName, deleteCancel, deleteConfirm;

function initializeElements() {
  fileListEl = $('#file-list');
  codeEl = $('#codearea');
  termEl = $('#terminal');
  statusEl = $('#status');
  langEl = $('#language');
  flagsEl = $('#flags');
  runBtn = $('#run');
  newFileModal = $('#new-file-modal');
  newFileNameInput = $('#new-file-name');
  modalCancel = $('#modal-cancel');
  modalCreate = $('#modal-create');
  deleteFileModal = $('#delete-file-modal');
  deleteFileName = $('#delete-file-name');
  deleteCancel = $('#delete-cancel');
  deleteConfirm = $('#delete-confirm');
}

let files = [];
let activePath = null;
let dirty = false;

const extToLang = (p) => {
  if (!p) return '';
  const ext = p.split('.').pop();
  if (ext === 'js' || ext === 'mjs' || ext === 'cjs') return 'javascript';
  if (ext === 'py') return 'python';
  if (ext === 'sh' || ext === 'bash') return 'bash';
  if (ext === 'c') return 'c';
  if (ext === 'cpp' || ext === 'cc' || ext === 'cxx') return 'cpp';
  if (ext === 'rs') return 'rust';
  if (ext === 'go') return 'go';
  if (ext === 'php') return 'php';
  if (ext === 'lua') return 'lua';
  if (ext === 'rb') return 'ruby';
  return '';
};

function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg;
}

function println(s = '') {
  if (termEl) {
    termEl.textContent += s + '\n';
    termEl.scrollTop = termEl.scrollHeight;
  }
}

async function api(path, opts = {}) {
  try {
    const res = await fetch(`/api${path}`, { 
      headers: { 'Content-Type': 'application/json' }, 
      ...opts 
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errorText}`);
    }
    
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await res.json();
    }
    return await res.text();
  } catch (err) {
    console.error('API Error:', err);
    throw err;
  }
}

async function loadFiles() {
  try {
    setStatus('Loading files…');
    const result = await api('/files');
    
    // Ensure files is an array
    files = Array.isArray(result) ? result : [];
    
    renderFileList();
    setStatus('Ready');
    
    // Select first file if no active file and files exist
    if (!activePath && files.length > 0) {
      await selectFile(files[0].path);
    }
  } catch (err) {
    console.error('Error loading files:', err);
    setStatus('Error loading files');
    println(`Error loading files: ${err.message}`);
    
    // Initialize empty files array on error
    files = [];
    renderFileList();
  }
}

function renderFileList() {
  if (!fileListEl) return;
  
  fileListEl.innerHTML = '';
  
  if (!Array.isArray(files)) {
    console.error('Files is not an array:', files);
    return;
  }
  
  files.forEach(f => {
    if (!f || typeof f.path !== 'string') {
      console.warn('Invalid file object:', f);
      return;
    }
    
    const el = document.createElement('div');
    el.className = 'file' + (f.path === activePath ? ' active' : '');
    el.innerHTML = `<span>${f.path}</span><span class="muted">${f.size || 0} B</span>`;
    el.addEventListener('click', async () => {
      if (dirty && !confirm('Discard unsaved changes?')) return;
      await selectFile(f.path);
    });
    fileListEl.appendChild(el);
  });
}

async function selectFile(path) {
  try {
    const content = await api(`/file?path=${encodeURIComponent(path)}`);
    activePath = path;
    if (codeEl) codeEl.value = content || '';
    dirty = false;
    renderFileList();
    
    // Auto-detect language
    const autoLang = extToLang(path);
    if (autoLang && langEl && !langEl.value) {
      langEl.value = autoLang;
    }
    
    setStatus(`Loaded ${path}`);
  } catch (err) {
    console.error('Error selecting file:', err);
    setStatus('Error loading file');
    println(`Error loading file: ${err.message}`);
  }
}

async function saveActive() {
  if (!activePath || !codeEl) return;
  
  try {
    await api('/file', { 
      method: 'PUT', 
      body: JSON.stringify({ 
        path: activePath, 
        content: codeEl.value || '' 
      })
    });
    dirty = false;
    setStatus('Saved');
  } catch (err) {
    console.error('Error saving file:', err);
    setStatus('Error saving file');
    println(`Error saving file: ${err.message}`);
  }
}

// Modal handling
function showModal() {
  if (!newFileModal || !newFileNameInput) return;
  newFileModal.classList.add('show');
  newFileNameInput.value = '';
  newFileNameInput.focus();
}

function hideModal() {
  if (!newFileModal) return;
  newFileModal.classList.remove('show');
}

function showDeleteModal(filename) {
  if (!deleteFileModal || !deleteFileName) return;
  deleteFileName.textContent = filename;
  deleteFileModal.classList.add('show');
}

function hideDeleteModal() {
  if (!deleteFileModal) return;
  deleteFileModal.classList.remove('show');
}

async function createNewFile() {
  try {
    if (!newFileNameInput) return;
    
    const name = newFileNameInput.value.trim();
    if (!name) {
      alert('Please enter a filename');
      return;
    }
    
    // Check if file already exists
    if (files.some(f => f.path === name)) {
      alert('File already exists!');
      return;
    }
    
    hideModal();
    setStatus('Creating file...');
    
    await api('/file', { 
      method: 'POST', 
      body: JSON.stringify({ 
        path: name, 
        content: '' 
      })
    });
    
    await loadFiles();
    await selectFile(name);
    setStatus(`Created ${name}`);
  } catch (err) {
    console.error('Error creating file:', err);
    alert(`Error creating file: ${err.message}`);
    setStatus('Error creating file');
  }
}

function setupEventListeners() {
  // File actions
  const newFileBtn = $('#new-file');
  const deleteFileBtn = $('#delete-file');
  
  if (newFileBtn) {
    newFileBtn.addEventListener('click', () => {
      showModal();
    });
  }

  if (deleteFileBtn) {
    deleteFileBtn.addEventListener('click', () => {
      if (!activePath) {
        alert('No file selected to delete');
        return;
      }
      showDeleteModal(activePath);
    });
  }

  if (deleteCancel) {
    deleteCancel.addEventListener('click', hideDeleteModal);
  }
  
  if (deleteConfirm) {
    deleteConfirm.addEventListener('click', async () => {
      if (!activePath) return;
      
      try {
        hideDeleteModal();
        setStatus('Deleting file...');
        
        await api(`/file?path=${encodeURIComponent(activePath)}`, { 
          method: 'DELETE' 
        });
        
        const deletedFile = activePath;
        activePath = null;
        if (codeEl) codeEl.value = '';
        await loadFiles();
        setStatus(`Deleted ${deletedFile}`);
      } catch (err) {
        console.error('Error deleting file:', err);
        alert(`Error deleting file: ${err.message}`);
        setStatus('Error deleting file');
      }
    });
  }

  if (modalCancel) {
    modalCancel.addEventListener('click', hideModal);
  }
  
  if (modalCreate) {
    modalCreate.addEventListener('click', createNewFile);
  }

  // Handle Enter key in modal
  if (newFileNameInput) {
    newFileNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        createNewFile();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        hideModal();
      }
    });
  }

  // Close modal when clicking outside
  if (newFileModal) {
    newFileModal.addEventListener('click', (e) => {
      if (e.target === newFileModal) {
        hideModal();
      }
    });
  }

  // Close delete modal when clicking outside
  if (deleteFileModal) {
    deleteFileModal.addEventListener('click', (e) => {
      if (e.target === deleteFileModal) {
        hideDeleteModal();
      }
    });
  }

  // Handle Escape key to close modals
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideModal();
      hideDeleteModal();
    }
  });

  // Editor dirty tracking and save (Ctrl/Cmd+S)
  if (codeEl) {
    codeEl.addEventListener('input', () => { 
      dirty = true; 
      setStatus(activePath ? `${activePath} (unsaved)` : 'Unsaved changes');
    });
  }

  window.addEventListener('keydown', async (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      await saveActive();
    }
  });

  // Run button
  if (runBtn) {
    runBtn.addEventListener('click', async () => {
      if (!activePath) {
        alert('No file selected to run');
        return;
      }
      
      try {
        // Save current file before running
        await saveActive();
        
        // Clear terminal
        if (termEl) termEl.textContent = '';
        setStatus('Running…');
        
        const language = (langEl?.value) || extToLang(activePath);
        const flags = (flagsEl?.value) || '';
        
        println(`$ Running ${activePath} (${language || 'auto-detect'})`);
        
        const result = await api('/run', {
          method: 'POST',
          body: JSON.stringify({
            language: language,
            flags: flags,
            entry: activePath
          })
        });
        
        if (result.stdout) {
          println('--- OUTPUT ---');
          println(result.stdout);
        }
        
        if (result.stderr) {
          println('--- ERRORS ---');
          println(result.stderr);
        }
        
        if (result.error) {
          println('--- ERROR ---');
          println(result.error);
        }
        
        setStatus('Done');
      } catch (err) {
        console.error('Error running code:', err);
        println(`--- ERROR ---`);
        println(err.message);
        setStatus('Error');
      }
    });
  }
}

// Initialize everything when DOM is ready
function initialize() {
  initializeElements();
  setupEventListeners();
  
  // Load files
  loadFiles().catch(err => {
    console.error('Failed to load files:', err);
    println(`Failed to load files: ${err.message}`);
    setStatus('Error');
  });
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  // Already loaded
  initialize();
}
