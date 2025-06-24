// popup.js
document.getElementById('timerForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const minutes = parseInt(document.getElementById('minutes').value, 10) || 0;
  const seconds = parseInt(document.getElementById('seconds').value, 10) || 0;
  const totalMs = (minutes * 60 + seconds) * 1000;

  // Send a message to the background script to set/update the timer.
  // The background script is the single source of truth for state changes.
  chrome.runtime.sendMessage({ type: 'SET_TIMER', duration: totalMs });

  window.close();
});
