document.getElementById('downloadBtn').addEventListener('click', async () => {
  const button = document.getElementById('downloadBtn');
  const status = document.getElementById('status');

  button.disabled = true;
  status.className = 'info';
  status.textContent = 'Searching for VTT files...';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // First try to get VTT files from background script (intercepted network requests)
    const bgResponse = await chrome.runtime.sendMessage({
      action: 'getVttFiles',
      tabId: tab.id
    });

    let vttUrl = null;

    // If background script found VTT files, use the first one
    if (bgResponse && bgResponse.vttFiles && bgResponse.vttFiles.length > 0) {
      vttUrl = bgResponse.vttFiles[0];
      console.log('VTT found from background script:', vttUrl);
    }

    // If not found in background, try to find it in the page
    if (!vttUrl) {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: findVTTInPage
      });

      if (results && results[0] && results[0].result) {
        vttUrl = results[0].result;
        console.log('VTT found in page:', vttUrl);
      }
    }

    if (!vttUrl) {
      status.className = 'error';
      status.textContent = 'No VTT file found on the page';
      return;
    }

    // Download the VTT file
    const result = await downloadVTT(vttUrl, tab.title);

    if (result.success) {
      status.className = 'success';
      status.textContent = `File downloaded: ${result.filename}`;
    } else {
      status.className = 'error';
      status.textContent = result.error || 'Error during download';
    }
  } catch (error) {
    status.className = 'error';
    status.textContent = 'Error: ' + error.message;
  } finally {
    button.disabled = false;
  }
});

// Function executed in page to search for VTT in DOM and Performance API
function findVTTInPage() {
  let vttUrl = null;

  // 1. Search for <track> tags with VTT files
  const tracks = document.querySelectorAll('track[src*=".vtt"], track[kind="subtitles"], track[kind="captions"]');
  if (tracks.length > 0) {
    vttUrl = tracks[0].src;
  }

  // 2. Search for links with .vtt extension
  if (!vttUrl) {
    const links = document.querySelectorAll('a[href*=".vtt"]');
    if (links.length > 0) {
      vttUrl = links[0].href;
    }
  }

  // 3. Search in HTML for VTT file URLs
  if (!vttUrl) {
    const bodyText = document.body.innerHTML;
    const vttMatch = bodyText.match(/(https?:\/\/[^\s<>"]+\.vtt[^\s<>"]*)/i);
    if (vttMatch) {
      vttUrl = vttMatch[1];
    }
  }

  // 4. Search for blob URLs or data URLs
  if (!vttUrl) {
    const allLinks = document.querySelectorAll('a[href^="blob:"], a[href^="data:text/vtt"]');
    if (allLinks.length > 0) {
      vttUrl = allLinks[0].href;
    }
  }

  // 5. Search in Performance API (resources loaded via XHR/Fetch)
  if (!vttUrl && window.performance) {
    const resources = performance.getEntriesByType('resource');
    const vttResource = resources.find(r => r.name.includes('.vtt'));
    if (vttResource) {
      vttUrl = vttResource.name;
    }
  }

  return vttUrl;
}

// Function to download the VTT (executed in popup context)
async function downloadVTT(vttUrl, pageTitle) {
  try {
    // Download the VTT file content
    const response = await fetch(vttUrl);
    if (!response.ok) {
      return { success: false, error: `Download error: ${response.status}` };
    }

    const vttContent = await response.text();

    // Clean the page title to use as filename
    let cleanTitle = pageTitle || 'subtitles';
    cleanTitle = cleanTitle
      .replace(/[<>:"/\\|?*]/g, '_')  // Remove invalid characters
      .replace(/\s+/g, '_')            // Replace spaces with underscores
      .substring(0, 100);              // Limit length

    const filename = `${cleanTitle}.txt`;

    // Create a blob and download the file
    const blob = new Blob([vttContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    // Use chrome.downloads API to download
    await chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: false
    });

    // Clean up the blob URL after a moment
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    return { success: true, filename: filename };

  } catch (error) {
    return { success: false, error: error.message };
  }
}
