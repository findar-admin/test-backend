'use client'

import React, { useState, useEffect, useRef } from 'react';
import { provideVisitationFeedback, FeedbackResponse, resendDeepLink,DeepLinkComponentProps  } from '@/lib/api';

interface ApiError {
  statusCode: number;
  message: string;
  title: string;
  timestamp: string;
}

const PostVisitationFeedback: React.FC<DeepLinkComponentProps> = ({ token, action, metadata }) => {
  const [result, setResult] = useState<FeedbackResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const isProcessingRef = useRef(false);

  const handleResendDeepLink = async () => {
    setResendStatus('Requesting new deep link...');
    try {
      const result = await resendDeepLink(token);
      setResendStatus(result.message);
    } catch (error) {
      setResendStatus('Failed to request new deep link. Please try again.');
    }
  };

  useEffect(() => {
    console.log('Effect running. Token:', token, 'Action:', action, 'Metadata:', metadata);
    
    async function handleFeedback() {
      if (isProcessingRef.current) {
        console.log('Already processing, skipping');
        return;
      }

      isProcessingRef.current = true;
      setIsLoading(true);

      try {
        const { visitationId } = metadata
        if (!visitationId) {
          throw new Error('Visitation ID not found in metadata');
        }

        console.log('Providing visitation feedback...');
        const feedbackResult = await provideVisitationFeedback(
          visitationId.toString(),
          action,
          token
        );
        console.log('Feedback result:', feedbackResult);

        setResult(feedbackResult);
        setError(null);
      } catch (err) {
        console.error('Error in handleFeedback:', err);
        if (err instanceof Error) {
          setError({
            statusCode: 500,
            message: err.message,
            title: 'Error',
            timestamp: new Date().toISOString()
          });
        } else if (err instanceof Response) {
          // Handle API errors
          const errorData: ApiError = await err.json();
          setError(errorData);
        } else {
          setError({
            statusCode: 500,
            message: 'An unknown error occurred',
            title: 'Error',
            timestamp: new Date().toISOString()
          });
        }
      } finally {
        setIsLoading(false);
        isProcessingRef.current = false;
      }
    }

    handleFeedback();

    return () => {
      console.log('Effect cleanup');
    };
  }, [token, action, metadata]);

  console.log('Rendering. IsLoading:', isLoading, 'Error:', error, 'Result:', result);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <div className="text-2xl font-semibold text-gray-700">Processing your feedback...</div>
      </div>
    );
  }

  if (error) {
    const isDuplicateSubmission = error.statusCode === 409;
    const bgColor = isDuplicateSubmission ? 'bg-blue-100' : 'bg-red-100';
    const textColor = isDuplicateSubmission ? 'text-blue-800' : 'text-red-800';
    const icon = isDuplicateSubmission ? '✓' : '⚠️';

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className={`${bgColor} shadow-lg rounded-lg p-6 max-w-md w-full`}>
          <div className="flex items-center mb-4">
            <span className="text-2xl mr-2">{icon}</span>
            <h2 className={`text-2xl font-bold ${textColor}`}>{error.title}</h2>
          </div>
          <p className={`${textColor} mb-4`}>{error.message}</p>
          {!isDuplicateSubmission && (
            <>
              <div className="bg-white rounded p-4 mb-4">
                <pre className="text-sm text-gray-600 whitespace-pre-wrap">
                  {JSON.stringify(error, null, 2)}
                </pre>
              </div>
              <button
                onClick={handleResendDeepLink}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition duration-300"
              >
                Request New Deep Link
              </button>
              {resendStatus && (
                <p className="mt-4 text-sm text-gray-600">{resendStatus}</p>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="bg-white shadow-lg rounded-lg p-6 max-w-md w-full">
          <h2 className="text-2xl font-bold text-green-600 mb-4">Thank You for Your Feedback!</h2>
          <p className="text-gray-700 mb-4">Your response has been successfully recorded.</p>
          <div className="bg-gray-100 rounded p-4">
            <h3 className="font-semibold text-gray-700 mb-2">API Response:</h3>
            <pre className="text-sm text-gray-600 whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <div className="text-2xl font-semibold text-gray-700">Unexpected state. Please try again.</div>
    </div>
  );
};

export default PostVisitationFeedback;