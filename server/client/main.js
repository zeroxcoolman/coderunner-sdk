
zeroxcoolman/coderunner-sdk
main

GITHUB

[runtime 2/9] RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y ✔ 27 secs
[runtime 3/9] RUN wget -Q -O /tmp/go.tar.gz https://go.dev/dl/go1.21.0.linux-amd64.tar.gz && tar -C /usr/local -xzf /tmp/go.tar.gz && rm /tmp/go.tar.gz
wget: --quota: Invalid byte value '-O'
✕ [runtime 3/9] RUN wget -Q -O /tmp/go.tar.gz https://go.dev/dl/go1.21.0.linux-amd64.tar.gz && tar -C /usr/local -xzf /tmp/go.tar.gz && rm /tmp/go.tar.gz
process "/bin/sh -c wget -Q -O /tmp/go.tar.gz https://go.dev/dl/go1.21.0.linux-amd64.tar.gz && tar -C /usr/local -xzf /tmp/go.tar.gz && rm /tmp/go.tar.gz" did not complete successfully: exit code: 2
✕ [client-builder 3/5] RUN npm install
process "/bin/sh -c npm install" did not complete successfully: exit code: 137: context canceled: context canceled
Dockerfile:62
-------------------
61 | # Install Go
62 | >>> RUN wget -Q -O /tmp/go.tar.gz https://go.dev/dl/go1.21.0.linux-amd64.tar.gz \
63 | >>> && tar -C /usr/local -xzf /tmp/go.tar.gz \
64 | >>> && rm /tmp/go.tar.gz
65 | ENV PATH="/usr/local/go/bin:${PATH}"
-------------------
ERROR: failed to build: failed to solve: process "/bin/sh -c wget -Q -O /tmp/go.tar.gz https://go.dev/dl/go1.21.0.linux-amd64.tar.gz && tar -C /usr/local -xzf /tmp/go.tar.gz && rm /tmp/go.tar.gz" did not complete successfully: exit code: 2
Also there is another problem, alot of the functionality doesn't work, the run button and if you try customising it doesn't even do anything sometikmes it works sometimes it doesn't, i think its because the main.js/server.js is out of sync with the index.html or something like that

I can see multiple issues with your Dockerfile and application. Let me help you fix both the build errors and the functionality problems.

Issues Identified:
Dockerfile errors: Incorrect wget flags and build failures
Application functionality: Mismatched code between HTML, JS, and server
Missing error handling and synchronization issues

Fixed Dockerfile
Code 

Fixed main.js - Synchronized with HTML
Code 



Continue


Fixed main.js - Synchronized with HTML
Code 
Now let me create a simplified server.js that's better synchronized:


Fixed server.js - Better Error Handling
Code 



// Enhanced CodeRunner with Advanced Customization - FIXED VERSION
// Attempt to initialize Discord Embedded App SDK (non-fatal if not present in plain web dev)
let discordSdk;
(async () => {
  try {
    const mod = await import('@discord/embedded-app-sdk');
    discordSdk = new mod.DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID || '');
    await discordSdk.ready();
    console.log('Discord SDK initialized');
  } catch (e) {
    console.warn('Discord SDK not active (dev mode or not available)');
  }
})();

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// Global elements - ensuring they exist
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
let isInitialized = false;

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

// Initialize elements with error checking
function initializeElements() {
  try {
    // Core elements
    fileListEl = $('#file-list');
    codeEl = $('#codearea');
    termEl = $('#terminal');
    statusEl = $('#status');
    langEl = $('#language');
    flagsEl = $('#flags');
    runBtn = $('#run');
    
    // Modal elements
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
    
    // Settings elements
    settingsPanel = $('#settings-panel');
    settingsBtn = $('#settings-btn');
    backToEditorBtn = $('#back-to-editor');
    
    // Custom button elements
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

    // Verify critical elements exist
    const criticalElements = [fileListEl, codeEl, termEl, statusEl, runBtn];
    const missing = criticalElements.filter(el => !el);
    
    if (missing.length > 0) {
      console.error('Critical elements missing from DOM:', missing);
      throw new Error('Required DOM elements not found');
    }

    console.log('✅ All elements initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Element initialization failed:', error);
    return false;
  }
}

