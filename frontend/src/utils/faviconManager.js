// frontend/src/utils/faviconManager.js
/**
 * Favicon Manager
 * Dynamically updates favicon based on study group
 * 
 * Groups 1 & 2: Regular vertical split (workflow left, chat right)
 * Groups 3 & 4: Reversed vertical split (chat left, workflow right)
 */

const FAVICON_PATHS = {
  DEFAULT: '/favicon-group-3-4.svg',
  GROUP_1_2: '/favicon-group-1-2.svg', // Workflow left, Chat right
  GROUP_3_4: '/favicon-group-3-4.svg'  // Chat left, Workflow right
};

/**
 * Update favicon based on study group
 * @param {number} group - Study group (1, 2, 3, or 4)
 */
export const updateFaviconForGroup = (group) => {
  if (!group) {
    console.warn('No group provided for favicon update');
    return;
  }

  let faviconPath;
  
  if (group === 1 || group === 2) {
    faviconPath = FAVICON_PATHS.GROUP_1_2;
  } else if (group === 3 || group === 4) {
    faviconPath = FAVICON_PATHS.GROUP_3_4;
  } else {
    console.warn(`Invalid group: ${group}, using default favicon`);
    faviconPath = FAVICON_PATHS.DEFAULT;
  }

  updateFavicon(faviconPath);
  console.log(`Favicon updated for group ${group}: ${faviconPath}`);
};

/**
 * Update the favicon link element
 * @param {string} path - Path to favicon file
 */
const updateFavicon = (path) => {
  // Find existing favicon link
  let link = document.querySelector("link[rel*='icon']");
  
  if (!link) {
    // Create new link element if it doesn't exist
    link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    document.head.appendChild(link);
  }
  
  // Update href
  link.href = path;
};

/**
 * Reset to default favicon
 */
export const resetFavicon = () => {
  updateFavicon(FAVICON_PATHS.DEFAULT);
};