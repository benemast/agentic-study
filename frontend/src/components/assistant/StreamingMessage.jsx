// frontend/src/components/assistant/StreamingMessage.jsx
import React, { useEffect, useRef } from 'react';

const StreamingMessage = ({ content, isStreaming, className = '' }) => {
  const contentRef = useRef(null);
  const lastContentRef = useRef('');
  const rafIdRef = useRef(null);
  
  useEffect(() => {
    if (!contentRef.current) return;
    
    // Cancel pending RAF
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }
    
    // Only update if content changed
    if (content !== lastContentRef.current) {
      lastContentRef.current = content;
      
      // Use RAF for 60fps smooth updates
      rafIdRef.current = requestAnimationFrame(() => {
        if (contentRef.current) {
          contentRef.current.textContent = content;
        }
      });
    }
    
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [content]);
  
  return (
    <div className={`whitespace-pre-wrap break-words ${className}`}>
      <span ref={contentRef}>{content}</span>
      {isStreaming && (
        <span className="inline-block w-0.5 h-4 bg-current animate-pulse ml-0.5 align-middle" />
      )}
    </div>
  );
};

export default StreamingMessage;