/**
 * Discord Bot Dashboard - Client-side JavaScript
 * Handles UI interactions and AJAX requests
 */

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
    // Mobile sidebar toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', function() {
        sidebar.classList.toggle('active');
      });
      
      // Close sidebar when clicking outside
      document.addEventListener('click', function(event) {
        if (sidebar.classList.contains('active') && 
            !sidebar.contains(event.target) && 
            event.target !== sidebarToggle) {
          sidebar.classList.remove('active');
        }
      });
    }
    
    // Server settings form handling
    const serverSettingsForms = [
      'generalSettingsForm',
      'welcomeSettingsForm',
      'autoRoleSettingsForm',
      'commandSettingsForm'
    ];
    
    serverSettingsForms.forEach(formId => {
      const form = document.getElementById(formId);
      if (form) {
        form.addEventListener('submit', function(e) {
          e.preventDefault();
          
          // Get server ID from the URL
          const urlPath = window.location.pathname;
          const serverId = urlPath.split('/').pop();
          
          // Get form data
          const formData = new FormData(form);
          const jsonData = {};
          
          for (const [key, value] of formData.entries()) {
            // Handle checkboxes for disabled commands
            if (key === 'disabledCommands') {
              if (!jsonData[key]) {
                jsonData[key] = [];
              }
              jsonData[key].push(value);
            } else {
              jsonData[key] = value;
            }
          }
          
          // Send AJAX request
          fetch(`/dashboard/server/${serverId}/settings`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(jsonData),
          })
          .then(response => response.json())
          .then(data => {
            if (data.success) {
              showNotification('Settings saved successfully!', 'success');
            } else {
              showNotification(data.error || 'Failed to save settings', 'error');
            }
          })
          .catch(error => {
            console.error('Error:', error);
            showNotification('An error occurred while saving settings', 'error');
          });
        });
      }
    });
    
    // Toggle welcome settings based on checkbox
    const welcomeEnabled = document.getElementById('welcomeEnabled');
    if (welcomeEnabled) {
      welcomeEnabled.addEventListener('change', function() {
        document.getElementById('welcomeChannel').disabled = !this.checked;
        document.getElementById('welcomeMessage').disabled = !this.checked;
      });
    }
    
    // Toggle auto role settings based on checkbox
    const autoRoleEnabled = document.getElementById('autoRoleEnabled');
    if (autoRoleEnabled) {
      autoRoleEnabled.addEventListener('change', function() {
        document.getElementById('autoRoleId').disabled = !this.checked;
      });
    }
    
    // Tab switching in server settings
    const tabButtons = document.querySelectorAll('.nav-tabs li');
    if (tabButtons.length > 0) {
      tabButtons.forEach(button => {
        button.addEventListener('click', function() {
          // Remove active class from all tabs
          document.querySelectorAll('.nav-tabs li').forEach(tab => {
            tab.classList.remove('active');
          });
          document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
          });
          
          // Add active class to clicked tab
          this.classList.add('active');
          const tabId = this.getAttribute('data-tab');
          document.getElementById(tabId).classList.add('active');
        });
      });
    }
    
    // Bot status updater
    function updateBotStatus() {
      fetch('/api/status')
        .then(response => response.json())
        .then(data => {
          // Update status elements if they exist
          const statusElements = {
            'bot-status': data.status === 0 ? 'Online' : 'Offline',
            'bot-ping': `${data.ping} ms`,
            'bot-uptime': formatUptime(data.uptime),
            'bot-servers': data.guilds,
            'bot-users': data.users
          };
          
          for (const [id, value] of Object.entries(statusElements)) {
            const element = document.getElementById(id);
            if (element) {
              element.textContent = value;
            }
          }
        })
        .catch(error => {
          console.error('Error fetching bot status:', error);
        });
    }
    
    // Update bot status every 60 seconds if on dashboard
    if (window.location.pathname.includes('/dashboard')) {
      updateBotStatus();
      setInterval(updateBotStatus, 60000);
    }
  });
  
  /**
   * Shows a notification message
   * @param {string} message - The message to display
   * @param {string} type - The type of notification ('success' or 'error')
   */
  function showNotification(message, type = 'success') {
    // Remove any existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => {
      notification.remove();
    });
    
    // Create new notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    // Hide and remove after 3 seconds
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 3000);
  }
  
  /**
   * Formats uptime into human-readable string
   * @param {number} ms - Uptime in milliseconds
   * @returns {string} Formatted uptime
   */
  function formatUptime(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0) parts.push(`${seconds}s`);
    
    return parts.join(' ') || '0s';
  }