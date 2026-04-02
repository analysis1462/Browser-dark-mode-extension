let currentSettings = null;
let darkModeRoot = null;
let mediaStyleEl = null;

function createDarkModeRoot() {
  if (darkModeRoot) return darkModeRoot;
  
  darkModeRoot = document.createElement('div');
  darkModeRoot.id = 'dark-mode-extension-root';
  darkModeRoot.style.cssText = `
    all: initial !important;
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    pointer-events: none !important;
    z-index: 2147483647 !important;
  `;
  
  document.documentElement.appendChild(darkModeRoot);
  return darkModeRoot;
}

function applyFilterMode(settings) {
  const invertValue = settings.invert / 100;
  const brightnessValue = settings.brightness / 100;
  const contrastValue = settings.contrast / 100;
  const sepiaValue = settings.sepia / 100;
  const grayscaleValue = settings.grayscale / 100;
  
  document.documentElement.style.filter = `
    invert(${invertValue}) 
    hue-rotate(180deg) 
    brightness(${brightnessValue}) 
    contrast(${contrastValue}) 
    sepia(${sepiaValue}) 
    grayscale(${grayscaleValue})
  `;
  
  if (!mediaStyleEl) {
    mediaStyleEl = document.createElement('style');
    mediaStyleEl.id = 'dark-mode-media-style';
    document.head.appendChild(mediaStyleEl);
  }
  
  mediaStyleEl.textContent = `
    img, video, svg, canvas, iframe, [style*="background-image"], picture {
      filter: invert(1) hue-rotate(180deg) !important;
    }
    ::selection {
      background: rgba(127, 127, 255, 0.3) !important;
      color: #eaeaea !important;
    }
  `;
}

function removeDarkMode() {
  document.documentElement.style.filter = '';
  
  if (mediaStyleEl) {
    mediaStyleEl.remove();
    mediaStyleEl = null;
  }
  
  if (darkModeRoot) {
    darkModeRoot.remove();
    darkModeRoot = null;
  }
}

function shouldEnableDarkMode(settings) {
  const domain = window.location.hostname;
  
  if (settings.blacklist && settings.blacklist.includes(domain)) return false;
  if (settings.whitelist && settings.whitelist.includes(domain)) return true;
  
  if (!settings.isEnabled) return false;
  
  if (settings.useSystemTheme) {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  
  return true;
}

async function applySettings(settings) {
  currentSettings = settings;
  
  removeDarkMode();
  
  if (shouldEnableDarkMode(settings)) {
    applyFilterMode(settings);
    
    chrome.runtime.sendMessage({
      type: 'UPDATE_ICON',
      isDark: true
    }).catch(() => {});
  } else {
    chrome.runtime.sendMessage({
      type: 'UPDATE_ICON',
      isDark: false
    }).catch(() => {});
  }
}

async function init() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    if (response) {
      await applySettings(response);
    }
  } catch (error) {
    console.error('初始化失败:', error);
  }
}

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  switch (request.type) {
    case 'TOGGLE_DARK_MODE':
    case 'UPDATE_SETTINGS':
      try {
        await applySettings(request.settings);
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
      break;
  }
  return true;
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

const systemThemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
if (systemThemeMediaQuery && systemThemeMediaQuery.addEventListener) {
  systemThemeMediaQuery.addEventListener('change', async () => {
    if (currentSettings && currentSettings.useSystemTheme) {
      await applySettings(currentSettings);
    }
  });
}
