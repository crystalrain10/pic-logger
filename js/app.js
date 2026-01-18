// Main application logic
let currentPage = 'welcome';
let pageModules = {};

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    initializeHardwareListeners();
    
    // Check if running as R1 plugin
    if (typeof PluginMessageHandler !== 'undefined') {
        console.log('Running as R1 Creation');
    } else {
        console.log('Running in browser mode');
    }
    
    // Load initial page
    loadPage('capture');
});

// Navigation system
function initializeNavigation() {
    const menuBtn = document.getElementById('menuBtn');
    const closeMenu = document.getElementById('closeMenu');
    const menuNav = document.getElementById('menuNav');
    const menuLinks = document.querySelectorAll('.menu-nav a');
    
    // Toggle menu
    menuBtn.addEventListener('click', () => {
        menuNav.classList.add('open');
    });
    
    closeMenu.addEventListener('click', () => {
        menuNav.classList.remove('open');
    });
    
    // Handle menu navigation
    menuLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            loadPage(page);
            menuNav.classList.remove('open');
            
            // Update active state
            menuLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });
}

// Load page content
async function loadPage(pageName) {
    const content = document.getElementById('content');
    currentPage = pageName;
    
    // Clear current content
    content.innerHTML = '';
    
    // Load page-specific content
    switch(pageName) {
        case 'capture':
            if (typeof loadCapturePage === 'function') {
                loadCapturePage(content);
            }
            break;
        case 'logs':
            if (typeof loadLogsPage === 'function') {
                loadLogsPage(content);
            }
            break;
        case 'projects':
            if (typeof loadProjectsPage === 'function') {
                loadProjectsPage(content);
            }
            break;
        default:
            content.innerHTML = '<div class="welcome"><h2>Welcome</h2><p>Select an option from the menu.</p></div>';
    }
}

// Hardware button listeners
function initializeHardwareListeners() {
    // PTT button - long press to start log entry
    window.addEventListener('longPressStart', () => {
        if (currentPage === 'capture' && pageModules.capture) {
            pageModules.capture.startLogEntry();
        }
    });
    
    // Scroll wheel for navigation
    window.addEventListener('scrollUp', () => {
        // Could be used for scrolling logs or navigating
        if (currentPage === 'logs' && pageModules.logs) {
            pageModules.logs.scrollUp();
        }
    });
    
    window.addEventListener('scrollDown', () => {
        if (currentPage === 'logs' && pageModules.logs) {
            pageModules.logs.scrollDown();
        }
    });
}

// Plugin message handler
window.onPluginMessage = function(data) {
    console.log('Received plugin message:', data);
    
    // Route to appropriate page handler
    if (currentPage === 'capture' && pageModules.capture) {
        pageModules.capture.handleMessage(data);
    } else if (currentPage === 'logs' && pageModules.logs) {
        pageModules.logs.handleMessage(data);
    }
};

// Export for global access
window.currentPage = () => currentPage;
window.pageModules = pageModules;
window.loadPage = loadPage;
