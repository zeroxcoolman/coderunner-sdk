// Enhanced CodeRunner with Advanced Customization
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
const $$ = (sel) => document.querySelectorAll(sel);

// Global elements
let fileListEl, codeEl, termEl, statusEl, langEl, flagsEl, runBtn;
let newFileModal, newFileNameInput, modalCancel, modalCreate;
let deleteFileModal, deleteFileName, deleteCancel, deleteConfirm;
let renameFileModal, renameFileNameInput, currentFilenameEl, renameCancel, renameConfirm;
let settingsPanel, settingsBtn, backToEditorBtn;
let customButtonModal, customButtonName, customButtonCode, customButtonCancel, customButtonSave;
let editCustomButtonModal, editButtonName, editButtonCode, editButtonCancel, editButtonSave;
let factoryResetModal, factoryResetCancel, factoryResetConfirm;
let customFileActions, customButtonsList, addCustomButtonBtn, buttonDropZone;

// Application state
let files = [];
let activePath = null;
let dirty = false;
let fileToRename = null;
let customButtons = [];
let currentTheme = 'default';
let editingButtonIndex = -1;
let draggedButtonIndex = -1;

// Theme presets
const THEME_PRESETS = {
  default: {
    'primary-color': '#111827',
    'accent-color': '#3b82f6',
    'background-color': '#ffffff',
    'text-color': '#1f2937',
    'terminal-bg': '#0b0b0b',
    'terminal-text': '#e5e7eb',
    'border-radius': '8',
    'shadow-intensity': '2'
  },
  dark: {
    'primary-color': '#f3f4f6',
    'accent-color': '#60a5fa',
    'background-color': '#1f2937',
    'text-color': '#f9fafb',
    'terminal-bg': '#111827',
    'terminal-text': '#e5e7eb',
    'header-bg': '#374151',
    'sidebar-bg': '#374151',
    'footer-bg': '#374151',
    'editor-bg': '#1f2937'
  },
  retro: {
    'primary-color': '#f59e0b',
    'accent-color': '#10b981',
    'background-color': '#fef3c7',
    'text-color': '#92400e',
    'terminal-bg': '#451a03',
    'terminal-text': '#fbbf24'
  },
  neon: {
    'primary-color': '#ec4899',
    'accent-color': '#06ffa5',
    'background-color': '#0f0f23',
    'text-color': '#06ffa5',
    'terminal-bg': '#000000',
    'terminal-text': '#06ffa5'
  },
  nature: {
    'primary-color': '#059669',
    'accent-color': '#84cc16',
    'background-color': '#ecfdf5',
    'text-color': '#064e3b',
    'terminal-bg': '#14532d',
    'terminal-text': '#bbf7d0'
  },
  ocean: {
    'primary-color': '#0284c7',
    'accent-color': '#06b6d4',
    'background-color': '#e0f2fe',
    'text-color': '#0c4a6e',
    'terminal-bg': '#164e63',
    'terminal-text': '#a5f3fc'
  }
};

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
  
  editCustomButtonModal = $('#edit-custom-button-modal');
  editButtonName = $('#edit-button-name');
  editButtonCode = $('#edit-button-code');
  editButtonCancel = $('#edit-button-cancel');
  editButtonSave = $('#edit-button-save');
  
  factoryResetModal = $('#factory-reset-modal');
  factoryResetCancel = $('#factory-reset-cancel');
  factoryResetConfirm = $('#factory-reset-confirm');
  
  customFileActions = $('#custom-file-actions');
  customButtonsList = $('#custom-buttons-list');
  addCustomButtonBtn = $('#add-custom-button');
  buttonDropZone = $('#button-drop-zone');
}

// Enhanced storage system
function loadCustomButtons() {
  const stored = window.customButtonsStorage || '[]';
  try {
    const parsed = JSON.parse(stored);
    customButtons = Array.isArray(parsed) ? parsed : [];
    // Ensure all buttons have required properties
    customButtons = customButtons.map(btn => ({
      name: btn.name || 'Unnamed',
      code: btn.code || '',
      icon: btn.icon || '',
      color: btn.color || '',
      id: btn.id || Date.now() + Math.random()
    }));
  } catch {
    customButtons = [];
  }
}

