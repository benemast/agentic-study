// frontend/src/components/assistant/StreamingMessage.jsx
import React, { useRef, useEffect, useState } from 'react';
import TypeIt from 'typeit';

/**
 * StreamingMessage with TypeIt typing animation
 * 
 * Types out each new line character-by-character as it arrives.
 * Previous lines remain static.
 */
const StreamingMessage = ({ content, isStreaming, className = '' }) => {
  const elementRef = useRef(null);
  const typeItInstanceRef = useRef(null);
  const processedLinesRef = useRef(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const lastExecutionIdRef = useRef(null);
  
  // Safe destroy helper
  const safeDestroy = (instance) => {
    if (!instance) return;
    try {
      instance.destroy();
    } catch (error) {
      // Ignore TypeIt destroy errors in Strict Mode
    }
  };
  
  // Initialize TypeIt once
  useEffect(() => {
    if (!elementRef.current || typeItInstanceRef.current) return;
    
    console.log('✨ TypeIt: Initializing');
    
    typeItInstanceRef.current = new TypeIt(elementRef.current, {
      speed: 30,
      waitUntilVisible: true,
      cursor: false,
      html: true,  // CRITICAL: Allow HTML for <br> tags
    });
    
    setIsInitialized(true);
    
    return () => {
      if (typeItInstanceRef.current) {
        console.log('🧹 TypeIt: Cleaning up');
        safeDestroy(typeItInstanceRef.current);
        typeItInstanceRef.current = null;
        setIsInitialized(false);
      }
    };
  }, []);
  
  // Handle new content arriving
  useEffect(() => {
    if (!isInitialized || !typeItInstanceRef.current) return;
    
    // Handle array or string content
    let lines = [];
    if (Array.isArray(content)) {
      lines = content.filter(line => line && line.trim() !== '');
    } else if (content) {
      lines = content.split('\n').filter(line => line.trim() !== '');
    }
    
    console.log(`📊 TypeIt: ${lines.length} total lines, ${processedLinesRef.current} processed`);
    
    // Check for new lines
    if (lines.length > processedLinesRef.current) {
      const newLines = lines.slice(processedLinesRef.current);
      
      console.log(`✍️ TypeIt: Typing ${newLines.length} new lines`);
      
      // Queue each new line
      newLines.forEach((line, index) => {
        typeItInstanceRef.current.type(line);
        
        // Add <br> after each line except the last one
        const isLastNewLine = index === newLines.length - 1;
        if (!isLastNewLine) {
          typeItInstanceRef.current.type('<br>');  // Use HTML break
        }
      });
      
      // Start typing
      typeItInstanceRef.current.go();
      
      // Update count
      processedLinesRef.current = lines.length;
    }
  }, [content, isStreaming, isInitialized]);
  
  // Reset ONLY when content becomes completely empty (new execution starting)
  useEffect(() => {
    let lines = [];
    if (Array.isArray(content)) {
      lines = content;
    } else if (content) {
      lines = content.split('\n').filter(line => line.trim() !== '');
    }
    
    // ONLY reset if we had content before and now it's COMPLETELY EMPTY
    const shouldReset = lines.length === 0 && processedLinesRef.current > 0;
    
    if (shouldReset) {
      console.log('🔄 TypeIt: Resetting for new execution');
      
      // Destroy old instance
      if (typeItInstanceRef.current) {
        safeDestroy(typeItInstanceRef.current);
        typeItInstanceRef.current = null;
      }
      
      // Recreate if element exists
      if (elementRef.current) {
        typeItInstanceRef.current = new TypeIt(elementRef.current, {
          speed: 30,
          waitUntilVisible: true,
          cursor: false,
          html: true,
        });
        setIsInitialized(true);
      } else {
        setIsInitialized(false);
      }
      
      processedLinesRef.current = 0;
    }
  }, [content]);
  
  return (
    <div className={`whitespace-pre-wrap break-words ${className}`}>
      <span ref={elementRef}></span>
      {isStreaming && (
        <span className="inline-block w-0.5 h-4 bg-current animate-pulse ml-0.5 align-middle" />
      )}
    </div>
  );
};

export default StreamingMessage;