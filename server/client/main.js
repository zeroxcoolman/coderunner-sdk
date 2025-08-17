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

// FIXED: Properly define utility functions
function $(sel) {
  return document.querySelector(sel);
}

function $$(sel) {
  return document.querySelectorAll(sel);
}

// Global elements - ensuring they exist
let elements = {};

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
    'shadow-intensity': '2',
    'terminal-opacity': '1'
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
    'editor-bg': '#1f2937',
    'border-radius': '8',
    'shadow-intensity': '2',
    'terminal-opacity': '1'
  },
  retro: {
    'primary-color': '#f59e0b',
    'accent-color': '#10b981',
    'background-color': '#fef3c7',
    'text-color': '#92400e',
    'terminal-bg': '#451a03',
    'terminal-text': '#fbbf24',
    'border-radius': '8',
    'shadow-intensity': '2',
    'terminal-opacity': '1'
  },
  neon: {
    'primary-color': '#ec4899',
    'accent-color': '#06ffa5',
    'background-color': '#0f0f23',
    'text-color': '#06ffa5',
    'terminal-bg': '#000000',
    'terminal-text': '#06ffa5',
    'border-radius': '8',
    'shadow-intensity': '2',
    'terminal-opacity': '1'
  },
  nature: {
    'primary-color': '#059669',
    'accent-color': '#84cc16',
    'background-color': '#ecfdf5',
    'text-color': '#064e3b',
    'terminal-bg': '#14532d',
    'terminal-text': '#bbf7d0',
    'border-radius': '8',
    'shadow-intensity': '2',
    'terminal-opacity': '1'
  },
  ocean: {
    'primary-color': '#0284c7',
    'accent-color': '#06b6d4',
    'background-color': '#e0f2fe',
    'text-color': '#0c4a6e',
    'terminal-bg': '#164e63',
    'terminal-text': '#a5f3fc',
    'border-radius': '8',
    'shadow-intensity': '2',
    'terminal-opacity': '1'
  }
};