// Enhanced storage system with error handling
function loadCustomButtons() {
  try {
    const stored = localStorage.getItem('customButtons') || '[]';
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
    
    console.log(`Loaded ${customButtons.length} custom buttons`);
  } catch (error) {
    console.error('Error loading custom buttons:', error);
    customButtons = [];
  }
}

function saveCustomButtons() {
  try {
    localStorage.setItem('customButtons', JSON.stringify(customButtons));
    console.log('Custom buttons saved');
  } catch (error) {
    console.error('Error saving custom buttons:', error);
  }
}

function loadTheme() {
  try {
    const stored = localStorage.getItem('theme') || '{}';
    const theme = JSON.parse(stored);
    applyTheme(theme);
    currentTheme = theme.preset || 'default';
    console.log(`Loaded theme: ${currentTheme}`);
  } catch (error) {
    console.error('Error loading theme:', error);
    applyTheme(THEME_PRESETS.default);
  }
}

function saveTheme(theme) {
  try {
    localStorage.setItem('theme', JSON.stringify(theme));
    console.log('Theme saved');
  } catch (error) {
    console.error('Error saving theme:', error);
  }
}

function applyTheme(theme) {
  try {
    const root = document.documentElement;
    Object.entries(theme).forEach(([key, value]) => {
      if (key === 'preset') return;
      if (key.includes('radius') || key.includes('intensity') || key.includes('opacity')) {
        root.style.setProperty(`--${key}`, key.includes('opacity') ? value : `${value}px`);
      } else {
        root.style.setProperty(`--${key}`, value);
      }
    });
    console.log('Theme applied');
  } catch (error) {
    console.error('Error applying theme:', error);
  }
}

// File extension to language mapping
const extToLang = (p) => {
  if (!p) return '';
  const ext = p.split('.').pop()?.toLowerCase();
  const mapping = {
    'js': 'javascript', 'mjs': 'javascript', 'cjs': 'javascript',
    'py': 'python',
    'sh': 'bash', 'bash': 'bash',
    'c': 'c',
    'cpp': 'cpp', 'cc': 'cpp', 'cxx': 'cpp',
    'rs': 'rust',
    'go': 'go',
    'php': 'php',
    'lua': 'lua',
    'rb': 'ruby'
  };
  return mapping[ext] || '';
};

// Utility functions with error handling
function setStatus(msg) {
  if (statusEl) {
    statusEl.textContent = msg;
    console.log(`Status: ${msg}`);
  }
}

function println(s = '') {
  if (termEl) {
    termEl.textContent += s + '\n';
    termEl.scrollTop = termEl.scrollHeight;
  }
}

// Enhanced particle effects system
function createParticle(x, y) {
  const particleCheckbox = $('#particle-effects');
  if (!particleCheckbox?.checked) return;
  
  try {
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
  } catch (error) {
    console.error('Error creating particle:', error);
  }
}

