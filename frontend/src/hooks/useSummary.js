// hooks/useSummary.js
/**
 * Summary Management Hook
 * 
 * Usage:
 * const { 
 *   summaryAvailable, 
 *   summaryData, 
 *   isModalOpen, 
 *   summaryViewed,
 *   openSummary, 
 *   closeSummary, 
 *   createSummary,
 *   isLoading 
 * } = useSummary(taskNumber);
 */

import { useState, useCallback, useEffect } from 'react';
import { useSession } from './useSession';
import { summaryAPI } from '../services/api'; // Will be added to services/api.js

export const useSummary = (taskNumber) => {
  const { sessionId } = useSession();
  
  // State
  const [summaryAvailable, setSummaryAvailable] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [summaryViewed, setSummaryViewed] = useState(false);
  const [isFromDatabase, setIsFromDatabase] = useState(false);

  /**
   * Mark summary as available (called after workflow/chat completion)
   */
  const markSummaryAvailable = useCallback(() => {
    setSummaryAvailable(true);
  }, []);

  /**
   * Fetch summary from backend
   * @returns {Promise<Object|null>} Summary data or null if error
   */
  const fetchSummary = useCallback(async () => {
    if (!sessionId || !taskNumber) {
      console.warn('Cannot fetch summary: missing sessionId or taskNumber');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await summaryAPI.get(sessionId, taskNumber);
      
      if (data) {
        setSummaryData(data);
        setSummaryAvailable(true);
        setIsFromDatabase(true);
        return data;
      } else {
        throw new Error('Failed to fetch summary');
      }
    } catch (err) {
      console.error('Error fetching summary:', err);
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, taskNumber]);

  /**
   * Create new summary from execution results
   * @param {Object} resultsData - Execution results with sections
   * @param {string} executionId - Workflow execution ID
   * @returns {Promise<Object|null>} Created summary data or null if error
   */
  const createSummary = useCallback(async (resultsData, executionId) => {
    if (!sessionId || !taskNumber) {
      console.warn('Cannot create summary: missing sessionId or taskNumber');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await summaryAPI.create(sessionId, {
        task_number: taskNumber,
        execution_id: executionId,
        sections: resultsData.sections || resultsData,
        metadata: resultsData.metadata || {}
      });

      if (data) {
        setSummaryData(data);
        setSummaryAvailable(true);
        return data;
      } else {
        throw new Error('Failed to create summary');
      }
    } catch (err) {
      console.error('Error creating summary:', err);
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, taskNumber]);

  /**
   * Mark summary as viewed (without opening modal)
   * Used when child components have their own modal management
   */
  const markAsViewed = useCallback(() => {
    setSummaryViewed(true);
  }, []);

  /**
   * Open summary modal
   * Fetches summary if not already loaded
   * Marks summary as viewed when opened
   */
  const openSummary = useCallback(async () => {
    // If we don't have summary data yet, fetch it
    if (!summaryData && summaryAvailable) {
      await fetchSummary();
    }
    
    setIsModalOpen(true);
    setSummaryViewed(true); // Mark as viewed when modal opens
  }, [summaryData, summaryAvailable, fetchSummary]);

  /**
   * Close summary modal
   */
  const closeSummary = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  /**
   * Clear summary data (e.g., when starting new execution)
   * Resets viewed state as well
   */
  const clearSummary = useCallback(() => {
    setSummaryData(null);
    setSummaryAvailable(false);
    setIsModalOpen(false);
    setError(null);
    setSummaryViewed(false); // Reset viewed state
  }, []);

  /**
   * Handle execution completion - mark summary as available
   * This should be called when WebSocket sends completion message
   * Resets viewed state on new execution
   */
  const handleExecutionComplete = useCallback((resultsData) => {
    setSummaryData({
      sections: resultsData.sections || resultsData,
      metadata: resultsData.metadata || {
        total_records: resultsData.metadata?.total_records || 0,
        processed_at: new Date().toISOString()
      }
    });
    setSummaryAvailable(true);
    setSummaryViewed(false);
    setIsFromDatabase(false);
  }, []);

  return {
    // State
    summaryAvailable,
    summaryData,
    isModalOpen,
    isLoading,
    error,
    summaryViewed,
    isFromDatabase,
    
    // Actions
    openSummary,
    closeSummary,
    createSummary,
    fetchSummary,
    clearSummary,
    markSummaryAvailable,
    handleExecutionComplete,
    markAsViewed, // New: mark as viewed without opening modal
  };
};

export default useSummary;