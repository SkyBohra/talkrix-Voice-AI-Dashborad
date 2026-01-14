import axios from 'axios';

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL}/tools`;

const getAuthHeaders = () => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  }
  return {};
};

// Helper to normalize backend response
const normalizeResponse = (response: any) => {
  const data = response.data;
  return {
    success: data.statusCode < 400,
    data: data.data,
    message: data.message,
    error: data.error,
  };
};

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
export const fetchUserTools = async () => {
  const res = await axios.get(`${API_BASE}/user/me`, {
    headers: getAuthHeaders(),
  });
  return normalizeResponse(res);
};

/**
 * Fetch tools for a specific user
 */
export const fetchToolsByUser = async (userId: string) => {
  const res = await axios.get(`${API_BASE}/user/${userId}`, {
    headers: getAuthHeaders(),
  });
  return normalizeResponse(res);
};

/**
 * Fetch all tools
 */
export const fetchAllTools = async () => {
  const res = await axios.get(API_BASE, {
    headers: getAuthHeaders(),
  });
  return normalizeResponse(res);
};

/**
 * Get a specific tool by local database ID
 */
export const fetchTool = async (id: string) => {
  const res = await axios.get(`${API_BASE}/${id}`, {
    headers: getAuthHeaders(),
  });
  return normalizeResponse(res);
};

/**
 * Create a new tool
 */
export const createTool = async (toolData: CreateToolPayload) => {
  const res = await axios.post(API_BASE, toolData, {
    headers: getAuthHeaders(),
  });
  return normalizeResponse(res);
};

/**
 * Update a tool (full replacement in Ultravox)
 */
export const updateTool = async (id: string, toolData: CreateToolPayload) => {
  const res = await axios.put(`${API_BASE}/${id}`, toolData, {
    headers: getAuthHeaders(),
  });
  return normalizeResponse(res);
};

/**
 * Delete a tool
 */
export const deleteTool = async (id: string) => {
  const res = await axios.delete(`${API_BASE}/${id}`, {
    headers: getAuthHeaders(),
  });
  return normalizeResponse(res);
};
