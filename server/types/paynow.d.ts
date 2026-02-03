declare module 'paynow' {
  export class Paynow {
    resultUrl: string;
    returnUrl: string;
    constructor(integrationId: string, integrationKey: string);
    createPayment(reference: string, authEmail?: string): Payment;
    send(payment: Payment): Promise<PaynowResponse>;
    sendMobile(payment: Payment, phone: string, method: string): Promise<PaynowResponse>;
    pollTransaction(pollUrl: string): Promise<PaynowStatusResponse>;
  }

  export interface Payment {
    add(title: string, amount: number): void;
  }

  export interface PaynowResponse {
    success: boolean;
    instructions?: string;
    pollUrl?: string;
    redirectUrl?: string;
    error?: string;
  }

  export interface PaynowStatusResponse {
    paid: boolean;
    status: string;
  }
}