// Enhanced API with better error handling
async function api(path, opts = {}) {
  try {
    if (!path || path.includes('null') || path.includes('undefined')) {
      throw new Error('Invalid API path');
    }
    
    console.log(`API: ${opts.method || 'GET'} ${path}`);
    
    const response = await fetch(`/api${path}`, { 
      headers: { 'Content-Type': 'application/json' }, 
      ...opts 
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return await response.json();
    }
    return await response.text();
  } catch (error) {
    console.error('API Error:', error);
    setStatus(`API Error: ${error.message}`);
    throw error;
  }
}

// Enhanced file loading with better error handling
async function loadFiles() {
  try {
    setStatus('Loading files…');
    const result = await api('/files');
    
    if (!Array.isArray(result)) {
      throw new Error('Invalid response format from server');
    }
    
    files = result.filter(f => {
      if (!f || typeof f.path !== 'string' || f.path.trim() === '') {
        console.warn('Filtering out invalid file:', f);
        return false;
      }
      return true;
    });
    
    renderFileList();
    setStatus(`Loaded ${files.length} files`);
    
    if (!activePath && files.length > 0) {
      await selectFile(files[0].path);
    }
  } catch (error) {
    console.error('Error loading files:', error);
    setStatus('Error loading files');
    println(`❌ Error loading files: ${error.message}`);
    files = [];
    renderFileList();
  }
}

// Enhanced file list rendering
function renderFileList() {
  if (!fileListEl) {
    console.error('File list element not found');
    return;
  }
  
  try {
    fileListEl.innerHTML = '';
    
    if (files.length === 0) {
      fileListEl.innerHTML = '<div class="muted" style="padding: 12px;">No files yet. Create your first file!</div>';
      return;
    }
    
    files.forEach(file => {
      if (!file || typeof file.path !== 'string') return;
      
      const el = document.createElement('div');
      el.className = 'file' + (file.path === activePath ? ' active' : '');
      el.innerHTML = `
        <span class="file-name">${file.path}</span>
        <div class="file-actions">
          <button class="file-action-btn rename-btn" title="Rename">📝</button>
          <span class="muted">${file.size || 0} B</span>
        </div>
      `;
      
      const nameSpan = el.querySelector('.file-name');
      nameSpan?.addEventListener('click', async (e) => {
        try {
          if ($('#particle-effects')?.checked) {
            createParticle(e.clientX, e.clientY);
          }
          
          // Apply file click effect
          const effect = $('#file-click-effect')?.value;
          if (effect && effect !== 'none') {
            el.style.animation = `${effect} 0.3s ease`;
            setTimeout(() => el.style.animation = '', 300);
          }
          
          if (dirty && !confirm('Discard unsaved changes?')) return;
          
          await selectFile(file.path);
        } catch (error) {
          console.error('Error selecting file:', error);
          setStatus('Error selecting file');
        }
      });
      
      const renameBtn = el.querySelector('.rename-btn');
      renameBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        showRenameModal(file.path);
      });
      
      fileListEl.appendChild(el);
    });
  } catch (error) {
    console.error('Error rendering file list:', error);
    fileListEl.innerHTML = '<div class="muted" style="padding: 12px; color: red;">Error rendering files</div>';
  }
}

// Enhanced custom button rendering
function renderCustomButtons() {
  if (!customFileActions) return;
  
  try {
    // Remove existing custom buttons
    const existingCustom = customFileActions.querySelectorAll('.custom-button');
    existingCustom.forEach(btn => btn.remove());
    
    // Add custom buttons
    customButtons.forEach((button, index) => {
      const btn = document.createElement('button');
      btn.textContent = (button.icon ? button.icon + ' ' : '') + button.name;
      btn.className = 'custom-button';
      if (button.color) btn.classList.add(button.color);
      
      // Add hover effects
      const hoverEffect = $('#button-hover-effect')?.value;
      if (hoverEffect) {
        btn.classList.add(`hover-${hoverEffect}`);
      }
      
      btn.onclick = (e) => {
        try {
          if ($('#particle-effects')?.checked) {
            createParticle(e.clientX, e.clientY);
          }
          executeCustomButtonCode(button.code);
        } catch (error) {
          console.error('Error executing custom button:', error);
          setStatus('Error executing button');
        }
      };
      
      // Insert before drop zone if it exists
      if (buttonDropZone) {
        customFileActions.insertBefore(btn, buttonDropZone);
      } else {
        customFileActions.appendChild(btn);
      }
    });
    
    console.log(`Rendered ${customButtons.length} custom buttons`);
  } catch (error) {
    console.error('Error rendering custom buttons:', error);
  }
}

// Enhanced file selection
async function selectFile(path) {
  if (!path || typeof path !== 'string' || path.trim() === '') {
    console.error('selectFile: Invalid path provided:', path);
    setStatus('Error: Invalid file path');
    return;
  }
  
  try {
    setStatus(`Loading ${path}...`);
    const content = await api(`/file?path=${encodeURIComponent(path)}`);
    
    activePath = path;
    if (codeEl) {
      codeEl.value = content || '';
    }
    dirty = false;
    renderFileList();
    
    // Auto-detect language
    const autoLang = extToLang(path);
    if (autoLang && langEl && !langEl.value) {
      langEl.value = autoLang;
    }
    
    setStatus(`Loaded ${path}`);
  } catch (error) {
    console.error('Error selecting file:', error);
    setStatus(`Error loading ${path}`);
    println(`❌ Error loading file: ${error.message}`);
  }
}

