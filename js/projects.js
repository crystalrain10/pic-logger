// Project management functionality
let currentProject = null;
let projectsList = [];

// Load projects from storage
async function loadProjects() {
    try {
        if (typeof window.creationStorage !== 'undefined') {
            const stored = await window.creationStorage.plain.getItem('projects');
            if (stored) {
                const data = JSON.parse(atob(stored));
                projectsList = data.projects || [];
                currentProject = data.currentProject || null;
                
                // If no current project but projects exist, select first
                if (!currentProject && projectsList.length > 0) {
                    currentProject = projectsList[0];
                    await saveProjects();
                }
            }
        } else {
            // Fallback for browser testing
            const stored = localStorage.getItem('pic_logger_projects');
            if (stored) {
                const data = JSON.parse(stored);
                projectsList = data.projects || [];
                currentProject = data.currentProject || null;
            }
        }
    } catch (error) {
        console.error('Error loading projects:', error);
        projectsList = [];
        currentProject = null;
    }
}

// Save projects to storage
async function saveProjects() {
    try {
        const data = {
            projects: projectsList,
            currentProject: currentProject
        };
        
        if (typeof window.creationStorage !== 'undefined') {
            await window.creationStorage.plain.setItem('projects', btoa(JSON.stringify(data)));
        } else {
            // Fallback for browser testing
            localStorage.setItem('pic_logger_projects', JSON.stringify(data));
        }
    } catch (error) {
        console.error('Error saving projects:', error);
    }
}

// Get current project
function getCurrentProject() {
    return currentProject;
}

// Set current project
async function setCurrentProject(projectName) {
    if (projectsList.includes(projectName)) {
        currentProject = projectName;
        await saveProjects();
        return true;
    }
    return false;
}

// Create new project
async function createProject(projectName) {
    if (!projectName || projectName.trim() === '') {
        return false;
    }
    
    const trimmedName = projectName.trim();
    
    // Check if project already exists
    if (projectsList.includes(trimmedName)) {
        return false;
    }
    
    projectsList.push(trimmedName);
    currentProject = trimmedName;
    await saveProjects();
    return true;
}

// Delete project
async function deleteProject(projectName) {
    const index = projectsList.indexOf(projectName);
    if (index > -1) {
        projectsList.splice(index, 1);
        
        // If deleted project was current, select another or clear
        if (currentProject === projectName) {
            currentProject = projectsList.length > 0 ? projectsList[0] : null;
        }
        
        await saveProjects();
        return true;
    }
    return false;
}

// Load projects page
function loadProjectsPage(container) {
    container.innerHTML = `
        <div class="projects-container">
            <div class="project-selector">
                <label>Current Project</label>
                <select id="projectSelect">
                    <option value="">No project selected</option>
                </select>
            </div>
            <div class="new-project">
                <input type="text" id="newProjectName" placeholder="New project name">
                <button id="createProjectBtn">Create Project</button>
                <button id="deleteProjectBtn" class="capture-btn secondary" style="margin-top: 6px;">Delete Current</button>
            </div>
        </div>
    `;
    
    // Populate project selector
    const select = document.getElementById('projectSelect');
    projectsList.forEach(project => {
        const option = document.createElement('option');
        option.value = project;
        option.textContent = project;
        if (project === currentProject) {
            option.selected = true;
        }
        select.appendChild(option);
    });
    
    // Handle project selection
    select.addEventListener('change', async (e) => {
        const selected = e.target.value;
        if (selected) {
            await setCurrentProject(selected);
            updateProjectDisplay();
        }
    });
    
    // Handle create project
    document.getElementById('createProjectBtn').addEventListener('click', async () => {
        const input = document.getElementById('newProjectName');
        const name = input.value;
        
        if (name) {
            const success = await createProject(name);
            if (success) {
                input.value = '';
                // Reload page to update selector
                loadProjectsPage(container);
            } else {
                alert('Project name already exists or is invalid');
            }
        }
    });
    
    // Handle delete project
    document.getElementById('deleteProjectBtn').addEventListener('click', async () => {
        if (currentProject) {
            if (confirm(`Delete project "${currentProject}"? This will also delete all logs.`)) {
                await deleteProject(currentProject);
                // Also delete logs for this project
                if (typeof deleteProjectLogs === 'function') {
                    await deleteProjectLogs(currentProject);
                }
                loadProjectsPage(container);
            }
        }
    });
}

// Update project display in other pages
function updateProjectDisplay() {
    // Update header or status displays if needed
    const statusElements = document.querySelectorAll('.current-project');
    statusElements.forEach(el => {
        el.textContent = currentProject || 'No project';
    });
}

// Initialize projects on load
loadProjects();

// Export functions
window.getCurrentProject = getCurrentProject;
window.setCurrentProject = setCurrentProject;
window.createProject = createProject;
window.deleteProject = deleteProject;
window.loadProjectsPage = loadProjectsPage;
window.updateProjectDisplay = updateProjectDisplay;