// FIXED: Initialize elements with proper error checking and waiting for DOM
function initializeElements() {
  console.log('🔧 Initializing elements...');
  
  try {
    // Core elements
    elements.fileList = $('#file-list');
    elements.code = $('#codearea');
    elements.terminal = $('#terminal');
    elements.status = $('#status');
    elements.language = $('#language');
    elements.flags = $('#flags');
    elements.runBtn = $('#run');
    
    // Buttons
    elements.newFileBtn = $('#new-file');
    elements.deleteFileBtn = $('#delete-file');
    elements.settingsBtn = $('#settings-btn');
    elements.backToEditorBtn = $('#back-to-editor');
    
    // Modal elements
    elements.newFileModal = $('#new-file-modal');
    elements.newFileNameInput = $('#new-file-name');
    elements.modalCancel = $('#modal-cancel');
    elements.modalCreate = $('#modal-create');
    
    elements.deleteFileModal = $('#delete-file-modal');
    elements.deleteFileName = $('#delete-file-name');
    elements.deleteCancel = $('#delete-cancel');
    elements.deleteConfirm = $('#delete-confirm');
    
    elements.renameFileModal = $('#rename-file-modal');
    elements.renameFileNameInput = $('#rename-file-name');
    elements.currentFilename = $('#current-filename');
    elements.renameCancel = $('#rename-cancel');
    elements.renameConfirm = $('#rename-confirm');
    
    // Settings elements
    elements.settingsPanel = $('#settings-panel');
    
    // Custom button elements
    elements.customButtonModal = $('#custom-button-modal');
    elements.customButtonName = $('#custom-button-name');
    elements.customButtonCode = $('#custom-button-code');
    elements.customButtonCancel = $('#custom-button-cancel');
    elements.customButtonSave = $('#custom-button-save');
    
    elements.editCustomButtonModal = $('#edit-custom-button-modal');
    elements.editButtonName = $('#edit-button-name');
    elements.editButtonCode = $('#edit-button-code');
    elements.editButtonCancel = $('#edit-button-cancel');
    elements.editButtonSave = $('#edit-button-save');
    
    elements.factoryResetModal = $('#factory-reset-modal');
    elements.factoryResetCancel = $('#factory-reset-cancel');
    elements.factoryResetConfirm = $('#factory-reset-confirm');
    
    elements.customFileActions = $('#custom-file-actions');
    elements.customButtonsList = $('#custom-buttons-list');
    elements.addCustomButtonBtn = $('#add-custom-button');
    elements.buttonDropZone = $('#button-drop-zone');

    // Verify critical elements exist
    const criticalElements = [
      'fileList', 'code', 'terminal', 'status', 'runBtn', 'newFileBtn'
    ];
    
    const missing = criticalElements.filter(key => !elements[key]);
    
    if (missing.length > 0) {
      console.error('❌ Critical elements missing:', missing);
      throw new Error(`Required DOM elements not found: ${missing.join(', ')}`);
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

// FIXED: Theme application with proper CSS variable setting
function applyTheme(theme) {
  try {
    const root = document.documentElement;
    
    // First apply preset defaults if available
    if (theme.preset && THEME_PRESETS[theme.preset]) {
      const presetTheme = THEME_PRESETS[theme.preset];
      Object.entries(presetTheme).forEach(([key, value]) => {
        if (key === 'preset') return;
        if (key.includes('radius') || key.includes('intensity')) {
          root.style.setProperty(`--${key}`, `${value}px`);
        } else if (key.includes('opacity')) {
          root.style.setProperty(`--${key}`, value);
        } else {
          root.style.setProperty(`--${key}`, value);
        }
      });
    }
    
    // Then apply any custom overrides
    Object.entries(theme).forEach(([key, value]) => {
      if (key === 'preset') return;
      if (key.includes('radius') || key.includes('intensity')) {
        root.style.setProperty(`--${key}`, `${value}px`);
      } else if (key.includes('opacity')) {
        root.style.setProperty(`--${key}`, value);
      } else {
        root.style.setProperty(`--${key}`, value);
      }
    });
    
    console.log('Theme applied successfully');
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
  if (elements.status) {
    elements.status.textContent = msg;
    console.log(`Status: ${msg}`);
  }
}

function println(s = '') {
  if (elements.terminal) {
    elements.terminal.textContent += s + '\n';
    elements.terminal.scrollTop = elements.terminal.scrollHeight;
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

// FIXED: Enhanced API with better error handling and path validation
async function api(path, opts = {}) {
  try {
    // FIXED: Better path validation
    if (!path || typeof path !== 'string') {
      throw new Error('Invalid API path');
    }
    
    // Don't make API calls during factory reset
    if (path.includes('null') || path.includes('undefined')) {
      throw new Error('Invalid API path contains null/undefined');
    }
    
    console.log(`API: ${opts.method || 'GET'} ${path}`);
    
    const response = await fetch(`/api${path}`, { 
      headers: { 'Content-Type': 'application/json' }, 
      ...opts 
    });
    
    if (!response.ok) {
      let errorText;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const errorData = await response.json();
        errorText = errorData.message || errorData.error || `HTTP ${response.status}`;
      } else {
        errorText = await response.text() || `HTTP ${response.status}`;
      }
      throw new Error(errorText);
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

// FIXED: Enhanced file loading with better error handling
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
    
    // Only auto-select if no active file and files exist
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
  if (!elements.fileList) {
    console.error('File list element not found');
    return;
  }
  
  try {
    elements.fileList.innerHTML = '';
    
    if (files.length === 0) {
      elements.fileList.innerHTML = '<div class="muted" style="padding: 12px;">No files yet. Create your first file!</div>';
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
      
      elements.fileList.appendChild(el);
    });
  } catch (error) {
    console.error('Error rendering file list:', error);
    elements.fileList.innerHTML = '<div class="muted" style="padding: 12px; color: red;">Error rendering files</div>';
  }
}

// Enhanced custom button rendering
function renderCustomButtons() {
  if (!elements.customFileActions) return;
  
  try {
    // Remove existing custom buttons
    const existingCustom = elements.customFileActions.querySelectorAll('.custom-button');
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
      if (elements.buttonDropZone) {
        elements.customFileActions.insertBefore(btn, elements.buttonDropZone);
      } else {
        elements.customFileActions.appendChild(btn);
      }
    });
    
    console.log(`Rendered ${customButtons.length} custom buttons`);
  } catch (error) {
    console.error('Error rendering custom buttons:', error);
  }
}

// FIXED: Enhanced file selection with better validation
async function selectFile(path) {
  if (!path || typeof path !== 'string' || path.trim() === '') {
    console.error('selectFile: Invalid path provided:', path);
    setStatus('Error: Invalid file path');
    return;
  }
  
  // Avoid selecting the same file if already active
  if (path === activePath && elements.code.value !== '') {
    return;
  }
  
  try {
    setStatus(`Loading ${path}...`);
    const content = await api(`/file?path=${encodeURIComponent(path)}`);
    
    activePath = path;
    if (elements.code) {
      elements.code.value = content || '';
    }
    dirty = false;
    renderFileList();
    
    // Auto-detect language
    const autoLang = extToLang(path);
    if (autoLang && elements.language && !elements.language.value) {
      elements.language.value = autoLang;
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
  if (!activePath || !elements.code) {
    console.warn('Cannot save: no active file or code element');
    return;
  }
  
  try {
    setStatus('Saving...');
    await api('/file', { 
      method: 'PUT', 
      body: JSON.stringify({ 
        path: activePath, 
        content: elements.code.value || '' 
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

// FIXED: Modal functions with proper element checking
function showModal() {
  if (!elements.newFileModal || !elements.newFileNameInput) {
    console.error('New file modal elements not found');
    return;
  }
  elements.newFileModal.classList.add('show');
  elements.newFileNameInput.value = '';
  elements.newFileNameInput.focus();
}

function hideModal() {
  elements.newFileModal?.classList.remove('show');
}

function showRenameModal(filename) {
  if (!filename || typeof filename !== 'string') {
    console.error('Invalid filename for rename:', filename);
    return;
  }
  
  if (!elements.renameFileModal || !elements.renameFileNameInput || !elements.currentFilename) {
    console.error('Rename modal elements not found');
    return;
  }
  
  fileToRename = filename;
  elements.currentFilename.textContent = filename;
  elements.renameFileNameInput.value = filename;
  elements.renameFileModal.classList.add('show');
  elements.renameFileNameInput.focus();
}

function hideRenameModal() {
  elements.renameFileModal?.classList.remove('show');
  fileToRename = null;
}

function showDeleteModal(filename) {
  if (!elements.deleteFileModal || !elements.deleteFileName) {
    console.error('Delete modal elements not found');
    return;
  }
  elements.deleteFileName.textContent = filename;
  elements.deleteFileModal.classList.add('show');
}

function hideDeleteModal() {
  elements.deleteFileModal?.classList.remove('show');
}

function showSettings() {
  if (!elements.settingsPanel) {
    console.error('Settings panel not found');
    return;
  }
  elements.settingsPanel.classList.add('show');
  renderCustomButtonSettings();
  updateThemeInputs();
}

function hideSettings() {
  elements.settingsPanel?.classList.remove('show');
}

// FIXED: Enhanced theme management with immediate updates
function updateThemeInputs() {
  try {
    const theme = JSON.parse(localStorage.getItem('theme') || '{}');
    
    // Get current theme or default
    const currentThemeData = currentTheme && THEME_PRESETS[currentTheme] ? 
      { ...THEME_PRESETS[currentTheme], ...theme } : 
      { ...THEME_PRESETS.default, ...theme };
    
    // Update all inputs with current values
    Object.entries(currentThemeData).forEach(([key, value]) => {
      if (key === 'preset') return;
      const input = $(`#${key}`);
      if (input) {
        input.value = value;
      }
    });
    
    // Update range displays and add immediate event listeners
    const radiusSlider = $('#border-radius');
    const shadowSlider = $('#shadow-intensity');
    const opacitySlider = $('#terminal-opacity');
    
    if (radiusSlider) {
      const radiusValue = $('#radius-value');
      const updateRadius = () => {
        if (radiusValue) radiusValue.textContent = radiusSlider.value + 'px';
        updateThemeFromInputs();
      };
      if (radiusValue) radiusValue.textContent = radiusSlider.value + 'px';
      radiusSlider.oninput = updateRadius;
      radiusSlider.onchange = updateRadius;
    }
    
    if (shadowSlider) {
      const shadowValue = $('#shadow-value');
      const updateShadow = () => {
        if (shadowValue) shadowValue.textContent = shadowSlider.value;
        updateThemeFromInputs();
      };
      if (shadowValue) shadowValue.textContent = shadowSlider.value;
      shadowSlider.oninput = updateShadow;
      shadowSlider.onchange = updateShadow;
    }
    
    if (opacitySlider) {
      const opacityValue = $('#opacity-value');
      const updateOpacity = () => {
        if (opacityValue) opacityValue.textContent = Math.round(opacitySlider.value * 100) + '%';
        updateThemeFromInputs();
      };
      if (opacityValue) opacityValue.textContent = Math.round(opacitySlider.value * 100) + '%';
      opacitySlider.oninput = updateOpacity;
      opacitySlider.onchange = updateOpacity;
    }
    
    // Update preset selection
    $$('.theme-preset').forEach(preset => {
      preset.classList.toggle('active', preset.dataset.theme === currentTheme);
    });
    
    console.log('Theme inputs updated successfully');
  } catch (error) {
    console.error('Error updating theme inputs:', error);
  }
}

// FIXED: Immediate theme updates
function updateThemeFromInputs() {
  try {
    const theme = { preset: currentTheme };
    
    // Get all theme-related inputs
    const themeInputs = [
      'primary-color', 'accent-color', 'background-color', 'text-color', 
      'terminal-bg', 'terminal-text', 'border-radius', 'shadow-intensity', 'terminal-opacity'
    ];
    
    themeInputs.forEach(key => {
      const input = $(`#${key}`);
      if (input && input.value !== undefined) {
        theme[key] = input.value;
      }
    });
    
    // Apply theme immediately
    applyTheme(theme);
    saveTheme(theme);
    
    console.log('Theme updated from inputs');
  } catch (error) {
    console.error('Error updating theme:', error);
  }
}

// Enhanced custom button settings
function renderCustomButtonSettings() {
  if (!elements.customButtonsList) return;
  
  try {
    elements.customButtonsList.innerHTML = '';
    
    if (customButtons.length === 0) {
      elements.customButtonsList.innerHTML = '<p class="muted">No custom buttons added yet. Click "Add Custom Button" to create your first one!</p>';
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
      
      elements.customButtonsList.appendChild(item);
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
    if (!elements.editCustomButtonModal) {
      console.error('Edit modal not found');
      return;
    }
    
    editingButtonIndex = index;
    const button = customButtons[index];
    
    if (elements.editButtonName) elements.editButtonName.value = button.name || '';
    if (elements.editButtonCode) elements.editButtonCode.value = button.code || '';
    
    const iconSelect = $('#edit-button-icon');
    const colorSelect = $('#edit-button-color');
    if (iconSelect) iconSelect.value = button.icon || '';
    if (colorSelect) colorSelect.value = button.color || '';
    
    elements.editCustomButtonModal.classList.add('show');
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
  if (!elements.newFileNameInput) {
    console.error('New file input not found');
    return;
  }
  
  try {
    const name = elements.newFileNameInput.value.trim();
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
  if (!elements.renameFileNameInput || !fileToRename) {
    console.error('Rename inputs not found');
    hideRenameModal();
    return;
  }
  
  try {
    const newName = elements.renameFileNameInput.value.trim();
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
    if (elements.code) elements.code.value = '';
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
  if (!elements.customButtonName || !elements.customButtonCode) {
    console.error('Custom button modal inputs not found');
    return;
  }
  
  try {
    const name = elements.customButtonName.value.trim();
    const code = elements.customButtonCode.value.trim();
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
  if (editingButtonIndex === -1 || !elements.editButtonName || !elements.editButtonCode) {
    console.error('Edit button inputs not found');
    return;
  }
  
  try {
    const name = elements.editButtonName.value.trim();
    const code = elements.editButtonCode.value.trim();
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
  elements.customButtonModal?.classList.remove('show');
}

function hideEditButtonModal() {
  elements.editCustomButtonModal?.classList.remove('show');
  editingButtonIndex = -1;
}

function showCustomButtonModal() {
  if (!elements.customButtonModal) {
    console.error('Custom button modal not found');
    return;
  }
  
  elements.customButtonModal.classList.add('show');
  if (elements.customButtonName) elements.customButtonName.value = '';
  if (elements.customButtonCode) elements.customButtonCode.value = '';
  
  const iconSelect = $('#custom-button-icon');
  const colorSelect = $('#custom-button-color');
  if (iconSelect) iconSelect.value = '';
  if (colorSelect) colorSelect.value = '';
  
  if (elements.customButtonName) elements.customButtonName.focus();
}

// FIXED: Factory reset without API calls
function factoryReset() {
  try {
    console.log('🏭 Starting factory reset...');
    
    // Reset custom buttons
    customButtons = [];
    
    // Reset theme to default
    currentTheme = 'default';
    const defaultTheme = { preset: 'default', ...THEME_PRESETS.default };
    
    // Save to localStorage
    saveCustomButtons();
    saveTheme(defaultTheme);
    
    // Apply theme immediately
    applyTheme(defaultTheme);
    
    // Clear custom CSS
    const customStylesEl = $('#custom-styles');
    if (customStylesEl) customStylesEl.textContent = '';
    
    // Re-render UI components
    renderCustomButtons();
    renderCustomButtonSettings();
    updateThemeInputs();
    
    // Close modal
    hideFactoryResetModal();
    
    setStatus('🏭 Factory reset completed');
    println('🏭 Factory reset completed! All customizations restored to defaults.');
    
    console.log('✅ Factory reset completed successfully');
  } catch (error) {
    console.error('Error during factory reset:', error);
    alert('Error during factory reset');
    setStatus('Error during reset');
  }
}

function showFactoryResetModal() {
  elements.factoryResetModal?.classList.add('show');
}

function hideFactoryResetModal() {
  elements.factoryResetModal?.classList.remove('show');
}

// FIXED: Enhanced event listener setup with immediate theme updates
function setupEventListeners() {
  console.log('🔧 Setting up event listeners...');
  
  try {
    // Settings
    elements.settingsBtn?.addEventListener('click', showSettings);
    elements.backToEditorBtn?.addEventListener('click', hideSettings);
    
    // File actions
    elements.newFileBtn?.addEventListener('click', showModal);
    elements.deleteFileBtn?.addEventListener('click', () => {
      if (!activePath) {
        alert('No file selected to delete');
        return;
      }
      showDeleteModal(activePath);
    });

    // New file modal
    elements.modalCancel?.addEventListener('click', hideModal);
    elements.modalCreate?.addEventListener('click', createNewFile);

    elements.newFileNameInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        createNewFile();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        hideModal();
      }
    });

    // Rename file modal
    elements.renameCancel?.addEventListener('click', hideRenameModal);
    elements.renameConfirm?.addEventListener('click', renameFile);

    elements.renameFileNameInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        renameFile();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        hideRenameModal();
      }
    });

    // Delete file modal
    elements.deleteCancel?.addEventListener('click', hideDeleteModal);
    elements.deleteConfirm?.addEventListener('click', deleteFile);

    // Custom button modals
    elements.addCustomButtonBtn?.addEventListener('click', showCustomButtonModal);
    elements.customButtonCancel?.addEventListener('click', hideCustomButtonModal);
    elements.customButtonSave?.addEventListener('click', addCustomButton);
    elements.editButtonCancel?.addEventListener('click', hideEditButtonModal);
    elements.editButtonSave?.addEventListener('click', saveEditedButton);

    // Factory reset
    $('#factory-reset')?.addEventListener('click', showFactoryResetModal);
    elements.factoryResetCancel?.addEventListener('click', hideFactoryResetModal);
    elements.factoryResetConfirm?.addEventListener('click', factoryReset);

    // FIXED: Theme controls with immediate updates
    $('.theme-preset').forEach(preset => {
      preset.addEventListener('click', () => {
        currentTheme = preset.dataset.theme;
        const theme = { preset: currentTheme, ...THEME_PRESETS[currentTheme] };
        applyTheme(theme);
        saveTheme(theme);
        updateThemeInputs();
        
        // Update active state immediately
        $('.theme-preset').forEach(p => p.classList.remove('active'));
        preset.classList.add('active');
      });
    });

    // FIXED: Color inputs with immediate updates
    ['primary-color', 'accent-color', 'background-color', 'text-color', 
     'terminal-bg', 'terminal-text'].forEach(id => {
      const input = $(`#${id}`);
      if (input) {
        const updateTheme = () => updateThemeFromInputs();
        input.addEventListener('change', updateTheme);
        input.addEventListener('input', updateTheme); // For real-time updates
      }
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
    const modals = [
      elements.newFileModal, elements.renameFileModal, elements.deleteFileModal, 
      elements.customButtonModal, elements.editCustomButtonModal, elements.factoryResetModal
    ];
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
    elements.code?.addEventListener('input', () => { 
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

    // FIXED: Enhanced run button with better error handling
    elements.runBtn?.addEventListener('click', async (e) => {
      try {
        if ($('#particle-effects')?.checked) {
          createParticle(e.clientX, e.clientY);
        }
        
        if (!activePath) {
          alert('No file selected to run');
          return;
        }
        
        // Disable run button during execution
        elements.runBtn.disabled = true;
        elements.runBtn.textContent = 'Running...';
        
        // Save before running
        await saveActive();
        
        // Clear terminal
        if (elements.terminal) elements.terminal.textContent = '';
        setStatus('Running…');
        
        const language = elements.language?.value || extToLang(activePath) || '';
        const flags = elements.flags?.value || '';
        
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
      } finally {
        // Re-enable run button
        elements.runBtn.disabled = false;
        elements.runBtn.textContent = 'Run ▶';
      }
    });

    console.log('✅ Event listeners setup complete');
  } catch (error) {
    console.error('❌ Error setting up event listeners:', error);
  }
}

// FIXED: Enhanced initialization with proper DOM waiting
function initialize() {
  console.log('🚀 Initializing Enhanced CodeRunner...');
  
  try {
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
    if (elements.terminal) {
      elements.terminal.textContent = '';
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
      setStatus('Ready');
    }).catch(error => {
      console.error('❌ Failed to load files:', error);
      println(`❌ Failed to load files: ${error.message}`);
      setStatus('Error loading files');
    });
    
  } catch (error) {
    console.error('❌ Fatal initialization error:', error);
    if (elements.terminal) {
      elements.terminal.textContent = `❌ Initialization failed: ${error.message}\n\nPlease refresh the page.`;
    }
    if (elements.status) {
      elements.status.textContent = 'Initialization failed';
    }
  }
}

// FIXED: Enhanced DOM ready checking with multiple fallbacks
function waitForDOMAndInitialize() {
  if (document.readyState === 'loading') {
    // DOM is still loading
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    // DOM is already ready
    setTimeout(initialize, 100); // Small delay to ensure all elements are rendered
  }
  
  // Additional fallback - ensure we initialize even if DOMContentLoaded doesn't fire
  setTimeout(() => {
    if (!isInitialized) {
      console.warn('⚠️ Fallback initialization triggered');
      initialize();
    }
  }, 2000);
}

// Start the initialization process
waitForDOMAndInitialize();

// Export for debugging
window.debugCodeRunner = {
  elements, files, customButtons, currentTheme,
  loadFiles, renderFileList, renderCustomButtons,
  api, setStatus, println, initialize
};