// Enhanced save function
async function saveActive() {
  if (!activePath || !codeEl) {
    console.warn('Cannot save: no active file or code element');
    return;
  }
  
  try {
    setStatus('Saving...');
    await api('/file', { 
      method: 'PUT', 
      body: JSON.stringify({ 
        path: activePath, 
        content: codeEl.value || '' 
      })
    });
    
    dirty = false;
    setStatus(`Saved ${activePath}`);
  } catch (error) {
    console.error('Error saving file:', error);
    setStatus('Error saving file');
    println(`❌ Error saving: ${error.message}`);
  }
}

// Enhanced sandboxed code execution
function executeCustomButtonCode(code) {
  try {
    const safeSelectFile = (path) => {
      if (!path || path === 'null' || path === 'undefined') {
        println('❌ Error: Invalid file path provided to selectFile');
        return Promise.reject(new Error('Invalid file path'));
      }
      return selectFile(path);
    };
    
    // Enhanced sandbox with more utilities
    const sandbox = {
      files, activePath,
      selectFile: safeSelectFile,
      saveActive,
      println, api, setStatus,
      // Additional utilities
      alert: (msg) => alert(msg),
      confirm: (msg) => confirm(msg),
      prompt: (msg, def) => prompt(msg, def),
      createParticle,
      applyTheme,
      showNotification: (msg) => {
        try {
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
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          `;
          notification.textContent = msg;
          document.body.appendChild(notification);
          setTimeout(() => {
            if (notification.parentNode) {
              notification.parentNode.removeChild(notification);
            }
          }, 3000);
        } catch (error) {
          console.error('Error showing notification:', error);
        }
      }
    };
    
    const func = new Function(...Object.keys(sandbox), code);
    func(...Object.values(sandbox));
  } catch (error) {
    println(`❌ Custom button error: ${error.message}`);
    console.error('Custom button execution error:', error);
  }
}

// Modal functions with error checking
function showModal() {
  if (!newFileModal || !newFileNameInput) {
    console.error('New file modal elements not found');
    return;
  }
  newFileModal.classList.add('show');
  newFileNameInput.value = '';
  newFileNameInput.focus();
}

function hideModal() {
  newFileModal?.classList.remove('show');
}

function showRenameModal(filename) {
  if (!filename || typeof filename !== 'string') {
    console.error('Invalid filename for rename:', filename);
    return;
  }
  
  if (!renameFileModal || !renameFileNameInput || !currentFilenameEl) {
    console.error('Rename modal elements not found');
    return;
  }
  
  fileToRename = filename;
  currentFilenameEl.textContent = filename;
  renameFileNameInput.value = filename;
  renameFileModal.classList.add('show');
  renameFileNameInput.focus();
}

function hideRenameModal() {
  renameFileModal?.classList.remove('show');
  fileToRename = null;
}

function showDeleteModal(filename) {
  if (!deleteFileModal || !deleteFileName) {
    console.error('Delete modal elements not found');
    return;
  }
  deleteFileName.textContent = filename;
  deleteFileModal.classList.add('show');
}

function hideDeleteModal() {
  deleteFileModal?.classList.remove('show');
}

function showSettings() {
  if (!settingsPanel) {
    console.error('Settings panel not found');
    return;
  }
  settingsPanel.classList.add('show');
  renderCustomButtonSettings();
  updateThemeInputs();
}

function hideSettings() {
  settingsPanel?.classList.remove('show');
}

// Enhanced theme management
function updateThemeInputs() {
  try {
    const theme = JSON.parse(localStorage.getItem('theme') || '{}');
    
    Object.entries(THEME_PRESETS.default).forEach(([key, defaultValue]) => {
      const input = $(`#${key}`);
      if (input) {
        input.value = theme[key] || defaultValue;
      }
    });
    
    // Update range displays
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
    $$('.theme-preset').forEach(preset => {
      preset.classList.toggle('active', preset.dataset.theme === currentTheme);
    });
  } catch (error) {
    console.error('Error updating theme inputs:', error);
  }
}

function updateThemeFromInputs() {
  try {
    const theme = { preset: currentTheme };
    
    ['primary-color', 'accent-color', 'background-color', 'text-color', 
     'terminal-bg', 'terminal-text', 'border-radius', 'shadow-intensity', 'terminal-opacity'].forEach(key => {
      const input = $(`#${key}`);
      if (input) theme[key] = input.value;
    });
    
    applyTheme(theme);
    saveTheme(theme);
  } catch (error) {
    console.error('Error updating theme:', error);
  }
}

// Enhanced custom button settings
function renderCustomButtonSettings() {
  if (!customButtonsList) return;
  
  try {
    customButtonsList.innerHTML = '';
    
    if (customButtons.length === 0) {
      customButtonsList.innerHTML = '<p class="muted">No custom buttons added yet. Click "Add Custom Button" to create your first one!</p>';
      return;
    }
    
    customButtons.forEach((button, index) => {
      const item = document.createElement('div');
      item.className = 'custom-button-item';
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
      
      customButtonsList.appendChild(item);
    });
  } catch (error) {
    console.error('Error rendering custom button settings:', error);
  }
}

// Global functions for button management
window.removeCustomButton = (index) => {
  try {
    customButtons.splice(index, 1);
    saveCustomButtons();
    renderCustomButtons();
    renderCustomButtonSettings();
    setStatus('Custom button removed');
  } catch (error) {
    console.error('Error removing custom button:', error);
  }
};

window.editCustomButton = (index) => {
  try {
    if (!editCustomButtonModal) {
      console.error('Edit modal not found');
      return;
    }
    
    editingButtonIndex = index;
    const button = customButtons[index];
    
    if (editButtonName) editButtonName.value = button.name || '';
    if (editButtonCode) editButtonCode.value = button.code || '';
    
    const iconSelect = $('#edit-button-icon');
    const colorSelect = $('#edit-button-color');
    if (iconSelect) iconSelect.value = button.icon || '';
    if (colorSelect) colorSelect.value = button.color || '';
    
    editCustomButtonModal.classList.add('show');
  } catch (error) {
    console.error('Error editing custom button:', error);
  }
};

window.moveButton = (index, direction) => {
  try {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= customButtons.length) return;
    
    const button = customButtons.splice(index, 1)[0];
    customButtons.splice(newIndex, 0, button);
    
    saveCustomButtons();
    renderCustomButtons();
    renderCustomButtonSettings();
  } catch (error) {
    console.error('Error moving button:', error);
  }
};

