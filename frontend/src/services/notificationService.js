// frontend/src/services/notificationService.js

/**
 * Browser Notification Service
 * 
 * Handles native OS-level notifications for important events
 * Works alongside react-hot-toast for in-app notifications
 */

/**
 * Get current favicon URL from the page
 * Falls back to default if not found
 */
const getCurrentFaviconUrl = () => {
  // Try to find the favicon link element
  const faviconLink = document.querySelector("link[rel*='icon']");
  
  if (faviconLink && faviconLink.href) {
    return faviconLink.href;
  }
  
  // Fallback to default
  return '/favicon-group-3-4.svg';
};

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
    
    // Multi-layer notification state
    this.originalTitle = document.title;
    this.originalFavicon = null;
    this.titleFlashInterval = null;
    this.pendingNotifications = [];
    this.isTabVisible = !document.hidden;
    
    // Setup visibility change listener
    this.setupVisibilityListener();
  }
  
  /**
   * Setup visibility change detection
   */
  setupVisibilityListener() {
    document.addEventListener('visibilitychange', () => {
      this.isTabVisible = !document.hidden;
      
      if (this.isTabVisible) {
        // User returned - handle pending notifications
        this.handleUserReturn();
      }
    });
  }
  
  /**
   * Handle user returning to tab
   */
  handleUserReturn() {
    if (this.pendingNotifications.length > 0) {
      // Stop title flash
      this.stopTitleFlash();
      
      // Reset favicon
      this.resetFavicon();
      
      // Show accumulated notifications as toasts
      const callback = this.pendingNotifications[0].toastCallback;
      if (callback) {
        const count = this.pendingNotifications.length;
        if (count === 1) {
          const notif = this.pendingNotifications[0];
          callback(notif.title, notif.body);
        } else {
          callback(
            `You have ${count} notifications`,
            'Check execution progress for details'
          );
        }
      }
      
      // Clear pending notifications
      this.pendingNotifications = [];
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
      
      return permission;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return 'denied';
    }
  }
  
  /**
   * Change favicon to notification version
   */
  setNotificationFavicon() {
    const link = document.querySelector("link[rel*='icon']");
    if (!link) return;
    
    // Store original if not already stored
    if (!this.originalFavicon) {
      this.originalFavicon = link.href;
    }
    
    // Create a canvas-based notification badge favicon
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    
    // Load current favicon
    const img = new Image();
    img.onload = () => {
      // Draw original favicon
      ctx.drawImage(img, 0, 0, 32, 32);
      
      // Draw notification badge (red circle)
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(24, 8, 8, 0, 2 * Math.PI);
      ctx.fill();
      
      // Draw white border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Update favicon
      link.href = canvas.toDataURL('image/png');
    };
    img.src = this.originalFavicon || getCurrentFaviconUrl();
  }
  
  /**
   * Reset favicon to original
   */
  resetFavicon() {
    if (!this.originalFavicon) return;
    
    const link = document.querySelector("link[rel*='icon']");
    if (link) {
      link.href = this.originalFavicon;
    }
  }
  
  /**
   * Start flashing page title
   */
  startTitleFlash(message) {
    // Stop any existing flash
    this.stopTitleFlash();
    
    let isOriginal = true;
    this.titleFlashInterval = setInterval(() => {
      document.title = isOriginal ? message : this.originalTitle;
      isOriginal = !isOriginal;
    }, 1500); // Flash every 1.5 seconds
  }
  
  /**
   * Stop flashing page title
   */
  stopTitleFlash() {
    if (this.titleFlashInterval) {
      clearInterval(this.titleFlashInterval);
      this.titleFlashInterval = null;
      document.title = this.originalTitle;
    }
  }


  /**
   * Send a browser notification (low-level method)
   * @param {string} title - Notification title
   * @param {Object} options - Notification options
   * @returns {Notification|null} Notification instance or null
   */
  send(title, options = {}) {
    if (!this.isSupported || !this.enabled) {
      console.debug('Notifications not enabled, skipping:', title);
      return null;
    }

    try {
      // Get current favicon dynamically
      const faviconUrl = getCurrentFaviconUrl();
      
      const notification = new Notification(title, {
        icon: options.icon || faviconUrl,
        badge: options.badge || faviconUrl,
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
   * Smart notification with multi-layer degradation strategy
   * 
   * Layers (strategically triggered):
   * 1. Browser notification (ONLY if tab hidden + permission granted)
   * 2. Favicon badge (always)
   * 3. Title flash (if tab hidden)
   * 4. Toast (immediate if visible, on return if hidden)
   * @param {string} title - Notification title
   * @param {Object} options - Notification options
   * @param {Function} toastFallback - Toast function to call if browser notification fails/not appropriate
   * @returns {Notification|null}
   */
  smartNotify(title, options = {}, toastFallback = null) {
    const isTabHidden = document.hidden;
    const hasPermission = this.enabled && this.isSupported;

    // === LAYER 1: Browser Notification (ONLY if tab hidden) ===
    let browserNotification = null;
    
    if (isTabHidden && hasPermission) {
      browserNotification = this.send(title, options);
    } 

    // === LAYER 2: Favicon Badge (ALWAYS) ===
    this.setNotificationFavicon();
    
    // Auto-reset favicon after 30 seconds if user doesn't return
    setTimeout(() => {
      if (this.pendingNotifications.length === 0) {
        this.resetFavicon();
      }
    }, 30000);

    // === LAYER 3 & 4: Title Flash + Toast on Return (if hidden) ===
    if (isTabHidden) {
      this.startTitleFlash(`${title.substring(0, 30)}...`);
      
      this.pendingNotifications.push({
        title,
        body: options.body,
        toastCallback: toastFallback
      });
    } else {
      // Tab visible - show toast immediately, NO browser notification
      if (toastFallback) {
        toastFallback(title, options.body);
      }
    }
    
    return browserNotification;
  }

  /**
   * Send execution started notification with smart degradation
   */
  notifyExecutionStarted(executionId, condition, toastFallback = null) {
    const conditionName = condition === 'workflow_builder' ? 'Workflow' : 'AI Assistant';
    
    return this.smartNotify('Execution Started', {
      body: `${conditionName} execution has started`,
      tag: `execution-${executionId}`
    }, toastFallback);
  }

  /**
   * Send execution completed notification with smart degradation
   */
  notifyExecutionCompleted(executionId, condition, duration, toastFallback = null) {
    const conditionName = condition === 'workflow_builder' ? 'Workflow' : 'AI Assistant';
    const durationText = duration ? ` in ${Math.round(duration / 1000)}s` : '';
    
    return this.smartNotify('Execution Completed', {
      body: `${conditionName} execution completed successfully${durationText}`,
      tag: `execution-${executionId}`,
      requireInteraction: true,
      timeout: 0
    }, toastFallback);
  }

  /**
   * Send execution failed notification with smart degradation
   */
  notifyExecutionFailed(executionId, condition, error, toastFallback = null) {
    const conditionName = condition === 'workflow_builder' ? 'Workflow' : 'AI Assistant';
    
    return this.smartNotify('Execution Failed', {
      body: `${conditionName} execution failed: ${error || 'Unknown error'}`,
      tag: `execution-${executionId}`,
      requireInteraction: true,
      timeout: 0
    }, toastFallback);
  }

  /**
   * Send progress notification (for long-running tasks)
   */
  notifyProgress(executionId, condition, progress, message) {
    const conditionName = condition === 'workflow_builder' ? 'Workflow' : 'AI Assistant';
    
    return this.send(`${conditionName} Progress: ${progress}%`, {
      body: message || 'Execution in progress...',
      tag: `execution-${executionId}-progress`,
      silent: true, // Don't make sound for progress updates
      timeout: 3000
    });
  }

  /**
   * Send long-running execution notification
   */
  notifyLongRunning(executionId, condition, toastFallback = null) {
    const conditionName = condition === 'workflow_builder' ? 'Workflow' : 'AI Assistant';
    
    return this.smartNotify('Analysis in Progress', {
      body: 'Working hard to create your results! Analysing can take up to a minute depending on the amount of data transmitted. Please be patient.',
      tag: `execution-${executionId}-longrunning`,
      silent: true,
      timeout: 10000
    }, toastFallback);
  }

  /**
   * Send node completion notification (Workflow Builder only)
   */
  notifyNodeCompleted(nodeId, nodeLabel) {
    return this.send('Node Completed', {
      body: `${nodeLabel || nodeId} completed successfully`,
      tag: `node-${nodeId}`,
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
  /**
   * Clear all notification indicators
   */
  clearAllIndicators() {
    this.stopTitleFlash();
    this.resetFavicon();
    this.pendingNotifications = [];
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;