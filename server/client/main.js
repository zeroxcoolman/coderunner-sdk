// Attempt to initialize Discord Embedded App SDK (non-fatal if not present in plain web dev)
let discordSdk;
(async () => {
  try {
    const mod = await import('@discord/embedded-app-sdk');
    discordSdk = new mod.DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID || '');
    await discordSdk.ready();
  } catch (e) {
    console.warn('Discord SDK not active (dev mode).');
  }
})();

const $ = (sel) => document.querySelector(sel);

// Global elements
let fileListEl, codeEl, termEl, statusEl, langEl, flagsEl, runBtn;
let newFileModal, newFileNameInput, modalCancel, modalCreate;
let deleteFileModal, deleteFileName, deleteCancel, deleteConfirm;
let renameFileModal, renameFileNameInput, currentFilenameEl, renameCancel, renameConfirm;
let settingsPanel, settingsBtn, backToEditorBtn;
let customButtonModal, customButtonName, customButtonCode, customButtonCancel, customButtonSave;
let factoryResetModal, factoryResetCancel, factoryResetConfirm;
let customFileActions, customButtonsList, addCustomButtonBtn;

// Application state
let files = [];
let activePath = null;
let dirty = false;
let fileToRename = null;
let customButtons = [];

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
  
  renameFileModal = $('#rename-file-modal');
  renameFileNameInput = $('#rename-file-name');
  currentFilenameEl = $('#current-filename');
  renameCancel = $('#rename-cancel');
  renameConfirm = $('#rename-confirm');
  
  settingsPanel = $('#settings-panel');
  settingsBtn = $('#settings-btn');
  backToEditorBtn = $('#back-to-editor');
  
  customButtonModal = $('#custom-button-modal');
  customButtonName = $('#custom-button-name');
  customButtonCode = $('#custom-button-code');
  customButtonCancel = $('#custom-button-cancel');
  customButtonSave = $('#custom-button-save');
  
  factoryResetModal = $('#factory-reset-modal');
  factoryResetCancel = $('#factory-reset-cancel');
  factoryResetConfirm = $('#factory-reset-confirm');
  
  customFileActions = $('#custom-file-actions');
  customButtonsList = $('#custom-buttons-list');
  addCustomButtonBtn = $('#add-custom-button');
}

// Custom buttons storage (in memory for artifact compatibility)
function loadCustomButtons() {
  const stored = window.customButtonsStorage || '[]';
  try {
    customButtons = JSON.parse(stored);
  } catch {
    customButtons = [];
  }
}

function saveCustomButtons() {
  window.customButtonsStorage = JSON.stringify(customButtons);
}

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
    files = Array.isArray(result) ? result : [];
    renderFileList();
    setStatus('Ready');
    
    if (!activePath && files.length > 0) {
      await selectFile(files[0].path);
    }
  } catch (err) {
    console.error('Error loading files:', err);
    setStatus('Error loading files');
    println(`Error loading files: ${err.message}`);
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
    el.innerHTML = `
      <span class="file-name">${f.path}</span>
      <div class="file-actions">
        <button class="file-action-btn" onclick="showRenameModal('${f.path}')" title="Rename">📝</button>
        <span class="muted">${f.size || 0} B</span>
      </div>
    `;
    
    // Add click handler to file name area only
    const nameSpan = el.querySelector('.file-name');
    nameSpan.addEventListener('click', async () => {
      if (dirty && !confirm('Discard unsaved changes?')) return;
      await selectFile(f.path);
    });
    
    fileListEl.appendChild(el);
  });
}

function renderCustomButtons() {
  if (!customFileActions) return;
  
  // Remove existing custom buttons (keep default ones)
  const existingCustom = customFileActions.querySelectorAll('.custom-button');
  existingCustom.forEach(btn => btn.remove());
  
  // Add custom buttons
  customButtons.forEach((button, index) => {
    const btn = document.createElement('button');
    btn.textContent = button.name;
    btn.className = 'custom-button';
    btn.onclick = () => executeCustomButtonCode(button.code);
    customFileActions.appendChild(btn);
  });
}

