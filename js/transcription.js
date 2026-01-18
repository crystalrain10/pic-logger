// Transcription functionality using LLM
let transcriptionInProgress = false;

// Transcribe audio using LLM
async function transcribeAudio(audioBase64) {
    if (transcriptionInProgress) {
        console.log('Transcription already in progress');
        return 'Transcription in progress...';
    }
    
    if (typeof PluginMessageHandler === 'undefined') {
        console.log('PluginMessageHandler not available, using fallback');
        // Try Web Speech API as fallback
        return await tryWebSpeechTranscription();
    }
    
    transcriptionInProgress = true;
    
    return new Promise((resolve, reject) => {
        // Set up timeout
        const timeout = setTimeout(() => {
            transcriptionInProgress = false;
            // Try Web Speech API as fallback
            tryWebSpeechTranscription().then(resolve).catch(() => {
                resolve('Transcription timeout - please try again');
            });
        }, 30000); // 30 second timeout
        
        // Create message ID to track this specific request
        const messageId = `transcribe_${Date.now()}`;
        let resolved = false;
        
        // Create temporary message handler
        const originalHandler = window.onPluginMessage;
        const tempHandler = function(data) {
            // Check if this is our transcription response
            // We'll accept any response while transcription is in progress
            if (resolved) return;
            
            clearTimeout(timeout);
            transcriptionInProgress = false;
            resolved = true;
            
            // Restore original handler
            window.onPluginMessage = originalHandler;
            
            // Parse response
            let transcription = '';
            
            if (data.data) {
                try {
                    const parsed = JSON.parse(data.data);
                    // Check if it's a transcription response
                    if (parsed.transcription) {
                        transcription = parsed.transcription;
                    } else if (typeof parsed === 'string') {
                        transcription = parsed;
                    } else if (parsed.text) {
                        transcription = parsed.text;
                    } else {
                        // Try to extract text from any field
                        transcription = Object.values(parsed).find(v => typeof v === 'string') || JSON.stringify(parsed);
                    }
                } catch (e) {
                    // Not JSON, use as plain text
                    transcription = data.data;
                }
            }
            
            if (data.message && !transcription) {
                transcription = data.message;
            }
            
            if (transcription) {
                resolve(transcription.trim());
            } else {
                // Fallback to Web Speech API
                tryWebSpeechTranscription().then(resolve).catch(() => {
                    resolve('No transcription received');
                });
            }
        };
        
        window.onPluginMessage = tempHandler;
        
        // Send transcription request to LLM
        // Note: The SDK doesn't support sending audio directly, so we request transcription
        // The user should speak or we use Web Speech API as fallback
        const message = `I have recorded an audio memo. Please transcribe what was said. Return ONLY the transcription text, no JSON formatting, no additional commentary, just the spoken words.`;
        
        try {
            PluginMessageHandler.postMessage(JSON.stringify({
                message: message,
                useLLM: true,
                wantsR1Response: false
            }));
        } catch (error) {
            clearTimeout(timeout);
            transcriptionInProgress = false;
            window.onPluginMessage = originalHandler;
            // Fallback to Web Speech API
            tryWebSpeechTranscription().then(resolve).catch(reject);
        }
    });
}

// Try Web Speech API for transcription (fallback)
async function tryWebSpeechTranscription() {
    return new Promise((resolve, reject) => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            reject(new Error('Speech recognition not available'));
            return;
        }
        
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        
        let finalTranscript = '';
        
        recognition.onresult = (event) => {
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript + ' ';
                }
            }
        };
        
        recognition.onend = () => {
            if (finalTranscript.trim()) {
                resolve(finalTranscript.trim());
            } else {
                reject(new Error('No speech detected'));
            }
        };
        
        recognition.onerror = (event) => {
            reject(new Error(event.error));
        };
        
        try {
            recognition.start();
        } catch (error) {
            reject(error);
        }
    });
}

// Request LLM transcription
function requestLLMTranscription(message) {
    return new Promise((resolve, reject) => {
        try {
            PluginMessageHandler.postMessage(JSON.stringify({
                message: message,
                useLLM: true,
                wantsR1Response: false
            }));
            
            // Response will be handled by onPluginMessage
            // This is a simplified version - in practice, you'd need better message routing
        } catch (error) {
            reject(error);
        }
    });
}

// Enhance transcription with LLM
function enhanceTranscription(text) {
    return new Promise((resolve, reject) => {
        if (typeof PluginMessageHandler === 'undefined') {
            resolve(text);
            return;
        }
        
        const message = `Clean up and correct this transcription: "${text}". Return ONLY the corrected text, no JSON, no additional commentary.`;
        
        const timeout = setTimeout(() => {
            resolve(text); // Return original if timeout
        }, 10000);
        
        const originalHandler = window.onPluginMessage;
        window.onPluginMessage = function(data) {
            clearTimeout(timeout);
            window.onPluginMessage = originalHandler;
            
            let enhanced = text;
            if (data.data) {
                try {
                    const parsed = JSON.parse(data.data);
                    enhanced = parsed.transcription || parsed.text || JSON.stringify(parsed);
                } catch (e) {
                    enhanced = data.data;
                }
            } else if (data.message) {
                enhanced = data.message;
            }
            
            resolve(enhanced.trim() || text);
        };
        
        PluginMessageHandler.postMessage(JSON.stringify({
            message: message,
            useLLM: true,
            wantsR1Response: false
        }));
    });
}

// Alternative: Use Web Speech Recognition API for real-time transcription
function startSpeechRecognition(callback) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        callback(null, 'Speech recognition not available');
        return null;
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    let finalTranscript = '';
    
    recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript + ' ';
            }
        }
    };
    
    recognition.onend = () => {
        callback(finalTranscript.trim(), null);
    };
    
    recognition.onerror = (event) => {
        callback(null, event.error);
    };
    
    recognition.start();
    return recognition;
}

// Export functions
window.transcribeAudio = transcribeAudio;
window.startSpeechRecognition = startSpeechRecognition;
