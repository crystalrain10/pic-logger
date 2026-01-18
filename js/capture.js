// Camera and microphone capture functionality
let videoStream = null;
let audioStream = null;
let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;
let capturedPhoto = null;
let recordedAudio = null;
let currentTranscription = '';

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
            const self = this;
            
            document.getElementById('capturePhotoBtn').addEventListener('click', () => {
                self.capturePhoto();
            });
            
            document.getElementById('recordAudioBtn').addEventListener('click', () => {
                if (isRecording) {
                    self.stopRecording();
                } else {
                    self.startRecording();
                }
            });
            
            document.getElementById('saveEntryBtn').addEventListener('click', () => {
                self.saveEntry();
            });
            
            document.getElementById('cancelBtn').addEventListener('click', () => {
                self.cancel();
            });
        },
        
        startCamera: async function() {
            try {
                // R1 screen is 240x282px, request camera with proper aspect ratio
                const constraints = {
                    video: { 
                        facingMode: 'environment',
                        width: { ideal: 240 },
                        height: { ideal: 282 }
                    } 
                };
                
                videoStream = await navigator.mediaDevices.getUserMedia(constraints);
                
                if (this.videoElement) {
                    this.videoElement.srcObject = videoStream;
                    
                    // Wait for video metadata to load
                    this.videoElement.addEventListener('loadedmetadata', () => {
                        // Force video to fill container
                        this.videoElement.style.width = '100%';
                        this.videoElement.style.height = '190px';
                        this.videoElement.style.objectFit = 'cover';
                        this.videoElement.style.display = 'block';
                    }, { once: true });
                    
                    // Set initial styles immediately
                    this.videoElement.style.width = '100%';
                    this.videoElement.style.height = '190px';
                    this.videoElement.style.objectFit = 'cover';
                    this.videoElement.style.display = 'block';
                    this.videoElement.style.backgroundColor = '#000';
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
                // Use R1 screen aspect ratio: 240x282
                const targetWidth = 240;
                const targetHeight = 282;
                canvas.width = targetWidth;
                canvas.height = targetHeight;
                const ctx = canvas.getContext('2d');
                
                // Draw video to canvas, covering the full area
                ctx.drawImage(this.videoElement, 0, 0, targetWidth, targetHeight);
                
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
                currentTranscription = '';
                
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
            
            // Transcribe audio using R1 LLM dictation
            let transcription = '';
            if (recordedAudio && window.transcribeAudio) {
                try {
                    this.updateStatus('Transcribing...');
                    transcription = await window.transcribeAudio(recordedAudio);
                    if (!transcription || transcription.trim() === '') {
                        transcription = 'Audio recorded (transcription unavailable)';
                    }
                } catch (error) {
                    console.error('Transcription error:', error);
                    transcription = 'Audio recorded (transcription failed)';
                }
            } else if (recordedAudio) {
                transcription = 'Audio recorded (transcription not available)';
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
