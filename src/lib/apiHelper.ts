import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

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

// Create axios instance with base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor - adds auth token to all requests
apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor - handles token expiration
apiClient.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError) => {
        if (error.response?.status === 401) {
            // Token expired or invalid
            handleTokenExpiration();
        }
        return Promise.reject(error);
    }
);

// Handle token expiration - clear storage and redirect to login
export const handleTokenExpiration = () => {
    if (typeof window !== 'undefined') {
        // Clear all auth-related data
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');
        
        // Only redirect if not already on login page
        if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/signup')) {
            // Store the current path to redirect back after login
            const currentPath = window.location.pathname;
            if (currentPath !== '/' && currentPath !== '/login') {
                sessionStorage.setItem('redirectAfterLogin', currentPath);
            }
            window.location.href = '/login?expired=true';
        }
    }
};

// Check if token is expired (decode JWT and check exp)
export const isTokenExpired = (): boolean => {
    if (typeof window === 'undefined') return true;
    
    const token = localStorage.getItem('token');
    if (!token) return true;
    
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const exp = payload.exp * 1000; // Convert to milliseconds
        const now = Date.now();
        
        // Consider token expired if less than 5 minutes remaining
        return now >= exp - (5 * 60 * 1000);
    } catch {
        return true;
    }
};

// Check token validity before making API calls
export const checkTokenValidity = (): boolean => {
    if (isTokenExpired()) {
        handleTokenExpiration();
        return false;
    }
    return true;
};

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
        // Check token validity before making API call
        if (!checkTokenValidity()) {
            return {
                success: false,
                data: null,
                message: 'Session expired. Please login again.',
                error: 'Session expired. Please login again.',
            };
        }
        
        const response = await apiCall();
        return normalizeResponse<T>(response);
    } catch (error) {
        // Handle 401 errors by redirecting to login
        if (axios.isAxiosError(error) && error.response?.status === 401) {
            handleTokenExpiration();
            return {
                success: false,
                data: null,
                message: 'Session expired. Please login again.',
                error: 'Session expired. Please login again.',
            };
        }
        
        const errorMessage = extractErrorMessage(error);
        return {
            success: false,
            data: null,
            message: errorMessage,
            error: errorMessage,
        };
    }
};

// Check if user should be redirected to login (legacy - kept for backward compatibility)
export const handleAuthError = (error: unknown): boolean => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
        handleTokenExpiration();
        return true;
    }
    return false;
};
