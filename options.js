const DEFAULT_SETTINGS = {
  isEnabled: false,
  darkModeType: 'filter',
  brightness: 90,
  contrast: 100,
  sepia: 0,
  grayscale: 0,
  invert: 100,
  whitelist: [],
  blacklist: [],
  autoDetect: true,
  useSystemTheme: false
};

let settings = null;

async function init() {
  try {
    settings = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    if (!settings) {
      settings = { ...DEFAULT_SETTINGS };
    }
    
    setupTabs();
    loadSettings();
    setupEventListeners();
  } catch (error) {
    console.error('初始化设置页面失败:', error);
    showNotification('初始化失败，请刷新页面重试');
  }
}

function setupTabs() {
  const tabs = document.querySelectorAll('.nav-tab');
  const contents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.dataset.tab;
      
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      
      tab.classList.add('active');
      const content = document.getElementById(tabId);
      if (content) content.classList.add('active');
    });
  });
}

function loadSettings() {
  document.getElementById('autoEnable').checked = settings.isEnabled;
  document.getElementById('useSystemTheme').checked = settings.useSystemTheme;
  
  document.getElementById('defaultBrightness').value = settings.brightness;
  document.getElementById('defaultBrightnessValue').textContent = `${settings.brightness}%`;
  
  document.getElementById('defaultContrast').value = settings.contrast;
  document.getElementById('defaultContrastValue').textContent = `${settings.contrast}%`;
  
  document.getElementById('defaultGrayscale').value = settings.grayscale;
  document.getElementById('defaultGrayscaleValue').textContent = `${settings.grayscale}%`;
  
  document.getElementById('defaultSepia').value = settings.sepia;
  document.getElementById('defaultSepiaValue').textContent = `${settings.sepia}%`;
  
  renderSiteList('whitelist', settings.whitelist);
  renderSiteList('blacklist', settings.blacklist);
}

function renderSiteList(listId, sites) {
  const list = document.getElementById(listId);
  if (!list) return;
  
  list.innerHTML = '';
  
  sites.forEach((site, index) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="site-domain">${escapeHtml(site)}</span>
      <button class="remove-btn" data-list="${listId}" data-index="${index}">移除</button>
    `;
    list.appendChild(li);
  });
  
  list.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const listType = btn.dataset.list;
      const index = parseInt(btn.dataset.index, 10);
      if (settings[listType]) {
        settings[listType].splice(index, 1);
        renderSiteList(listType, settings[listType]);
      }
    });
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function setupEventListeners() {
  document.getElementById('defaultBrightness').addEventListener('input', (e) => {
    document.getElementById('defaultBrightnessValue').textContent = `${e.target.value}%`;
  });
  
  document.getElementById('defaultContrast').addEventListener('input', (e) => {
    document.getElementById('defaultContrastValue').textContent = `${e.target.value}%`;
  });
  
  document.getElementById('defaultGrayscale').addEventListener('input', (e) => {
    document.getElementById('defaultGrayscaleValue').textContent = `${e.target.value}%`;
  });
  
  document.getElementById('defaultSepia').addEventListener('input', (e) => {
    document.getElementById('defaultSepiaValue').textContent = `${e.target.value}%`;
  });
  
  document.getElementById('addWhitelist').addEventListener('click', () => {
    const input = document.getElementById('whitelistInput');
    if (!input) return;
    
    const domain = input.value.trim().toLowerCase();
    if (domain && settings.whitelist && !settings.whitelist.includes(domain)) {
      settings.whitelist.push(domain);
      settings.blacklist = settings.blacklist.filter(d => d !== domain);
      renderSiteList('whitelist', settings.whitelist);
      renderSiteList('blacklist', settings.blacklist);
      input.value = '';
    }
  });
  
  document.getElementById('addBlacklist').addEventListener('click', () => {
    const input = document.getElementById('blacklistInput');
    if (!input) return;
    
    const domain = input.value.trim().toLowerCase();
    if (domain && settings.blacklist && !settings.blacklist.includes(domain)) {
      settings.blacklist.push(domain);
      settings.whitelist = settings.whitelist.filter(d => d !== domain);
      renderSiteList('blacklist', settings.blacklist);
      renderSiteList('whitelist', settings.whitelist);
      input.value = '';
    }
  });
  
  document.getElementById('saveSettings').addEventListener('click', async () => {
    collectSettings();
    await chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', settings });
    showNotification('设置已保存！');
  });
  
  document.getElementById('resetSettings').addEventListener('click', async () => {
    if (confirm('确定要恢复所有默认设置吗？')) {
      settings = { ...DEFAULT_SETTINGS };
      loadSettings();
      await chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', settings });
      showNotification('已恢复默认设置！');
    }
  });
}

function collectSettings() {
  settings.isEnabled = document.getElementById('autoEnable').checked;
  settings.useSystemTheme = document.getElementById('useSystemTheme').checked;
  
  settings.brightness = parseInt(document.getElementById('defaultBrightness').value, 10);
  settings.contrast = parseInt(document.getElementById('defaultContrast').value, 10);
  settings.grayscale = parseInt(document.getElementById('defaultGrayscale').value, 10);
  settings.sepia = parseInt(document.getElementById('defaultSepia').value, 10);
}

function showNotification(message) {
  const existing = document.querySelector('.custom-notification');
  if (existing) existing.remove();
  
  const notification = document.createElement('div');
  notification.className = 'custom-notification';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 16px 24px;
    background: linear-gradient(135deg, #5a8a6a 0%, #4a7a5a 100%);
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    font-weight: 500;
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;
  notification.textContent = message;
  
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

document.addEventListener('DOMContentLoaded', init);
