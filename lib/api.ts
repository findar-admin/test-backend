import { API_BASE_URL } from './constants'

export interface DeepLinkValidationResponse {
  isValid: boolean;
  type?: string;
  metadata?: Record<string, any>;
  options?: any[];
  expiresAt?: string;
  remainingUsages?: number;
  message?: string;
}

export interface FeedbackResponse {
  success: boolean;
  message: string;
}

export interface DeepLinkComponentProps {
  token: string;
  action: string;
  metadata: {
    [key: string]: any;
  };
}

export class DeepLinkExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeepLinkExpiredError';
  }
}

export interface PaymentBreakdown {
  payments: Array<{
    id: string;
    paymentType: string;
    amount: number;
    dueDate: string;
    paid: boolean;
    
  }>;
  currency: string
}

export interface RevolutPaymentResponse {
  totalAmount: number;
  feeAmount: number;
  paymentProvider: string;
  redirectUrl: string;
}

export async function fetchPaymentBreakdown(rentalOrderId: string, token: string): Promise<PaymentBreakdown> {
  const response = await fetch(`${API_BASE_URL}/rental-orders/${rentalOrderId}/payment-breakdown`, {
    headers: { 
      // 'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch payment breakdown');
  }

  return response.json();
}



export async function validateDeepLink(action: string, token: string): Promise<DeepLinkValidationResponse> {
  const response = await fetch(`${API_BASE_URL}/deep-links/validate?action=${action}`, {
    method: 'GET',
    headers: {
      'X-DeepLink-Token': token,
    },
  });
  if (response.status === 410) {
    const errorData = await response.json();
    throw new DeepLinkExpiredError(errorData.message);
  }
  if (!response.ok) {
    throw new Error('Failed to validate deep link');
  }
  return response.json();
}

export async function provideVisitationFeedback(visitationId: string, action: string, token: string): Promise<FeedbackResponse> {
  const response = await fetch(`${API_BASE_URL}/visitations/${visitationId}/feedback?action=${action.toLocaleUpperCase()}`, {
    method: 'POST',
    headers: {
      'X-DeepLink-Token': token,
    },
  });
  if (!response.ok) {
    throw new Error('Failed to provide visitation feedback');
  }
  return response.json();
}

export async function resendDeepLink(token: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE_URL}/deep-links/resend`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  });
  if (!response.ok) {
    throw new Error('Failed to resend deep link');
  }
  return response.json();
}

export interface CreatePaymentIntentResponse {
  clientSecret: string;
}

// export async function createPaymentIntent(token: string, rentalOrderId: string, paymentType: string, paymentProvider: string): Promise<CreatePaymentIntentResponse> {
//   const response = await fetch(`${API_BASE_URL}/payments/create-payment/${rentalOrderId}?paymentType=${paymentType}&paymentProvider=${paymentProvider}`, {
//     method: 'POST',
//     headers: {
//       'X-DeepLink-Token': token,
//       'Accept': 'application/json',
//       'Content-Type': 'application/json',
//     }
//   });

//   if (!response.ok) {
//     throw new Error('Failed to create payment intent');
//   }

//   return response.json();
// }

type PaymentResponse = CreatePaymentIntentResponse | RevolutPaymentResponse;

export async function createPaymentIntent(
  token: string, 
  rentalOrderId: string, 
  paymentType: string, 
  paymentProvider: string
): Promise<PaymentResponse> {
  const response = await fetch(`${API_BASE_URL}/payments/create-payment/${rentalOrderId}?paymentType=${paymentType}&paymentProvider=${paymentProvider}`, {
    method: 'POST',
    headers: {
      'X-DeepLink-Token': token,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok) {
    throw new Error('Failed to create payment intent');
  }

  const data = await response.json();

  if ('clientSecret' in data) {
    return data as CreatePaymentIntentResponse;
  } else if ('redirectUrl' in data) {
    return data as RevolutPaymentResponse;
  } else {
    throw new Error('Invalid payment response format');
  }
}

// Function to determine the type of the payment response
export function isRevolutPaymentResponse(response: PaymentResponse): response is RevolutPaymentResponse {
  return 'redirectUrl' in response;
}