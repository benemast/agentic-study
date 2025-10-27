// frontend/src/hooks/useJoyridePositionFix.js
import { useEffect, useRef } from 'react';

export const useJoyridePositionFix = (run, steps) => {
  const currentStepRef = useRef(0);
  const lastLoggedStepRef = useRef(-1);

  useEffect(() => {
    if (!run) return;

    let animationFrameId = null;

    const calculatePosition = (target, floater) => {
      const targetRect = target.getBoundingClientRect();
      const floaterRect = floater.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const SPACING = 12;
      const EDGE_PADDING = 20;

      // Detect panel boundary
      const resizeHandle = document.querySelector('.resize-handle');
      const panelBoundary = resizeHandle ? resizeHandle.getBoundingClientRect().left : 900;
      const isInLeftPanel = targetRect.left < panelBoundary;

      let top, left, placement = 'bottom';
      let alignment = 'center';

      // Calculate available space
      const spaceBelow = viewportHeight - targetRect.bottom;
      const spaceAbove = targetRect.top;
      const spaceRight = viewportWidth - targetRect.right;
      const spaceLeft = targetRect.left;

      // Determine vertical placement
      if (spaceBelow >= floaterRect.height + SPACING + EDGE_PADDING) {
        top = targetRect.bottom + SPACING;
        placement = 'bottom';
      } else if (spaceAbove >= floaterRect.height + SPACING + EDGE_PADDING) {
        top = targetRect.top - floaterRect.height - SPACING;
        placement = 'top';
      } else {
        top = spaceBelow > spaceAbove 
          ? targetRect.bottom + SPACING 
          : Math.max(EDGE_PADDING, targetRect.top - floaterRect.height - SPACING);
        placement = spaceBelow > spaceAbove ? 'bottom' : 'top';
      }

      // Horizontal alignment
      if (placement === 'top' || placement === 'bottom') {
        const targetCenter = targetRect.left + (targetRect.width / 2);
        const isSmallTarget = targetRect.width < (floaterRect.width * 0.3);
        
        if (isSmallTarget && isInLeftPanel) {
          // Calculate position within the LEFT PANEL
          const positionInPanel = (targetCenter / panelBoundary) * 100;
          
          console.log(`[DEBUG Step ${currentStepRef.current}] Target ${targetRect.left}px, Panel ${panelBoundary}px, Position: ${positionInPanel.toFixed(1)}%`);
          
          if (positionInPanel > 70) {
            // RIGHT side of panel - align tooltip's right edge with target's right edge
            left = targetRect.right - floaterRect.width;
            alignment = 'right';
          } else if (positionInPanel < 30) {
            // LEFT side of panel - align tooltip's left edge with target's left edge
            left = targetRect.left;
            alignment = 'left';
          } else {
            // CENTER of panel
            left = targetCenter - (floaterRect.width / 2);
            alignment = 'center';
          }
        } else {
          // Large targets or right panel: center
          left = targetCenter - (floaterRect.width / 2);
          alignment = 'center';
        }
      }

      // Viewport bounds
      if (left < EDGE_PADDING) left = EDGE_PADDING;
      if (left + floaterRect.width > viewportWidth - EDGE_PADDING) {
        left = viewportWidth - floaterRect.width - EDGE_PADDING;
      }
      if (top < EDGE_PADDING) top = EDGE_PADDING;
      if (top + floaterRect.height > viewportHeight - EDGE_PADDING) {
        top = viewportHeight - floaterRect.height - EDGE_PADDING;
      }

      return { 
        top: Math.round(top), 
        left: Math.round(left), 
        placement,
        alignment
      };
    };

    const enforcePosition = () => {
      const floater = document.querySelector('.__floater');
      if (!floater) {
        animationFrameId = requestAnimationFrame(enforcePosition);
        return;
      }

      const stepIndex = parseInt(floater.getAttribute('data-step-index')) || currentStepRef.current;
      const currentStep = steps[stepIndex];

      if (!currentStep) {
        animationFrameId = requestAnimationFrame(enforcePosition);
        return;
      }

      // Body target - center on screen
      if (currentStep.target === 'body') {
        if (floater.style.left !== '50%' || floater.style.top !== '50%') {
          floater.style.position = 'fixed';
          floater.style.left = '50%';
          floater.style.top = '50%';
          floater.style.transform = 'translate(-50%, -50%)';
          floater.style.zIndex = '10003';
          floater.style.maxWidth = '500px';
          floater.style.margin = '0';
        }
        animationFrameId = requestAnimationFrame(enforcePosition);
        return;
      }

      const target = document.querySelector(currentStep.target);
      if (!target || floater.offsetHeight === 0) {
        animationFrameId = requestAnimationFrame(enforcePosition);
        return;
      }

      const positionData = calculatePosition(target, floater);
      const currentLeft = parseInt(floater.style.left) || 0;
      const currentTop = parseInt(floater.style.top) || 0;

      const needsCorrection = 
        Math.abs(currentTop - positionData.top) > 2 ||
        Math.abs(currentLeft - positionData.left) > 2 ||
        floater.style.transform !== 'none';

      if (needsCorrection) {
        floater.style.position = 'fixed';
        floater.style.left = `${positionData.left}px`;
        floater.style.top = `${positionData.top}px`;
        floater.style.transform = 'none';
        floater.style.zIndex = '10003';
        floater.style.maxWidth = '400px';
        floater.style.margin = '0';

        if (lastLoggedStepRef.current !== stepIndex) {
          console.log(`✓ Step ${stepIndex} (${positionData.placement}-${positionData.alignment}): left=${positionData.left}px`);
          lastLoggedStepRef.current = stepIndex;
        }
      }

      floater.setAttribute('data-step-index', stepIndex);
      animationFrameId = requestAnimationFrame(enforcePosition);
    };

    animationFrameId = requestAnimationFrame(enforcePosition);

    const observer = new MutationObserver(() => {});
    const startObserver = () => {
      const floater = document.querySelector('.__floater');
      if (floater) observer.observe(floater, { attributes: true });
      else setTimeout(startObserver, 50);
    };
    startObserver();

    const handleResize = () => { lastLoggedStepRef.current = -1; };
    window.addEventListener('resize', handleResize);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [run, steps]);
};