function renderCustomButtonSettings() {
  if (!customButtonsList) return;
  
  customButtonsList.innerHTML = '';
  
  if (customButtons.length === 0) {
    customButtonsList.innerHTML = '<p class="muted">No custom buttons added yet.</p>';
    return;
  }
  
  customButtons.forEach((button, index) => {
    const item = document.createElement('div');
    item.className = 'custom-button-item';
    item.innerHTML = `
      <div class="custom-button-preview">${button.name}</div>
      <div style="flex: 1; font-family: monospace; font-size: 11px; color: #666; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        ${button.code.substring(0, 60)}${button.code.length > 60 ? '...' : ''}
      </div>
      <button onclick="removeCustomButton(${index})" style="background-color: #dc2626; color: white; padding: 4px 8px; font-size: 11px; border: none; border-radius: 4px; cursor: pointer;">Remove</button>
    `;
    customButtonsList.appendChild(item);
  });
}

function executeCustomButtonCode(code) {
  try {
    // Create a function with available context
    const func = new Function('files', 'activePath', 'selectFile', 'saveActive', 'println', 'api', 'setStatus', code);
    func(files, activePath, selectFile, saveActive, println, api, setStatus);
  } catch (err) {
    println(`Custom button error: ${err.message}`);
    console.error('Custom button execution error:', err);
  }
}

// Global functions for onclick handlers
window.showRenameModal = (filename) => {
  fileToRename = filename;
  if (currentFilenameEl) currentFilenameEl.textContent = filename;
  if (renameFileNameInput) renameFileNameInput.value = filename;
  if (renameFileModal) renameFileModal.classList.add('show');
  if (renameFileNameInput) renameFileNameInput.focus();
};

window.removeCustomButton = (index) => {
  customButtons.splice(index, 1);
  saveCustomButtons();
  renderCustomButtons();
  renderCustomButtonSettings();
};

