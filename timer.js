// timer.js

if (!window.__my_timer_injected) {
  window.__my_timer_injected = true;

  const timerDiv = document.createElement('div');
  timerDiv.id = 'my-extension-timer';
  timerDiv.style.position = 'fixed';
  timerDiv.style.top = '20px';
  timerDiv.style.right = '20px';
  timerDiv.style.zIndex = '999999';
  timerDiv.style.background = 'rgba(0,0,0,0.8)';
  timerDiv.style.color = '#fff';
  timerDiv.style.padding = '10px 20px';
  timerDiv.style.borderRadius = '8px';
  timerDiv.style.fontSize = '20px';
  timerDiv.style.fontFamily = 'monospace';
  timerDiv.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
  timerDiv.style.userSelect = 'none';
  timerDiv.style.cursor = 'pointer';

  document.body.appendChild(timerDiv);

  function formatTime(ms) {
    const negative = ms < 0;
    ms = Math.abs(ms);
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return (negative ? '-' : '') +
      (minutes < 10 ? '0' : '') + minutes + ':' +
      (seconds < 10 ? '0' : '') + seconds;
  }

  async function updateTimerDisplay() {
    // console.log('Content Script: updateTimerDisplay called.'); // Uncomment for debugging
    const data = await chrome.storage.local.get(['timerInitial', 'timerStart', 'timerRunning']);

    const timerInitial = data.timerInitial || 0;
    const timerStart = data.timerStart || Date.now();
    const timerRunning = data.timerRunning || false;

    if (!timerRunning) {
      timerDiv.style.display = 'none';
      return;
    }
    timerDiv.style.display = 'block';

    const elapsed = Date.now() - timerStart;
    const remaining = timerInitial - elapsed;
    timerDiv.textContent = formatTime(remaining);
    timerDiv.style.background = remaining < 0 ? 'rgba(200,0,0,0.8)' : 'rgba(0,0,0,0.8)';
    // console.log('Content Script: updateTimerDisplay finished.'); // Uncomment for debugging
  }

  setInterval(updateTimerDisplay, 1000);
  updateTimerDisplay();

  // --- Drag functionality variables ---
  let isDragging = false;
  let initialMouseX;
  let initialMouseY;
  let initialDivX;
  let initialDivY;
  let dragOccurred = false; // Flag to differentiate drag from click
  const DRAG_THRESHOLD = 5; // Pixels moved to consider it a drag, not a click

  // --- Click functionality variables ---
  let clickTimeout; // For single/double click debounce

  // Mousedown starts the drag process
  timerDiv.addEventListener('mousedown', (e) => {
    // Only allow dragging with left mouse button
    if (e.button !== 0) return;

    isDragging = true;
    dragOccurred = false; // Reset drag flag for new interaction
    timerDiv.style.cursor = 'grabbing';

    // Store initial mouse position for drag calculation
    initialMouseX = e.clientX;
    initialMouseY = e.clientY;

    // Store initial div position (relative to viewport)
    // Use getBoundingClientRect for accurate position
    const rect = timerDiv.getBoundingClientRect();
    initialDivX = rect.left;
    initialDivY = rect.top;

    // Prevent default drag behavior (e.g., image dragging)
    e.preventDefault();
  });

  // Mousemove on the document to allow dragging outside the div
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const dx = e.clientX - initialMouseX;
    const dy = e.clientY - initialMouseY;

    // If mouse moved beyond threshold, it's a drag
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      dragOccurred = true;
    }

    // Calculate new position
    let newX = initialDivX + dx;
    let newY = initialDivY + dy;

    // Optional: Constrain to viewport (prevent dragging off-screen)
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const divWidth = timerDiv.offsetWidth;
    const divHeight = timerDiv.offsetHeight;

    newX = Math.max(0, Math.min(newX, viewportWidth - divWidth));
    newY = Math.max(0, Math.min(newY, viewportHeight - divHeight));

    timerDiv.style.left = `${newX}px`;
    timerDiv.style.top = `${newY}px`;
    timerDiv.style.right = 'auto'; // Disable right/bottom positioning when dragging
    timerDiv.style.bottom = 'auto'; // Ensure bottom is not interfering
  });

  // Mouseup on the document to end the drag
  document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    timerDiv.style.cursor = 'pointer'; // Reset cursor
  });

  // Click listener for single/double click actions
  timerDiv.addEventListener('click', (event) => {
    if (dragOccurred) { // If a drag just occurred, ignore this click
      dragOccurred = false; // Reset flag
      return;
    }

    if (event.detail === 1) { // Single click (restart timer)
      clickTimeout = setTimeout(() => {
        chrome.runtime.sendMessage({ type: 'RESTART_TIMER_FROM_CONTENT' });
      }, 200); // Delay to differentiate from double click
    } else if (event.detail === 2) { // Double click (stop timer)
      clearTimeout(clickTimeout); // Clear any pending single-click action
      chrome.runtime.sendMessage({ type: 'STOP_TIMER' });
    }
  });

  // Listen for timer updates from background
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'TIMER_UPDATED') {
      updateTimerDisplay(); // This will now call the async version
    }
  });
}
