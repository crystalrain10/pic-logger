// Transcription functionality using R1 LLM dictation
let transcriptionInProgress = false;
let transcriptionRequestId = null;

// Transcribe audio using R1's built-in LLM dictation
async function transcribeAudio(audioBase64) {
    if (transcriptionInProgress) {
        console.log('Transcription already in progress');
        return 'Transcription in progress...';
    }
    
    if (typeof PluginMessageHandler === 'undefined') {
        console.log('PluginMessageHandler not available');
        return 'Transcription not available (not running as R1 creation)';
    }
    
    transcriptionInProgress = true;
    transcriptionRequestId = `transcribe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return new Promise((resolve, reject) => {
        // Set up timeout
        const timeout = setTimeout(() => {
            transcriptionInProgress = false;
            transcriptionRequestId = null;
            resolve('Transcription timeout - please try again');
        }, 30000); // 30 second timeout
        
        // Create temporary message handler
        const originalHandler = window.onPluginMessage;
        let resolved = false;
        
        const tempHandler = function(data) {
            if (resolved) return;
            
            clearTimeout(timeout);
            transcriptionInProgress = false;
            transcriptionRequestId = null;
            resolved = true;
            
            // Restore original handler
            window.onPluginMessage = originalHandler;
            
            // Parse response
            let transcription = '';
            
            if (data.data) {
                try {
                    const parsed = JSON.parse(data.data);
                    // Extract transcription from various possible formats
                    if (parsed.transcription) {
                        transcription = parsed.transcription;
                    } else if (parsed.text) {
                        transcription = parsed.text;
                    } else if (parsed.message) {
                        transcription = parsed.message;
                    } else if (typeof parsed === 'string') {
                        transcription = parsed;
                    } else {
                        // Try to find any string value
                        const stringValue = Object.values(parsed).find(v => typeof v === 'string' && v.length > 10);
                        transcription = stringValue || JSON.stringify(parsed);
                    }
                } catch (e) {
                    // Not JSON, use as plain text
                    transcription = data.data;
                }
            }
            
            if (data.message && !transcription) {
                transcription = data.message;
            }
            
            // Filter out generic completion messages
            if (transcription) {
                const lowerTranscription = transcription.toLowerCase();
                if (lowerTranscription.includes("user's request has been completed") || 
                    lowerTranscription.includes("request completed") ||
                    lowerTranscription.includes("task completed") ||
                    lowerTranscription.includes("i've completed") ||
                    lowerTranscription.includes("completed your request") ||
                    lowerTranscription.includes("i have completed")) {
                    resolve('Transcription unavailable - please try recording again');
                } else {
                    resolve(transcription.trim());
                }
            } else {
                resolve('No transcription received');
            }
        };
        
        window.onPluginMessage = tempHandler;
        
        // Request transcription from R1 LLM
        // The R1 device should have access to the audio that was just recorded
        // Use a clear, direct instruction for dictation/transcription
        const message = `Please transcribe the audio memo that was just recorded on this device. Return ONLY the transcription of what was said, as plain text. Do not include any commentary, confirmation messages, or JSON formatting. Just return the spoken words exactly as they were said. If you cannot access the audio, return the text "Transcription unavailable".`;
        
        try {
            PluginMessageHandler.postMessage(JSON.stringify({
                message: message,
                useLLM: true,
                wantsR1Response: false
            }));
        } catch (error) {
            clearTimeout(timeout);
            transcriptionInProgress = false;
            transcriptionRequestId = null;
            window.onPluginMessage = originalHandler;
            reject(error);
        }
    });
}

// Export functions
window.transcribeAudio = transcribeAudio;