// Enhanced file operations
async function createNewFile() {
  if (!newFileNameInput) {
    console.error('New file input not found');
    return;
  }
  
  try {
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
  } catch (error) {
    console.error('Error creating file:', error);
    alert(`Error creating file: ${error.message}`);
    setStatus('Error creating file');
  }
}

async function renameFile() {
  if (!renameFileNameInput || !fileToRename) {
    console.error('Rename inputs not found');
    hideRenameModal();
    return;
  }
  
  try {
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
    
    // Get content, create new file, delete old file
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
    setStatus(`Renamed to ${newName}`);
  } catch (error) {
    console.error('Error renaming file:', error);
    alert(`Error renaming file: ${error.message}`);
    setStatus('Error renaming file');
    hideRenameModal();
  }
}

async function deleteFile() {
  if (!activePath) {
    alert('No file selected to delete');
    return;
  }
  
  try {
    hideDeleteModal();
    setStatus('Deleting file...');
    
    await api(`/file?path=${encodeURIComponent(activePath)}`, { 
      method: 'DELETE' 
    });
    
    const deletedFile = activePath;
    activePath = null;
    if (codeEl) codeEl.value = '';
    dirty = false;
    
    await loadFiles();
    setStatus(`Deleted ${deletedFile}`);
  } catch (error) {
    console.error('Error deleting file:', error);
    alert(`Error deleting file: ${error.message}`);
    setStatus('Error deleting file');
  }
}

