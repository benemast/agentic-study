// frontend/src/components/NotificationPermission.jsx

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { notificationService } from '../services/notificationService';

/**
 * NotificationPermission Component
 * 
 * Requests browser notification permissions and allows users to enable/disable
 * Shows a banner when notifications are supported but not enabled
 * 
 * @param {Object} props
 * @param {boolean} props.autoRequest - Auto-request permission on mount (default: false)
 * @param {boolean} props.showBanner - Show persistent banner when permissions not granted (default: true)
 */
export const NotificationPermission = ({ 
  autoRequest = false, 
  showBanner = true 
}) => {
  const [permission, setPermission] = useState('default');
  const [isEnabled, setIsEnabled] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  // Check initial state
  useEffect(() => {
    const supported = notificationService.isNotificationSupported();
    setIsSupported(supported);
    
    if (supported) {
      setPermission(notificationService.getPermission());
      setIsEnabled(notificationService.isEnabled());
      
      // Auto-request if enabled
      if (autoRequest && notificationService.getPermission() === 'default') {
        handleRequestPermission();
      }
    }
  }, [autoRequest]);

  /**
   * Request notification permission
   */
  const handleRequestPermission = async () => {
    const result = await notificationService.requestPermission();
    setPermission(result);
    setIsEnabled(result === 'granted');
    
    if (result === 'granted') {
      // Send test notification
      notificationService.send('Notifications Enabled', {
        body: 'You will now receive notifications for workflow execution updates',
        force: true // Send even if window is focused
      });
    }
  };

  /**
   * Enable notifications (if permission already granted)
   */
  const handleEnable = () => {
    const enabled = notificationService.enable();
    setIsEnabled(enabled);
    
    if (enabled) {
      notificationService.send('Notifications Enabled', {
        body: 'You will receive execution updates',
        force: true
      });
    }
  };

  /**
   * Disable notifications
   */
  const handleDisable = () => {
    notificationService.disable();
    setIsEnabled(false);
  };

  /**
   * Dismiss banner
   */
  const handleDismissBanner = () => {
    setBannerDismissed(true);
    // Store in localStorage to persist dismissal
    localStorage.setItem('notificationBannerDismissed', 'true');
  };

  // Check if banner was previously dismissed
  useEffect(() => {
    const dismissed = localStorage.getItem('notificationBannerDismissed') === 'true';
    setBannerDismissed(dismissed);
  }, []);

  // Don't show anything if notifications not supported
  if (!isSupported) {
    return null;
  }

  // Don't show banner if dismissed or permission already granted
  if (!showBanner || bannerDismissed || permission === 'granted') {
    return null;
  }

  // Show banner for default (not requested) or denied permissions
  return (
    <div className="fixed bottom-4 right-4 max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 z-50">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <Bell className="w-6 h-6 text-blue-500" />
        </div>
        
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Enable Notifications
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
            Get notified when your workflows complete, even when this tab is in the background.
          </p>
          
          {permission === 'default' && (
            <button
              onClick={handleRequestPermission}
              className="w-full px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
            >
              Enable Notifications
            </button>
          )}
          
          {permission === 'denied' && (
            <div className="text-xs text-orange-600 dark:text-orange-400">
              <p className="mb-2">Notifications are blocked in your browser settings.</p>
              <p>To enable, click the 🔒 icon in your address bar and allow notifications for this site.</p>
            </div>
          )}
        </div>
        
        <button
          onClick={handleDismissBanner}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

/**
 * NotificationToggle - Compact toggle for settings/toolbar
 */
export const NotificationToggle = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const supported = notificationService.isNotificationSupported();
    setIsSupported(supported);
    
    if (supported) {
      setPermission(notificationService.getPermission());
      setIsEnabled(notificationService.isEnabled());
    }
  }, []);

  const handleToggle = async () => {
    if (permission !== 'granted') {
      // Request permission first
      const result = await notificationService.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        notificationService.enable();
        setIsEnabled(true);
      }
    } else {
      // Toggle on/off
      if (isEnabled) {
        notificationService.disable();
        setIsEnabled(false);
      } else {
        notificationService.enable();
        setIsEnabled(true);
      }
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <button
      onClick={handleToggle}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
        isEnabled
          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
      }`}
      title={isEnabled ? 'Disable notifications' : 'Enable notifications'}
    >
      {isEnabled ? (
        <Bell className="w-4 h-4" />
      ) : (
        <BellOff className="w-4 h-4" />
      )}
      <span className="text-sm font-medium">
        Notifications
      </span>
    </button>
  );
};

export default NotificationPermission;