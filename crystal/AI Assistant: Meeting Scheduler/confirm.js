// Parse URL parameters to get slot data
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

let slotData = null;

// Decode token to get slot information
try {
  const decoded = atob(token);
  slotData = JSON.parse(decoded);
  console.log('Slot data:', slotData);

  // Display slot information
  displaySlotInfo(slotData);
} catch (error) {
  console.error('Error parsing token:', error);
  showMessage('Invalid confirmation link', 'error');
}

function displaySlotInfo(data) {
  const startDate = new Date(data.slot.start);
  const endDate = new Date(data.slot.end);

  document.getElementById('date').textContent = startDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  document.getElementById('time').textContent = `${startDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  })} - ${endDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  })}`;

  document.getElementById('duration').textContent = `${data.slot.duration} minutes`;
  document.getElementById('attendee').textContent = data.sender || 'Unknown';
}

// Confirm button handler
document.getElementById('confirmBtn').addEventListener('click', async () => {
  if (!slotData) {
    showMessage('Invalid slot data', 'error');
    return;
  }

  // Show loading
  document.querySelector('.loading').style.display = 'block';
  document.getElementById('actions').classList.add('hidden');

  try {
    // Send message to background script to create calendar event
    const response = await chrome.runtime.sendMessage({
      type: 'createCalendarEvent',
      slotData: slotData
    });

    document.querySelector('.loading').style.display = 'none';

    if (response.success) {
      showMessage('✓ Meeting confirmed! Calendar event created successfully.', 'success');

      // Open Google Calendar to show the event
      if (response.eventLink) {
        setTimeout(() => {
          window.open(response.eventLink, '_blank');
        }, 1000);
      }

      // Send confirmation email back (optional - could be implemented later)
      // await sendConfirmationEmail(slotData);
    } else {
      showMessage(`Failed to create calendar event: ${response.error}`, 'error');
      document.getElementById('actions').classList.remove('hidden');
    }
  } catch (error) {
    console.error('Confirmation error:', error);
    document.querySelector('.loading').style.display = 'none';
    showMessage(`Error: ${error.message}`, 'error');
    document.getElementById('actions').classList.remove('hidden');
  }
});

// Cancel button handler
document.getElementById('cancelBtn').addEventListener('click', () => {
  window.close();
});

function showMessage(text, type) {
  const messageEl = document.getElementById('message');
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  messageEl.style.display = 'block';
}
