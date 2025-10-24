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
import React, { useState, useEffect } from 'react';
import WorkflowBuilder from '../workflow/WorkflowBuilder';
import AIChat from '../assistant/AIChat';
import DatasetViewer from './DatasetViewer';
import { reviewsAPI } from '../../services/reviewsAPI';
import { useTracking } from '../../hooks/useTracking';

const TaskScreen = ({ taskConfig, taskNumber, onComplete }) => {
  const { track } = useTracking();
  
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [showCompletionPrompt, setShowCompletionPrompt] = useState(false);
  const [taskStartTime] = useState(Date.now());

  // Load dataset on mount
  useEffect(() => {
    loadDataset();
  }, [taskConfig]);

  /**
   * Load reviews dataset from API
   */
  const loadDataset = async () => {
    try {
      console.log("Try loading dataset!")
      if(loading){
        console.log("Already loading dataset!");
        return
      }
      setLoading(true);
      setLoadError(null);

      track('DATASET_LOAD_STARTED', {
        taskNumber,
        category: taskConfig.category,
        productId: taskConfig.product_id
      });

      const data = await reviewsAPI.getReviews(
        taskConfig.category.toLowerCase(),
        taskConfig.product_id,
        {
          excludeMalformed: false, // Exclude spam and missing data
          limit: 500
        }
      );
      
      setReviews(data.reviews || []);
      
      track('DATASET_LOADED', {
        taskNumber,
        reviewCount: data.reviews?.length || 0,
        category: taskConfig.category
      });

    } catch (error) {
      console.error('Failed to load dataset:', error);
      setLoadError(error.message);
      
      track('DATASET_LOAD_FAILED', {
        taskNumber,
        error: error.message
      });
    } finally {
      console.log("Finished loading dataset!")
      setLoading(false);
    }
  };

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
    const taskDuration = Math.floor((Date.now() - taskStartTime) / 1000);
    
    track('TASK_COMPLETED', {
      taskNumber,
      condition: taskConfig.condition,
      durationSeconds: taskDuration,
      dataset: taskConfig.dataset
    });
    
    onComplete();
  };

  /**
   * Cancel completion
   */
  const cancelCompletion = () => {
    setShowCompletionPrompt(false);
    
    track('TASK_COMPLETION_CANCELLED', {
      taskNumber
    });
  };

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
        {/* LEFT SIDE: Task Info + Dataset */}
        <div className="w-1/3 border-r border-gray-200 flex flex-col bg-white">
          {/* Task Description (Top, Non-scrollable) */}
          <div className="p-6 border-b border-gray-200 flex-shrink-0">
            {/* Role & Goal */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-5 mb-4 border border-blue-200">
              <div className="flex items-start gap-3 mb-3">
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

            {/* Product Info */}
            <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
              <div className="text-xs text-gray-600 space-y-1">
                <div><strong>Product:</strong> {taskConfig.product_title}</div>
                <div><strong>Category:</strong> {taskConfig.category}</div>
                <div><strong>Reviews:</strong> {reviews.length} available</div>
              </div>
            </div>
          </div>

          {/* Dataset Viewer (Bottom, Scrollable) */}
          <div className="flex-1 overflow-hidden min-h-0">
            <DatasetViewer 
              reviews={reviews} 
              loading={loading}
              error={loadError}
              category={taskConfig.category}
              onRetry={loadDataset}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Complete Task {taskNumber}?
              </h3>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-900">
                You're about to complete this task and move on to a brief survey about 
                your experience. Make sure you've finished your analysis and are satisfied 
                with your work.
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={confirmCompletion}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Yes, I'm Done - Continue to Survey
              </button>
              <button
                onClick={cancelCompletion}
                className="w-full px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                No, Let Me Continue Working
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