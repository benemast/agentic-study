// frontend/src/components/JoyridePortal.jsx
import { createPortal } from 'react-dom';
import Joyride from 'react-joyride';
import { useEffect, useState, useCallback } from 'react';

const JoyridePortal = (props) => {
  const [portalRoot, setPortalRoot] = useState(null);

  useEffect(() => {
    let container = document.getElementById('joyride-portal-root');
    
    if (!container) {
      container = document.createElement('div');
      container.id = 'joyride-portal-root';
      container.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        pointer-events: none !important;
        z-index: 10001 !important;
        overflow: visible !important;
      `;
      document.body.appendChild(container);
    }
    
    setPortalRoot(container);
    
    return () => {
      if (container && container.childNodes.length === 0) {
        container.remove();
      }
    };
  }, []);

  // Force Popper to recalculate and fix transform issues
  const handleCallback = useCallback((data) => {
    if (props.callback) {
      props.callback(data);
    }

    // Fix transform issues after step changes
    if (data.type === 'step:after') {
      requestAnimationFrame(() => {
        const floater = document.querySelector('.__floater');
        if (floater) {
          // Remove the centering transform that conflicts with Popper
          const currentTransform = floater.style.transform;
          if (currentTransform && currentTransform.includes('translate(-50%, -50%)')) {
            // Let Popper handle positioning entirely
            floater.style.left = '';
            floater.style.top = '';
            floater.style.transform = '';
            
            // Force Popper update
            if (floater.__popper) {
              floater.__popper.update();
            }
          }
        }
      });
    }
  }, [props.callback]);

  if (!portalRoot) return null;

  return createPortal(
    <Joyride 
      {...props}
      callback={handleCallback}
      floaterProps={{
        ...props.floaterProps,
        disableAnimation: true,
        styles: {
          ...props.floaterProps?.styles,
          floater: {
            ...props.floaterProps?.styles?.floater,
            filter: 'none',
            zIndex: 10003,
            // Remove centering styles
            left: 'auto',
            top: 'auto',
            transform: 'none',
          },
        },
        options: {
          ...props.floaterProps?.options,
          modifiers: [
            {
              name: 'computeStyles',
              options: {
                // CRITICAL: Use top/left positioning, NOT transforms
                gpuAcceleration: false,
                adaptive: false,
              },
            },
            {
              name: 'preventOverflow',
              options: {
                boundary: 'viewport',
                padding: 20,
              },
            },
            {
              name: 'flip',
              options: {
                boundary: 'viewport',
                fallbackPlacements: ['top', 'bottom', 'left', 'right'],
              },
            },
          ],
        },
      }}
      styles={{
        ...props.styles,
        overlay: {
          ...props.styles?.overlay,
          pointerEvents: 'auto',
        },
        spotlight: {
          ...props.styles?.spotlight,
          pointerEvents: 'none',
        },
      }}
    />,
    portalRoot
  );
};

export default JoyridePortal;