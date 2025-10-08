// Content script for Gmail integration
console.log('AI Assistant: Meeting Scheduler: Content script loaded');
console.log('Content script timestamp:', new Date().toISOString());

// Global error handler to catch any missed errors
window.addEventListener('error', (e) => {
  console.error('❌ Global error caught:', e.error, e.message, e.filename, e.lineno);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('❌ Unhandled promise rejection:', e.reason);
});

// Configuration
const CONFIG = {
  checkInterval: 3000, // Check for new emails every 3 seconds
  meetingKeywords: ['meeting', 'schedule', 'call', 'sync', 'catch up', 'chat', 'discuss', 'available', 'free time']
};

// State management
let processedEmails = new Set();
let isAuthenticated = false;

// Initialize extension
async function init() {
  console.log('Initializing AI Assistant: Meeting Scheduler...');

  // Check authentication status
  const authStatus = await chrome.runtime.sendMessage({ type: 'checkAuth' });
  isAuthenticated = authStatus?.authenticated || false;

  if (!isAuthenticated) {
    showOnboardingModal();
  } else {
    startMonitoring();
  }
}

// Show onboarding modal with OAuth prompt
function showOnboardingModal() {
  const modal = document.createElement('div');
  modal.id = 'scheduler-onboarding-modal';
  modal.innerHTML = `
    <div class="scheduler-modal-overlay">
      <div class="scheduler-modal-content">
        <h2>Welcome to AI Assistant: Meeting Scheduler</h2>
        <p>This extension helps you schedule meetings directly from Gmail.</p>
        <h3>Permissions Required:</h3>
        <ul>
          <li>Read your Gmail messages to detect meeting requests</li>
          <li>Access your Google Calendar to find available time slots</li>
          <li>Draft replies on your behalf</li>
        </ul>
        <div class="scheduler-gdpr-notice">
          <p><strong>Privacy & Data Protection (GDPR):</strong></p>
          <p>We process your email and calendar data locally in your browser. No data is stored on external servers without your explicit consent. You can revoke permissions at any time through Chrome extension settings.</p>
        </div>
        <button id="scheduler-auth-btn" class="scheduler-primary-btn">Connect with Google</button>
        <button id="scheduler-cancel-btn" class="scheduler-secondary-btn">Maybe Later</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('scheduler-auth-btn').addEventListener('click', async () => {
    const result = await chrome.runtime.sendMessage({ type: 'authenticate' });
    if (result?.success) {
      isAuthenticated = true;
      modal.remove();
      startMonitoring();
    }
  });

  document.getElementById('scheduler-cancel-btn').addEventListener('click', () => {
    modal.remove();
  });
}

// Start monitoring Gmail for meeting requests
function startMonitoring() {
  console.log('Starting email monitoring...');

  // Observe DOM changes in Gmail
  const observer = new MutationObserver(() => {
    scanGmailForMeetingRequests();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Initial scan
  scanGmailForMeetingRequests();

  // Periodic scan as backup
  setInterval(scanGmailForMeetingRequests, CONFIG.checkInterval);
}

// Scan Gmail for potential meeting requests
async function scanGmailForMeetingRequests() {
  const emails = getVisibleEmails();

  for (const email of emails) {
    const emailId = email.id;

    // Skip if already processed
    if (processedEmails.has(emailId)) continue;

    // Check if email contains meeting request (async now)
    const isMeeting = await isMeetingRequest(email);
    if (isMeeting) {
      console.log('Meeting request detected:', emailId);
      processedEmails.add(emailId);
      showInlinePrompt(email);
    }
  }
}

// Extract visible emails from Gmail DOM
function getVisibleEmails() {
  const emails = [];

  // Gmail email rows (this selector may need adjustment based on Gmail's DOM)
  const emailRows = document.querySelectorAll('tr.zA, div[role="main"] [data-message-id]');

  emailRows.forEach((row, index) => {
    const messageId = row.getAttribute('data-message-id') || `email-${index}`;
    const subject = row.querySelector('[data-subject]')?.textContent ||
                   row.querySelector('.bog span')?.textContent || '';
    const body = row.querySelector('.a3s')?.textContent || '';
    const sender = row.querySelector('.gD')?.getAttribute('email') ||
                  row.querySelector('.yW span')?.textContent || '';

    emails.push({
      id: messageId,
      subject,
      body,
      sender,
      element: row
    });
  });

  return emails;
}

// Detect if email is a meeting request (AI-enhanced)
async function isMeetingRequest(email) {
  // Request AI detection from background script
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'detectMeeting',
      email: {
        subject: email.subject,
        body: email.body.substring(0, 1000) // Limit body length for API efficiency
      }
    });

    if (response?.success && response.result) {
      console.log('AI detection result:', response.result);
      return response.result.isMeetingRequest;
    }
  } catch (error) {
    console.error('AI detection failed, using fallback:', error);
  }

  // Fallback to keyword-based detection
  return keywordBasedDetection(email);
}

// Original keyword-based detection (fallback)
function keywordBasedDetection(email) {
  const text = `${email.subject} ${email.body}`.toLowerCase();

  // Check for meeting keywords
  const hasKeyword = CONFIG.meetingKeywords.some(keyword => text.includes(keyword));

  // Additional heuristics
  const hasQuestionMark = text.includes('?');
  const hasTimeReference = /\b(time|when|schedule|available|free)\b/.test(text);

  return hasKeyword && (hasQuestionMark || hasTimeReference);
}

// Detect Gmail layout mode
function detectGmailLayout() {
  // Check for split view indicators in Gmail's DOM
  const splitViewVertical = document.querySelector('.aeF'); // Vertical split
  const splitViewHorizontal = document.querySelector('.ae4'); // Horizontal split

  if (splitViewVertical && splitViewVertical.style.display !== 'none') {
    return 'vertical-split';
  } else if (splitViewHorizontal && splitViewHorizontal.style.display !== 'none') {
    return 'horizontal-split';
  }
  return 'no-split';
}

// Find the appropriate container for the prompt based on layout
function findPromptContainer() {
  // Look for the email view container (where the opened email is displayed)
  // Gmail uses different selectors for different views

  // Try to find the main email view area (works in all layouts)
  const emailView = document.querySelector('[role="main"]');
  if (!emailView) return null;

  // Find the subject line container - we want to insert above it
  const subjectContainer = emailView.querySelector('h2.hP') ||
                          emailView.querySelector('[data-legacy-thread-id]') ||
                          emailView.querySelector('.ha h2');

  if (subjectContainer) {
    // Get the parent container that holds the email header
    return subjectContainer.closest('.adn.ads') ||
           subjectContainer.closest('.gs') ||
           subjectContainer.parentElement;
  }

  return emailView;
}

// Show inline prompt for scheduling
function showInlinePrompt(email) {
  console.log('📍 Showing inline prompt...');

  // Check if prompt already exists anywhere
  const existingPrompt = document.querySelector('.scheduler-prompt');
  if (existingPrompt) {
    console.log('  - Prompt already exists, skipping');
    return;
  }

  const layout = detectGmailLayout();
  console.log('  - Detected layout:', layout);

  const prompt = document.createElement('div');
  prompt.className = 'scheduler-prompt';
  prompt.setAttribute('data-layout', layout);
  prompt.innerHTML = `
    <div class="scheduler-banner">
      <span class="scheduler-icon">📅</span>
      <span class="scheduler-message">Meeting request detected. Schedule now?</span>
      <button class="scheduler-schedule-btn" data-email-id="${email.id}">Schedule</button>
      <button class="scheduler-dismiss-btn" data-email-id="${email.id}">Dismiss</button>
    </div>
  `;

  // Find the appropriate container based on layout
  const container = findPromptContainer();

  if (container) {
    console.log('  - Found container:', container);

    // Insert at the top of the container (above subject line)
    if (container.firstChild) {
      container.insertBefore(prompt, container.firstChild);
      console.log('  - ✅ Prompt inserted at top of container');
    } else {
      container.appendChild(prompt);
      console.log('  - ✅ Prompt appended to container');
    }
  } else {
    console.log('  - ⚠️ Container not found, falling back to email element');
    // Fallback to original behavior
    email.element.appendChild(prompt);
  }

  // Add event listeners
  prompt.querySelector('.scheduler-schedule-btn').addEventListener('click', () => {
    startScheduling(email);
    prompt.remove();
  });

  prompt.querySelector('.scheduler-dismiss-btn').addEventListener('click', () => {
    prompt.remove();
  });
}

// Start the scheduling flow
async function startScheduling(email) {
  console.log('Starting scheduling for:', email.id);

  // Show loading indicator
  const loadingElement = showLoadingIndicator(email.element);

  try {
    // Request available slots from background script with timeout
    const response = await Promise.race([
      chrome.runtime.sendMessage({
        type: 'findSlots',
        emailId: email.id,
        sender: email.sender
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out after 30 seconds')), 30000)
      )
    ]);

    // Remove loading indicator
    loadingElement?.remove();

    console.log('Response received:', response);
    console.log('Response.success:', response?.success);
    console.log('Response.slots:', response?.slots);
    console.log('Response.slots type:', typeof response?.slots);
    console.log('Response.slots is array:', Array.isArray(response?.slots));
    console.log('Response.slots length:', response?.slots?.length);

    if (response?.success && response.slots && Array.isArray(response.slots) && response.slots.length > 0) {
      console.log('✅ Calling draftReply with', response.slots.length, 'slots');
      draftReply(email, response.slots);
    } else {
      const errorMsg = response?.error || 'Failed to find available slots';
      console.error('❌ Slot finding failed:', errorMsg);
      console.error('❌ Response object:', JSON.stringify(response));
      showError(email.element, errorMsg);
    }
  } catch (error) {
    console.error('Scheduling error:', error);
    loadingElement?.remove();

    let errorMessage = 'An error occurred while scheduling';
    if (error.message.includes('timeout')) {
      errorMessage = 'Request timed out. Please check your Google Calendar connection and try again.';
    }

    showError(email.element, errorMessage);
  }
}

// Draft reply with available slots
function draftReply(email, slots) {
  console.log('Drafting reply with slots:', slots);

  // Plain text version for clipboard
  const replyTextPlain = "Happy to find a time to connect—please select a slot below.\n\n" +
                   formatSlotLinks(slots) +
                   "\n\nIf none of these work, feel free to suggest different times.";

  // HTML version for modal display with clickable links
  const replyTextHTML = "Happy to find a time to connect—please select a slot below.<br><br>" +
                   formatSlotLinksHTML(slots) +
                   "<br><br>If none of these work, feel free to suggest different times.";

  // HTML version for Gmail compose (clean format with hyperlinks)
  const replyTextGmail = "Happy to find a time to connect—please select a slot below.<br><br>" +
                   formatSlotLinksForGmail(slots) +
                   "<br><br>If none of these work, feel free to suggest different times.";

  // Open Gmail compose/reply
  openGmailReplyDraft(email, replyTextPlain, replyTextHTML, replyTextGmail);
}

// Format slot links for email (plain text version)
function formatSlotLinks(slots) {
  return slots.map((slot, index) => {
    const date = new Date(slot.start);
    const timeStr = date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });
    return `${index + 1}. ${timeStr} - Click here to confirm: ${slot.confirmLink}`;
  }).join('\n');
}

// Format slot links as HTML with clickable links (for modal display)
function formatSlotLinksHTML(slots) {
  return slots.map((slot, index) => {
    const date = new Date(slot.start);
    const timeStr = date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });
    return `${index + 1}. ${timeStr} - <a href="${slot.confirmLink}" target="_blank" style="color: #1a73e8; text-decoration: none;">Click here to confirm</a>`;
  }).join('<br>');
}

// Format slot links as HTML for Gmail compose (cleaner format with links)
function formatSlotLinksForGmail(slots) {
  return slots.map((slot, index) => {
    const date = new Date(slot.start);
    const timeStr = date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });
    return `${index + 1}. ${timeStr} - <a href="${slot.confirmLink}">Click here to confirm</a>`;
  }).join('<br>');
}

// Open Gmail reply draft
function openGmailReplyDraft(email, replyTextPlain, replyTextHTML, replyTextGmail) {
  console.log('Opening reply draft:', { email, replyTextPlain });

  // Show modal with draft text
  showDraftModal(email, replyTextPlain, replyTextHTML, replyTextGmail);

  // Store draft data for later use
  chrome.runtime.sendMessage({
    type: 'saveDraft',
    emailId: email.id,
    draftText: replyTextPlain
  });
}

// Show draft modal with copy functionality
function showDraftModal(email, replyTextPlain, replyTextHTML, replyTextGmail) {
  const modal = document.createElement('div');
  modal.id = 'scheduler-draft-modal';
  modal.innerHTML = `
    <div class="scheduler-modal-overlay">
      <div class="scheduler-modal-content scheduler-draft-modal">
        <h2>📧 Reply Draft Ready</h2>
        <p>Your meeting scheduling reply has been generated. You can:</p>

        <div class="scheduler-draft-actions">
          <button id="scheduler-copy-draft-btn" class="scheduler-primary-btn">
            📋 Copy Draft to Clipboard
          </button>
          <button id="scheduler-open-compose-btn" class="scheduler-primary-btn">
            ✉️ Open Gmail Reply
          </button>
        </div>

        <div class="scheduler-draft-preview">
          <h3>Preview:</h3>
          <div id="scheduler-draft-text" style="line-height: 1.6;">${replyTextHTML}</div>
        </div>

        <button id="scheduler-close-modal-btn" class="scheduler-secondary-btn">Close</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Copy to clipboard button (uses plain text version)
  document.getElementById('scheduler-copy-draft-btn').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(replyTextPlain);
      const btn = document.getElementById('scheduler-copy-draft-btn');
      btn.textContent = '✅ Copied!';
      setTimeout(() => {
        btn.textContent = '📋 Copy Draft to Clipboard';
      }, 2000);
      showNotification('Draft copied to clipboard!', 'success');
    } catch (error) {
      console.error('Copy failed:', error);
      showNotification('Failed to copy. Please select and copy manually.', 'error');
    }
  });

  // Open compose button - try to find and click reply button
  document.getElementById('scheduler-open-compose-btn').addEventListener('click', () => {
    // Try to find and click the reply button
    const replyButton = findReplyButton(email);

    if (replyButton) {
      replyButton.click();
      showNotification('Opening Gmail reply...', 'info');

      // Try to auto-paste after a delay (Gmail needs time to open compose)
      // Try multiple times with increasing delays
      let attempts = 0;
      const maxAttempts = 5;
      const attemptInterval = setInterval(() => {
        attempts++;
        console.log(`🔄 Attempt ${attempts}/${maxAttempts} to find and fill compose box...`);

        const composeBox = findComposeBox();
        if (composeBox) {
          const success = insertTextIntoCompose(composeBox, replyTextGmail);
          if (success) {
            showNotification('✅ Draft text inserted! Review and send when ready.', 'success');
            clearInterval(attemptInterval);
          }
        } else if (attempts >= maxAttempts) {
          console.log('❌ Failed to find compose box after', maxAttempts, 'attempts');
          showNotification('Could not auto-fill. Please paste the draft manually (already copied to clipboard).', 'warning');
          clearInterval(attemptInterval);
        }
      }, 500);
    } else {
      showNotification('Could not find reply button. Please click Reply manually and paste the draft.', 'error');
    }

    modal.remove();
  });

  // Close button
  document.getElementById('scheduler-close-modal-btn').addEventListener('click', () => {
    modal.remove();
  });
}