function saveCustomButtons() {
  window.customButtonsStorage = JSON.stringify(customButtons);
}

function loadTheme() {
  const stored = window.themeStorage || '{}';
  try {
    const theme = JSON.parse(stored);
    applyTheme(theme);
    currentTheme = theme.preset || 'default';
  } catch {
    applyTheme(THEME_PRESETS.default);
  }
}

function saveTheme(theme) {
  window.themeStorage = JSON.stringify(theme);
}

function applyTheme(theme) {
  const root = document.documentElement;
  Object.entries(theme).forEach(([key, value]) => {
    if (key === 'preset') return;
    if (key.includes('radius') || key.includes('intensity') || key.includes('opacity')) {
      root.style.setProperty(`--${key}`, key.includes('opacity') ? value : `${value}px`);
    } else {
      root.style.setProperty(`--${key}`, value);
    }
  });
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

// Enhanced particle effects system
function createParticle(x, y) {
  if (!$('#particle-effects').checked) return;
  
  const particle = document.createElement('div');
  particle.className = 'particle';
  particle.style.left = x + 'px';
  particle.style.top = y + 'px';
  particle.style.background = `var(--accent-color, #3b82f6)`;
  
  document.body.appendChild(particle);
  
  setTimeout(() => {
    if (particle.parentNode) {
      particle.parentNode.removeChild(particle);
    }
  }, 1000);
}

async function api(path, opts = {}) {
  try {
    if (path.includes('path=null') || path.includes('path=undefined')) {
      console.error('🚨 CRITICAL: API call with null/undefined path detected!');
      throw new Error('Invalid API call with null/undefined path');
    }
    
    console.log('API call:', path, opts.method || 'GET');
    
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
    files = files.filter(f => {
      if (!f || typeof f.path !== 'string' || f.path.trim() === '') {
        console.warn('Filtering out invalid file:', f);
        return false;
      }
      return true;
    });
    
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
  
  files.forEach(f => {
    if (!f || typeof f.path !== 'string') return;
    
    const el = document.createElement('div');
    el.className = 'file' + (f.path === activePath ? ' active' : '');
    el.innerHTML = `
      <span class="file-name">${f.path}</span>
      <div class="file-actions">
        <button class="file-action-btn rename-btn" title="Rename">📝</button>
        <span class="muted">${f.size || 0} B</span>
      </div>
    `;
    
    const nameSpan = el.querySelector('.file-name');
    nameSpan.addEventListener('click', async (e) => {
      if ($('#particle-effects').checked) {
        createParticle(e.clientX, e.clientY);
      }
      
      // Apply file click effect
      const effect = $('#file-click-effect').value;
      if (effect && effect !== 'none') {
        el.style.animation = `${effect} 0.3s ease`;
        setTimeout(() => el.style.animation = '', 300);
      }
      
      if (dirty && !confirm('Discard unsaved changes?')) return;
      
      if (f.path && typeof f.path === 'string' && f.path.trim() !== '') {
        await selectFile(f.path);
      } else {
        alert('Error: Invalid file selected');
      }
    });
    
    const renameBtn = el.querySelector('.rename-btn');
    renameBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (f.path && typeof f.path === 'string') {
        showRenameModal(f.path);
      } else {
        alert('Error: Invalid file selected for renaming');
      }
    });
    
    fileListEl.appendChild(el);
  });
}

function renderCustomButtons() {
  if (!customFileActions) return;
  
  const existingCustom = customFileActions.querySelectorAll('.custom-button');
  existingCustom.forEach(btn => btn.remove());
  
  customButtons.forEach((button, index) => {
    const btn = document.createElement('button');
    btn.textContent = (button.icon ? button.icon + ' ' : '') + button.name;
    btn.className = 'custom-button';
    if (button.color) btn.classList.add(button.color);
    
    // Add hover effects
    const hoverEffect = $('#button-hover-effect').value;
    if (hoverEffect) {
      btn.classList.add(`hover-${hoverEffect}`);
    }
    
    btn.onclick = (e) => {
      if ($('#particle-effects').checked) {
        createParticle(e.clientX, e.clientY);
      }
      executeCustomButtonCode(button.code);
    };
    
    // Insert before drop zone
    customFileActions.insertBefore(btn, buttonDropZone);
  });
}

