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

const memo = {
  settings: null,
  lastSettings: null
};

async function getSettings() {
  try {
    const result = await chrome.storage.sync.get('settings');
    const settings = { ...DEFAULT_SETTINGS, ...result.settings };
    memo.settings = settings;
    return settings;
  } catch (error) {
    console.error('获取设置失败:', error);
    return { ...DEFAULT_SETTINGS };
  }
}

async function saveSettings(settings) {
  try {
    memo.settings = settings;
    await chrome.storage.sync.set({ settings });
  } catch (error) {
    console.error('保存设置失败:', error);
  }
}

async function updateIcon(tabId, isDark) {
  try {
    const path = isDark ? {
      16: 'icons/icon16-dark.png',
      32: 'icons/icon32-dark.png',
      48: 'icons/icon48-dark.png',
      128: 'icons/icon128-dark.png'
    } : {
      16: 'icons/icon16.png',
      32: 'icons/icon32.png',
      48: 'icons/icon48.png',
      128: 'icons/icon128.png'
    };
    await chrome.action.setIcon({ tabId, path });
  } catch (error) {
    console.error('更新图标失败:', error);
  }
}

function shouldEnableDarkMode(url, settings) {
  try {
    const domain = new URL(url).hostname;
    
    if (settings.blacklist && settings.blacklist.includes(domain)) return false;
    if (settings.whitelist && settings.whitelist.includes(domain)) return true;
  } catch (error) {
    console.error('解析URL失败:', error);
  }
  
  return settings.isEnabled;
}

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await getSettings();
  await saveSettings(settings);
  
  if (chrome.runtime.setUninstallURL) {
    chrome.runtime.setUninstallURL('https://github.com/analysis1462/Browser-dark-mode-extension');
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'GET_SETTINGS':
      getSettings().then(sendResponse).catch(() => sendResponse({ ...DEFAULT_SETTINGS }));
      return true;
      
    case 'SAVE_SETTINGS':
      saveSettings(request.settings).then(() => sendResponse({ success: true })).catch(() => sendResponse({ success: false }));
      return true;
      
    case 'UPDATE_ICON':
      if (sender.tab && sender.tab.id) {
        updateIcon(sender.tab.id, request.isDark).catch(() => {});
      }
      sendResponse({ success: true });
      return true;
  }
});

async function handleTabUpdate(tab) {
  if (!tab || !tab.url) return;
  
  const settings = memo.settings || await getSettings();
  const shouldEnable = shouldEnableDarkMode(tab.url, settings);
  await updateIcon(tab.id, shouldEnable);
}

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await handleTabUpdate(tab);
  } catch (error) {
    console.error('处理标签激活失败:', error);
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  try {
    if (changeInfo.status === 'complete') {
      await handleTabUpdate(tab);
    }
  } catch (error) {
    console.error('处理标签更新失败:', error);
  }
});