// Enhanced custom button operations
function addCustomButton() {
  if (!customButtonName || !customButtonCode) {
    console.error('Custom button modal inputs not found');
    return;
  }
  
  try {
    const name = customButtonName.value.trim();
    const code = customButtonCode.value.trim();
    const icon = $('#custom-button-icon')?.value || '';
    const color = $('#custom-button-color')?.value || '';
    
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
  } catch (error) {
    console.error('Error adding custom button:', error);
    alert('Error adding custom button');
  }
}

function saveEditedButton() {
  if (editingButtonIndex === -1 || !editButtonName || !editButtonCode) {
    console.error('Edit button inputs not found');
    return;
  }
  
  try {
    const name = editButtonName.value.trim();
    const code = editButtonCode.value.trim();
    const icon = $('#edit-button-icon')?.value || '';
    const color = $('#edit-button-color')?.value || '';
    
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
      name, code, icon, color
    };
    
    saveCustomButtons();
    renderCustomButtons();
    renderCustomButtonSettings();
    hideEditButtonModal();
    setStatus(`Updated custom button: ${name}`);
  } catch (error) {
    console.error('Error saving edited button:', error);
    alert('Error saving button changes');
  }
}

function hideCustomButtonModal() {
  customButtonModal?.classList.remove('show');
}

function hideEditButtonModal() {
  editCustomButtonModal?.classList.remove('show');
  editingButtonIndex = -1;
}

function showCustomButtonModal() {
  if (!customButtonModal) {
    console.error('Custom button modal not found');
    return;
  }
  
  customButtonModal.classList.add('show');
  if (customButtonName) customButtonName.value = '';
  if (customButtonCode) customButtonCode.value = '';
  
  const iconSelect = $('#custom-button-icon');
  const colorSelect = $('#custom-button-color');
  if (iconSelect) iconSelect.value = '';
  if (colorSelect) colorSelect.value = '';
  
  if (customButtonName) customButtonName.focus();
}

function factoryReset() {
  try {
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
    
    setStatus('🏭 Factory reset completed');
    println('🏭 Factory reset completed! All customizations restored to defaults.');
  } catch (error) {
    console.error('Error during factory reset:', error);
    alert('Error during factory reset');
  }
}

function showFactoryResetModal() {
  factoryResetModal?.classList.add('show');
}

function hideFactoryResetModal() {
  factoryResetModal?.classList.remove('show');
}

