import axios from 'axios';
import { getAuthHeaders, safeApiCall, ApiResponse } from './apiHelper';

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL}/tools`;

// Tool Definition interfaces
export interface DynamicParameter {
  name: string;
  location?: string;
  schema?: Record<string, any>;
  required?: boolean;
}

export interface StaticParameter {
  name: string;
  location?: string;
  value?: any;
}

export interface AutomaticParameter {
  name: string;
  location?: string;
  knownValue?: string;
}

export interface HttpToolImplementation {
  baseUrlPattern?: string;
  httpMethod?: string;
}

export interface ToolDefinition {
  modelToolName?: string;
  description?: string;
  dynamicParameters?: DynamicParameter[];
  staticParameters?: StaticParameter[];
  automaticParameters?: AutomaticParameter[];
  requirements?: Record<string, any>;
  timeout?: string;
  precomputable?: boolean;
  http?: HttpToolImplementation;
  client?: Record<string, any>;
  dataConnection?: Record<string, any>;
  defaultReaction?: string;
  staticResponse?: { responseText: string };
}

export interface Tool {
  _id?: string;
  talkrixToolId?: string;
  userId?: string;
  name: string;
  definition: ToolDefinition;
  ownership?: string;
  talkrixCreated?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateToolPayload {
  name: string;
  definition: ToolDefinition;
}

/**
 * Fetch tools for the current user
 */
export const fetchUserTools = async (): Promise<ApiResponse> => {
  return safeApiCall(() => axios.get(`${API_BASE}/user/me`, { headers: getAuthHeaders() }));
};

/**
 * Fetch tools for a specific user
 */
export const fetchToolsByUser = async (userId: string): Promise<ApiResponse> => {
  return safeApiCall(() => axios.get(`${API_BASE}/user/${userId}`, { headers: getAuthHeaders() }));
};

/**
 * Fetch all tools
 */
export const fetchAllTools = async (): Promise<ApiResponse> => {
  return safeApiCall(() => axios.get(API_BASE, { headers: getAuthHeaders() }));
};

/**
 * Get a specific tool by local database ID
 */
export const fetchTool = async (id: string): Promise<ApiResponse> => {
  return safeApiCall(() => axios.get(`${API_BASE}/${id}`, { headers: getAuthHeaders() }));
};

/**
 * Create a new tool
 */
export const createTool = async (toolData: CreateToolPayload): Promise<ApiResponse> => {
  return safeApiCall(() => axios.post(API_BASE, toolData, { headers: getAuthHeaders() }));
};

/**
 * Update a tool (full replacement in Ultravox)
 */
export const updateTool = async (id: string, toolData: CreateToolPayload): Promise<ApiResponse> => {
  return safeApiCall(() => axios.put(`${API_BASE}/${id}`, toolData, { headers: getAuthHeaders() }));
};

/**
 * Delete a tool
 */
export const deleteTool = async (id: string): Promise<ApiResponse> => {
  return safeApiCall(() => axios.delete(`${API_BASE}/${id}`, { headers: getAuthHeaders() }));
};
