'use client'

import React, { useState, useEffect } from 'react';
import { validateDeepLink, provideVisitationFeedback, FeedbackResponse, DeepLinkValidationResponse, DeepLinkExpiredError, resendDeepLink } from '@/lib/api';

interface PostVisitationFeedbackProps {
  token: string;
  action: string;
}

const PostVisitationFeedback: React.FC<PostVisitationFeedbackProps> = ({ token, action }) => {
  const [result, setResult] = useState<FeedbackResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

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
    async function handleFeedback() {
      if (!token || !action) {
        setError('Invalid deep link parameters');
        setIsLoading(false);
        return;
      }

      try {
        // First, validate the deep link
        const validationResult: DeepLinkValidationResponse = await validateDeepLink(action, token);

        if (!validationResult.isValid || validationResult.type !== 'PAYMENT') {
          throw new Error('Invalid or expired deep link');
        }

        // Check if visitationId exists in metadata
        const visitationId = validationResult.metadata?.visitationId;
        if (!visitationId) {
          throw new Error('Visitation ID not found in deep link metadata');
        }

        // If valid, provide the feedback
        const feedbackResult = await provideVisitationFeedback(
          visitationId.toString(),
          action,
          token
        );

        setResult(feedbackResult);
      } catch (err) {
        if (err instanceof DeepLinkExpiredError) {
          setError(err.message);
        } else {
          setError(err instanceof Error ? err.message : 'An unknown error occurred');
        }
      } finally {
        setIsLoading(false);
      }
    }

    handleFeedback();
  }, [token, action]);

  if (isLoading) {
    return <div>Processing your feedback...</div>;
  }

  if (error) {
    return (
      <div>
        <p>Error: {error}</p>
        <div className="mt-4">
          <button
            onClick={handleResendDeepLink}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Request New Deep Link
          </button>
        </div>
        {resendStatus && <p className="mt-2">{resendStatus}</p>}
      </div>
    );
  }

  return (
    <div>
      <h1>Post-Visitation Feedback</h1>
      {result && (
        <div>
          <p>Thank you for your feedback!</p>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default PostVisitationFeedback;