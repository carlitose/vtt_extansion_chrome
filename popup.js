document.getElementById('downloadBtn').addEventListener('click', async () => {
  const button = document.getElementById('downloadBtn');
  const status = document.getElementById('status');

  button.disabled = true;
  status.className = 'info';
  status.textContent = 'Searching for VTT files...';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Collect all VTT URLs from different sources
    const allVttUrls = [];

    // First try to get VTT files from background script (intercepted network requests)
    const bgResponse = await chrome.runtime.sendMessage({
      action: 'getVttFiles',
      tabId: tab.id
    });

    // If background script found VTT files, add them all
    if (bgResponse && bgResponse.vttFiles && bgResponse.vttFiles.length > 0) {
      allVttUrls.push(...bgResponse.vttFiles);
      console.log('VTT files found from background script:', bgResponse.vttFiles);
    }

    // Also try to find VTT files in the page
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: findVTTInPage
    });

    if (results && results[0] && results[0].result && results[0].result.length > 0) {
      allVttUrls.push(...results[0].result);
      console.log('VTT files found in page:', results[0].result);
    }

    // Remove duplicates by converting to Set and back to Array
    const uniqueVttUrls = [...new Set(allVttUrls)];

    if (uniqueVttUrls.length === 0) {
      status.className = 'error';
      status.textContent = 'No VTT file found on the page';
      return;
    }

    // Update status to show progress
    status.className = 'info';
    status.textContent = `Downloading ${uniqueVttUrls.length} VTT file${uniqueVttUrls.length > 1 ? 's' : ''}...`;

    // Download all VTT files
    const downloadResults = [];
    for (let i = 0; i < uniqueVttUrls.length; i++) {
      const result = await downloadVTT(uniqueVttUrls[i], tab.title, i + 1, uniqueVttUrls.length);
      downloadResults.push(result);
    }

    // Show final status
    const successCount = downloadResults.filter(r => r.success).length;
    const failCount = downloadResults.length - successCount;

    if (successCount === downloadResults.length) {
      status.className = 'success';
      const filenames = downloadResults.map(r => r.filename).join(', ');
      status.textContent = `Successfully downloaded ${successCount} file${successCount > 1 ? 's' : ''}: ${filenames}`;
    } else if (successCount > 0) {
      status.className = 'success';
      status.textContent = `Downloaded ${successCount}/${downloadResults.length} files (${failCount} failed)`;
    } else {
      status.className = 'error';
      status.textContent = 'All downloads failed';
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
  const vttUrls = [];

  // 1. Search for <track> tags with VTT files
  const tracks = document.querySelectorAll('track[src*=".vtt"], track[kind="subtitles"], track[kind="captions"]');
  tracks.forEach(track => {
    if (track.src) {
      vttUrls.push(track.src);
    }
  });

  // 2. Search for links with .vtt extension
  const links = document.querySelectorAll('a[href*=".vtt"]');
  links.forEach(link => {
    if (link.href) {
      vttUrls.push(link.href);
    }
  });

  // 3. Search in HTML for VTT file URLs
  const bodyText = document.body.innerHTML;
  const vttMatches = bodyText.matchAll(/(https?:\/\/[^\s<>"]+\.vtt[^\s<>"]*)/gi);
  for (const match of vttMatches) {
    vttUrls.push(match[1]);
  }

  // 4. Search for blob URLs or data URLs
  const allLinks = document.querySelectorAll('a[href^="blob:"], a[href^="data:text/vtt"]');
  allLinks.forEach(link => {
    if (link.href) {
      vttUrls.push(link.href);
    }
  });

  // 5. Search in Performance API (resources loaded via XHR/Fetch)
  if (window.performance) {
    const resources = performance.getEntriesByType('resource');
    resources.forEach(r => {
      if (r.name.includes('.vtt')) {
        vttUrls.push(r.name);
      }
    });
  }

  return vttUrls;
}

// Function to download the VTT (executed in popup context)
async function downloadVTT(vttUrl, pageTitle, index, totalFiles) {
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

    // Add index suffix only if there are multiple files
    const filename = totalFiles > 1
      ? `${cleanTitle}_${index}.txt`
      : `${cleanTitle}.txt`;

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
