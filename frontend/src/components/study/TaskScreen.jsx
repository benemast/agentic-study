// frontend/src/components/study/TaskScreen.jsx
/**
 * Optimized Task Screen
 * 
 * Features:
 * - Resizable split panel (drag to adjust left/right sizes)
 * - Collapsible task description
 * - Non-copiable task text
 * - Progress header with completion button
 * - Tooltips on all interactive elements
 * - Simplified footer
 * - Minimal re-renders
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import WorkflowBuilder from '../workflow/WorkflowBuilder';
import AIChat from '../assistant/AIChat';
import DatasetViewer from './DatasetViewer';
import { useTracking } from '../../hooks/useTracking';
import { useReviewData } from '../../hooks/useReviewData';

// ============================================================
// RESIZABLE SPLIT PANEL COMPONENT
// ============================================================
const ResizableSplit = ({ leftContent, rightContent, defaultLeftWidth = 40 }) => {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      
      // Constrain between 25% and 75%
      setLeftWidth(Math.min(Math.max(newLeftWidth, 25), 75));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div 
      ref={containerRef} 
      className="flex h-full relative"
      style={{ userSelect: isDragging ? 'none' : 'auto' }}
    >
      {/* Left Panel */}
      <div 
        className="flex flex-col"
        style={{ width: `${leftWidth}%` }}
      >
        {leftContent}
      </div>

      {/* Resize Handle */}
      <div
        className={`w-1 bg-gray-300 hover:bg-blue-500 cursor-col-resize flex-shrink-0 transition-colors ${
          isDragging ? 'bg-blue-500' : ''
        }`}
        onMouseDown={handleMouseDown}
        title="Drag to resize panels"
      >
        <div className="h-full w-full relative">
          {/* Visual indicator */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-full p-1 shadow-sm opacity-0 hover:opacity-100 transition-opacity">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
            </svg>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div 
        className="flex flex-col"
        style={{ width: `${100 - leftWidth}%` }}
      >
        {rightContent}
      </div>
    </div>
  );
};

