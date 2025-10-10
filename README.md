# VTT Downloader - Chrome Extension

Chrome extension to download VTT files from web pages and save them as .txt files with the page title as filename.

## 📦 Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in the top right)
3. Click "Load unpacked"
4. Select the `vtt_estensione` folder
5. The extension is now installed!

## 🎨 Better Icon (Optional)

To create a nicer icon:
1. Open the `create_icon.html` file in a browser
2. The `icon.png` file will be automatically downloaded
3. Replace the icon in the extension folder
4. Reload the extension at `chrome://extensions/`

## 🚀 Usage

1. Go to a web page that contains VTT files (subtitles)
2. Click the extension icon in the toolbar
3. Click the "Download VTT" button
4. The file will be downloaded as `.txt` with the page title as filename

## 🔍 How It Works

The extension searches for VTT files in this order:

### Primary Method (Network Interception)
1. **Background script monitors network requests** - Intercepts all `.vtt` file requests via Chrome's webRequest API

### Fallback Methods (DOM & Performance API)
2. `<track>` tags (video subtitles)
3. Links with `.vtt` extension
4. `.vtt` URLs in page HTML
5. Blob URLs or Data URLs with VTT files
6. Performance API (resources loaded via XHR/Fetch)

## 📝 Project Files

- `manifest.json` - Extension configuration
- `popup.html` - User interface
- `popup.js` - Logic to find and download VTT files
- `background.js` - Background script to intercept network requests
- `icon.png` - Extension icon
- `icon.svg` - SVG version of the icon
- `create_icon.html` - PNG icon generator
- `create_icon.js` - Node.js script to create base icon

## ⚙️ Features

- ✅ Automatically finds VTT files on the page
- ✅ Intercepts VTT files loaded via network requests (XHR/Fetch)
- ✅ Downloads and converts to .txt format
- ✅ Renames the file with the page title
- ✅ Handles special characters in filenames
- ✅ Visual feedback during download process
- ✅ Complete error handling
- ✅ Works with modern video players that load subtitles dynamically

## 🛠️ Development

To modify the extension:
1. Edit the source files
2. Go to `chrome://extensions/`
3. Click the "Reload" button on the extension
4. Test your changes

## 🔧 Technical Details

### Architecture
- **Manifest V3** - Uses the latest Chrome extension manifest version
- **Service Worker** - Background script runs as a service worker
- **webRequest API** - Intercepts network requests to capture VTT files
- **Scripting API** - Injects scripts to search DOM and Performance API
- **Downloads API** - Handles file downloads with proper naming

### Why Network Interception?
Modern video players often load subtitles dynamically via XHR/Fetch requests. These files never appear in the page DOM, making them impossible to find through traditional DOM queries. The background script intercepts these network requests to capture VTT file URLs.

## 📄 License

Free to use and modify.
