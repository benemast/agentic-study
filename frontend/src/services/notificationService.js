// frontend/src/services/NotificationService.js

/**
 * Browser Notification Service
 * 
 * Handles native OS-level notifications for important events
 * Works alongside react-hot-toast for in-app notifications
 */

class NotificationService {
  constructor() {
    this.permission = 'default';
    this.enabled = false;
    this.initialized = false;
    
    // Check if notifications are supported
    this.isSupported = 'Notification' in window;
    
    // Initialize on construction
    if (this.isSupported) {
      this.permission = Notification.permission;
      this.enabled = this.permission === 'granted';
    }
  }

  /**
   * Request notification permission from user
   * @returns {Promise<string>} Permission state: 'granted', 'denied', or 'default'
   */
  async requestPermission() {
    if (!this.isSupported) {
      console.warn('Browser notifications not supported');
      return 'denied';
    }

    if (this.permission === 'granted') {
      return 'granted';
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      this.enabled = permission === 'granted';
      this.initialized = true;
      
      console.log('Notification permission:', permission);
      return permission;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return 'denied';
    }
  }

  /**
   * Send a browser notification
   * @param {string} title - Notification title
   * @param {Object} options - Notification options
   * @returns {Notification|null} Notification instance or null
   */
  send(title, options = {}) {
    if (!this.isSupported || !this.enabled) {
      console.debug('Notifications not enabled, skipping:', title);
      return null;
    }

    // Don't send if window is focused (user is actively using the app)
    if (!document.hidden && !options.force) {
      console.debug('Window is focused, skipping notification:', title);
      return null;
    }

    try {
      const notification = new Notification(title, {
        icon: options.icon || '/favicon.ico',
        badge: options.badge || '/favicon.ico',
        body: options.body || '',
        tag: options.tag || 'default', // Prevents duplicate notifications
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false,
        ...options
      });

      // Auto-close after timeout (default: 5 seconds)
      const timeout = options.timeout || 5000;
      if (timeout > 0) {
        setTimeout(() => notification.close(), timeout);
      }

      // Handle clicks
      if (options.onClick) {
        notification.onclick = (event) => {
          event.preventDefault();
          window.focus();
          options.onClick(event);
          notification.close();
        };
      }

      return notification;
    } catch (error) {
      console.error('Failed to send notification:', error);
      return null;
    }
  }

  /**
   * Send execution started notification
   */
  notifyExecutionStarted(executionId, condition) {
    const conditionName = condition === 'workflow_builder' ? 'Workflow' : 'AI Assistant';
    
    return this.send('Execution Started', {
      body: `${conditionName} execution has started`,
      tag: `execution-${executionId}`,
      icon: '/favicon.ico'
    });
  }

  /**
   * Send execution completed notification
   */
  notifyExecutionCompleted(executionId, condition, duration) {
    const conditionName = condition === 'workflow_builder' ? 'Workflow' : 'AI Assistant';
    const durationText = duration ? ` in ${Math.round(duration / 1000)}s` : '';
    
    return this.send('Execution Completed ✓', {
      body: `${conditionName} execution completed successfully${durationText}`,
      tag: `execution-${executionId}`,
      icon: '/favicon.ico',
      requireInteraction: true, // Keep visible until user interacts
      timeout: 0
    });
  }

  /**
   * Send execution failed notification
   */
  notifyExecutionFailed(executionId, condition, error) {
    const conditionName = condition === 'workflow_builder' ? 'Workflow' : 'AI Assistant';
    
    return this.send('Execution Failed ✗', {
      body: `${conditionName} execution failed: ${error || 'Unknown error'}`,
      tag: `execution-${executionId}`,
      icon: '/favicon.ico',
      requireInteraction: true,
      timeout: 0
    });
  }

  /**
   * Send progress notification (for long-running tasks)
   */
  notifyProgress(executionId, condition, progress, message) {
    const conditionName = condition === 'workflow_builder' ? 'Workflow' : 'AI Assistant';
    
    return this.send(`${conditionName} Progress: ${progress}%`, {
      body: message || 'Execution in progress...',
      tag: `execution-${executionId}-progress`,
      icon: '/favicon.ico',
      silent: true, // Don't make sound for progress updates
      timeout: 3000
    });
  }

  /**
   * Send node completion notification (Workflow Builder only)
   */
  notifyNodeCompleted(nodeId, nodeLabel) {
    return this.send('Node Completed', {
      body: `${nodeLabel || nodeId} completed successfully`,
      tag: `node-${nodeId}`,
      icon: '/favicon.ico',
      silent: true,
      timeout: 3000
    });
  }

  /**
   * Send tool progress notification (AI Assistant only)
   */
  notifyToolProgress(toolName, message) {
    return this.send(`${toolName}`, {
      body: message,
      tag: `tool-${toolName}`,
      icon: '/favicon.ico',
      silent: true,
      timeout: 3000
    });
  }

  /**
   * Check if notifications are enabled
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Get current permission state
   */
  getPermission() {
    return this.permission;
  }

  /**
   * Check if browser supports notifications
   */
  isNotificationSupported() {
    return this.isSupported;
  }

  /**
   * Enable notifications (if permission granted)
   */
  enable() {
    if (this.permission === 'granted') {
      this.enabled = true;
      return true;
    }
    return false;
  }

  /**
   * Disable notifications
   */
  disable() {
    this.enabled = false;
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;