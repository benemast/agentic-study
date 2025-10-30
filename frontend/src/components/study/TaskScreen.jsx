// frontend/src/components/study/TaskScreen.jsx
/**
 * CLEANED Task Screen - Basic Joyride Integration
 * 
 * Removed:
 * - useJoyridePositionFix hook
 * - JoyridePortal component
 * - Manual positioning logic
 * - Body scroll manipulation
 * - Debug logging
 * 
 * Using standard Joyride with default Popper.js behavior
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';

// Components
import JoyridePortal from '../JoyridePortal'
import LanguageSwitcher from '../LanguageSwitcher';
import ThemeSwitcher from '../ThemeSwitcher';
import WorkflowBuilder from '../workflow/WorkflowBuilder';
import AIChat from '../assistant/AIChat';
import DatasetViewer from './DatasetViewer';

// Hooks
import { useTracking } from '../../hooks/useTracking';
import { useReviewData } from '../../hooks/useReviewData';
import { useTranslation } from '../../hooks/useTranslation';
import { useTheme } from '../../hooks/useTheme';
import useTutorial from '../../hooks/useTutorial';

// ============================================================
// JOYRIDE STYLES
// ============================================================

/**
 * Get Joyride styles based on current theme
 */
const getJoyrideStyles = (isDarkMode) => ({
  options: {
    arrowColor: isDarkMode ? '#374151' : '#fff',
    backgroundColor: isDarkMode ? '#374151' : '#fff',
    primaryColor: '#2563eb',
    textColor: isDarkMode ? '#f3f4f6' : '#1f2937',
    spotlightShadow: isDarkMode 
      ? '0 0 20px rgba(0, 0, 0, 0.8)' 
      : '0 0 20px rgba(0, 0, 0, 0.5)',
    zIndex: 10002,
  },
  tooltip: {
    borderRadius: 12,
    fontSize: 15,
    padding: 20,
    zIndex: 10003,
  },
  tooltipContainer: {
    textAlign: 'left',
  },
  tooltipTitle: {
    color: isDarkMode ? '#f3f4f6' : '#1f2937',
    fontSize: 18,
    marginBottom: 10,
  },
  tooltipContent: {
    color: isDarkMode ? '#d1d5db' : '#4b5563',
    fontSize: 15,
    lineHeight: 1.5,
  },
  buttonNext: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: '10px 20px',
    fontSize: 15,
    fontWeight: 500,
  },
  buttonBack: {
    color: isDarkMode ? '#9ca3af' : '#6b7280',
    marginRight: 12,
    fontSize: 15,
  },
  buttonSkip: {
    color: isDarkMode ? '#9ca3af' : '#9ca3af',
    fontSize: 14,
  },
  overlay: {
    backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
    zIndex: 10000,
    mixBlendMode: 'normal',
  },
  spotlight: {
    backgroundColor: 'transparent',
    border: `2px solid ${isDarkMode ? '#3b82f6' : '#2563eb'}`,
    borderRadius: 4,
    zIndex: 10001,
  },
});