function renderCustomButtonSettings() {
  if (!customButtonsList) return;
  
  customButtonsList.innerHTML = '';
  
  if (customButtons.length === 0) {
    customButtonsList.innerHTML = '<p class="muted">No custom buttons added yet. Click "Add Custom Button" to create your first one!</p>';
    return;
  }
  
  customButtons.forEach((button, index) => {
    const item = document.createElement('div');
    item.className = 'custom-button-item';
    item.draggable = true;
    item.innerHTML = `
      <div class="custom-button-order">
        <button class="order-btn" onclick="moveButton(${index}, -1)" ${index === 0 ? 'disabled' : ''}>↑</button>
        <button class="order-btn" onclick="moveButton(${index}, 1)" ${index === customButtons.length - 1 ? 'disabled' : ''}>↓</button>
      </div>
      <div class="custom-button-preview ${button.color || ''}" style="${button.color === 'rainbow' ? 'background: linear-gradient(45deg, #ff0000, #ff8000, #ffff00, #80ff00, #00ff00, #00ff80, #00ffff, #0080ff, #0000ff, #8000ff, #ff00ff, #ff0080); color: white;' : ''}">
        ${button.icon ? button.icon + ' ' : ''}${button.name}
      </div>
      <div style="flex: 1; font-family: monospace; font-size: 11px; color: #666; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        ${button.code.substring(0, 60)}${button.code.length > 60 ? '...' : ''}
      </div>
      <div style="display: flex; gap: 5px;">
        <button class="edit-btn" onclick="editCustomButton(${index})">✏️</button>
        <button onclick="removeCustomButton(${index})" style="background-color: #dc2626; color: white; padding: 4px 8px; font-size: 11px; border: none; border-radius: 4px; cursor: pointer;">🗑️</button>
      </div>
    `;
    
    // Add drag and drop functionality
    item.addEventListener('dragstart', (e) => {
      draggedButtonIndex = index;
      item.classList.add('dragging');
    });
    
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      draggedButtonIndex = -1;
    });
    
    customButtonsList.appendChild(item);
  });
  
  // Setup drop zone functionality
  setupDropZone();
}

function setupDropZone() {
  if (!buttonDropZone) return;
  
  buttonDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    buttonDropZone.classList.add('highlight');
  });
  
  buttonDropZone.addEventListener('dragleave', () => {
    buttonDropZone.classList.remove('highlight');
  });
  
  buttonDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    buttonDropZone.classList.remove('highlight');
    
    if (draggedButtonIndex !== -1) {
      // Move button to end of array
      const button = customButtons.splice(draggedButtonIndex, 1)[0];
      customButtons.push(button);
      saveCustomButtons();
      renderCustomButtons();
      renderCustomButtonSettings();
    }
  });
}