// ============================================================
// TASK DESCRIPTION COMPONENT (Collapsible)
// ============================================================
const TaskDescription = ({ taskConfig, taskNumber, reviewCount, loading, error }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="flex-shrink-0 bg-gradient-to-br from-blue-50 to-purple-50 border-b border-gray-200">
      {/* Header (always visible) */}
      <div className="px-6 py-3 flex items-center justify-between bg-white bg-opacity-60 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900">
          Task Description
        </h2>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 hover:bg-white rounded-lg transition-colors"
          title={isCollapsed ? 'Expand task description' : 'Collapse task description'}
        >
          <svg 
            className={`w-5 h-5 text-gray-600 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>

      {/* Collapsible Content */}
      {!isCollapsed && (
        <div 
          className="p-6 select-none"
          style={{ 
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none'
          }}
          onCopy={(e) => e.preventDefault()}
          onCut={(e) => e.preventDefault()}
        >
          {/* Role & Goal */}
          <div className="bg-white bg-opacity-80 rounded-lg p-4 shadow-sm mb-3">
            <div className="flex items-start gap-3">
              <div className="text-2xl">👤</div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-blue-900 mb-1">
                  Your Role: {taskConfig.role}
                </h3>
                <p className="text-sm text-blue-700 leading-relaxed">
                  {taskConfig.goal}
                </p>
              </div>
            </div>
            
            {taskConfig.focus && (
              <div className="bg-white bg-opacity-50 rounded p-3 mt-3">
                <p className="text-sm text-blue-800">
                  <strong>Focus:</strong> {taskConfig.focus}
                </p>
              </div>
            )}
          </div>
          
          {/* Expected Output */}
          {taskConfig.expectedOutput && taskConfig.expectedOutput.length > 0 && (
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200 mb-3">
              <h4 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                <span>📋</span>
                Expected Output:
              </h4>
              <ul className="text-sm text-yellow-800 space-y-1.5">
                {taskConfig.expectedOutput.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-yellow-600 flex-shrink-0">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Product Info */}
          <div className="p-3 bg-gray-50 rounded border border-gray-200">
            <div className="text-xs text-gray-600 space-y-1">
              <div><strong>Product:</strong> {taskConfig.product_title || taskConfig.product_id}</div>
              <div><strong>Category:</strong> {taskConfig.category}</div>
              <div>
                <strong>Reviews:</strong> {
                  loading ? 'Loading...' : 
                  error ? 'Failed to load' : 
                  `${reviewCount} available`
                }
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Note: Footer is now handled at the app level via AppFooter component
// No need for footer in TaskScreen - it appears at the bottom of the entire app

// ============================================================
// MAIN TASK SCREEN COMPONENT
// ============================================================
const TaskScreen = ({ taskConfig, taskNumber, onComplete }) => {
  const { track } = useTracking();
  
  // Stabilize options object to prevent re-triggers (React best practice)
  const reviewOptions = useMemo(() => ({
    excludeMalformed: false,
    limit: 2000,
    minRating: 0,
    maxRating: 5,
    verifiedOnly: false
  }), []);
  
  // Single source of truth: Fetch reviews once at parent level
  const { 
    reviews,
    reviewCount, 
    loading: reviewsLoading, 
    error: reviewsError,
    retry: retryReviews
  } = useReviewData({
    category: taskConfig.category,
    taskNumber,
    options: reviewOptions
  });

  // ============================================================
  // DEBUG LOGGING
  // ============================================================
  useEffect(() => {
    console.log('[TaskScreen] Review data state:', {
      reviewsLength: reviews?.length || 0,
      reviewCount,
      loading: reviewsLoading,
      error: reviewsError
    });
  }, [reviews, reviewCount, reviewsLoading, reviewsError]);
  
  const [showCompletionPrompt, setShowCompletionPrompt] = useState(false);
  const [taskStartTime] = useState(Date.now());

  // ============================================================
  // EVENT HANDLERS
  // ============================================================
  
  const handleTaskComplete = useCallback(() => {
    const taskDuration = Math.floor((Date.now() - taskStartTime) / 1000);
    
    track('TASK_COMPLETE_CLICKED', {
      taskNumber,
      condition: taskConfig.condition,
      durationSeconds: taskDuration
    });
    
    setShowCompletionPrompt(true);
  }, [taskNumber, taskConfig.condition, taskStartTime, track]);

  const confirmCompletion = useCallback(() => {
    track('TASK_COMPLETED', {
      taskNumber,
      condition: taskConfig.condition
    });
    
    onComplete?.();
  }, [taskNumber, taskConfig.condition, onComplete, track]);

  const cancelCompletion = useCallback(() => {
    track('TASK_COMPLETION_CANCELLED', {
      taskNumber,
      condition: taskConfig.condition
    });
    
    setShowCompletionPrompt(false);
  }, [taskNumber, taskConfig.condition, track]);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Progress Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              Task {taskNumber} of 2
            </span>
            <span className="text-gray-300">•</span>
            <span className="text-sm font-medium text-gray-700">
              {taskConfig.condition === 'workflow_builder' 
                ? '🔧 Workflow Builder' 
                : '🤖 AI Assistant'}
            </span>
            <span className="text-gray-300">•</span>
            <span className="text-sm text-gray-600">
              {taskConfig.category === 'wireless' ? '🎧 Headphones' : '👟 Shoes'}
            </span>
          </div>
          
          <button
            onClick={handleTaskComplete}
            className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
            title="Complete this task and proceed to the next step"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Complete Task
          </button>
        </div>
      </div>

      {/* Main Content Area with Resizable Split */}
      <div className="flex-1 overflow-hidden">
        <ResizableSplit
          defaultLeftWidth={40}
          leftContent={
            /* LEFT SIDE: Task Description + Dataset Viewer */
            <div className="h-full flex flex-col bg-gray-50">
              {/* Task Description (Collapsible) */}
              <TaskDescription 
                taskConfig={taskConfig} 
                taskNumber={taskNumber}
                reviewCount={reviewCount}
                loading={reviewsLoading}
                error={reviewsError}
              />

              {/* Dataset Viewer (Scrollable) */}
              <div className="flex-1 overflow-hidden">
                <DatasetViewer 
                  category={taskConfig.category}
                  productId={taskConfig.product_id}
                  taskNumber={taskNumber}
                  reviews={reviews}
                  reviewCount={reviewCount}
                  loading={reviewsLoading}
                  error={reviewsError}
                  onRetry={retryReviews}
                />
              </div>
            </div>
          }
          rightContent={
            /* RIGHT SIDE: Work Mode (Workflow Builder or AI Chat) */
            <div className="h-full bg-white">
              {taskConfig.condition === 'workflow_builder' ? (
                <WorkflowBuilder />
              ) : (
                <AIChat />
              )}
            </div>
          }
        />
      </div>

      {/* Completion Confirmation Modal */}
      {showCompletionPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Complete Task {taskNumber}?
            </h3>
            <p className="text-gray-600 mb-6">
              Are you satisfied with your work and ready to move to the next step? 
              You cannot return to this task after proceeding.
            </p>
            <div className="flex gap-3">
              <button
                onClick={cancelCompletion}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Continue Working
              </button>
              <button
                onClick={confirmCompletion}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
              >
                Yes, Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default TaskScreen;