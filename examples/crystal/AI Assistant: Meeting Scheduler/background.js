// Background service worker for API calls and OAuth management
console.log('AI Assistant: Meeting Scheduler: Background service worker loaded');

// Configuration
const CONFIG = {
  apiEndpoint: 'https://your-backend-api.com', // Replace with your backend URL
  anthropicApiKey: 'YOUR_ANTHROPIC_API_KEY_HERE', // Replace with your Anthropic API key
  anthropicApiUrl: 'https://api.anthropic.com/v1/messages',
  slotDuration: 30, // minutes
  slotsToOffer: 3,
  daysAhead: 14,
  workingHours: {
    start: 9, // 9 AM
    end: 17   // 5 PM
  }
};

// State
let authToken = null;
let userEmail = null;

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message:', request.type);

  // Handle messages asynchronously
  (async () => {
    try {
      switch (request.type) {
        case 'checkAuth':
          await handleCheckAuth(sendResponse);
          break;

        case 'authenticate':
          await handleAuthenticate(sendResponse);
          break;

        case 'detectMeeting':
          await handleDetectMeeting(request, sendResponse);
          break;

        case 'findSlots':
          await handleFindSlots(request, sendResponse);
          break;

        case 'saveDraft':
          await handleSaveDraft(request, sendResponse);
          break;

        case 'createCalendarEvent':
          await handleCreateCalendarEvent(request, sendResponse);
          break;

        default:
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Message handler error:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();

  return true; // Keep message channel open for async response
});

// Check authentication status
async function handleCheckAuth(sendResponse) {
  try {
    // Check if we have a stored token
    const result = await chrome.storage.local.get(['authToken', 'userEmail']);

    if (result.authToken) {
      authToken = result.authToken;
      userEmail = result.userEmail;

      // Verify token is still valid
      const isValid = await verifyToken(authToken);

      sendResponse({ authenticated: isValid });
    } else {
      sendResponse({ authenticated: false });
    }
  } catch (error) {
    console.error('Auth check error:', error);
    sendResponse({ authenticated: false });
  }
}

// Handle OAuth authentication
async function handleAuthenticate(sendResponse) {
  try {
    console.log('Starting OAuth flow...');

    // Use Chrome Identity API for OAuth
    chrome.identity.getAuthToken({ interactive: true }, async (token) => {
      if (chrome.runtime.lastError) {
        console.error('OAuth error:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
        return;
      }

      if (token) {
        authToken = token;

        // Get user profile
        const profile = await getUserProfile(token);
        userEmail = profile?.email;

        // Store token and email
        await chrome.storage.local.set({ authToken: token, userEmail });

        console.log('Authentication successful');
        sendResponse({ success: true, email: userEmail });
      } else {
        sendResponse({ success: false, error: 'No token received' });
      }
    });
  } catch (error) {
    console.error('Authentication error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Verify token validity
async function verifyToken(token) {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + token);
    return response.ok;
  } catch (error) {
    console.error('Token verification error:', error);
    return false;
  }
}

// Get user profile
async function getUserProfile(token) {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return await response.json();
  } catch (error) {
    console.error('Profile fetch error:', error);
    return null;
  }
}

// Find available time slots
async function handleFindSlots(request, sendResponse) {
  try {
    console.log('Finding slots for:', request.emailId);

    if (!authToken) {
      console.error('No auth token available');
      sendResponse({ success: false, error: 'Not authenticated. Please reconnect your Google account.' });
      return;
    }

    console.log('Fetching calendar events...');

    // Get calendar events for the next N days
    const events = await getCalendarEvents(authToken);

    console.log('Calendar events fetched:', events.length);

    // Find available slots
    const slots = findAvailableSlots(events);

    console.log('Available slots found:', slots.length);

    if (slots.length === 0) {
      sendResponse({
        success: false,
        error: 'No available slots found in the next 14 days. Please check your calendar or adjust working hours.'
      });
      return;
    }

    // Generate confirmation links for each slot
    const slotsWithLinks = slots.map(slot => ({
      ...slot,
      confirmLink: generateConfirmLink(slot, request.emailId, request.sender)
    }));

    console.log('Sending slots to content script:', slotsWithLinks.length);
    sendResponse({ success: true, slots: slotsWithLinks });

  } catch (error) {
    console.error('Find slots error:', error);
    sendResponse({ success: false, error: `Calendar error: ${error.message}` });
  }
}

// Get calendar events from Google Calendar API
async function getCalendarEvents(token) {
  try {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + CONFIG.daysAhead);

    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
                `timeMin=${now.toISOString()}&` +
                `timeMax=${futureDate.toISOString()}&` +
                `singleEvents=true&` +
                `orderBy=startTime`;

    console.log('Calling Calendar API:', url.substring(0, 100) + '...');

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('Calendar API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Calendar API error response:', errorText);

      if (response.status === 401) {
        // Token expired or invalid
        authToken = null;
        await chrome.storage.local.remove(['authToken']);
        throw new Error('Authentication expired. Please reconnect your Google account.');
      }

      throw new Error(`Calendar API error: ${response.status} - ${errorText.substring(0, 100)}`);
    }

    const data = await response.json();
    console.log('Calendar API success, events:', data.items?.length || 0);

    // Log first few events for debugging
    if (data.items && data.items.length > 0) {
      console.log('Sample events (first 3):');
      data.items.slice(0, 3).forEach(event => {
        console.log('  -', event.summary || '(No title)', ':', event.start.dateTime || event.start.date, 'to', event.end.dateTime || event.end.date);
      });
    } else {
      console.log('✅ Calendar is empty - should find many slots!');
    }

    return data.items || [];

  } catch (error) {
    console.error('Calendar fetch error:', error);
    throw error; // Re-throw to be caught by handleFindSlots
  }
}

// Find available time slots
function findAvailableSlots(events) {
  console.log('=== SLOT FINDING DEBUG ===');
  console.log('Total events:', events.length);

  // Count transparent (Free) vs opaque (Busy) events
  const transparentEvents = events.filter(e => e.transparency === 'transparent').length;
  const opaqueEvents = events.length - transparentEvents;
  console.log('  - Transparent (Free):', transparentEvents, '(will be ignored)');
  console.log('  - Opaque (Busy):', opaqueEvents, '(will block slots)');

  console.log('Working hours:', CONFIG.workingHours);
  console.log('Slot duration:', CONFIG.slotDuration, 'minutes');
  console.log('Days ahead:', CONFIG.daysAhead);

  // STEP 1: Collect ALL available slots in the time window
  const allSlots = [];
  const now = new Date();

  const startDate = new Date(now);
  startDate.setHours(startDate.getHours() + 1);
  startDate.setMinutes(0);
  startDate.setSeconds(0);
  startDate.setMilliseconds(0);

  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + CONFIG.daysAhead);

  console.log('Search window:', startDate.toLocaleString(), 'to', endDate.toLocaleString());

  let currentSlot = new Date(startDate);
  let checkedSlots = 0;

  while (currentSlot < endDate && checkedSlots < 2000) {
    checkedSlots++;

    // Skip weekends
    if (currentSlot.getDay() === 0 || currentSlot.getDay() === 6) {
      currentSlot.setDate(currentSlot.getDate() + 1);
      currentSlot.setHours(CONFIG.workingHours.start, 0, 0, 0);
      continue;
    }

    // Skip outside working hours
    const currentHour = currentSlot.getHours();
    if (currentHour < CONFIG.workingHours.start || currentHour >= CONFIG.workingHours.end) {
      currentSlot.setDate(currentSlot.getDate() + 1);
      currentSlot.setHours(CONFIG.workingHours.start, 0, 0, 0);
      continue;
    }

    const slotEnd = new Date(currentSlot.getTime() + CONFIG.slotDuration * 60000);

    // Skip if slot end goes beyond working hours
    if (slotEnd.getHours() > CONFIG.workingHours.end ||
        (slotEnd.getHours() === CONFIG.workingHours.end && slotEnd.getMinutes() > 0)) {
      currentSlot.setDate(currentSlot.getDate() + 1);
      currentSlot.setHours(CONFIG.workingHours.start, 0, 0, 0);
      continue;
    }

    // Check if slot conflicts with existing events
    const hasConflict = events.some(event => {
      if (!event.start || !event.end) return false;

      if (event.transparency === 'transparent') {
        return false;
      }

      const eventStart = new Date(event.start.dateTime || event.start.date);
      const eventEnd = new Date(event.end.dateTime || event.end.date);

      return (currentSlot >= eventStart && currentSlot < eventEnd) ||
             (slotEnd > eventStart && slotEnd <= eventEnd) ||
             (currentSlot <= eventStart && slotEnd >= eventEnd);
    });

    if (!hasConflict) {
      allSlots.push({
        start: currentSlot.toISOString(),
        end: slotEnd.toISOString(),
        duration: CONFIG.slotDuration,
        hour: currentSlot.getHours(),
        dayIndex: Math.floor((currentSlot - startDate) / (1000 * 60 * 60 * 24))
      });
    }

    // Move to next slot
    currentSlot = new Date(currentSlot.getTime() + CONFIG.slotDuration * 60000);
  }

  console.log('Total slots checked:', checkedSlots);
  console.log('All available slots found:', allSlots.length);

  // STEP 2: Select slots strategically with varied times
  if (allSlots.length === 0) {
    return [];
  }

  const selectedSlots = selectDiverseSlots(allSlots, CONFIG.slotsToOffer);

  console.log('Selected diverse slots:', selectedSlots.length);
  selectedSlots.forEach((slot, i) => {
    console.log(`  ${i + 1}. ${new Date(slot.start).toLocaleString()}`);
  });

  return selectedSlots;
}

