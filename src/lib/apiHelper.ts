import axios, { AxiosError, AxiosResponse } from 'axios';

export interface ApiResponse<T = any> {
    success: boolean;
    data: T | null;
    message: string;
    error?: string;
}

export interface ApiError {
    message: string;
    statusCode?: number;
    error?: string;
}

// Extract error message from various error formats
export const extractErrorMessage = (error: unknown): string => {
    if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<any>;
        
        // Check for response data error messages
        if (axiosError.response?.data) {
            const data = axiosError.response.data;
            
            // Handle different backend error formats
            if (data.message) return data.message;
            if (data.error) return data.error;
            if (typeof data === 'string') return data;
        }
        
        // Handle network errors
        if (axiosError.code === 'ECONNREFUSED') {
            return 'Unable to connect to server. Please check your connection.';
        }
        if (axiosError.code === 'NETWORK_ERROR' || !axiosError.response) {
            return 'Network error. Please check your internet connection.';
        }
        
        // Handle HTTP status codes
        switch (axiosError.response?.status) {
            case 400:
                return 'Invalid request. Please check your input.';
            case 401:
                return 'Session expired. Please login again.';
            case 403:
                return 'You do not have permission to perform this action.';
            case 404:
                return 'The requested resource was not found.';
            case 409:
                return 'A conflict occurred. The resource may already exist.';
            case 422:
                return 'Invalid data provided. Please check your input.';
            case 429:
                return 'Too many requests. Please try again later.';
            case 500:
                return 'Server error. Please try again later.';
            case 502:
                return 'Server is temporarily unavailable. Please try again.';
            case 503:
                return 'Service unavailable. Please try again later.';
            default:
                return axiosError.message || 'An unexpected error occurred.';
        }
    }
    
    if (error instanceof Error) {
        return error.message;
    }
    
    return 'An unexpected error occurred.';
};

// Get auth headers for authenticated requests
export const getAuthHeaders = () => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token) {
            return { Authorization: `Bearer ${token}` };
        }
    }
    return {};
};

// Helper to normalize backend response
export const normalizeResponse = <T = any>(response: AxiosResponse): ApiResponse<T> => {
    const data = response.data;
    return {
        success: data.statusCode < 400,
        data: data.data,
        message: data.message || 'Success',
        error: data.error,
    };
};

// Safe API wrapper that catches errors and returns normalized response
export const safeApiCall = async <T = any>(
    apiCall: () => Promise<AxiosResponse>
): Promise<ApiResponse<T>> => {
    try {
        const response = await apiCall();
        return normalizeResponse<T>(response);
    } catch (error) {
        const errorMessage = extractErrorMessage(error);
        return {
            success: false,
            data: null,
            message: errorMessage,
            error: errorMessage,
        };
    }
};

// Check if user should be redirected to login
export const handleAuthError = (error: unknown): boolean => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return true;
    }
    return false;
};
