// frontend/src/components/SentimentAnalysisProgress.jsx
// NEW COMPONENT: Display real-time sentiment analysis progress

import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

/**
 * SentimentAnalysisProgress Component
 * 
 * Displays real-time progress during sentiment analysis:
 * - Overall progress bar
 * - Current batch being processed
 * - "Thinking" indicator with chunk count
 * - Completion/error states
 * 
 * Usage:
 * import SentimentAnalysisProgress from './SentimentAnalysisProgress';
 * 
 * <SentimentAnalysisProgress executionId={execution.id} />
 */
const SentimentAnalysisProgress = ({ executionId }) => {
  const [progress, setProgress] = useState({
    active: false,
    totalReviews: 0,
    totalBatches: 0,
    currentBatch: 0,
    reviewsAnalyzed: 0,
    thinkingChunks: 0,
    error: null,
    complete: false
  });

  useEffect(() => {
    // Get WebSocket client (adjust path based on your setup)
    const wsClient = window.wsClient; // or however you access your WebSocket client
    
    if (!wsClient) {
      console.warn('WebSocket client not available for sentiment progress');
      return;
    }

    // Handler for analysis start
    const handleAnalysisStart = (message) => {
      if (message.execution_id === executionId) {
        setProgress({
          active: true,
          totalReviews: message.total_reviews,
          totalBatches: message.total_batches,
          currentBatch: 0,
          reviewsAnalyzed: 0,
          thinkingChunks: 0,
          error: null,
          complete: false
        });
      }
    };

    // Handler for batch start
    const handleBatchStart = (message) => {
      if (message.execution_id === executionId) {
        setProgress(prev => ({
          ...prev,
          currentBatch: message.batch_number,
          thinkingChunks: 0
        }));
      }
    };

    // Handler for thinking indicator
    const handleThinking = (message) => {
      if (message.execution_id === executionId) {
        setProgress(prev => ({
          ...prev,
          thinkingChunks: message.chunks_received
        }));
      }
    };

    // Handler for batch complete
    const handleBatchComplete = (message) => {
      if (message.execution_id === executionId) {
        setProgress(prev => ({
          ...prev,
          reviewsAnalyzed: prev.reviewsAnalyzed + message.reviews_analyzed
        }));
      }
    };

    // Handler for batch error
    const handleBatchError = (message) => {
      if (message.execution_id === executionId) {
        setProgress(prev => ({
          ...prev,
          error: message.error
        }));
      }
    };

    // Handler for analysis complete
    const handleAnalysisComplete = (message) => {
      if (message.execution_id === executionId) {
        setProgress(prev => ({
          ...prev,
          active: false,
          complete: true,
          reviewsAnalyzed: message.total_reviews_analyzed
        }));

        // Auto-hide after 3 seconds
        setTimeout(() => {
          setProgress(prev => ({ ...prev, complete: false }));
        }, 3000);
      }
    };

    // Subscribe to events
    wsClient.on('sentiment_analysis_start', handleAnalysisStart);
    wsClient.on('sentiment_batch_start', handleBatchStart);
    wsClient.on('sentiment_thinking', handleThinking);
    wsClient.on('sentiment_batch_complete', handleBatchComplete);
    wsClient.on('sentiment_batch_error', handleBatchError);
    wsClient.on('sentiment_analysis_complete', handleAnalysisComplete);

    // Cleanup
    return () => {
      wsClient.off('sentiment_analysis_start', handleAnalysisStart);
      wsClient.off('sentiment_batch_start', handleBatchStart);
      wsClient.off('sentiment_thinking', handleThinking);
      wsClient.off('sentiment_batch_complete', handleBatchComplete);
      wsClient.off('sentiment_batch_error', handleBatchError);
      wsClient.off('sentiment_analysis_complete', handleAnalysisComplete);
    };
  }, [executionId]);

  // Don't render if not active and not complete
  if (!progress.active && !progress.complete) {
    return null;
  }

  // Calculate progress percentage
  const progressPercentage = progress.totalReviews > 0
    ? Math.round((progress.reviewsAnalyzed / progress.totalReviews) * 100)
    : 0;

  return (
    <div className="sentiment-analysis-progress bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {progress.complete ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : progress.error ? (
            <AlertCircle className="w-5 h-5 text-red-500" />
          ) : (
            <Sparkles className="w-5 h-5 text-purple-500 animate-pulse" />
          )}
          <span className="font-semibold text-gray-800">
            {progress.complete ? 'Analysis Complete' : 'Analyzing Sentiment'}
          </span>
        </div>
        <span className="text-sm font-medium text-purple-600">
          {progressPercentage}%
        </span>
      </div>

      {/* Progress Stats */}
      {progress.active && (
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-white rounded-md p-2 border border-gray-200">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Batch</div>
            <div className="text-lg font-bold text-gray-800">
              {progress.currentBatch} / {progress.totalBatches}
            </div>
          </div>
          <div className="bg-white rounded-md p-2 border border-gray-200">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Reviews</div>
            <div className="text-lg font-bold text-gray-800">
              {progress.reviewsAnalyzed} / {progress.totalReviews}
            </div>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
        <div 
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Thinking Indicator */}
      {progress.active && progress.thinkingChunks > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-600 bg-white rounded-md p-2 border border-gray-200">
          <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
          <span>Processing batch...</span>
          <span className="ml-auto text-xs text-gray-400">
            ({progress.thinkingChunks} chunks)
          </span>
        </div>
      )}

      {/* Error Message */}
      {progress.error && (
        <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
          <AlertCircle className="inline w-4 h-4 mr-1" />
          Error: {progress.error}
        </div>
      )}

      {/* Completion Message */}
      {progress.complete && (
        <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-md p-2">
          <CheckCircle className="inline w-4 h-4 mr-1" />
          Successfully analyzed {progress.reviewsAnalyzed} reviews!
        </div>
      )}
    </div>
  );
};

export default SentimentAnalysisProgress;