// Enhanced event listener setup
function setupEventListeners() {
  try {
    // Settings
    settingsBtn?.addEventListener('click', showSettings);
    backToEditorBtn?.addEventListener('click', hideSettings);
    
    // File actions
    $('#new-file')?.addEventListener('click', showModal);
    $('#delete-file')?.addEventListener('click', () => {
      if (!activePath) {
        alert('No file selected to delete');
        return;
      }
      showDeleteModal(activePath);
    });

    // New file modal
    modalCancel?.addEventListener('click', hideModal);
    modalCreate?.addEventListener('click', createNewFile);

    newFileNameInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        createNewFile();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        hideModal();
      }
    });

    // Rename file modal
    renameCancel?.addEventListener('click', hideRenameModal);
    renameConfirm?.addEventListener('click', renameFile);

    renameFileNameInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        renameFile();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        hideRenameModal();
      }
    });

    // Delete file modal
    deleteCancel?.addEventListener('click', hideDeleteModal);
    deleteConfirm?.addEventListener('click', deleteFile);

    // Custom button modals
    addCustomButtonBtn?.addEventListener('click', showCustomButtonModal);
    customButtonCancel?.addEventListener('click', hideCustomButtonModal);
    customButtonSave?.addEventListener('click', addCustomButton);
    editButtonCancel?.addEventListener('click', hideEditButtonModal);
    editButtonSave?.addEventListener('click', saveEditedButton);

    // Factory reset
    $('#factory-reset')?.addEventListener('click', showFactoryResetModal);
    factoryResetCancel?.addEventListener('click', hideFactoryResetModal);
    factoryResetConfirm?.addEventListener('click', factoryReset);

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
      input?.addEventListener('change', updateThemeFromInputs);
    });

    // Apply custom CSS
    $('#apply-css')?.addEventListener('click', () => {
      try {
        const customCss = $('#custom-css')?.value || '';
        const customStylesEl = $('#custom-styles');
        if (customStylesEl) {
          customStylesEl.textContent = customCss;
          setStatus('Custom CSS applied!');
        }
      } catch (error) {
        console.error('Error applying CSS:', error);
        setStatus('Error applying CSS');
      }
    });

    // Animation controls
    $('#button-hover-effect')?.addEventListener('change', () => {
      renderCustomButtons();
    });

    // Modal click-outside-to-close
    const modals = [newFileModal, renameFileModal, deleteFileModal, 
                   customButtonModal, editCustomButtonModal, factoryResetModal];
    modals.forEach(modal => {
      modal?.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('show');
        }
      });
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

    // Editor dirty tracking
    codeEl?.addEventListener('input', () => { 
      dirty = true; 
      setStatus(activePath ? `${activePath} (unsaved)` : 'Unsaved changes');
    });

    // Save shortcut (Ctrl/Cmd+S)
    window.addEventListener('keydown', async (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        await saveActive();
      }
    });

    // Enhanced run button
    runBtn?.addEventListener('click', async (e) => {
      try {
        if ($('#particle-effects')?.checked) {
          createParticle(e.clientX, e.clientY);
        }
        
        if (!activePath) {
          alert('No file selected to run');
          return;
        }
        
        // Save before running
        await saveActive();
        
        // Clear terminal
        if (termEl) termEl.textContent = '';
        setStatus('Running…');
        
        const language = langEl?.value || extToLang(activePath) || '';
        const flags = flagsEl?.value || '';
        
        println(`🚀 Running ${activePath}${language ? ` (${language})` : ''}...`);
        
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
        
        const time = result.executionTime ? ` (${result.executionTime}ms)` : '';
        setStatus(`Done${time}`);
        
        if (result.success) {
          println(`✅ Execution completed${time}`);
        } else {
          println(`❌ Execution failed${time}`);
        }
        
      } catch (error) {
        console.error('Error running code:', error);
        println(`❌ Runtime Error: ${error.message}`);
        setStatus('Error');
      }
    });

    console.log('✅ Event listeners setup complete');
  } catch (error) {
    console.error('❌ Error setting up event listeners:', error);
  }
}

// Enhanced initialization
function initialize() {
  try {
    console.log('🚀 Initializing Enhanced CodeRunner...');
    
    // Initialize elements first
    if (!initializeElements()) {
      throw new Error('Failed to initialize DOM elements');
    }
    
    // Load saved data
    loadCustomButtons();
    loadTheme();
    
    // Setup event listeners
    setupEventListeners();
    
    // Render UI components
    renderCustomButtons();
    
    // Welcome message
    if (termEl) {
      termEl.textContent = '';
      println('🎨 Enhanced CodeRunner loaded!');
      println('✨ Features: Custom themes, buttons, drag & drop, and more!');
      println('⚙️ Click the settings gear to explore customization options.');
      println('');
    }
    
    setStatus('Initializing...');
    
    // Load files
    loadFiles().then(() => {
      isInitialized = true;
      console.log('✅ Enhanced CodeRunner initialized successfully!');
    }).catch(error => {
      console.error('❌ Failed to load files:', error);
      println(`❌ Failed to load files: ${error.message}`);
      setStatus('Error loading files');
    });
    
  } catch (error) {
    console.error('❌ Fatal initialization error:', error);
    if (termEl) {
      termEl.textContent = `❌ Initialization failed: ${error.message}\n\nPlease refresh the page.`;
    }
    if (statusEl) {
      statusEl.textContent = 'Initialization failed';
    }
  }
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  // DOM is already ready
  initialize();
}

// Export for debugging
window.debugCodeRunner = {
  files, customButtons, currentTheme,
  loadFiles, renderFileList, renderCustomButtons,
  api, setStatus, println
};
