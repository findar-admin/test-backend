import React, { useState, useEffect } from 'react';
import { fetchPaymentBreakdown, createPaymentIntent, PaymentBreakdown, RevolutPaymentResponse, isRevolutPaymentResponse } from '@/lib/api';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

interface PaymentHandlerProps {
  token: string;
  action: string;
  metadata: {
    [key: string]: any;
  };
}

let stripePromise: Promise<Stripe | null>;
const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe('pk_test_51P6AKxLChzAJmHfQKlHregHRDxcvqeJ5pyIoqF8uC0yLaHmODY3KgW1pIOrEVJKMm9JhEJYTZdhlNl5nP1dCbBS9003W0YvADm');
  }
  return stripePromise;
};

const PaymentForm: React.FC<PaymentHandlerProps> = ({ token, action, metadata }) => {
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentBreakdown | null>(null);
  const [selectedPaymentType, setSelectedPaymentType] = useState<'SECURITY_DEPOSIT' | 'ALL'>('SECURITY_DEPOSIT');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [revolutRedirectUrl, setRevolutRedirectUrl] = useState<string | null>(null);


  const stripe = useStripe();
  const elements = useElements();

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const rentalOrderId = metadata.rentalOrderId;
        if (!rentalOrderId) {
          throw new Error('Rental order ID is missing from metadata');
        }
        const breakdown = await fetchPaymentBreakdown(rentalOrderId, token);
        setPaymentBreakdown(breakdown);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch payment breakdown');
      }
    };

    fetchOrder();
  }, [token, metadata]);

  const handlePaymentTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedPaymentType(event.target.value as 'SECURITY_DEPOSIT' | 'ALL');
  };

  const handlePayment = async () => {
    if (action === 'stripe') {
      await handleStripePayment();
    } else if (action === 'revolut') {
      handleRevolutPayment();
    }
  };

  const handleStripePayment = async () => {
    if (!stripe || !elements || !paymentBreakdown) {
      setError('Payment cannot be processed at this time.');
      return;
    }

    setProcessing(true);

    try {
      const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: elements.getElement(CardElement)!,
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      const response = await createPaymentIntent(
        token,
        metadata.rentalOrderId,
        selectedPaymentType,
        'STRIPE'
      );

      if (isRevolutPaymentResponse(response)) {
        throw new Error('Unexpected Revolut response for Stripe payment');
      }

      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(response.clientSecret, {
        payment_method: paymentMethod.id,
      });

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      if (paymentIntent.status === 'succeeded') {
        console.log('Payment succeeded!');
        setPaymentSuccess(true);
        setError(null);
        // Handle successful payment (e.g., show success message, redirect)
      } else {
        throw new Error('Payment failed. Please try again.');
      }
    } catch (err) {
      setPaymentSuccess(false);
      setError(err instanceof Error ? err.message : 'An error occurred during payment.');
    } finally {
      setProcessing(false);
    }
  };

  // const handleRevolutPayment = async () => {
  //   if (!paymentBreakdown) {
  //     setError('Payment breakdown is not available.');
  //     return;
  //   }

  //   setProcessing(true);

  //   try {
  //     const response = await createPaymentIntent(
  //       token,
  //       metadata.rentalOrderId,
  //       selectedPaymentType,
  //       'REVOLUT'
  //     );

  //     if (!isRevolutPaymentResponse(response)) {
  //       throw new Error('Invalid Revolut payment response');
  //     }

  //     setRevolutRedirectUrl(response.redirectUrl);
  //     setPaymentSuccess(true);
  //     setError(null);
  //     // You can choose to automatically redirect the user or provide a button to redirect
  //     // window.location.href = response.redirectUrl;
  //   } catch (err) {
  //     setPaymentSuccess(false);
  //     setError(err instanceof Error ? err.message : 'An error occurred during Revolut payment setup.');
  //   } finally {
  //     setProcessing(false);
  //   }
  // };

  const handleRevolutPayment = async () => {
    if (!paymentBreakdown) {
      setError('Payment breakdown is not available.');
      return;
    }

    setProcessing(true);

    try {
      const response = await createPaymentIntent(
        token,
        metadata.rentalOrderId,
        selectedPaymentType,
        'REVOLUT'
      );

      if (!isRevolutPaymentResponse(response)) {
        throw new Error('Invalid Revolut payment response');
      }

      setRevolutRedirectUrl(response.redirectUrl);
      setPaymentSuccess(true);
      setError(null);

      // Automatically redirect to Revolut payment page
      window.location.href = response.redirectUrl;
    } catch (err) {
      setPaymentSuccess(false);
      setError(err instanceof Error ? err.message : 'An error occurred during Revolut payment setup.');
    } finally {
      setProcessing(false);
    }
  };

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-8 bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-md">
        <p className="font-bold text-lg mb-2">Error</p>
        <p>{error}</p>
      </div>
    );
  }

  if (!paymentBreakdown) {
    return (
      <div className="max-w-2xl mx-auto mt-8 text-center py-8 bg-gray-50 rounded-lg shadow-md">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading payment details...</p>
      </div>
    );
  }

  const securityDeposit = paymentBreakdown.payments.find(p => p.paymentType === 'SECURITY_DEPOSIT')?.amount || 0;
  const totalAmount = paymentBreakdown.payments.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <div className="max-w-2xl mx-auto mt-8 bg-white shadow-lg rounded-lg overflow-hidden">
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
        <h2 className="text-2xl font-bold text-white">Payment Details</h2>
      </div>
      <div className="p-6">
        {/* {paymentSuccess && (
          <div className="mb-6 bg-green-50 border-l-4 border-green-500 text-green-700 p-4 rounded-lg shadow-md">
            <p className="font-bold text-lg mb-2">Payment Successful!</p>
            <p>Your payment has been processed successfully. Thank you for your transaction.</p>
          </div>
        )} */}

        {paymentSuccess && action === 'revolut' && revolutRedirectUrl && (
          <div className="mb-6 bg-green-50 border-l-4 border-green-500 text-green-700 p-4 rounded-lg shadow-md">
            <p className="font-bold text-lg mb-2">Redirecting to Revolut Payment Page</p>
            <p>You will be redirected to complete your payment with Revolut. If you are not redirected automatically, please click the button below.</p>
            <button
              onClick={() => window.location.href = revolutRedirectUrl}
              className="mt-4 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-300"
            >
              Go to Revolut Payment
            </button>
          </div>
        )}
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">Payment Breakdown</h3>
          <ul className="space-y-2 text-gray-600">
            {paymentBreakdown.payments.map((payment) => (
              <li key={payment.id} className="flex justify-between items-center">
                <span>{payment.paymentType}</span>
                <span className="font-medium">€{payment.amount.toFixed(2)}</span>
              </li>
            ))}
            <li className="flex justify-between items-center font-bold text-gray-800 pt-2 border-t">
              <span>Total Amount</span>
              <span>€{totalAmount.toFixed(2)}</span>
            </li>
          </ul>
        </div>



        <div className="mb-6">
          <label htmlFor="paymentType" className="block text-lg font-semibold text-gray-800 mb-3">
            Select Payment Option
          </label>
          <select
            id="paymentType"
            value={selectedPaymentType}
            onChange={handlePaymentTypeChange}
            className="block w-full px-4 py-3 text-lg font-medium text-gray-900 border-2 border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white shadow-sm"
          >
            <option value="SECURITY_DEPOSIT" className="py-2">Security Deposit Only (€{securityDeposit.toFixed(2)})</option>
            <option value="ALL" className="py-2">All Payments (€{totalAmount.toFixed(2)})</option>
          </select>

        </div>

        {action === 'stripe' && (
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="card-element">
              Credit or debit card
            </label>
            <div className="border rounded p-3 bg-gray-50">
              <CardElement id="card-element" options={{ style: { base: { fontSize: '16px' } } }} />
            </div>
          </div>
        )}

        {/* <button
          onClick={handlePayment}
          disabled={processing}
          className={`w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline transition duration-300 ${processing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
        >
          {processing ? 'Processing...' : `Pay ${selectedPaymentType === 'SECURITY_DEPOSIT' ? 'Security Deposit' : 'All'} with ${action === 'stripe' ? 'Stripe' : 'Revolut'}`}
        </button> */}

        <button
          onClick={handlePayment}
          disabled={processing || paymentSuccess}
          className={`w-full font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline transition duration-300 ${processing || paymentSuccess
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
        >
          {processing
            ? 'Processing...'
            : paymentSuccess
              ? 'Payment Successful'
              : `Pay ${selectedPaymentType === 'SECURITY_DEPOSIT' ? 'Security Deposit' : 'All'} with ${action === 'stripe' ? 'Stripe' : 'Revolut'}`}
        </button>
      </div>
    </div>
  );
};

const PaymentHandler: React.FC<PaymentHandlerProps> = (props) => {
  return (
    <Elements stripe={getStripe()}>
      <PaymentForm {...props} />
    </Elements>
  );
};

export default PaymentHandler;