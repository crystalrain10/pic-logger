// Log storage and display functionality

// Save log entry
async function saveLogEntry(projectName, entry) {
    if (!projectName || !entry) {
        console.error('Invalid project name or entry');
        return false;
    }
    
    try {
        // Generate entry ID
        const entryId = `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        entry.id = entryId;
        
        // Load existing logs for this project
        const logs = await loadProjectLogs(projectName);
        
        // Add new entry
        logs.entries.push(entry);
        
        // Sort by timestamp (newest first)
        logs.entries.sort((a, b) => {
            return new Date(b.timestamp) - new Date(a.timestamp);
        });
        
        // Save back to storage
        const storageKey = `log_${projectName}`;
        const dataString = JSON.stringify(logs);
        
        if (typeof window.creationStorage !== 'undefined') {
            await window.creationStorage.plain.setItem(storageKey, btoa(dataString));
        } else {
            // Fallback for browser testing
            localStorage.setItem(`pic_logger_${storageKey}`, dataString);
        }
        
        return true;
    } catch (error) {
        console.error('Error saving log entry:', error);
        return false;
    }
}

// Load project logs
async function loadProjectLogs(projectName) {
    try {
        const storageKey = `log_${projectName}`;
        let dataString = null;
        
        if (typeof window.creationStorage !== 'undefined') {
            const stored = await window.creationStorage.plain.getItem(storageKey);
            if (stored) {
                dataString = atob(stored);
            }
        } else {
            // Fallback for browser testing
            dataString = localStorage.getItem(`pic_logger_${storageKey}`);
        }
        
        if (dataString) {
            const logs = JSON.parse(dataString);
            // Ensure entries array exists
            if (!logs.entries) {
                logs.entries = [];
            }
            return logs;
        }
    } catch (error) {
        console.error('Error loading project logs:', error);
    }
    
    // Return empty logs structure
    return {
        projectName: projectName,
        entries: []
    };
}

// Delete project logs
async function deleteProjectLogs(projectName) {
    try {
        const storageKey = `log_${projectName}`;
        
        if (typeof window.creationStorage !== 'undefined') {
            await window.creationStorage.plain.removeItem(storageKey);
        } else {
            localStorage.removeItem(`pic_logger_${storageKey}`);
        }
        
        return true;
    } catch (error) {
        console.error('Error deleting project logs:', error);
        return false;
    }
}

// Delete specific log entry
async function deleteLogEntry(projectName, entryId) {
    try {
        const logs = await loadProjectLogs(projectName);
        logs.entries = logs.entries.filter(entry => entry.id !== entryId);
        
        const storageKey = `log_${projectName}`;
        const dataString = JSON.stringify(logs);
        
        if (typeof window.creationStorage !== 'undefined') {
            await window.creationStorage.plain.setItem(storageKey, btoa(dataString));
        } else {
            localStorage.setItem(`pic_logger_${storageKey}`, dataString);
        }
        
        return true;
    } catch (error) {
        console.error('Error deleting log entry:', error);
        return false;
    }
}

// Load logs page
async function loadLogsPage(container) {
    const project = window.getCurrentProject ? window.getCurrentProject() : null;
    
    if (!project) {
        container.innerHTML = `
            <div class="logs-container">
                <div class="empty-logs">Please select a project first</div>
            </div>
        `;
        return;
    }
    
    // Load logs
    const logs = await loadProjectLogs(project);
    
    container.innerHTML = `
        <div class="logs-container">
            <div class="logs-header">
                <h3>${project}</h3>
                <span style="font-size: 9px; color: #888;">${logs.entries.length} entries</span>
            </div>
            <div class="log-entry-list" id="logEntryList">
                ${logs.entries.length === 0 ? '<div class="empty-logs">No entries yet</div>' : ''}
            </div>
        </div>
    `;
    
    // Render entries
    const entryList = document.getElementById('logEntryList');
    if (entryList && logs.entries.length > 0) {
        logs.entries.forEach(entry => {
            renderLogEntry(entryList, entry, project);
        });
    }
    
    // Initialize logs module
    const logsModule = {
        scrollPosition: 0,
        
        scrollUp: function() {
            const list = document.getElementById('logEntryList');
            if (list) {
                this.scrollPosition = Math.max(0, this.scrollPosition - 50);
                list.scrollTop = this.scrollPosition;
            }
        },
        
        scrollDown: function() {
            const list = document.getElementById('logEntryList');
            if (list) {
                this.scrollPosition += 50;
                list.scrollTop = this.scrollPosition;
            }
        },
        
        handleMessage: function(data) {
            // Handle plugin messages if needed
        }
    };
    
    pageModules.logs = logsModule;
}

// Render a single log entry
function renderLogEntry(container, entry, project) {
    const entryDiv = document.createElement('div');
    entryDiv.className = 'log-entry';
    entryDiv.dataset.entryId = entry.id;
    
    const date = new Date(entry.timestamp);
    const timeString = date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    let html = `
        <div class="log-entry-header">
            <span class="log-entry-time">${timeString}</span>
        </div>
    `;
    
    if (entry.photo) {
        html += `<img src="${entry.photo}" class="log-entry-thumb" alt="Photo">`;
    }
    
    if (entry.transcription) {
        const shortText = entry.transcription.length > 50 
            ? entry.transcription.substring(0, 50) + '...' 
            : entry.transcription;
        html += `<div class="log-entry-text">${escapeHtml(shortText)}</div>`;
    } else if (entry.audio) {
        html += `<div class="log-entry-text" style="color: #888;">Audio recorded (no transcription)</div>`;
    }
    
    html += `
        <div class="log-entry-detail">
            ${entry.transcription ? `<div class="log-entry-detail-text">${escapeHtml(entry.transcription)}</div>` : ''}
            <div class="log-entry-detail-actions">
                <button class="log-entry-btn" onclick="deleteEntry('${entry.id}', '${project}')">Delete</button>
            </div>
        </div>
    `;
    
    entryDiv.innerHTML = html;
    
    // Toggle expand on click
    entryDiv.addEventListener('click', (e) => {
        if (!e.target.classList.contains('log-entry-btn')) {
            entryDiv.classList.toggle('expanded');
        }
    });
    
    container.appendChild(entryDiv);
}

// Delete entry handler
async function deleteEntry(entryId, projectName) {
    if (confirm('Delete this entry?')) {
        await deleteLogEntry(projectName, entryId);
        // Reload logs page
        const content = document.getElementById('content');
        if (content) {
            loadLogsPage(content);
        }
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export functions
window.saveLogEntry = saveLogEntry;
window.loadProjectLogs = loadProjectLogs;
window.deleteProjectLogs = deleteProjectLogs;
window.deleteLogEntry = deleteLogEntry;
window.loadLogsPage = loadLogsPage;
window.deleteEntry = deleteEntry;
