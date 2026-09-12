import axios from 'axios';
import { getAuthHeaders, safeApiCall, ApiResponse } from './apiHelper';

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
    plan: {
        name: string;
        code: string;
        version: number;
        custom: boolean;
        pulseSec: number;
        minBillableSec: number;
        rates: PlanRates;
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