// Find the reply button for an email
function findReplyButton(email) {
  console.log('🔍 Looking for reply button...');

  // Try multiple strategies to find the reply button

  // Strategy 1: Look for reply button in the entire document (most reliable)
  const allReplyButtons = document.querySelectorAll('[role="button"]');
  for (const button of allReplyButtons) {
    const ariaLabel = button.getAttribute('aria-label');
    const title = button.getAttribute('title');
    const dataTooltip = button.getAttribute('data-tooltip');

    if (ariaLabel?.toLowerCase().includes('reply') ||
        title?.toLowerCase().includes('reply') ||
        dataTooltip?.toLowerCase().includes('reply')) {
      console.log('✅ Found reply button via Strategy 1:', ariaLabel || title || dataTooltip);
      return button;
    }
  }

  // Strategy 2: Look for reply button near the email element
  const nearbyButtons = email.element.querySelectorAll('[role="button"]');
  for (const button of nearbyButtons) {
    const ariaLabel = button.getAttribute('aria-label');
    if (ariaLabel?.toLowerCase().includes('reply')) {
      console.log('✅ Found reply button via Strategy 2:', ariaLabel);
      return button;
    }
  }

  // Strategy 3: Look in the email toolbar/action area
  const toolbar = email.element.closest('[role="main"]')?.querySelector('[role="toolbar"]');
  if (toolbar) {
    const buttons = toolbar.querySelectorAll('[role="button"]');
    for (const button of buttons) {
      const ariaLabel = button.getAttribute('aria-label');
      if (ariaLabel?.toLowerCase().includes('reply')) {
        console.log('✅ Found reply button via Strategy 3:', ariaLabel);
        return button;
      }
    }
  }

  // Strategy 4: Look for the reply icon span
  const replySpans = document.querySelectorAll('span[role="link"]');
  for (const span of replySpans) {
    const ariaLabel = span.getAttribute('aria-label');
    if (ariaLabel?.toLowerCase() === 'reply') {
      console.log('✅ Found reply span via Strategy 4');
      return span;
    }
  }

  console.log('❌ Could not find reply button with any strategy');
  return null;
}

