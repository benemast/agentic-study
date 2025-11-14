// frontend/src/components/study/TaskScreen.jsx
/**
 * 
 * Main TaskScreen 
 * Providing the split view of teask description, dataset viewer and WorkflowBuilder/AIChat
 * 
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
import SummaryModal from './SummaryModal';
import { Search, User, ClipboardList, Settings, Bot, Headphones, Footprints, FileText } from 'lucide-react';

// Hooks
import { useTracking } from '../../hooks/useTracking';
import { useReviewData } from '../../hooks/useReviewData';
import { useTranslation } from '../../hooks/useTranslation';
import { useTheme } from '../../hooks/useTheme';
import useTutorial from '../../hooks/useTutorial';
import { useSummary } from '../../hooks/useSummary';

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
    zIndex: 100000,
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
      className="task-description-section border-b-2 border-gray-200 dark:border-gray-700 bg-gradient-to-b from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-800 shadow-sm">
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
              <User className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">                  
                  {t('task.description.role')}
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {t('task.description.goal')}
                </p>
              </div>
            </div>
            
            {taskConfig.focus && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-3 mt-3 border border-gray-200 dark:border-gray-600">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>{t('task.description.focusLabel')}</strong> 
                  {taskConfig.dataset === 'wireless' ? (
                        t('task.description.focusText.wireless')
                  ) : (
                        t('task.description.focusText.shoes')
                  )}
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
                <ClipboardList className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                {t('task.description.expectedOutputLabel')}
              </h4>
              <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1.5">
                <li className="flex items-start gap-2">
                    <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">•</span>
                    <span>{t('task.description.expectedOutput1')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">•</span>
                    <span>{t('task.description.expectedOutput2')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">•</span>
                    <span>{t('task.description.expectedOutput3')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">•</span>
                    <span>{t('task.description.expectedOutput4')}</span>
                  </li>
              </ul>
            </div>
          )}

          {/* Product Info Card */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-sm">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
              <Search className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              {t('task.description.productCard.title')}
            </h4>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <div><strong>{t('task.description.productCard.titleLable')}</strong> {taskConfig.product_title}</div>
              <div><strong>ID:</strong> {taskConfig.product_id}</div>
              <div><strong>{t('task.description.productCard.categoryLabel')}</strong> {
                taskConfig.dataset === 'wireless' ? (
                  t('task.description.productCard.wireless')
              ) : (
                  t('task.description.productCard.shoes')
              )}</div>
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

  const handleJoyrideCallback = useCallback((data) => {
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
  
  // Summary hook for completion guard - store full hook to pass to children
  const summaryHook = useSummary(taskNumber);
  const { summaryAvailable, summaryViewed, createSummary, summaryData, fetchSummary, openSummary, isModalOpen, isFromDatabase } = summaryHook;

  // Load summary from database on mount
  useEffect(() => {
    if (fetchSummary) {
      fetchSummary();
    }
  }, [taskNumber, fetchSummary]); // Run on mount and when task changes

  // ============================================================
  // EVENT HANDLERS
  // ============================================================

  const handleTaskComplete = useCallback(() => {
    const taskDuration = Math.floor((Date.now() - taskStartTime) / 1000);
    
    track('task_complete_clicked', {
      taskNumber,
      condition: taskConfig.condition,
      durationSeconds: taskDuration
    });
    
    setShowCompletionPrompt(true);
  }, [taskNumber, taskConfig.condition, taskStartTime, track]);

  const confirmCompletion = useCallback(() => {
    track('task_completed', {
      taskNumber,
      condition: taskConfig.condition
    });
    
    onComplete?.();
  }, [taskNumber, taskConfig.condition, onComplete, track]);

  const cancelCompletion = useCallback(() => {
    track('task_completion_cancelled', {
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
      {/* BASIC JOYRIDE - No custom positioning */}
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
            <div className="flex items-center gap-1.5">
              {taskConfig.condition === 'workflow_builder' ? (
                <>
                  <Settings className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('task.header.workflowBuilder')}
                  </span>
                </>
              ) : (
                <>
                  <Bot className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('task.header.aiAssistant')}
                  </span>
                </>
              )}
            </div>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <div className="flex items-center gap-1.5">
              {taskConfig.dataset === 'wireless' ? (
                <>
                  <Headphones className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {t('task.header.headphones')}
                  </span>
                </>
              ) : (
                <>
                  <Footprints className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {t('task.header.shoes')}
                  </span>
                </>
              )}
            </div>
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
          
          {/* Right: Complete button with summary viewed guard */}
          <button
            onClick={handleTaskComplete}
            disabled={!summaryViewed}
            data-tour="complete-task-button"
            className={`complete-task-button px-5 py-2 text-white rounded-lg transition-colors font-medium flex items-center gap-2 ${
              summaryViewed 
                ? 'bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600' 
                : 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed opacity-60'
            }`}
            title={
              !summaryViewed && summaryAvailable
                ? t('task.header.viewSummaryFirst')
                : !summaryAvailable
                ? t('task.header.executeFirst')
                : t('task.header.completeTooltip')
            }
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {t('task.header.completeButton')}
          </button>
        </div>
      </div>

      {/* Previous Summary Banner - Only shows for data loaded from DB, not fresh executions */}
      {summaryData && summaryAvailable && isFromDatabase && (
        <div className="flex justify-center px-6 mt-2 mb-2">
          <div className="w-full max-w-4xl p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-blue-900 dark:text-blue-300 text-sm mb-0.5">
                    {t('task.previousSummary.title')}
                  </h4>
                  <p className="text-xs text-blue-700 dark:text-blue-400">
                    {summaryData.metadata?.processed_at ? (
                      <>
                        {t('task.previousSummary.savedOn')} {
                          (() => {
                            const date = new Date(summaryData.metadata.processed_at);
                            const day = String(date.getDate()).padStart(2, '0');
                            const month = date.toLocaleString('en-US', { month: 'short' });
                            const year = date.getFullYear();
                            return `${day}-${month}-${year}`;
                          })()
                        } {t('task.previousSummary.at')} {
                          (() => {
                            const date = new Date(summaryData.metadata.processed_at);
                            const hours = String(date.getHours()).padStart(2, '0');
                            const minutes = String(date.getMinutes()).padStart(2, '0');
                            return `${hours}:${minutes}`;
                          })()
                        }
                      </>
                    ) : (
                      t('task.previousSummary.unknownTime')
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (openSummary) {
                    openSummary();
                  }
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors flex-shrink-0"
              >
                {t('task.previousSummary.viewButton')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area with Resizable Split */}
      <div data-tour="task-content-container" className="flex-1 overflow-hidden">
        <ResizableSplit
          defaultLeftWidth={40}
          onResize={(width) => setLeftPanelWidth(width)} 
          leftContent={
            /* LEFT SIDE: Task Description + Dataset Viewer */
            <div className="h-full flex flex-col pr-1 bg-gradient-to-br overflow-y-auto min-h-0">
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
                className="flex-1 min-h-0 overflow-y-auto"
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
            <div data-tour="task-work-container" className="h-full bg-white dark:bg-gray-800">
              {taskConfig.condition === 'workflow_builder' ? (
                <WorkflowBuilder summaryHook={summaryHook} />
              ) : (
                <AIChat summaryHook={summaryHook} />
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

      {/* Summary Modal */}
      {isModalOpen && summaryData && (
        <SummaryModal
          isOpen={isModalOpen}
          onClose={() => summaryHook.closeSummary && summaryHook.closeSummary()}
          onOpen={() => {
            if (summaryHook.markAsViewed) {
              summaryHook.markAsViewed();
            }
            track('summary_modal_opened', {})
          }}
          summaryData={summaryData}
          taskNumber={taskNumber}
        />
      )}
    </div>
  );
};

export default TaskScreen;