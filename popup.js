let settings = null;
let currentTab = null;

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

let notificationTimeout = null;
let currentDomain = null;

function updateSiteStatus() {
  const siteStatus = document.getElementById('siteStatus');
  if (!siteStatus || !currentDomain) {
    if (siteStatus) siteStatus.style.display = 'none';
    return;
  }
  
  if (settings.whitelist && settings.whitelist.includes(currentDomain)) {
    siteStatus.textContent = '✓ 白名单 - 始终启用';
    siteStatus.className = 'site-status whitelist';
    siteStatus.style.display = 'block';
  } else if (settings.blacklist && settings.blacklist.includes(currentDomain)) {
    siteStatus.textContent = '✕ 黑名单 - 从不启用';
    siteStatus.className = 'site-status blacklist';
    siteStatus.style.display = 'block';
  } else {
    siteStatus.style.display = 'none';
  }
}

function showNotification(message, type = 'success') {
  const notification = document.getElementById('notification');
  if (!notification) return;
  
  if (notificationTimeout) {
    clearTimeout(notificationTimeout);
  }
  
  notification.textContent = message;
  notification.className = `notification ${type}`;
  notification.style.display = 'block';
  
  notificationTimeout = setTimeout(() => {
    notification.style.display = 'none';
  }, 2500);
}

async function init() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;
    
    const currentSiteEl = document.getElementById('currentSite');
    if (currentTab && currentTab.url) {
      if (currentTab.url.startsWith('http')) {
        currentDomain = new URL(currentTab.url).hostname;
        if (currentSiteEl) currentSiteEl.textContent = currentDomain;
      } else {
        if (currentSiteEl) currentSiteEl.textContent = '不适用（非网页）';
        currentDomain = null;
      }
    }
    
    settings = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    if (!settings) {
      settings = { ...DEFAULT_SETTINGS };
    }
    updateUI();
    setupEventListeners();
  } catch (error) {
    console.error('初始化失败:', error);
    const currentSiteEl = document.getElementById('currentSite');
    if (currentSiteEl) currentSiteEl.textContent = '初始化错误';
    currentDomain = null;
  }
}

function updateUI() {
  const enableToggle = document.getElementById('enableToggle');
  if (enableToggle) enableToggle.checked = settings.isEnabled;
  
  const brightnessEl = document.getElementById('brightness');
  const brightnessValueEl = document.getElementById('brightnessValue');
  if (brightnessEl) brightnessEl.value = settings.brightness;
  if (brightnessValueEl) brightnessValueEl.textContent = `${settings.brightness}%`;
  
  const contrastEl = document.getElementById('contrast');
  const contrastValueEl = document.getElementById('contrastValue');
  if (contrastEl) contrastEl.value = settings.contrast;
  if (contrastValueEl) contrastValueEl.textContent = `${settings.contrast}%`;
  
  const invertEl = document.getElementById('invert');
  const invertValueEl = document.getElementById('invertValue');
  if (invertEl) invertEl.value = settings.invert;
  if (invertValueEl) invertValueEl.textContent = `${settings.invert}%`;
  
  updateSiteStatus();
}

async function saveAndApply() {
  await chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', settings });
  
  if (currentTab && currentTab.id) {
    chrome.tabs.sendMessage(currentTab.id, { type: 'UPDATE_SETTINGS', settings }).catch(() => {});
  }
}

function setupEventListeners() {
  const enableToggle = document.getElementById('enableToggle');
  if (enableToggle) {
    enableToggle.addEventListener('change', async (e) => {
      settings.isEnabled = e.target.checked;
      await saveAndApply();
    });
  }
  
  const brightnessEl = document.getElementById('brightness');
  if (brightnessEl) {
    brightnessEl.addEventListener('input', (e) => {
      settings.brightness = parseInt(e.target.value, 10);
      const brightnessValueEl = document.getElementById('brightnessValue');
      if (brightnessValueEl) brightnessValueEl.textContent = `${settings.brightness}%`;
    });
    brightnessEl.addEventListener('change', saveAndApply);
  }
  
  const contrastEl = document.getElementById('contrast');
  if (contrastEl) {
    contrastEl.addEventListener('input', (e) => {
      settings.contrast = parseInt(e.target.value, 10);
      const contrastValueEl = document.getElementById('contrastValue');
      if (contrastValueEl) contrastValueEl.textContent = `${settings.contrast}%`;
    });
    contrastEl.addEventListener('change', saveAndApply);
  }
  
  const invertEl = document.getElementById('invert');
  if (invertEl) {
    invertEl.addEventListener('input', (e) => {
      settings.invert = parseInt(e.target.value, 10);
      const invertValueEl = document.getElementById('invertValue');
      if (invertValueEl) invertValueEl.textContent = `${settings.invert}%`;
    });
    invertEl.addEventListener('change', saveAndApply);
  }
  
  const addToWhitelist = document.getElementById('addToWhitelist');
  if (addToWhitelist) {
    addToWhitelist.addEventListener('click', async () => {
      if (!currentTab || !currentTab.url) return;
      
      const domain = new URL(currentTab.url).hostname;
      if (!settings.whitelist.includes(domain)) {
        settings.whitelist.push(domain);
        settings.blacklist = settings.blacklist.filter(d => d !== domain);
        await saveAndApply();
        updateSiteStatus();
        showNotification(`${domain} 已添加到白名单，将始终启用暗色模式`);
      } else {
        showNotification(`${domain} 已经在白名单中`, 'error');
      }
    });
  }
  
  const addToBlacklist = document.getElementById('addToBlacklist');
  if (addToBlacklist) {
    addToBlacklist.addEventListener('click', async () => {
      if (!currentTab || !currentTab.url) return;
      
      const domain = new URL(currentTab.url).hostname;
      if (!settings.blacklist.includes(domain)) {
        settings.blacklist.push(domain);
        settings.whitelist = settings.whitelist.filter(d => d !== domain);
        await saveAndApply();
        updateSiteStatus();
        showNotification(`${domain} 已添加到黑名单，将从不启用暗色模式`);
      } else {
        showNotification(`${domain} 已经在黑名单中`, 'error');
      }
    });
  }
  
  const openSettings = document.getElementById('openSettings');
  if (openSettings) {
    openSettings.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }
}

document.addEventListener('DOMContentLoaded', init);
