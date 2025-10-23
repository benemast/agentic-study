// frontend/src/components/study/CompletionScreen.jsx
/**
 * Study Completion Screen
 * 
 * Thanks participant and provides study completion code
 */
import React, { useState, useEffect } from 'react';
import { useSession } from '../../hooks/useSession';
import { useTracking } from '../../hooks/useTracking';

const CompletionScreen = ({ studyConfig }) => {
  const { sessionId } = useSession();
  const { track } = useTracking();
  const [completionCode, setCompletionCode] = useState('');

  useEffect(() => {
    // Generate completion code
    const code = generateCompletionCode(sessionId);
    setCompletionCode(code);
    
    track('STUDY_COMPLETED', {
      group: studyConfig?.group,
      completionCode: code
    });
  }, [sessionId, studyConfig]);

  const generateCompletionCode = (sessionId) => {
    // Generate a unique completion code based on session ID
    const hash = sessionId.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    return `STUDY-${Math.abs(hash).toString(36).toUpperCase().slice(0, 8)}`;
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(completionCode);
    track('COMPLETION_CODE_COPIED', { code: completionCode });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Success Icon */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Study Complete! 🎉
          </h1>
          <p className="text-lg text-gray-600">
            Thank you for participating in our research
          </p>
        </div>
        
        {/* Study Summary */}
        <div className="bg-blue-50 rounded-lg p-6 mb-6">
          <h2 className="font-semibold text-blue-900 mb-3">What You Accomplished:</h2>
          <ul className="space-y-2 text-blue-800">
            <li className="flex items-start">
              <span className="text-green-600 mr-2">✓</span>
              <span>Completed demographic questionnaire</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-600 mr-2">✓</span>
              <span>Completed Task 1 using {studyConfig?.task1?.condition === 'workflow_builder' ? 'Workflow Builder' : 'AI Assistant'}</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-600 mr-2">✓</span>
              <span>Provided feedback survey for Task 1</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-600 mr-2">✓</span>
              <span>Completed Task 2 using {studyConfig?.task2?.condition === 'workflow_builder' ? 'Workflow Builder' : 'AI Assistant'}</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-600 mr-2">✓</span>
              <span>Provided feedback survey for Task 2</span>
            </li>
          </ul>
        </div>
{/* 
        {/* Completion Code \/*}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-3">Your Completion Code:</h2>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-white border-2 border-gray-300 rounded-lg p-4">
              <code className="text-2xl font-mono font-bold text-gray-900">
                {completionCode}
              </code>
            </div>
            <button
              onClick={handleCopyCode}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Please save this code. You may need it to receive compensation or credit for participation.
          </p>
        </div>
*/}
        {/* Thank You Message */}
        <div className="border-t border-gray-200 pt-6">
          <h2 className="font-semibold text-gray-900 mb-3">Thank You!</h2>
          <p className="text-gray-700 mb-4">
            Your participation is invaluable to our research on human-AI collaboration and 
            agentic workflow design. The data you provided will help us understand how 
            different levels of AI autonomy affect user experience and task outcomes.
          </p>
          <p className="text-gray-700">
            If you have any questions about this study, please contact the research team 
            at <a href="mailto:study@example.com" className="text-blue-600 hover:underline">study@example.com</a>.
          </p>
        </div>
        {/*
        {/* Study Group Info (for researchers) *\/}
        {studyConfig && (
          <div className="mt-6 p-4 bg-gray-100 rounded-lg">
            <details>
              <summary className="text-sm font-medium text-gray-700 cursor-pointer">
                Study Details (for research purposes)
              </summary>
              <div className="mt-2 text-xs text-gray-600 space-y-1">
                <p>Group: {studyConfig.group}</p>
                <p>Task 1: {studyConfig.task1.condition} - {studyConfig.task1.dataset}</p>
                <p>Task 2: {studyConfig.task2.condition} - {studyConfig.task2.dataset}</p>
                <p>Session ID: {sessionId}</p>
              </div>
            </details>
          </div>
        )}
        */}

        {/* Close Window Button */}
        <div className="mt-8 text-center">
        {/*
          <button
            onClick={() => window.close()}
            className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
          >
            Close Window
          </button>
        */}
          <p className="text-sm text-gray-500 mt-2">
            You can safely close this window now
          </p>
        </div>
      </div>
    </div>
  );
};

export default CompletionScreen;