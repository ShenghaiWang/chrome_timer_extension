chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    timerInitial: 5 * 60 * 1000, // 5 minutes, to be consistent with timer.js
    // Ensure timerStart is set to Date.now() on install, not a fixed value
    timerStart: Date.now(),
    timerRunning: false
  });
});

chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  if (msg.type === 'SET_TIMER') {
    console.log(`Background: Received SET_TIMER message with duration ${msg.duration}ms.`);
    if (msg.duration > 0) {
      await chrome.storage.local.set({
        timerStart: Date.now(),
        timerInitial: msg.duration,
        timerRunning: true
      });
    } else {
      // If duration is 0, stop the timer.
      await chrome.storage.local.set({ timerRunning: false });
    }
    await broadcastTimer(); // Notify all tabs of the change
  } else if (msg.type === 'RESTART_TIMER_FROM_CONTENT') {
    console.log('Background: Received RESTART_TIMER_FROM_CONTENT message.');
    // Get the current timerInitial to restart with the same duration
    // To restart, we only need to reset the start time and ensure it's running.
    // The existing timerInitial in storage is already correct.
    await chrome.storage.local.set({
      timerStart: Date.now(),
      timerRunning: true
    });
    await broadcastTimer();
  } else if (msg.type === 'STOP_TIMER') {
    console.log('Background: Received STOP_TIMER message.');
    await chrome.storage.local.set({ timerRunning: false });
    await broadcastTimer();
  }
  // Return true if you were to use sendResponse asynchronously, but with async/await,
  // the promise returned by the listener handles this for us.
  console.log('Background: onMessage listener finished.');
});

async function broadcastTimer() {
  console.log('Background: broadcastTimer started.');
  try {
    const tabs = await chrome.tabs.query({});
    console.log(`Background: Found ${tabs.length} tabs.`);
    for (const tab of tabs) {
      try {
        // The message just signals an update; the content script will fetch the latest state.
        await chrome.tabs.sendMessage(tab.id, { type: 'TIMER_UPDATED' });
      } catch (e) {
        // This error is expected for tabs where the content script cannot be injected,
        // such as chrome:// pages or the web store. We can safely ignore it.
        if (!e.message.includes('Could not establish connection') && !e.message.includes('Receiving end does not exist')) {
          console.error(`Failed to send message to tab ${tab.id}:`, e);
        }
      }
    }
  } catch (e) {
    console.error("Failed to query tabs:", e);
    // This catch block will handle errors from chrome.tabs.query
    // If "Extension context invalidated" occurs here, it will be logged.
  }
  console.log('Background: broadcastTimer finished.');
}