// ============================================================
// RESIZABLE SPLIT PANEL COMPONENT
// ============================================================
const ResizableSplit = ({ leftContent, rightContent, defaultLeftWidth = 40, onResize }) => {
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
      const constrainedWidth = Math.min(Math.max(newLeftWidth, 20), 80);
      setLeftWidth(constrainedWidth);
      
      // Notify parent of resize
      if (onResize) {
        onResize(constrainedWidth);
      }
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
  }, [isDragging, onResize]);

  return (
    <div 
      data-tour="task-split"
      ref={containerRef} 
      className="flex h-full relative"
      style={{ 
        userSelect: isDragging ? 'none' : 'auto',
        overflow: 'visible'
      }}
    >
      {/* Left Panel */}
      <div 
        data-tour="task-split-left"
        className="flex flex-col border-r-2 border-gray-200 dark:border-gray-700"
        style={{ width: `${leftWidth}%` }}
      >
        {leftContent}
      </div>

      {/* Resize Handle */}
      <div
        data-tour="resize-handle"
        className={`group resize-handle w-1 bg-gray-300 dark:bg-gray-600 hover:bg-blue-500 dark:hover:bg-blue-400 cursor-col-resize flex-shrink-0 transition-colors ${
          isDragging ? 'bg-blue-500 dark:bg-blue-400' : ''
        }`}
        onMouseDown={handleMouseDown}
        title="Drag to resize panels"
      >
        <div className="h-full w-full relative">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-700 rounded-full p-1 shadow-sm opacity-50 group-hover:opacity-100 transition-opacity">
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7l-5 5 5 5M16 7l5 5-5 5" />
            </svg>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div 
        data-tour="task-split-right"
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
  const { t } = useTranslation();

  return (
    <div 
      data-tour="task-description-section"
      className="task-description-section flex-shrink-0 border-b-2 border-gray-200 dark:border-gray-700 bg-gradient-to-b from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-800 shadow-sm">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        title={isCollapsed ? t('task.description.expand') : t('task.description.collapse')}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t('task.description.title', 'Task Description')}
        </h3>
        <svg
          className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${
            !isCollapsed ? 'transform rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Collapsible Content */}
      {!isCollapsed && (
        <div className="px-6 pb-4 space-y-3 text-sm text-gray-700 dark:text-gray-300">
          {/* Role & Goal Card */}
          <div 
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm"
            style={{ 
              userSelect: 'none',
              WebkitUserSelect: 'none',
              MozUserSelect: 'none',
              msUserSelect: 'none'
            }}
            onCopy={(e) => e.preventDefault()}
            onCut={(e) => e.preventDefault()}
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl">👤</div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">
                  Your Role: {taskConfig.role}
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {taskConfig.goal}
                </p>
              </div>
            </div>
            
            {taskConfig.focus && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-3 mt-3 border border-gray-200 dark:border-gray-600">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Focus:</strong> {taskConfig.focus}
                </p>
              </div>
            )}
          </div>
          
          {/* Expected Output Card */}
          {taskConfig.expectedOutput && taskConfig.expectedOutput.length > 0 && (
            <div 
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm"
              style={{ 
                userSelect: 'none',
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none'
              }}
              onCopy={(e) => e.preventDefault()}
              onCut={(e) => e.preventDefault()}
            >
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <span>📋</span>
                Expected Output:
              </h4>
              <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1.5">
                {taskConfig.expectedOutput.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Product Info Card */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-sm">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <span>🔍</span>
                Product to analyse:
              </h4>
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <div><strong>Title:</strong> {taskConfig.product_title}</div>
              <div><strong>ID:</strong> {taskConfig.product_id}</div>
              <div><strong>Category:</strong> {taskConfig.category}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// TUTORIAL BUTTONS COMPONENT
// ============================================================
const TutorialButtons = ({ onScreenTutorial, onTaskTutorial, taskNumber }) => {
  return (
    <div data-tour="tutorial-buttons" className="flex items-center gap-2">
      {/* Only show screen tutorial button on Task 1 */}
      {taskNumber === 1 && (
        <button
          onClick={onScreenTutorial}
          className="px-3 py-1.5 text-sm bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800 rounded-lg transition-colors flex items-center gap-1.5"
          title="Replay screen features tutorial"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Screen Help
        </button>
      )}
      <button
        onClick={onTaskTutorial}
        className="px-3 py-1.5 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-lg transition-colors flex items-center gap-1.5"
        title="Replay task tutorial"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Task Help
      </button>
    </div>
  );
};

// ============================================================
// MAIN TASK SCREEN COMPONENT
// ============================================================
const TaskScreen = ({ taskConfig, taskNumber, onComplete }) => {
  const { track } = useTracking();
  const { t } = useTranslation();
  const { theme } = useTheme();

  const isDarkMode = theme === 'dark';

  const [leftPanelWidth, setLeftPanelWidth] = useState(40);
  // ============================================================
  // JOYRIDE SETUP - BASIC VERSION
  // ============================================================
  
  // Theme-aware Joyride styles
  const joyrideStyles = useMemo(() => getJoyrideStyles(isDarkMode), [isDarkMode]);
  
  // Internationalized Joyride locale
  const joyrideLocale = useMemo(() => ({
    back: t('tutorial.locale.back', '← Previous'),
    close: t('tutorial.locale.close', 'Close'),
    last: t('tutorial.locale.last', 'Got it!'),
    next: t('tutorial.locale.next', 'Next →'),
    skip: t('tutorial.locale.skip', 'Skip tutorial'),
  }), [t]);
  
  // Tutorial system
  const {
    run,
    steps,
    handleJoyrideCallback: originalCallback,
    showScreenTutorial,
    showTaskTutorial,
  } = useTutorial(taskNumber, taskConfig.condition);

  // ✅ SIMPLIFIED CALLBACK - No positioning manipulation
  const handleJoyrideCallback = useCallback((data) => {
    // !! IMPORTANT !! 
    // Defer original callback to avoid breaking positioning 
    if (originalCallback) {
      setTimeout(() => {
        originalCallback(data);
      }, 0);
    }
  }, [ originalCallback ]);

  // ============================================================
  // REVIEW DATA
  // ============================================================

  const reviewOptions = useMemo(() => ({
    excludeMalformed: false,
    limit: 2000
  }), []);
  
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
  // STATE
  // ============================================================

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
    <div 
      data-tour="task-screen-container" 
      className="task-screen-container h-screen flex flex-col bg-gray-50 dark:bg-gray-900"
    >
      {/* ✅ BASIC JOYRIDE - No custom positioning */}
      <JoyridePortal
        steps={steps}
        run={run}
        continuous
        showProgress
        showSkipButton
        callback={handleJoyrideCallback}
        styles={joyrideStyles}
        locale={joyrideLocale}

        spotlightClicks={true}
        scrollToFirstStep={false}
        disableScrolling={true}
        disableOverlay={false}
        debug={true}
      />

      {/* Progress Header */}
      <div className="flex-shrink-0 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          {/* Left: Tutorial buttons + Task info */}
          <div className="flex items-center gap-4">
            <TutorialButtons 
              onScreenTutorial={showScreenTutorial}
              onTaskTutorial={showTaskTutorial}
              taskNumber={taskNumber}
            />
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {t('task.header.taskNumber', { number: taskNumber, total: 2 })}
            </span>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {taskConfig.condition === 'workflow_builder' 
                ? '🔧 ' + t('task.header.workflowBuilder')
                : '🤖 ' + t('task.header.aiAssistant')}
            </span>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {taskConfig.dataset === 'wireless' 
                ? '🎧 ' + t('task.header.headphones')
                : '👟 ' + t('task.header.shoes')}
            </span>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-2"> 
              <LanguageSwitcher 
                variant="compact" 
                showLabels={false}
                className="bg-white dark:bg-gray-800 border border-gray-300"
              />
              <ThemeSwitcher 
                variant="icon-only"
                className="bg-white dark:bg-gray-800 border border-gray-300"
              />
            </div>
          </div>
          
          {/* Right: Complete button */}
          <button
            onClick={handleTaskComplete}
            className="complete-task-button px-5 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors font-medium flex items-center gap-2"
            title={t('task.header.completeTooltip')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {t('task.header.completeButton')}
          </button>
        </div>
      </div>

      {/* Main Content Area with Resizable Split */}
      <div className="flex-1 overflow-hidden">
        <ResizableSplit
          defaultLeftWidth={40}
          onResize={(width) => setLeftPanelWidth(width)} 
          leftContent={
            /* LEFT SIDE: Task Description + Dataset Viewer */
            <div className="h-full flex flex-col pr-1 bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50/30 dark:bg-gray-900">
              {/* Task Description (Collapsible) */}
              <TaskDescription 
                taskConfig={taskConfig} 
                taskNumber={taskNumber}
                reviewCount={reviewCount}
                loading={reviewsLoading}
                error={reviewsError}
              />

              {/* Dataset Viewer (Scrollable) */}
              <div 
                data-tour="dataset-viewer-container"
                className="flex-1 min-h-0 overflow-hidden"
              >
                <DatasetViewer 
                  category={taskConfig.category}
                  productId={taskConfig.product_id}
                  taskNumber={taskNumber}
                  reviews={reviews}
                  reviewCount={reviewCount}
                  loading={reviewsLoading}
                  error={reviewsError}
                  onRetry={retryReviews}
                  containerKey={leftPanelWidth}
                />
              </div>
            </div>
          }
          rightContent={
            /* RIGHT SIDE: Work Mode (Workflow Builder or AI Chat) */
            <div className="h-full bg-white dark:bg-gray-800">
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
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4 border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              {t('task.completion.title', { number: taskNumber })}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t('task.completion.message')}
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelCompletion}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                {t('common.navigation.cancel')}
              </button>
              <button
                onClick={confirmCompletion}
                className="px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors font-medium"
              >
                {t('task.completion.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskScreen;