# Pic Logger - Rabbit R1 Creation

A Rabbit R1 creation that enables you to capture photos and voice memos, transcribe them using the R1 LLM, and store everything in project-organized logs with timestamps.

## Features

- 📸 **Photo Capture**: Take pictures using the Rabbit R1 camera
- 🎤 **Voice Memos**: Record audio notes
- 📝 **Transcription**: Automatically transcribe voice memos using the R1 LLM
- 📁 **Project Organization**: Organize logs by project
- ⏰ **Timestamps**: Every entry includes a timestamp
- 🔍 **Log Viewing**: Browse and search through your log entries
- 🎯 **Quick Access**: Use PTT button (long press) to quickly start a log entry

## File Structure

```
pic-logger/
├── index.html          # Main app
├── qr-generator.html   # QR code generator for R1 scanning
├── css/
│   └── styles.css      # Styling (240x282px optimized)
├── js/
│   ├── app.js          # Main app logic & navigation
│   ├── projects.js     # Project management
│   ├── capture.js      # Camera & microphone capture
│   ├── transcription.js # LLM transcription handling
│   └── logs.js         # Log storage & display
└── README.md           # This file
```

## Setup & Deployment

### 1. Host the App

#### Option A: GitHub Pages (Recommended)

1. Create a new public repository on GitHub
2. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/pic-logger.git
   cd pic-logger
   ```
3. Copy the `pic-logger` folder contents to your repository
4. Commit and push:
   ```bash
   git add .
   git commit -m "Initial commit: Pic Logger creation"
   git push origin main
   ```
5. Enable GitHub Pages:
   - Go to repository Settings → Pages
   - Select branch: `main`
   - Select folder: `/ (root)`
   - Click Save
6. Your app will be available at: `https://yourusername.github.io/pic-logger/`

#### Option B: Netlify or Vercel

1. Sign up at [netlify.com](https://netlify.com) or [vercel.com](https://vercel.com)
2. Connect your GitHub repository or drag & drop the `pic-logger` folder
3. Deploy automatically
4. Get your deployment URL

### 2. Generate QR Code

1. Open `qr-generator.html` in a web browser (can be local file)
2. Fill in the form:
   - **Title**: "Pic Logger"
   - **URL**: Your hosted URL (e.g., `https://yourusername.github.io/pic-logger/`)
   - **Description**: "Capture photos and voice memos with transcription"
   - **Icon URL**: (Optional) URL to a 512x512px icon
   - **Theme Color**: `#FE5000` (Rabbit orange)
3. Click "Generate QR Code"
4. Download the QR code image

### 3. Add Icon (Optional)

Create a 512x512px PNG icon and:
- Upload it to your repository as `icon.png`
- Use the URL in the QR generator: `https://yourusername.github.io/pic-logger/icon.png`

### 4. Scan with Rabbit R1

1. Open the camera on your Rabbit R1
2. Scan the generated QR code
3. The Pic Logger app will open

## Usage

### Creating a Project

1. Open the menu (☰) and select "Projects"
2. Enter a project name and click "Create Project"
3. Select the project from the dropdown

### Capturing a Log Entry

**Method 1: Manual**
1. Go to "Capture" page
2. Click "Capture Photo" to take a picture
3. Click "Record Audio" to record a voice memo
4. Click "Save Entry" to save

**Method 2: Quick (PTT Button)**
1. Long press the PTT (side) button
2. App will automatically capture photo and start recording
3. Release to stop recording
4. Entry is saved automatically

### Viewing Logs

1. Open the menu and select "Logs"
2. Browse entries for the current project
3. Click an entry to expand and see full transcription
4. Delete entries by clicking "Delete" in expanded view

## Technical Details

### Storage

- Uses `window.creationStorage.plain` for persistent storage
- Data is stored per project
- Each entry includes: photo (base64), audio (base64), transcription, timestamp

### Transcription

- Primary: Uses R1 LLM via `PluginMessageHandler` with `useLLM: true`
- Fallback: Web Speech API (if available in browser)
- Transcription is requested after audio recording stops

### Permissions

- **Camera**: Required for photo capture
- **Microphone**: Required for voice memo recording
- Both permissions are requested automatically on first use

## Browser Testing

The app includes fallback storage using `localStorage` for testing in a regular browser. However, full functionality (especially transcription) requires running as an R1 creation.

## Limitations

- **Storage Size**: Base64 images and audio can be large. Consider storage limits.
- **Transcription**: LLM transcription requires the app to be running as an R1 creation.
- **Screen Size**: UI is optimized for 240x282px (Rabbit R1 screen).

## Troubleshooting

**Camera/Microphone not working:**
- Ensure HTTPS is enabled (required in production)
- Check browser/device permissions
- Try refreshing the page

**Transcription not working:**
- Ensure you're running as an R1 creation (not just in browser)
- Check that `PluginMessageHandler` is available
- Try the Web Speech API fallback

**Storage issues:**
- Check available storage space
- Consider deleting old entries
- Verify `creationStorage` API is available

## License

See LICENSE file in parent directory.
