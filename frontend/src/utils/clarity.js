// frontend/src/utils/clarity.js
/**
 * Initialize Microsoft Clarity tracking
 * Only loads in production when VITE_ENABLE_CLARITY is true
 */
export const initClarity = () => {
  const projectId = import.meta.env.VITE_CLARITY_PROJECT_ID;
  const enabled = import.meta.env.VITE_ENABLE_CLARITY === 'true';
  
  // Only load in production with valid project ID
  if (!enabled || !projectId || import.meta.env.DEV) {
    console.log('Clarity tracking disabled');
    return;
  }

  // Check if already loaded
  if (window.clarity) {
    console.log('Clarity already initialized');
    return;
  }

  // Load Clarity script
  (function(c, l, a, r, i, t, y) {
    c[a] = c[a] || function() {
      (c[a].q = c[a].q || []).push(arguments);
    };
    t = l.createElement(r);
    t.async = 1;
    t.src = "https://www.clarity.ms/tag/" + i;
    y = l.getElementsByTagName(r)[0];
    y.parentNode.insertBefore(t, y);
  })(window, document, "clarity", "script", projectId);

  console.log('Clarity tracking initialized:', projectId);
};