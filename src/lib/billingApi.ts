import axios from 'axios';
import { getAuthHeaders, safeApiCall, ApiResponse, extractErrorMessage } from './apiHelper';

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL}/org/billing`;

export type LedgerType =
    | 'opening'
    | 'topup'
    | 'call_charge'
    | 'promo'
    | 'adjustment'
    | 'refund'
    | 'reversal'
    | 'expiry';

export interface PlanRates {
    outbound: number; // paise per minute
    inbound: number;
    web: number;
}

export interface BillingSummary {
    orgId: string;
    currency: string;
    balancePaise: number;
    heldPaise: number;
    creditLimitPaise: number;
    availablePaise: number;
    lowBalancePaise: number;
    low: boolean;
    // False while Talkrix has charging switched off: calls are priced but nothing is deducted
    charging: boolean;
    // Whether Talkrix shows customers the per-minute rates; off unless staff turn it on
    showRates: boolean;
    plan: {
        name: string;
        code: string;
        version: number;
        custom: boolean;
        pulseSec: number;
        minBillableSec: number;
        // Only sent when showRates is on
        rates?: PlanRates;
    };
    minutesLeft: number | null;
}

export interface Transaction {
    id: string;
    type: LedgerType;
    amountPaise: number;
    balanceAfterPaise: number | null;
    reason: string | null;
    refType: string | null;
    refId: string | null;
    createdAt: string;
}

export interface TransactionsPage {
    entries: Transaction[];
    total: number;
    page: number;
    pages: number;
}

export interface UsageDay {
    day: string;
    calls: number;
    answeredCalls: number;
    billableSec: number;
    amountPaise: number;
}

export interface UsageReport {
    days: UsageDay[];
    totals: { calls: number; answeredCalls: number; billableSec: number; amountPaise: number };
}

export const fetchBilling = async (): Promise<ApiResponse<BillingSummary>> =>
    safeApiCall(() => axios.get(API_BASE, { headers: getAuthHeaders() }));

export const fetchTransactions = async (
    page = 1,
    limit = 25,
    type?: LedgerType,
): Promise<ApiResponse<TransactionsPage>> =>
    safeApiCall(() =>
        axios.get(`${API_BASE}/transactions`, {
            headers: getAuthHeaders(),
            params: { page, limit, ...(type ? { type } : {}) },
        }),
    );

export const fetchUsage = async (from?: string, to?: string): Promise<ApiResponse<UsageReport>> =>
    safeApiCall(() =>
        axios.get(`${API_BASE}/usage`, {
            headers: getAuthHeaders(),
            params: { ...(from ? { from } : {}), ...(to ? { to } : {}) },
        }),
    );

export const updateLowBalanceAlert = async (
    lowBalancePaise: number,
): Promise<ApiResponse<BillingSummary>> =>
    safeApiCall(() =>
        axios.patch(`${API_BASE}/alerts`, { lowBalancePaise }, { headers: getAuthHeaders() }),
    );


// ---------- buying credits, and the paperwork that follows ----------

export interface BillingProfile {
    name: string;
    gstin?: string | null;
    address?: string | null;
    stateCode?: string | null;
    stateName?: string | null;
    email?: string | null;
    phone?: string | null;
}

export interface TopupQuote {
    creditsPaise: number;
    taxPaise: number;
    cgstPaise: number;
    sgstPaise: number;
    igstPaise: number;
    ratePercent: number;
    totalPaise: number;
    placeOfSupply?: string;
    buyerGstin?: string;
}

export interface TopupOptions {
    online: boolean;
    minPaise: number;
    maxPaise: number;
    presetsPaise: number[];
    quote: TopupQuote;
}

export interface StartedTopup {
    paymentId: string;
    orderId: string;
    keyId: string;
    amountPaise: number;
    quote: TopupQuote;
}

export interface PaymentRow {
    id: string;
    gateway: 'razorpay' | 'manual';
    method: string | null;
    reference: string | null;
    creditsPaise: number;
    amountPaise: number;
    status: 'created' | 'captured' | 'failed' | 'refunded';
    invoiceId: string | null;
    notes: string | null;
    createdAt: string;
    capturedAt: string | null;
}

export interface InvoiceRow {
    id: string;
    number: string;
    kind: 'tax_invoice' | 'credit_note';
    issuedAt: string;
    subtotalPaise: number;
    taxPaise: number;
    totalPaise: number;
    placeOfSupply: string | null;
    buyerGstin: string | null;
    reason: string | null;
}

export const fetchBillingProfile = async (): Promise<ApiResponse<BillingProfile>> =>
    safeApiCall(() => axios.get(`${API_BASE}/profile`, { headers: getAuthHeaders() }));

export const saveBillingProfile = async (
    profile: Partial<Record<'legalName' | 'gstin' | 'address' | 'email' | 'phone', string>>,
): Promise<ApiResponse<BillingProfile>> =>
    safeApiCall(() => axios.patch(`${API_BASE}/profile`, profile, { headers: getAuthHeaders() }));

export const fetchTopupOptions = async (creditsPaise?: number): Promise<ApiResponse<TopupOptions>> =>
    safeApiCall(() =>
        axios.get(`${API_BASE}/topup`, {
            headers: getAuthHeaders(),
            params: creditsPaise ? { creditsPaise } : undefined,
        }),
    );

export const startTopup = async (creditsPaise: number): Promise<ApiResponse<StartedTopup>> =>
    safeApiCall(() => axios.post(`${API_BASE}/topup`, { creditsPaise }, { headers: getAuthHeaders() }));

export const confirmTopup = async (payload: {
    orderId: string;
    paymentId: string;
    signature: string;
}): Promise<ApiResponse<{ payment: PaymentRow; creditsAdded: boolean }>> =>
    safeApiCall(() => axios.post(`${API_BASE}/topup/confirm`, payload, { headers: getAuthHeaders() }));

export const fetchPayments = async (
    page = 1,
): Promise<ApiResponse<{ payments: PaymentRow[]; total: number; page: number; pages: number }>> =>
    safeApiCall(() => axios.get(`${API_BASE}/payments`, { headers: getAuthHeaders(), params: { page } }));

export const fetchInvoices = async (
    page = 1,
): Promise<ApiResponse<{ invoices: InvoiceRow[]; total: number; page: number; pages: number }>> =>
    safeApiCall(() => axios.get(`${API_BASE}/invoices`, { headers: getAuthHeaders(), params: { page } }));

/**
 * Files come through the API with the session's token, so they can't be fetched by URL alone:
 * download them into the page and hand the browser the bytes.
 */
export async function downloadBillingFile(path: string, filename: string): Promise<string | null> {
    try {
        const response = await axios.get(`${API_BASE}${path}`, {
            headers: getAuthHeaders(),
            responseType: 'blob',
        });
        const url = URL.createObjectURL(response.data as Blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
        return null;
    } catch (error) {
        return extractErrorMessage(error);
    }
}