// Select slots that are spread across time and vary in hour
function selectDiverseSlots(allSlots, count) {
  if (allSlots.length <= count) {
    return allSlots;
  }

  const selected = [];

  // Slot 1: Soonest available
  selected.push(allSlots[0]);
  console.log('📍 Slot 1 (soonest):', new Date(allSlots[0].start).toLocaleString());

  if (count === 1) return selected;

  // Slot 3 (last): Furthest available - select first to avoid conflicts
  const lastSlot = allSlots[allSlots.length - 1];
  selected.push(lastSlot);
  console.log('📍 Slot 3 (furthest):', new Date(lastSlot.start).toLocaleString());

  if (count === 2) return selected;

  // Slot 2 (middle): Pick a slot in the middle timeframe with different hour
  const middleIndex = Math.floor(allSlots.length / 2);

  // Find a slot near middle with different hour than first and last
  const usedHours = new Set([selected[0].hour, lastSlot.hour]);
  let middleSlot = null;

  // Search around middle index for slot with different hour
  for (let offset = 0; offset < allSlots.length / 2; offset++) {
    const candidates = [
      allSlots[middleIndex + offset],
      allSlots[middleIndex - offset]
    ].filter(s => s && !usedHours.has(s.hour));

    if (candidates.length > 0) {
      middleSlot = candidates[0];
      break;
    }
  }

  // If no different hour found, just use middle
  if (!middleSlot) {
    middleSlot = allSlots[middleIndex];
  }

  // Insert middle slot in position 2 (between soonest and furthest)
  selected.splice(1, 0, middleSlot);
  console.log('📍 Slot 2 (middle):', new Date(middleSlot.start).toLocaleString());

  return selected;
}

