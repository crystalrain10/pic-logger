// Camera and microphone capture functionality
let videoStream = null;
let audioStream = null;
let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;
let capturedPhoto = null;
let recordedAudio = null;

// Load capture page
function loadCapturePage(container) {
    container.innerHTML = `
        <div class="capture-container">
            <div class="capture-status" id="captureStatus">Ready</div>
            <div class="current-project" style="font-size: 9px; color: #888; margin-bottom: 6px; text-align: center;">
                Project: ${window.getCurrentProject ? window.getCurrentProject() || 'None' : 'None'}
            </div>
            <video id="videoPreview" class="capture-preview" autoplay playsinline></video>
            <div class="capture-controls">
                <button id="capturePhotoBtn" class="capture-btn">Capture Photo</button>
                <button id="recordAudioBtn" class="capture-btn secondary">Record Audio</button>
            </div>
            <div class="capture-controls">
                <button id="saveEntryBtn" class="capture-btn" disabled>Save Entry</button>
                <button id="cancelBtn" class="capture-btn secondary">Cancel</button>
            </div>
        </div>
    `;
    
    // Initialize capture module
    const captureModule = {
        videoElement: null,
        statusElement: null,
        
        init: function() {
            this.videoElement = document.getElementById('videoPreview');
            this.statusElement = document.getElementById('captureStatus');
            
            // Update project display
            if (window.updateProjectDisplay) {
                window.updateProjectDisplay();
            }
            
            // Check for current project
            if (!window.getCurrentProject || !window.getCurrentProject()) {
                this.updateStatus('Please select a project first');
            }
            
            // Start camera
            this.startCamera();
            
            // Set up event listeners
            this.setupEventListeners();
        },
        
        setupEventListeners: function() {
            document.getElementById('capturePhotoBtn').addEventListener('click', () => {
                this.capturePhoto();
            });
            
            document.getElementById('recordAudioBtn').addEventListener('click', () => {
                if (isRecording) {
                    this.stopRecording();
                } else {
                    this.startRecording();
                }
            });
            
            document.getElementById('saveEntryBtn').addEventListener('click', () => {
                this.saveEntry();
            });
            
            document.getElementById('cancelBtn').addEventListener('click', () => {
                this.cancel();
            });
        },
        
        startCamera: async function() {
            try {
                videoStream = await navigator.mediaDevices.getUserMedia({ 
                    video: { 
                        facingMode: 'environment',
                        width: { ideal: 240 },
                        height: { ideal: 320 }
                    } 
                });
                
                if (this.videoElement) {
                    this.videoElement.srcObject = videoStream;
                }
                this.updateStatus('Camera ready');
            } catch (error) {
                console.error('Error accessing camera:', error);
                this.updateStatus('Camera access denied');
            }
        },
        
        capturePhoto: function() {
            if (!this.videoElement || !videoStream) {
                this.updateStatus('Camera not available');
                return;
            }
            
            try {
                const canvas = document.createElement('canvas');
                canvas.width = this.videoElement.videoWidth || 240;
                canvas.height = this.videoElement.videoHeight || 320;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(this.videoElement, 0, 0);
                
                capturedPhoto = canvas.toDataURL('image/jpeg', 0.8);
                this.updateStatus('Photo captured');
                this.updateSaveButton();
            } catch (error) {
                console.error('Error capturing photo:', error);
                this.updateStatus('Photo capture failed');
            }
        },
        
        startRecording: async function() {
            try {
                audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                recordedChunks = [];
                
                mediaRecorder = new MediaRecorder(audioStream, {
                    mimeType: 'audio/webm;codecs=opus'
                });
                
                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        recordedChunks.push(event.data);
                    }
                };
                
                mediaRecorder.onstop = () => {
                    const blob = new Blob(recordedChunks, { type: 'audio/webm' });
                    this.convertAudioToBase64(blob);
                };
                
                mediaRecorder.start();
                isRecording = true;
                this.updateStatus('Recording...');
                
                const btn = document.getElementById('recordAudioBtn');
                if (btn) {
                    btn.textContent = 'Stop Recording';
                    btn.classList.add('recording');
                }
            } catch (error) {
                console.error('Error accessing microphone:', error);
                this.updateStatus('Microphone access denied');
            }
        },
        
        stopRecording: function() {
            if (mediaRecorder && isRecording) {
                mediaRecorder.stop();
                isRecording = false;
                
                // Stop all tracks
                if (audioStream) {
                    audioStream.getTracks().forEach(track => track.stop());
                    audioStream = null;
                }
                
                this.updateStatus('Recording stopped');
                
                const btn = document.getElementById('recordAudioBtn');
                if (btn) {
                    btn.textContent = 'Record Audio';
                    btn.classList.remove('recording');
                }
            }
        },
        
        convertAudioToBase64: function(blob) {
            const reader = new FileReader();
            reader.onloadend = () => {
                recordedAudio = reader.result; // base64 string
                this.updateStatus('Audio recorded');
                this.updateSaveButton();
            };
            reader.readAsDataURL(blob);
        },
        
        saveEntry: async function() {
            const project = window.getCurrentProject ? window.getCurrentProject() : null;
            if (!project) {
                this.updateStatus('Please select a project');
                return;
            }
            
            if (!capturedPhoto && !recordedAudio) {
                this.updateStatus('Capture photo or audio first');
                return;
            }
            
            this.updateStatus('Saving...');
            
            // If we have audio, transcribe it
            let transcription = '';
            if (recordedAudio && window.transcribeAudio) {
                try {
                    transcription = await window.transcribeAudio(recordedAudio);
                } catch (error) {
                    console.error('Transcription error:', error);
                    transcription = 'Transcription failed';
                }
            }
            
            // Save log entry
            if (window.saveLogEntry) {
                const entry = {
                    photo: capturedPhoto,
                    audio: recordedAudio,
                    transcription: transcription,
                    timestamp: new Date().toISOString()
                };
                
                await window.saveLogEntry(project, entry);
                this.updateStatus('Entry saved!');
                
                // Reset
                setTimeout(() => {
                    this.cancel();
                    // Reload capture page
                    if (typeof loadPage === 'function') {
                        loadPage('capture');
                    } else if (window.loadPage) {
                        window.loadPage('capture');
                    }
                }, 1500);
            }
        },
        
        cancel: function() {
            // Stop camera
            if (videoStream) {
                videoStream.getTracks().forEach(track => track.stop());
                videoStream = null;
            }
            
            // Stop audio
            if (audioStream) {
                audioStream.getTracks().forEach(track => track.stop());
                audioStream = null;
            }
            
            if (mediaRecorder && isRecording) {
                mediaRecorder.stop();
                isRecording = false;
            }
            
            // Reset state
            capturedPhoto = null;
            recordedAudio = null;
            recordedChunks = [];
            
            // Reload page
            const content = document.getElementById('content');
            if (content) {
                loadCapturePage(content);
            }
        },
        
        startLogEntry: function() {
            // Called by PTT button long press
            if (!window.getCurrentProject || !window.getCurrentProject()) {
                this.updateStatus('Select a project first');
                return;
            }
            
            // Auto-capture photo and start recording
            setTimeout(() => {
                this.capturePhoto();
            }, 100);
            
            setTimeout(() => {
                this.startRecording();
            }, 500);
        },
        
        updateStatus: function(message) {
            if (this.statusElement) {
                this.statusElement.textContent = message;
                if (message.includes('Recording')) {
                    this.statusElement.classList.add('recording');
                } else {
                    this.statusElement.classList.remove('recording');
                }
            }
        },
        
        updateSaveButton: function() {
            const btn = document.getElementById('saveEntryBtn');
            if (btn) {
                btn.disabled = !(capturedPhoto || recordedAudio);
            }
        },
        
        handleMessage: function(data) {
            // Handle plugin messages if needed
        }
    };
    
    // Store module reference
    pageModules.capture = captureModule;
    
    // Initialize after a short delay to ensure DOM is ready
    setTimeout(() => {
        captureModule.init();
    }, 100);
}

// Export
window.loadCapturePage = loadCapturePage;