// Enhanced sandboxed code execution
function executeCustomButtonCode(code) {
  try {
    const safeSelectFile = (path) => {
      if (path === null || path === undefined || path === '') {
        println('Error: Invalid file path provided to selectFile');
        return Promise.reject(new Error('Invalid file path'));
      }
      return selectFile(path);
    };
    
    const safeSaveActive = () => {
      return saveActive();
    };
    
    // Enhanced sandbox with more utilities
    const sandbox = {
      files, activePath,
      selectFile: safeSelectFile,
      saveActive: safeSaveActive,
      println, api, setStatus,
      // Additional utilities
      alert: (msg) => alert(msg),
      confirm: (msg) => confirm(msg),
      prompt: (msg, def) => prompt(msg, def),
      createParticle,
      applyTheme,
      showNotification: (msg) => {
        const notification = document.createElement('div');
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: var(--accent-color, #3b82f6);
          color: white;
          padding: 12px 20px;
          border-radius: var(--border-radius, 8px);
          z-index: 10000;
          animation: slideIn 0.3s ease;
        `;
        notification.textContent = msg;
        document.body.appendChild(notification);
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 3000);
      }
    };
    
    const func = new Function(...Object.keys(sandbox), code);
    func(...Object.values(sandbox));
  } catch (err) {
    println(`Custom button error: ${err.message}`);
    console.error('Custom button execution error:', err);
  }
}

function showRenameModal(filename) {
  if (!filename || typeof filename !== 'string' || filename.trim() === '') {
    alert('Error: Invalid file selected for renaming');
    return;
  }
  
  const fileExists = files.some(f => f.path === filename);
  if (!fileExists) {
    alert('Error: File not found');
    return;
  }
  
  fileToRename = filename;
  if (currentFilenameEl) currentFilenameEl.textContent = filename;
  if (renameFileNameInput) renameFileNameInput.value = filename;
  if (renameFileModal) renameFileModal.classList.add('show');
  if (renameFileNameInput) renameFileNameInput.focus();
}

// Global functions for button management
window.removeCustomButton = (index) => {
  customButtons.splice(index, 1);
  saveCustomButtons();
  renderCustomButtons();
  renderCustomButtonSettings();
};

window.editCustomButton = (index) => {
  editingButtonIndex = index;
  const button = customButtons[index];
  
  if (editButtonName) editButtonName.value = button.name || '';
  if (editButtonCode) editButtonCode.value = button.code || '';
  
  // Set icon and color
  const iconSelect = $('#edit-button-icon');
  const colorSelect = $('#edit-button-color');
  if (iconSelect) iconSelect.value = button.icon || '';
  if (colorSelect) colorSelect.value = button.color || '';
  
  if (editCustomButtonModal) editCustomButtonModal.classList.add('show');
};

window.moveButton = (index, direction) => {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= customButtons.length) return;
  
  const button = customButtons.splice(index, 1)[0];
  customButtons.splice(newIndex, 0, button);
  
  saveCustomButtons();
  renderCustomButtons();
  renderCustomButtonSettings();
};

async function selectFile(path) {
  if (path === null || path === undefined || typeof path !== 'string' || path.trim() === '') {
    console.error('selectFile received invalid path:', path);
    setStatus('Error: Invalid file path');
    alert('Error: Invalid file path');
    return;
  }
  
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
  
  // Reset selects
  const iconSelect = $('#custom-button-icon');
  const colorSelect = $('#custom-button-color');
  if (iconSelect) iconSelect.value = '';
  if (colorSelect) colorSelect.value = '';
  
  if (customButtonName) customButtonName.focus();
}

function hideCustomButtonModal() {
  if (!customButtonModal) return;
  customButtonModal.classList.remove('show');
}

function showEditButtonModal() {
  if (!editCustomButtonModal) return;
  editCustomButtonModal.classList.add('show');
}

function hideEditButtonModal() {
  if (!editCustomButtonModal) return;
  editCustomButtonModal.classList.remove('show');
  editingButtonIndex = -1;
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
  updateThemeInputs();
}

function hideSettings() {
  if (!settingsPanel) return;
  settingsPanel.classList.remove('show');
}

// Theme management
function updateThemeInputs() {
  const theme = JSON.parse(window.themeStorage || '{}');
  
  Object.entries(THEME_PRESETS.default).forEach(([key, defaultValue]) => {
    const input = $(`#${key}`);
    if (input) {
      input.value = theme[key] || defaultValue;
    }
  });
  
  // Update range value displays
  const radiusSlider = $('#border-radius');
  const shadowSlider = $('#shadow-intensity');
  const opacitySlider = $('#terminal-opacity');
  
  if (radiusSlider) {
    const radiusValue = $('#radius-value');
    if (radiusValue) radiusValue.textContent = radiusSlider.value + 'px';
    radiusSlider.oninput = () => {
      if (radiusValue) radiusValue.textContent = radiusSlider.value + 'px';
      updateThemeFromInputs();
    };
  }
  
  if (shadowSlider) {
    const shadowValue = $('#shadow-value');
    if (shadowValue) shadowValue.textContent = shadowSlider.value;
    shadowSlider.oninput = () => {
      if (shadowValue) shadowValue.textContent = shadowSlider.value;
      updateThemeFromInputs();
    };
  }
  
  if (opacitySlider) {
    const opacityValue = $('#opacity-value');
    if (opacityValue) opacityValue.textContent = Math.round(opacitySlider.value * 100) + '%';
    opacitySlider.oninput = () => {
      if (opacityValue) opacityValue.textContent = Math.round(opacitySlider.value * 100) + '%';
      updateThemeFromInputs();
    };
  }
  
  // Update preset selection
  $('.theme-preset').forEach(preset => {
    preset.classList.toggle('active', preset.dataset.theme === currentTheme);
  });
}

function updateThemeFromInputs() {
  const theme = { preset: currentTheme };
  
  ['primary-color', 'accent-color', 'background-color', 'text-color', 
   'terminal-bg', 'terminal-text', 'border-radius', 'shadow-intensity', 'terminal-opacity'].forEach(key => {
    const input = $(`#${key}`);
    if (input) theme[key] = input.value;
  });
  
  applyTheme(theme);
  saveTheme(theme);
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
    if (!renameFileNameInput || !fileToRename) {
      alert('Error: Unable to rename file - please try again');
      hideRenameModal();
      return;
    }
    
    const fileExists = files.some(f => f.path === fileToRename);
    if (!fileExists) {
      alert('Error: File no longer exists');
      hideRenameModal();
      return;
    }
    
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
      alert('A file with that name already exists!');
      return;
    }
    
    const originalFileName = fileToRename;
    hideRenameModal();
    setStatus('Renaming file...');
    
    if (!originalFileName || originalFileName === 'null' || originalFileName === 'undefined') {
      throw new Error('Invalid original filename for rename operation');
    }
    
    if (!newName || newName === 'null' || newName === 'undefined') {
      throw new Error('Invalid new filename for rename operation');
    }
    
    const content = await api(`/file?path=${encodeURIComponent(originalFileName)}`);
    
    await api('/file', { 
      method: 'POST', 
      body: JSON.stringify({ 
        path: newName, 
        content: content 
      })
    });
    
    await api(`/file?path=${encodeURIComponent(originalFileName)}`, { 
      method: 'DELETE' 
    });
    
    if (activePath === originalFileName) {
      activePath = newName;
    }
    
    await loadFiles();
    await selectFile(newName);
    setStatus(`Renamed ${originalFileName} to ${newName}`);
  } catch (err) {
    console.error('Error renaming file:', err);
    alert(`Error renaming file: ${err.message}`);
    setStatus('Error renaming file');
    fileToRename = null;
    hideRenameModal();
  }
}

