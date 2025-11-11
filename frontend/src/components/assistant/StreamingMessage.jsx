
import React from 'react';

/**
 * StreamingMessage - Dead simple progressive text display
 * 
 * Just shows content as it arrives. No animation, no RAF, no complexity.
 * The "streaming effect" comes from the parent updating content incrementally.
 */
const StreamingMessage = ({ 
  content = '', 
  isStreaming = false,
  className = '' 
}) => {
  // Normalize content to string
  const contentString = Array.isArray(content) 
    ? content.join('\n') 
    : String(content || '');

  return (
    <div className={`whitespace-pre-wrap break-words ${className}`}>
      {contentString}
      {isStreaming && (
        <span className="inline-block w-0.5 h-4 bg-current animate-pulse ml-1 align-middle" />
      )}
    </div>
  );
};

export default StreamingMessage;