// Find Gmail compose box
function findComposeBox() {
  console.log('🔍 Looking for compose box...');

  // Gmail compose box selectors - try multiple strategies
  const selectors = [
    'div[contenteditable="true"][aria-label*="Message"]',
    'div[contenteditable="true"][role="textbox"]',
    '[aria-label="Message Body"]',
    '[g_editable="true"]',
    '.Am.Al.editable',
    'div[contenteditable="true"]'
  ];

  for (const selector of selectors) {
    const boxes = document.querySelectorAll(selector);
    console.log(`  - Selector "${selector}" found ${boxes.length} boxes`);

    // Get the last (most recently opened) compose box
    if (boxes.length > 0) {
      const box = boxes[boxes.length - 1];
      console.log('✅ Found compose box:', box);
      return box;
    }
  }

  console.log('❌ Could not find compose box');
  return null;
}

// Insert text into Gmail compose box
function insertTextIntoCompose(composeBox, text) {
  console.log('📝 Inserting text into compose box...');

  try {
    // Check if text already contains HTML (has <br> or <a> tags)
    const isHTML = text.includes('<br>') || text.includes('<a ');

    // Focus the compose box first
    composeBox.focus();

    // Make compose box editable if not already
    if (!composeBox.hasAttribute('contenteditable')) {
      composeBox.setAttribute('contenteditable', 'true');
    }

    // Clear existing content
    composeBox.innerHTML = '';

    if (isHTML) {
      // Use execCommand insertHTML which Gmail respects
      // This preserves links in the final sent email
      document.execCommand('insertHTML', false, text);
      console.log('  - HTML inserted using execCommand (preserves links when sent)');
    } else {
      // Plain text - convert line breaks
      const htmlText = text.replace(/\n/g, '<br>');
      document.execCommand('insertHTML', false, htmlText);
      console.log('  - Plain text converted and inserted');
    }

    // Trigger input events so Gmail detects the change
    composeBox.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    composeBox.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));

    // Simulate user typing to ensure Gmail processes the content
    composeBox.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', code: 'End', bubbles: true }));
    composeBox.dispatchEvent(new KeyboardEvent('keyup', { key: 'End', code: 'End', bubbles: true }));

    // Move cursor to end of content
    setTimeout(() => {
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(composeBox);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
      composeBox.focus();
    }, 50);

    return true;
  } catch (error) {
    console.error('❌ Failed to insert text:', error);

    // Fallback: try direct innerHTML
    try {
      composeBox.innerHTML = text;
      console.log('  - Fallback: used innerHTML');
      return true;
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError);
      return false;
    }
  }
}

// UI Helper Functions
function showLoadingIndicator(element) {
  const loader = document.createElement('div');
  loader.className = 'scheduler-loading';
  loader.innerHTML = '<div class="scheduler-spinner"></div><span>Finding available slots...</span>';
  element.appendChild(loader);
  return loader; // Return so it can be removed later
}

function showError(element, message) {
  const error = document.createElement('div');
  error.className = 'scheduler-error';
  error.innerHTML = `<span class="scheduler-error-icon">⚠️</span><span>${message}</span>`;
  element.appendChild(error);

  setTimeout(() => error.remove(), 5000);
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `scheduler-notification scheduler-notification-${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => notification.remove(), 4000);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
