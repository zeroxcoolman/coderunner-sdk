// Enhanced CodeRunner Activity with full customization system
// Discord SDK initialization
let discordSdk;
(async () => {
  try {
    const mod = await import('@discord/embedded-app-sdk');
    discordSdk = new mod.DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID || '');
    await discordSdk.ready();
    
    // Get user info from Discord
    try {
      const { user } = await discordSdk.commands.authenticate({
        client_id: import.meta.env.VITE_DISCORD_CLIENT_ID,
        response_type: 'code',
        scope: ['identify']
      });
      updateUserDisplay(user);
    } catch (err) {
      console.log('Discord auth not available, using fallback');
      updateUserDisplay({ username: 'CodeRunner User', discriminator: '0001' });
    }
  } catch (e) {
    console.warn('Discord SDK not active (dev mode).');
    updateUserDisplay({ username: 'Dev User', discriminator: '0001' });
  }
})();

const $ = (sel) => document.querySelector(sel);

// Global state
let files = [];
let activePath = null;
let dirty = false;
let customButtons = [];
let settings = {
  primaryColor: '#111827',
  bgColor: '#ffffff',
  terminalBg: '#0b0b0b',
  fontSize: 13,
  sidebarWidth: 240,
  terminalHeight: 180
};

// DOM elements - initialized after DOM loads
let elements = {};

function initializeElements() {
  const elementIds = [
    'file-list', 'codearea', 'terminal', 'status', 'language', 'flags', 'run',
    'new-file-modal', 'new-file-name', 'modal-cancel', 'modal-create',
    'rename-file-modal', 'rename-file-name', 'rename-cancel', 'rename-confirm', 'current-filename',
    'delete-file-modal', 'delete-file-name', 'delete-cancel', 'delete-confirm',
    'settings-page', 'user-avatar', 'user-name', 'settings-btn', 'back-to-workspace',
    'custom-button-modal', 'button-text', 'button-action', 'button-color', 'button-cancel', 'button-create',
    'primary-color', 'bg-color', 'terminal-bg', 'font-size', 'font-size-value',
    'sidebar-width', 'sidebar-width-value', 'terminal-height', 'terminal-height-value',
    'buttons-preview', 'add-custom-button', 'html-editor', 'apply-html', 'reset-html',
    'restore-defaults', 'export-settings', 'import-settings', 'settings-file'
  ];
  
  elementIds.forEach(id => {
    elements[id] = $(`#${id}`);
  });
}