// Generate confirmation link for slot
function generateConfirmLink(slot, emailId, sender) {
  const token = generateToken(slot, emailId, sender);
  // Use chrome-extension:// URL instead of external backend
  const extensionId = chrome.runtime.id;
  return `chrome-extension://${extensionId}/confirm.html?token=${encodeURIComponent(token)}`;
}

// Generate secure token for slot confirmation
function generateToken(slot, emailId, sender) {
  // Encode slot data in the token
  const data = JSON.stringify({ slot, emailId, sender, timestamp: Date.now() });
  return btoa(data);
}

// Handle AI-based meeting detection
async function handleDetectMeeting(request, sendResponse) {
  try {
    console.log('Detecting meeting request with AI...');

    const { email } = request;
    const prompt = constructDetectionPrompt(email);

    // Call Claude API
    const response = await fetch(CONFIG.anthropicApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CONFIG.anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022', // Fast and cost-effective
        max_tokens: 200,
        temperature: 0,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const result = parseDetectionResponse(data.content[0].text);

    console.log('AI detection result:', result);
    sendResponse({ success: true, result });

  } catch (error) {
    console.error('AI detection error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Construct prompt for meeting detection
function constructDetectionPrompt(email) {
  return `Analyze this email and determine if it's a meeting request or scheduling inquiry.

Email Subject: ${email.subject}
Email Body: ${email.body}

Instructions:
- Determine if the sender is requesting to schedule a meeting, call, or any type of synchronous discussion
- Consider subtle requests like "let's connect", "can we chat", "find time to discuss"
- Ignore emails that just mention meetings but aren't requesting one (e.g., "meeting notes attached")
- Respond ONLY with a JSON object in this exact format:

{
  "isMeetingRequest": true or false,
  "confidence": 0.0 to 1.0,
  "reason": "brief explanation in 10 words or less"
}

Examples:
- "Can we schedule a call next week?" → {"isMeetingRequest": true, "confidence": 0.95, "reason": "Direct scheduling request with question"}
- "Meeting notes from yesterday" → {"isMeetingRequest": false, "confidence": 0.9, "reason": "Reference to past meeting, not request"}
- "Would love to connect sometime" → {"isMeetingRequest": true, "confidence": 0.75, "reason": "Subtle meeting request using connect"}

Respond only with the JSON, no additional text.`;
}

// Parse Claude's detection response
function parseDetectionResponse(text) {
  try {
    // Extract JSON from response (in case there's extra text)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      isMeetingRequest: parsed.isMeetingRequest,
      confidence: parsed.confidence,
      reason: parsed.reason,
      method: 'ai'
    };
  } catch (error) {
    console.error('Parse error:', error);
    throw error;
  }
}

// Save draft
async function handleSaveDraft(request, sendResponse) {
  try {
    await chrome.storage.local.set({
      [`draft_${request.emailId}`]: {
        text: request.draftText,
        timestamp: Date.now()
      }
    });
    sendResponse({ success: true });
  } catch (error) {
    console.error('Save draft error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Handle calendar event creation
async function handleCreateCalendarEvent(request, sendResponse) {
  try {
    console.log('Creating calendar event for slot:', request.slotData);

    // Ensure we have auth token
    if (!authToken) {
      const auth = await getAuthToken();
      if (!auth.success) {
        sendResponse({ success: false, error: 'Not authenticated' });
        return;
      }
    }

    const { slot, sender, emailId } = request.slotData;

    // Create calendar event
    const event = {
      summary: `Meeting with ${sender}`,
      description: `Scheduled via AI Assistant Meeting Scheduler\nOriginal email: ${emailId}`,
      start: {
        dateTime: slot.start,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: slot.end,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      attendees: [
        { email: sender }
      ],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 10 }
        ]
      }
    };

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Calendar API error: ${errorData.error?.message || response.statusText}`);
    }

    const createdEvent = await response.json();
    console.log('Calendar event created:', createdEvent);

    sendResponse({
      success: true,
      eventId: createdEvent.id,
      eventLink: createdEvent.htmlLink
    });

  } catch (error) {
    console.error('Create calendar event error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Extension installed - first time setup');
    // Could open onboarding page here
  }
});