async function selectFile(path) {
  try {
    const content = await api(`/file?path=${encodeURIComponent(path)}`);
    activePath = path;
    if (codeEl) codeEl.value = content || '';
    dirty = false;
    renderFileList();
    
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

// Modal functions
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

function hideRenameModal() {
  if (!renameFileModal) return;
  renameFileModal.classList.remove('show');
  fileToRename = null;
}

function showCustomButtonModal() {
  if (!customButtonModal) return;
  customButtonModal.classList.add('show');
  if (customButtonName) customButtonName.value = '';
  if (customButtonCode) customButtonCode.value = '';
  if (customButtonName) customButtonName.focus();
}

function hideCustomButtonModal() {
  if (!customButtonModal) return;
  customButtonModal.classList.remove('show');
}

function showFactoryResetModal() {
  if (!factoryResetModal) return;
  factoryResetModal.classList.add('show');
}

function hideFactoryResetModal() {
  if (!factoryResetModal) return;
  factoryResetModal.classList.remove('show');
}

function showSettings() {
  if (!settingsPanel) return;
  settingsPanel.classList.add('show');
  renderCustomButtonSettings();
}

function hideSettings() {
  if (!settingsPanel) return;
  settingsPanel.classList.remove('show');
}

async function createNewFile() {
  try {
    if (!newFileNameInput) return;
    
    const name = newFileNameInput.value.trim();
    if (!name) {
      alert('Please enter a filename');
      return;
    }
    
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

async function renameFile() {
  try {
    if (!renameFileNameInput || !fileToRename) return;
    
    const newName = renameFileNameInput.value.trim();
    if (!newName) {
      alert('Please enter a filename');
      return;
    }
    
    if (newName === fileToRename) {
      hideRenameModal();
      return;
    }
    
    if (files.some(f => f.path === newName)) {
      alert('File already exists!');
      return;
    }
    
    hideRenameModal();
    setStatus('Renaming file...');
    
    // Get current content
    const content = await api(`/file?path=${encodeURIComponent(fileToRename)}`);
    
    // Create new file with same content
    await api('/file', { 
      method: 'POST', 
      body: JSON.stringify({ 
        path: newName, 
        content: content 
      })
    });
    
    // Delete old file
    await api(`/file?path=${encodeURIComponent(fileToRename)}`, { 
      method: 'DELETE' 
    });
    
    // Update active path if it was the renamed file
    if (activePath === fileToRename) {
      activePath = newName;
    }
    
    await loadFiles();
    await selectFile(newName);
    setStatus(`Renamed to ${newName}`);
  } catch (err) {
    console.error('Error renaming file:', err);
    alert(`Error renaming file: ${err.message}`);
    setStatus('Error renaming file');
  }
}

function addCustomButton() {
  if (!customButtonName || !customButtonCode) return;
  
  const name = customButtonName.value.trim();
  const code = customButtonCode.value.trim();
  
  if (!name) {
    alert('Please enter a button name');
    return;
  }
  
  if (!code) {
    alert('Please enter JavaScript code');
    return;
  }
  
  customButtons.push({ name, code });
  saveCustomButtons();
  renderCustomButtons();
  renderCustomButtonSettings();
  hideCustomButtonModal();
  setStatus(`Added custom button: ${name}`);
}

function factoryReset() {
  customButtons = [];
  saveCustomButtons();
  renderCustomButtons();
  renderCustomButtonSettings();
  hideFactoryResetModal();
  setStatus('Customizations reset to factory defaults');
}

function setupEventListeners() {
  // Settings
  if (settingsBtn) {
    settingsBtn.addEventListener('click', showSettings);
  }
  
  if (backToEditorBtn) {
    backToEditorBtn.addEventListener('click', hideSettings);
  }
  
  // File actions
  const newFileBtn = $('#new-file');
  const deleteFileBtn = $('#delete-file');
  
  if (newFileBtn) {
    newFileBtn.addEventListener('click', showModal);
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

  // New file modal
  if (modalCancel) {
    modalCancel.addEventListener('click', hideModal);
  }
  
  if (modalCreate) {
    modalCreate.addEventListener('click', createNewFile);
  }

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

  // Rename file modal
  if (renameCancel) {
    renameCancel.addEventListener('click', hideRenameModal);
  }
  
  if (renameConfirm) {
    renameConfirm.addEventListener('click', renameFile);
  }

  if (renameFileNameInput) {
    renameFileNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        renameFile();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        hideRenameModal();
      }
    });
  }

  // Delete file modal
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

  // Custom button modal
  if (addCustomButtonBtn) {
    addCustomButtonBtn.addEventListener('click', showCustomButtonModal);
  }
  
  if (customButtonCancel) {
    customButtonCancel.addEventListener('click', hideCustomButtonModal);
  }
  
  if (customButtonSave) {
    customButtonSave.addEventListener('click', addCustomButton);
  }

  // Factory reset modal
  const factoryResetBtn = $('#factory-reset');
  if (factoryResetBtn) {
    factoryResetBtn.addEventListener('click', showFactoryResetModal);
  }
  
  if (factoryResetCancel) {
    factoryResetCancel.addEventListener('click', hideFactoryResetModal);
  }
  
  if (factoryResetConfirm) {
    factoryResetConfirm.addEventListener('click', factoryReset);
  }

  // Modal click-outside-to-close
  const modals = [newFileModal, renameFileModal, deleteFileModal, customButtonModal, factoryResetModal];
  modals.forEach(modal => {
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('show');
        }
      });
    }
  });

  // ESC key to close modals and settings
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideModal();
      hideRenameModal();
      hideDeleteModal();
      hideCustomButtonModal();
      hideFactoryResetModal();
      hideSettings();
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
        await saveActive();
        
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

function initialize() {
  initializeElements();
  loadCustomButtons();
  setupEventListeners();
  renderCustomButtons();
  
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
  initialize();
}
