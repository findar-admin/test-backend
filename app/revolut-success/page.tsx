'use client'

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const RevolutPaymentSuccessPage: React.FC = () => {
  const searchParams = useSearchParams();
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    const order_id = searchParams.get('order_id');
    if (order_id) {
      setOrderId(order_id);
    }
  }, [searchParams]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-3xl font-bold mb-6 text-green-600">Payment Successful!</h1>
        <p className="text-gray-700 mb-4">
          Thank you for your payment. Your transaction has been completed successfully.
        </p>
        {orderId && (
          <p className="text-gray-600 mb-6">
            Order ID: <span className="font-semibold">{orderId}</span>
          </p>
        )}
        <div className="space-y-4">
          <Link href="/" className="block w-full px-4 py-2 bg-blue-500 text-white rounded text-center hover:bg-blue-600 transition duration-300">
            Return to Home
          </Link>
          <Link href="/order-status" className="block w-full px-4 py-2 bg-green-500 text-white rounded text-center hover:bg-green-600 transition duration-300">
            Check Order Status
          </Link>
        </div>
      </div>
    </main>
  );
};

export default RevolutPaymentSuccessPage;