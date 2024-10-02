'use client'

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { validateDeepLink, DeepLinkValidationResponse, DeepLinkExpiredError, resendDeepLink } from '@/lib/api';
import PostVisitationFeedback from '@/components/PostVisitationFeedback';
import PaymentHandler from '@/components/PaymentHandler';

const deepLinkComponentMap: Record<string, React.ComponentType<any>> = {
  'POST_VISIT_FEEDBACK': PostVisitationFeedback,
  'PAYMENT': PaymentHandler,
  // Add other deep link types and their corresponding components here
};

const DeepLinkTesting: React.FC = () => {
  const searchParams = useSearchParams();
  const [validationResult, setValidationResult] = useState<DeepLinkValidationResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const hasValidated = useRef(false);

  const token = searchParams.get('token') || '';
  const action = searchParams.get('action') || '';

  useEffect(() => {
    const handleValidation = async () => {
      if (hasValidated.current || !token || !action) {
        setIsLoading(false);
        return;
      }

      hasValidated.current = true;
      console.log('Validation started', { token, action });

      try {
        console.log('Calling validateDeepLink');
        const result = await validateDeepLink(action, token);
        console.log('Validation result:', result);
        setValidationResult(result);
      } catch (error) {
        console.error('Validation error:', error);
        if (error instanceof DeepLinkExpiredError) {
          setError(error.message);
          setIsExpired(true);
        } else {
          setError(error instanceof Error ? error.message : 'An unknown error occurred');
          setValidationResult({ 
            isValid: false, 
            message: error instanceof Error ? error.message : 'An unknown error occurred' 
          });
        }
      } finally {
        console.log('Setting isLoading to false');
        setIsLoading(false);
      }
    };

    handleValidation();
  }, [token, action]);

  const handleResendDeepLink = async () => {
    setResendStatus('Requesting new deep link...');
    try {
      const result = await resendDeepLink(token);
      setResendStatus(result.message);
    } catch (error) {
      setResendStatus('Failed to request new deep link. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-700">Validating deep link... (Token: {token}, Action: {action})</p>
      </div>
    );
  }

  if (validationResult && validationResult.isValid && validationResult.type) {
    const DeepLinkComponent = deepLinkComponentMap[validationResult.type];
    if (DeepLinkComponent) {
      return <DeepLinkComponent token={token} action={action} metadata={validationResult.metadata || {}}/>;
    }
  }


  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6">
          <h1 className="text-2xl font-bold text-gray-900">Deep Link Testing</h1>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-2">Extracted Deep Link Parameters:</h2>
          <p className="text-sm text-gray-600">Token: <span className="font-mono bg-gray-100 px-1 rounded">{token || 'Not provided'}</span></p>
          <p className="text-sm text-gray-600">Action: <span className="font-mono bg-gray-100 px-1 rounded">{action || 'Not provided'}</span></p>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          {isExpired ? (
            <div>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={handleResendDeepLink}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                Request New Deep Link
              </button>
              {resendStatus && <p className="mt-2 text-sm text-gray-600">{resendStatus}</p>}
            </div>
          ) : error ? (
            <p className="text-red-600">{error}</p>
          ) : validationResult ? (
            <div className="mt-4">
              <h2 className="text-lg font-medium text-gray-900 mb-2">Validation Result:</h2>
              <div className="bg-gray-50 rounded-md p-4 border border-gray-200">
                {Object.entries(validationResult).map(([key, value]) => (
                  <div key={key} className="mb-2">
                    <span className="font-semibold text-gray-700">{key}: </span>
                    <span className="text-gray-600">
                      {typeof value === 'object' 
                        ? JSON.stringify(value, null, 2)
                        : String(value)
                      }
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {!token || !action ? (
            <div className="mt-4 p-4 bg-yellow-100 rounded-md">
              <p className="text-yellow-700">No valid deep link parameters found in the URL.</p>
              <p className="text-yellow-700 mt-1">Please use a URL in the format: /deep-links?token=your-token&action=your-action</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default DeepLinkTesting;