// Popup script for Chrome extension
console.log('Popup loaded');

// DOM elements
const loadingView = document.getElementById('loading-view');
const mainView = document.getElementById('main-view');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const connectBtn = document.getElementById('connect-btn');
const refreshBtn = document.getElementById('refresh-btn');
const disconnectBtn = document.getElementById('disconnect-btn');
const meetingsScheduled = document.getElementById('meetings-scheduled');
const pendingRequests = document.getElementById('pending-requests');
const autoDetectToggle = document.getElementById('auto-detect-toggle');
const notificationsToggle = document.getElementById('notifications-toggle');

// Initialize popup
async function init() {
  console.log('Initializing popup...');

  // Load settings
  await loadSettings();

  // Check authentication status
  await checkAuthStatus();

  // Load statistics
  await loadStats();

  // Set up event listeners
  setupEventListeners();
}

// Load user settings
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(['autoDetect', 'showNotifications']);

    if (result.autoDetect !== undefined) {
      autoDetectToggle.checked = result.autoDetect;
    }

    if (result.showNotifications !== undefined) {
      notificationsToggle.checked = result.showNotifications;
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

// Check authentication status
async function checkAuthStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'checkAuth' });

    if (response?.authenticated) {
      updateUIState('connected');
    } else {
      updateUIState('disconnected');
    }
  } catch (error) {
    console.error('Error checking auth:', error);
    updateUIState('error');
  }
}

// Update UI based on connection state
function updateUIState(state) {
  switch (state) {
    case 'connected':
      statusDot.className = 'status-dot connected';
      statusText.textContent = 'Connected';
      connectBtn.style.display = 'none';
      refreshBtn.style.display = 'block';
      disconnectBtn.style.display = 'block';
      break;

    case 'disconnected':
      statusDot.className = 'status-dot disconnected';
      statusText.textContent = 'Disconnected';
      connectBtn.style.display = 'block';
      refreshBtn.style.display = 'none';
      disconnectBtn.style.display = 'none';
      break;

    case 'connecting':
      statusDot.className = 'status-dot';
      statusText.textContent = 'Connecting...';
      connectBtn.disabled = true;
      break;

    case 'error':
      statusDot.className = 'status-dot disconnected';
      statusText.textContent = 'Error';
      connectBtn.style.display = 'block';
      refreshBtn.style.display = 'none';
      disconnectBtn.style.display = 'none';
      break;
  }
}

// Load statistics
async function loadStats() {
  try {
    const result = await chrome.storage.local.get(['stats']);

    if (result.stats) {
      meetingsScheduled.textContent = result.stats.scheduled || 0;
      pendingRequests.textContent = result.stats.pending || 0;
    }
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// Set up event listeners
function setupEventListeners() {
  // Connect button
  connectBtn.addEventListener('click', async () => {
    updateUIState('connecting');

    try {
      const response = await chrome.runtime.sendMessage({ type: 'authenticate' });

      if (response?.success) {
        updateUIState('connected');
        showNotification('Successfully connected to Google!', 'success');
      } else {
        updateUIState('disconnected');
        showNotification('Failed to connect. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Connection error:', error);
      updateUIState('disconnected');
      showNotification('An error occurred. Please try again.', 'error');
    }
  });

  // Refresh button
  refreshBtn.addEventListener('click', async () => {
    refreshBtn.disabled = true;
    refreshBtn.textContent = 'Refreshing...';

    try {
      // Force re-check authentication and reload stats
      await checkAuthStatus();
      await loadStats();

      showNotification('Calendar refreshed!', 'success');
    } catch (error) {
      console.error('Refresh error:', error);
      showNotification('Failed to refresh. Please try again.', 'error');
    } finally {
      refreshBtn.disabled = false;
      refreshBtn.textContent = 'Refresh Calendar';
    }
  });

  // Disconnect button
  disconnectBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to disconnect your Google account?')) {
      try {
        // Clear auth token
        await chrome.storage.local.remove(['authToken', 'userEmail']);

        // Revoke token
        chrome.identity.clearAllCachedAuthTokens(() => {
          console.log('Auth tokens cleared');
        });

        updateUIState('disconnected');
        showNotification('Disconnected successfully', 'success');
      } catch (error) {
        console.error('Disconnect error:', error);
        showNotification('Failed to disconnect', 'error');
      }
    }
  });

  // Auto-detect toggle
  autoDetectToggle.addEventListener('change', async () => {
    try {
      await chrome.storage.local.set({ autoDetect: autoDetectToggle.checked });
      showNotification(
        autoDetectToggle.checked ? 'Auto-detect enabled' : 'Auto-detect disabled',
        'success'
      );
    } catch (error) {
      console.error('Settings error:', error);
    }
  });

  // Notifications toggle
  notificationsToggle.addEventListener('change', async () => {
    try {
      await chrome.storage.local.set({ showNotifications: notificationsToggle.checked });
      showNotification(
        notificationsToggle.checked ? 'Notifications enabled' : 'Notifications disabled',
        'success'
      );
    } catch (error) {
      console.error('Settings error:', error);
    }
  });

  // Help link
  document.getElementById('help-link').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://github.com/yourusername/meeting-scheduler#help' });
  });

  // Privacy link
  document.getElementById('privacy-link').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://github.com/yourusername/meeting-scheduler#privacy' });
  });
}

// Show notification
function showNotification(message, type = 'info') {
  // Create temporary notification element
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: ${type === 'success' ? '#34a853' : type === 'error' ? '#ea4335' : '#1a73e8'};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    z-index: 1000;
    animation: slideDown 0.3s ease-out;
  `;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideUp 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