function addCustomButton() {
  if (!customButtonName || !customButtonCode) return;
  
  const name = customButtonName.value.trim();
  const code = customButtonCode.value.trim();
  const icon = $('#custom-button-icon').value;
  const color = $('#custom-button-color').value;
  
  if (!name) {
    alert('Please enter a button name');
    return;
  }
  
  if (!code) {
    alert('Please enter JavaScript code');
    return;
  }
  
  customButtons.push({ 
    name, 
    code, 
    icon, 
    color, 
    id: Date.now() + Math.random() 
  });
  
  saveCustomButtons();
  renderCustomButtons();
  renderCustomButtonSettings();
  hideCustomButtonModal();
  setStatus(`Added custom button: ${name}`);
}

function saveEditedButton() {
  if (editingButtonIndex === -1 || !editButtonName || !editButtonCode) return;
  
  const name = editButtonName.value.trim();
  const code = editButtonCode.value.trim();
  const icon = $('#edit-button-icon').value;
  const color = $('#edit-button-color').value;
  
  if (!name) {
    alert('Please enter a button name');
    return;
  }
  
  if (!code) {
    alert('Please enter JavaScript code');
    return;
  }
  
  customButtons[editingButtonIndex] = {
    ...customButtons[editingButtonIndex],
    name,
    code,
    icon,
    color
  };
  
  saveCustomButtons();
  renderCustomButtons();
  renderCustomButtonSettings();
  hideEditButtonModal();
  setStatus(`Updated custom button: ${name}`);
}