// User display functions
// User display functions
function updateUserDisplay(user) {
  if (elements['user-name']) {
    elements['user-name'].textContent = user.global_name || user.username || 'User';
  }
  if (elements['user-avatar']) {
    const initials = (user.global_name || user.username || 'U').charAt(0).toUpperCase();
    elements['user-avatar'].textContent = initials;
    
    // If user has avatar, use it
    if (user.avatar) {
      const avatarUrl = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=32`;
      elements['user-avatar'].style.backgroundImage = `url(${avatarUrl})`;
      elements['user-avatar'].style.backgroundSize = 'cover';
      elements['user-avatar'].textContent = '';
    }
  }
}

// Language detection
const extToLang = (p) => {
  if (!p) return '';
  const ext = p.split('.').pop();
  const langMap = {
    'js': 'javascript', 'mjs': 'javascript', 'cjs': 'javascript',
    'py': 'python', 'sh': 'bash', 'bash': 'bash', 'c': 'c',
    'cpp': 'cpp', 'cc': 'cpp', 'cxx': 'cpp', 'rs': 'rust',
    'go': 'go', 'php': 'php', 'lua': 'lua', 'rb': 'ruby'
  };
  return langMap[ext] || '';
};

// Utility functions
function setStatus(msg) {
  if (elements.status) elements.status.textContent = msg;
}

function println(s = '') {
  if (elements.terminal) {
    elements.terminal.textContent += s + '\n';
    elements.terminal.scrollTop = elements.terminal.scrollHeight;
  }
}

// API calls
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

// File management
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
  if (!elements['file-list']) return;
  
  elements['file-list'].innerHTML = '';
  
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
    elements['file-list'].appendChild(el);
  });
}

async function selectFile(path) {
  try {
    const content = await api(`/file?path=${encodeURIComponent(path)}`);
    activePath = path;
    if (elements.codearea) elements.codearea.value = content || '';
    dirty = false;
    renderFileList();
    
    const autoLang = extToLang(path);
    if (autoLang && elements.language && !elements.language.value) {
      elements.language.value = autoLang;
    }
    
    setStatus(`Loaded ${path}`);
  } catch (err) {
    console.error('Error selecting file:', err);
    setStatus('Error loading file');
    println(`Error loading file: ${err.message}`);
  }
}

async function saveActive() {
  if (!activePath || !elements.codearea) return;
  
  try {
    await api('/file', { 
      method: 'PUT', 
      body: JSON.stringify({ 
        path: activePath, 
        content: elements.codearea.value || '' 
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
function showModal(modalId) {
  const modal = elements[modalId];
  if (modal) modal.classList.add('show');
}

function hideModal(modalId) {
  const modal = elements[modalId];
  if (modal) modal.classList.remove('show');
}

function hideAllModals() {
  ['new-file-modal', 'rename-file-modal', 'delete-file-modal', 'custom-button-modal'].forEach(hideModal);
}

// File operations
async function createNewFile() {
  try {
    if (!elements['new-file-name']) return;
    
    const name = elements['new-file-name'].value.trim();
    if (!name) {
      alert('Please enter a filename');
      return;
    }
    
    if (files.some(f => f.path === name)) {
      alert('File already exists!');
      return;
    }
    
    hideModal('new-file-modal');
    setStatus('Creating file...');
    
    await api('/file', { 
      method: 'POST', 
      body: JSON.stringify({ path: name, content: '' })
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
    if (!elements['rename-file-name'] || !activePath) return;
    
    const newName = elements['rename-file-name'].value.trim();
    if (!newName) {
      alert('Please enter a new filename');
      return;
    }
    
    if (files.some(f => f.path === newName)) {
      alert('A file with that name already exists!');
      return;
    }
    
    hideModal('rename-file-modal');
    setStatus('Renaming file...');
    
    // Get current content
    const content = elements.codearea ? elements.codearea.value : '';
    
    // Create new file with new name
    await api('/file', { 
      method: 'POST', 
      body: JSON.stringify({ path: newName, content })
    });
    
    // Delete old file
    await api(`/file?path=${encodeURIComponent(activePath)}`, { 
      method: 'DELETE' 
    });
    
    const oldName = activePath;
    activePath = newName;
    await loadFiles();
    await selectFile(newName);
    setStatus(`Renamed ${oldName} to ${newName}`);
  } catch (err) {
    console.error('Error renaming file:', err);
    alert(`Error renaming file: ${err.message}`);
    setStatus('Error renaming file');
  }
}

async function deleteFile() {
  try {
    if (!activePath) return;
    
    hideModal('delete-file-modal');
    setStatus('Deleting file...');
    
    await api(`/file?path=${encodeURIComponent(activePath)}`, { 
      method: 'DELETE' 
    });
    
    const deletedFile = activePath;
    activePath = null;
    if (elements.codearea) elements.codearea.value = '';
    await loadFiles();
    setStatus(`Deleted ${deletedFile}`);
  } catch (err) {
    console.error('Error deleting file:', err);
    alert(`Error deleting file: ${err.message}`);
    setStatus('Error deleting file');
  }
}

// Settings system
function showSettings() {
  if (elements['settings-page']) {
    elements['settings-page'].classList.add('show');
    loadCurrentHtml();
  }
}

function hideSettings() {
  if (elements['settings-page']) {
    elements['settings-page'].classList.remove('show');
  }
}

function switchSettingsSection(sectionName) {
  // Hide all sections
  document.querySelectorAll('.setting-section').forEach(section => {
    section.style.display = 'none';
  });
  
  // Show selected section
  const section = $(`#${sectionName}-section`);
  if (section) section.style.display = 'block';
  
  // Update navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  document.querySelector(`[data-section="${sectionName}"]`)?.classList.add('active');
}

function applySettings() {
  const root = document.documentElement;
  
  // Apply colors
  if (elements['primary-color']) {
    settings.primaryColor = elements['primary-color'].value;
    root.style.setProperty('--primary-color', settings.primaryColor);
    
    // Update primary buttons
    document.querySelectorAll('.primary').forEach(btn => {
      btn.style.backgroundColor = settings.primaryColor;
      btn.style.borderColor = settings.primaryColor;
    });
  }
  
  if (elements['bg-color']) {
    settings.bgColor = elements['bg-color'].value;
    document.body.style.backgroundColor = settings.bgColor;
  }
  
  if (elements['terminal-bg']) {
    settings.terminalBg = elements['terminal-bg'].value;
    if (elements.terminal) {
      elements.terminal.style.backgroundColor = settings.terminalBg;
    }
  }
  
  // Apply typography
  if (elements['font-size']) {
    settings.fontSize = parseInt(elements['font-size'].value);
    if (elements.codearea) {
      elements.codearea.style.fontSize = `${settings.fontSize}px`;
    }
    if (elements['font-size-value']) {
      elements['font-size-value'].textContent = `${settings.fontSize}px`;
    }
  }
  
  // Apply layout
  if (elements['sidebar-width']) {
    settings.sidebarWidth = parseInt(elements['sidebar-width'].value);
    const content = $('.content');
    if (content) {
      content.style.gridTemplateColumns = `${settings.sidebarWidth}px 1fr`;
    }
    if (elements['sidebar-width-value']) {
      elements['sidebar-width-value'].textContent = `${settings.sidebarWidth}px`;
    }
  }
  
  if (elements['terminal-height']) {
    settings.terminalHeight = parseInt(elements['terminal-height'].value);
    const editorWrap = $('.editor-wrap');
    if (editorWrap) {
      editorWrap.style.gridTemplateRows = `1fr ${settings.terminalHeight}px`;
    }
    if (elements['terminal-height-value']) {
      elements['terminal-height-value'].textContent = `${settings.terminalHeight}px`;
    }
  }
  
  // Save to localStorage
  localStorage.setItem('coderunner-settings', JSON.stringify(settings));
  localStorage.setItem('coderunner-buttons', JSON.stringify(customButtons));
}

function loadSettings() {
  try {
    const saved = localStorage.getItem('coderunner-settings');
    if (saved) {
      settings = { ...settings, ...JSON.parse(saved) };
    }
    
    const savedButtons = localStorage.getItem('coderunner-buttons');
    if (savedButtons) {
      customButtons = JSON.parse(savedButtons);
    }
    
    // Apply loaded settings
    setTimeout(() => {
      if (elements['primary-color']) elements['primary-color'].value = settings.primaryColor;
      if (elements['bg-color']) elements['bg-color'].value = settings.bgColor;
      if (elements['terminal-bg']) elements['terminal-bg'].value = settings.terminalBg;
      if (elements['font-size']) elements['font-size'].value = settings.fontSize;
      if (elements['sidebar-width']) elements['sidebar-width'].value = settings.sidebarWidth;
      if (elements['terminal-height']) elements['terminal-height'].value = settings.terminalHeight;
      
      applySettings();
      renderCustomButtons();
    }, 100);
  } catch (err) {
    console.error('Error loading settings:', err);
  }
}

function restoreDefaults() {
  if (confirm('This will reset all customizations. Are you sure?')) {
    localStorage.removeItem('coderunner-settings');
    localStorage.removeItem('coderunner-buttons');
    customButtons = [];
    settings = {
      primaryColor: '#111827',
      bgColor: '#ffffff',
      terminalBg: '#0b0b0b',
      fontSize: 13,
      sidebarWidth: 240,
      terminalHeight: 180
    };
    location.reload();
  }
}

// Custom buttons system
function createCustomButton() {
  try {
    const text = elements['button-text']?.value.trim();
    const action = elements['button-action']?.value.trim();
    const color = elements['button-color']?.value;
    
    if (!text || !action) {
      alert('Please fill in both text and action fields');
      return;
    }
    
    const button = {
      id: Date.now(),
      text,
      action,
      color
    };
    
    customButtons.push(button);
    hideModal('custom-button-modal');
    renderCustomButtons();
    applySettings(); // Save to localStorage
    
    // Clear form
    if (elements['button-text']) elements['button-text'].value = '';
    if (elements['button-action']) elements['button-action'].value = '';
    if (elements['button-color']) elements['button-color'].value = '#3b82f6';
  } catch (err) {
    console.error('Error creating button:', err);
    alert('Error creating button');
  }
}

function deleteCustomButton(id) {
  customButtons = customButtons.filter(btn => btn.id !== id);
  renderCustomButtons();
  applySettings();
}

function renderCustomButtons() {
  const preview = elements['buttons-preview'];
  if (!preview) return;
  
  if (customButtons.length === 0) {
    preview.innerHTML = '<p>Custom buttons will appear here. Click "Add Button" to create your first one!</p>';
    return;
  }
  
  preview.innerHTML = '';
  customButtons.forEach(btn => {
    const buttonEl = document.createElement('div');
    buttonEl.className = 'custom-button';
    buttonEl.style.backgroundColor = btn.color;
    buttonEl.style.color = 'white';
    buttonEl.innerHTML = `
      ${btn.text}
      <button class="delete-btn" onclick="deleteCustomButton(${btn.id})">×</button>
    `;
    
    buttonEl.addEventListener('click', (e) => {
      if (e.target.classList.contains('delete-btn')) return;
      buttonEl.classList.toggle('selected');
    });
    
    preview.appendChild(buttonEl);
  });
  
  // Add buttons to the main interface
  addCustomButtonsToInterface();
}

function addCustomButtonsToInterface() {
  // Remove existing custom buttons
  document.querySelectorAll('.custom-interface-btn').forEach(btn => btn.remove());
  
  // Add new custom buttons to the files-actions area
  const filesActions = $('.files-actions');
  if (!filesActions) return;
  
  customButtons.forEach(btn => {
    const buttonEl = document.createElement('button');
    buttonEl.className = 'custom-interface-btn';
    buttonEl.textContent = btn.text;
    buttonEl.style.backgroundColor = btn.color;
    buttonEl.style.color = 'white';
    buttonEl.style.borderColor = btn.color;
    
    buttonEl.addEventListener('click', () => {
      try {
        // Create a safe execution context
        const func = new Function('elements', 'api', 'setStatus', 'println', 'files', 'activePath', btn.action);
        func(elements, api, setStatus, println, files, activePath);
      } catch (err) {
        console.error('Custom button error:', err);
        alert(`Button error: ${err.message}`);
      }
    });
    
    filesActions.appendChild(buttonEl);
  });
}

// HTML Editor functions
function loadCurrentHtml() {
  if (elements['html-editor']) {
    // Get current HTML structure (simplified)
    const appHtml = $('#app')?.outerHTML || '';
    elements['html-editor'].value = appHtml;
  }
}

function applyHtmlChanges() {
  try {
    const newHtml = elements['html-editor']?.value;
    if (!newHtml) return;
    
    if (confirm('This will replace the current interface. Continue?')) {
      // This is a simplified version - in a real app you'd want more safety checks
      const app = $('#app');
      if (app) {
        app.outerHTML = newHtml;
        // Reinitialize after HTML changes
        setTimeout(() => {
          initializeElements();
          setupEventListeners();
        }, 100);
      }
    }
  } catch (err) {
    console.error('Error applying HTML changes:', err);
    alert('Error applying HTML changes. Please check your HTML syntax.');
  }
}

function resetHtml() {
  if (confirm('Reset HTML to default?')) {
    location.reload();
  }
}

// Export/Import functions
function exportSettings() {
  const data = {
    settings,
    customButtons,
    timestamp: new Date().toISOString()
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'coderunner-settings.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importSettings() {
  elements['settings-file']?.click();
}

function handleImportFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      
      if (data.settings) settings = { ...settings, ...data.settings };
      if (data.customButtons) customButtons = data.customButtons;
      
      applySettings();
      renderCustomButtons();
      alert('Settings imported successfully!');
    } catch (err) {
      console.error('Import error:', err);
      alert('Error importing settings. Please check the file format.');
    }
  };
  reader.readAsText(file);
}

// Code execution
async function runCode() {
  if (!activePath) {
    alert('No file selected to run');
    return;
  }
  
  try {
    await saveActive();
    
    if (elements.terminal) elements.terminal.textContent = '';
    setStatus('Running…');
    
    const language = elements.language?.value || extToLang(activePath);
    const flags = elements.flags?.value || '';
    
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
}
