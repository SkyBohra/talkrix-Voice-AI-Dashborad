import axios from 'axios';
import { getAuthHeaders, safeApiCall, ApiResponse } from './apiHelper';

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL}/org/dnc`;

// The organization's do-not-call list. Every outbound call is checked against it.
export interface DncNumber {
    id: string;
    phoneNumber: string; // E.164
    reason: string | null;
    createdBy: string | null;
    createdAt: string;
}

export interface DncPage {
    numbers: DncNumber[];
    total: number;
    page: number;
    pages: number;
}

export interface DncAddResult {
    added: number;
    alreadyListed: number;
    invalid: number;
}

export const fetchDncNumbers = async (page = 1, limit = 50, search?: string): Promise<ApiResponse<DncPage>> =>
    safeApiCall(() =>
        axios.get(API_BASE, {
            headers: getAuthHeaders(),
            params: { page, limit, ...(search ? { search } : {}) },
        })
    );

// Numbers separated by new lines, commas or semicolons
export const addDncNumbers = async (phoneNumbers: string[], reason?: string): Promise<ApiResponse<DncAddResult>> =>
    safeApiCall(() => axios.post(API_BASE, { phoneNumbers, reason: reason || undefined }, { headers: getAuthHeaders() }));

export const removeDncNumber = async (id: string): Promise<ApiResponse<null>> =>
    safeApiCall(() => axios.delete(`${API_BASE}/${id}`, { headers: getAuthHeaders() }));