function factoryReset() {
  customButtons = [];
  const defaultTheme = { preset: 'default', ...THEME_PRESETS.default };
  
  saveCustomButtons();
  saveTheme(defaultTheme);
  applyTheme(defaultTheme);
  
  // Clear custom CSS
  const customStylesEl = $('#custom-styles');
  if (customStylesEl) customStylesEl.textContent = '';
  
  renderCustomButtons();
  renderCustomButtonSettings();
  updateThemeInputs();
  hideFactoryResetModal();
  
  setStatus('🏭 All customizations reset to factory defaults');
  println('🏭 Factory reset completed! All customizations have been restored to default settings.');
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
  if (modalCancel) modalCancel.addEventListener('click', hideModal);
  if (modalCreate) modalCreate.addEventListener('click', createNewFile);

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
  if (renameCancel) renameCancel.addEventListener('click', hideRenameModal);
  if (renameConfirm) renameConfirm.addEventListener('click', renameFile);

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
  if (deleteCancel) deleteCancel.addEventListener('click', hideDeleteModal);
  
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

  // Custom button modals
  if (addCustomButtonBtn) {
    addCustomButtonBtn.addEventListener('click', showCustomButtonModal);
  }
  
  if (customButtonCancel) customButtonCancel.addEventListener('click', hideCustomButtonModal);
  if (customButtonSave) customButtonSave.addEventListener('click', addCustomButton);
  
  if (editButtonCancel) editButtonCancel.addEventListener('click', hideEditButtonModal);
  if (editButtonSave) editButtonSave.addEventListener('click', saveEditedButton);

  // Factory reset modal
  const factoryResetBtn = $('#factory-reset');
  if (factoryResetBtn) {
    factoryResetBtn.addEventListener('click', showFactoryResetModal);
  }
  
  if (factoryResetCancel) factoryResetCancel.addEventListener('click', hideFactoryResetModal);
  if (factoryResetConfirm) factoryResetConfirm.addEventListener('click', factoryReset);

  // Theme controls
  $('.theme-preset').forEach(preset => {
    preset.addEventListener('click', () => {
      currentTheme = preset.dataset.theme;
      const theme = { preset: currentTheme, ...THEME_PRESETS[currentTheme] };
      applyTheme(theme);
      saveTheme(theme);
      updateThemeInputs();
    });
  });

  // Color inputs
  ['primary-color', 'accent-color', 'background-color', 'text-color', 
   'terminal-bg', 'terminal-text'].forEach(id => {
    const input = $(`#${id}`);
    if (input) {
      input.addEventListener('change', updateThemeFromInputs);
    }
  });

  // Apply custom CSS
  const applyCssBtn = $('#apply-css');
  if (applyCssBtn) {
    applyCssBtn.addEventListener('click', () => {
      const customCss = $('#custom-css').value;
      const customStylesEl = $('#custom-styles');
      if (customStylesEl) {
        customStylesEl.textContent = customCss;
        setStatus('Custom CSS applied!');
      }
    });
  }

  // Animation controls
  const buttonHoverSelect = $('#button-hover-effect');
  if (buttonHoverSelect) {
    buttonHoverSelect.addEventListener('change', () => {
      renderCustomButtons();
    });
  }

  // Modal click-outside-to-close
  const modals = [newFileModal, renameFileModal, deleteFileModal, customButtonModal, editCustomButtonModal, factoryResetModal];
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
      hideEditButtonModal();
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

  // Run button (protected from customization)
  if (runBtn) {
    runBtn.addEventListener('click', async (e) => {
      if ($('#particle-effects').checked) {
        createParticle(e.clientX, e.clientY);
      }
      
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
  loadTheme();
  setupEventListeners();
  renderCustomButtons();
  
  // Welcome message with some flair
  println('🎨 Enhanced CodeRunner loaded!');
  println('✨ New features: Custom themes, enhanced buttons, drag & drop, and more!');
  println('⚙️ Click the settings gear to explore customization options.');
  println('');
  
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
