# Phase 1: Keyword-Based Meeting Detection

This is the **Phase 1** version of the AI Assistant: Meeting Scheduler Chrome extension using **simple keyword-based detection**.

## Overview

Phase 1 uses a straightforward keyword matching algorithm to detect meeting requests in Gmail:

- Scans email subject and body for meeting-related keywords
- Checks for question marks or time-related words
- Shows scheduling prompt if conditions are met

### Detection Logic

```javascript
function isMeetingRequest(email) {
  const text = `${email.subject} ${email.body}`.toLowerCase();

  // Keywords: meeting, schedule, call, sync, catch up, chat, discuss, available, free time
  const hasKeyword = keywords.some(k => text.includes(k));

  // Additional checks
  const hasQuestionMark = text.includes('?');
  const hasTimeReference = /\b(time|when|schedule|available|free)\b/.test(text);

  return hasKeyword && (hasQuestionMark || hasTimeReference);
}
```

### Pros & Cons

**Pros**:
- ✅ Simple and fast
- ✅ No API costs
- ✅ Works offline
- ✅ Predictable behavior

**Cons**:
- ❌ ~60% accuracy
- ❌ Misses subtle requests ("Would love to connect")
- ❌ False positives ("Meeting notes attached")
- ❌ No confidence scoring

## Installation

### Prerequisites

- Google Chrome (v88+)
- Google account with Gmail and Calendar

### Setup Steps
1. **Download zip**:
   - Go to https://github.com/ndeltortoiii/claude-code/blob/main/examples/crystal/AI%20Assistant%3A%20Meeting%20Scheduler.zip
   - Download file
2. **Load Extension**:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `AI Assistant/ Meeting Scheduler` folder
3. **Test in Gmail**:
   - Open Gmail
   - Extension will show onboarding modal
   - Connect with Google
   - Send yourself a test email: "Can we schedule a meeting?"

## Features

- **Inbox Monitoring**: Scans Gmail for new emails automatically
- **Keyword Detection**: Matches 9 meeting-related keywords
- **Calendar Integration**: Fetches available slots from Google Calendar
- **Auto-Draft Replies**: Generates email responses with time slots
- **GDPR Compliant**: All processing happens locally in browser

## Configuration

Edit keywords in `content.js`:

```javascript
const CONFIG = {
  checkInterval: 3000, // Scan every 3 seconds
  meetingKeywords: [
    'meeting', 'schedule', 'call', 'sync',
    'catch up', 'chat', 'discuss',
    'available', 'free time'
  ]
};
```

## Test Cases

### Should Detect ✅

| Email | Reason |
|-------|--------|
| "Can we schedule a meeting?" | Has "schedule" + "meeting" + "?" |
| "Are you available for a call next week?" | Has "available" + "call" + "?" |
| "Let's discuss when you're free" | Has "discuss" + "when" + "free" |

### Should NOT Detect ❌

| Email | Reason |
|-------|--------|
| "Meeting notes attached" | No "?" or time reference |
| "Thanks for the update" | No meeting keywords |
| "When is the deadline?" | No meeting keywords |

### Known Limitations

❌ **Misses**: "Would love to connect" (no keywords matched)
❌ **False positive**: "The meeting was great!" (has keyword but no "?")

## Files

```
phase-1-keyword/
├── manifest.json       # Extension config (v1.0.0)
├── content.js          # Keyword-based detection
├── background.js       # OAuth & Calendar API (no AI)
├── popup.html/js       # Extension popup UI
├── styles.css          # Gmail overlay styles
├── icons/              # Extension icons
└── README.md           # This file
```

## Support

**For issues**:
- Not detecting emails? Check keywords match your typical emails
- Extension not loading? Verify OAuth setup
- No slots found? Check calendar has free time

**Debugging**:
```javascript
// Open Gmail → Press F12 → Console tab
// Look for: "Meeting request detected: [emailId]"
```

## Version

- **Version**: 1.0.0
- **Detection Method**: Keyword-based
- **Accuracy**: ~60%
- **Cost**: $0 (no API calls)

---

**Want better accuracy?** Ask about **Phase 2** with AI-powered detection!
