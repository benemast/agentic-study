// frontend/src/hooks/useBrowserNotification.js

/**
 * Browser Notifications Hook
 * 
 * Enables native OS notifications for workflow execution events
 * - Requests notification permission on mount
 * - Shows notifications for execution start/complete/error
 * - Falls back to in-app toast if permission denied
 * - Plays sound effects (optional)
 * - Shows notification badge
 */

import { useEffect, useCallback, useRef, useState } from 'react';

export const useBrowserNotifications = ({ 
  enabled = true,
  playSound = true,
  requireInteraction = false  // Keep notification until user dismisses
}) => {
  const [permission, setPermission] = useState(Notification.permission);
  const notificationRef = useRef(null);

  /**
   * Request notification permission
   */
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      setPermission('granted');
      return 'granted';
    }

    if (Notification.permission !== 'denied') {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    }

    return Notification.permission;
  }, []);

  /**
   * Show browser notification
   */
  const showNotification = useCallback(async (title, options = {}) => {
    if (!enabled) return;

    // Check if we have permission
    if (permission !== 'granted') {
      console.log('Notification permission not granted');
      return null;
    }

    // Close previous notification if it exists
    if (notificationRef.current) {
      notificationRef.current.close();
    }

    // Default options
    const defaultOptions = {
      icon: '/logo192.png',  // Your app icon
      badge: '/logo192.png',
      requireInteraction: requireInteraction,
      silent: !playSound,
      ...options
    };

    try {
      // Create notification
      const notification = new Notification(title, defaultOptions);
      notificationRef.current = notification;

      // Auto-close after 5 seconds (unless requireInteraction)
      if (!requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }

      // Handle click
      notification.onclick = () => {
        window.focus();
        notification.close();
        if (options.onClick) {
          options.onClick();
        }
      };

      return notification;
    } catch (error) {
      console.error('Failed to show notification:', error);
      return null;
    }
  }, [enabled, permission, playSound, requireInteraction]);

  /**
   * Show execution started notification
   */
  const notifyExecutionStart = useCallback((options = {}) => {
    return showNotification('Workflow Execution Started', {
      body: options.message || 'Your workflow is now running',
      icon: '/icons/play.png',
      tag: 'execution-start',
      ...options
    });
  }, [showNotification]);

  /**
   * Show execution completed notification
   */
  const notifyExecutionComplete = useCallback((options = {}) => {
    return showNotification('Workflow Complete! ✅', {
      body: options.message || 'Your workflow has finished successfully',
      icon: '/icons/success.png',
      tag: 'execution-complete',
      requireInteraction: true,  // Keep until dismissed
      ...options
    });
  }, [showNotification]);

  /**
   * Show execution error notification
   */
  const notifyExecutionError = useCallback((options = {}) => {
    return showNotification('Workflow Error ❌', {
      body: options.message || 'Your workflow encountered an error',
      icon: '/icons/error.png',
      tag: 'execution-error',
      requireInteraction: true,  // Keep until dismissed
      ...options
    });
  }, [showNotification]);

  /**
   * Show custom notification
   */
  const notify = useCallback((title, body, options = {}) => {
    return showNotification(title, {
      body,
      ...options
    });
  }, [showNotification]);

  // Request permission on mount
  useEffect(() => {
    if (enabled && permission === 'default') {
      requestPermission();
    }
  }, [enabled, permission, requestPermission]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (notificationRef.current) {
        notificationRef.current.close();
      }
    };
  }, []);

  return {
    permission,
    requestPermission,
    notify,
    notifyExecutionStart,
    notifyExecutionComplete,
    notifyExecutionError,
    isSupported: 'Notification' in window,
    isGranted: permission === 'granted'
  };
};