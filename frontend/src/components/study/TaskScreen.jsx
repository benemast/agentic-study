// frontend/src/components/study/TaskScreen.jsx
/**
 * Split Screen Task Layout
 * 
 * Left: Task description (top) + Dataset view (bottom)
 * Right: Work mode (Workflow Builder or AI Assistant)
 * 
 * Features:
 * - Non-editable task description
 * - Scrollable dataset preview
 * - Condition-specific work interface
 * - Task completion confirmation
 */
import React, { useState } from 'react';
import WorkflowBuilder from '../workflow/WorkflowBuilder';
import AIChat from '../assistant/AIChat';
import DatasetViewer from './DatasetViewer';
import { useReviewData } from '../../hooks/useReviewData';
import { useTracking } from '../../hooks/useTracking';

const TaskScreen = ({ taskConfig, taskNumber, onComplete }) => {
  const { track } = useTracking();
  
  // ============================================================
  // DATA FETCHING - Using Custom Hook
  // ============================================================
  // Only fetch reviewCount for display in product info
  // DatasetViewer will fetch its own data (shared cache = no duplicate requests!)
  const { 
    reviewCount, 
    loading, 
    error
  } = useReviewData({
    category: taskConfig.category,
    productId: taskConfig.product_id,
    taskNumber,
    options: {
      excludeMalformed: false,
      limit: 500
    }
  });

  // ============================================================
  // LOCAL STATE
  // ============================================================
  const [showCompletionPrompt, setShowCompletionPrompt] = useState(false);
  const [taskStartTime] = useState(Date.now());

  // ============================================================
  // EVENT HANDLERS
  // ============================================================

  /**
   * Handle task completion button click
   */
  const handleTaskComplete = () => {
    const taskDuration = Math.floor((Date.now() - taskStartTime) / 1000); // seconds
    
    track('TASK_COMPLETE_CLICKED', {
      taskNumber,
      condition: taskConfig.condition,
      durationSeconds: taskDuration
    });
    
    setShowCompletionPrompt(true);
  };

  /**
   * Confirm task completion
   */
  const confirmCompletion = () => {
    track('TASK_COMPLETED', {
      taskNumber,
      condition: taskConfig.condition
    });
    
    onComplete?.();
  };

  /**
   * Cancel completion
   */
  const cancelCompletion = () => {
    track('TASK_COMPLETION_CANCELLED', { taskNumber });
    setShowCompletionPrompt(false);
  };

  // ============================================================
  // RENDER
  // ============================================================
  
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Progress Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex-shrink-0">
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
              {taskConfig.dataset === 'wireless' ? '🎧 Headphones' : '👢 Shoes'}
            </span>
          </div>
          
          <button
            onClick={handleTaskComplete}
            className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Complete Task
          </button>
        </div>
      </div>

      {/* Split Screen Layout */}
      <div className="flex-1 flex overflow-hidden min-h-0">
      {/* LEFT SIDE: Task Info + Dataset Viewer */}
      <div className="w-1/2 flex flex-col border-r border-gray-300 bg-white">
        
        {/* Task Description (Top, Fixed) */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-br from-blue-50 to-purple-50 flex-shrink-0">
          
          {/* Role & Goal */}
          <div className="bg-white bg-opacity-80 rounded-lg p-4 shadow-sm mb-3">
            <div className="flex items-start gap-3">
              <div className="text-2xl">👤</div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-blue-900 mb-1">
                  Your Role: {taskConfig.role}
                </h2>
                <p className="text-sm text-blue-700 leading-relaxed">
                  {taskConfig.goal}
                </p>
              </div>
            </div>
            
            <div className="bg-white bg-opacity-50 rounded p-3 mt-3">
              <p className="text-sm text-blue-800">
                <strong>Focus:</strong> {taskConfig.focus}
              </p>
            </div>
          </div>
          
          {/* Expected Output */}
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <h3 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
              <span>📋</span>
              Expected Output:
            </h3>
            <ul className="text-sm text-yellow-800 space-y-1.5">
              {taskConfig.expectedOutput?.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-yellow-600 flex-shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Product Info - Now uses reviewCount from hook */}
          <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
            <div className="text-xs text-gray-600 space-y-1">
              <div><strong>Product:</strong> {taskConfig.product_title}</div>
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

        {/* Dataset Viewer (Bottom, Scrollable) */}
        <div className="flex-1 overflow-hidden min-h-0">
          {/* 
            DatasetViewer in STANDALONE MODE
            - Fetches its own data using useReviewData hook
            - Shares cache with TaskScreen (no duplicate API calls!)
            - Fully independent and reusable
          */}
          <DatasetViewer 
            category={taskConfig.category}
            productId={taskConfig.product_id}
            taskNumber={taskNumber}
          />
        </div>
        </div>

        {/* RIGHT SIDE: Work Mode */}
        <div className="flex-1 flex flex-col min-w-0">
          {taskConfig.condition === 'workflow_builder' ? (
            <WorkflowBuilder />
          ) : (
            <AIChat />
          )}
        </div>
      </div>

      {/* Completion Confirmation Modal */}
      {showCompletionPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Complete Task {taskNumber}?
            </h3>
            <p className="text-gray-600 mb-6">
              Are you satisfied with your work and ready to move to the next task?
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

            <p className="text-xs text-gray-500 text-center mt-4">
              You cannot return to this task after proceeding
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskScreen;