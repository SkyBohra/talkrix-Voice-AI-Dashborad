import axios from 'axios';
import { getAuthHeaders, safeApiCall, ApiResponse } from './apiHelper';

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL}/corpora`;

// ==================== CORPUS API ====================

/**
 * Create a new corpus (knowledge base)
 */
export const createCorpus = async (corpusData: { name: string; description?: string }): Promise<ApiResponse> => {
  return safeApiCall(() => axios.post(API_BASE, corpusData, { headers: getAuthHeaders() }));
};

/**
 * List all corpora for current user
 */
export const listCorpora = async (): Promise<ApiResponse> => {
  return safeApiCall(() => axios.get(API_BASE, { headers: getAuthHeaders() }));
};

/**
 * Get a specific corpus by ID
 */
export const getCorpus = async (id: string): Promise<ApiResponse> => {
  return safeApiCall(() => axios.get(`${API_BASE}/${id}`, { headers: getAuthHeaders() }));
};

/**
 * Update a corpus
 */
export const updateCorpus = async (id: string, updateData: { name?: string; description?: string }): Promise<ApiResponse> => {
  return safeApiCall(() => axios.patch(`${API_BASE}/${id}`, updateData, { headers: getAuthHeaders() }));
};

/**
 * Delete a corpus
 */
export const deleteCorpus = async (id: string): Promise<ApiResponse> => {
  return safeApiCall(() => axios.delete(`${API_BASE}/${id}`, { headers: getAuthHeaders() }));
};

/**
 * Query a corpus (RAG search)
 */
export const queryCorpus = async (id: string, query: string, maxResults?: number): Promise<ApiResponse> => {
  return safeApiCall(() => 
    axios.post(`${API_BASE}/${id}/query`, { query, maxResults }, { headers: getAuthHeaders() })
  );
};

/**
 * Sync corpora from Ultravox API
 */
export const syncCorpora = async (): Promise<ApiResponse> => {
  return safeApiCall(() => axios.post(`${API_BASE}/sync`, {}, { headers: getAuthHeaders() }));
};

// ==================== SOURCE API ====================

/**
 * Create a crawl source (web crawler)
 */
export const createCrawlSource = async (
  corpusId: string,
  sourceData: {
    name: string;
    description?: string;
    startUrls: string[];
    maxDocuments?: number;
    maxDepth?: number;
  },
): Promise<ApiResponse> => {
  return safeApiCall(() => 
    axios.post(`${API_BASE}/${corpusId}/sources/crawl`, sourceData, { headers: getAuthHeaders() })
  );
};

/**
 * Create an upload source (for uploaded documents)
 */
export const createUploadSource = async (
  corpusId: string,
  sourceData: {
    name: string;
    description?: string;
    documentIds: string[];
  },
): Promise<ApiResponse> => {
  return safeApiCall(() => 
    axios.post(`${API_BASE}/${corpusId}/sources/upload`, sourceData, { headers: getAuthHeaders() })
  );
};

/**
 * List sources for a corpus
 */
export const listSources = async (corpusId: string): Promise<ApiResponse> => {
  return safeApiCall(() => axios.get(`${API_BASE}/${corpusId}/sources`, { headers: getAuthHeaders() }));
};

/**
 * Get a specific source
 */
export const getSource = async (corpusId: string, sourceId: string): Promise<ApiResponse> => {
  return safeApiCall(() => axios.get(`${API_BASE}/${corpusId}/sources/${sourceId}`, { headers: getAuthHeaders() }));
};

/**
 * Update a source
 */
export const updateSource = async (corpusId: string, sourceId: string, updateData: any): Promise<ApiResponse> => {
  return safeApiCall(() => 
    axios.patch(`${API_BASE}/${corpusId}/sources/${sourceId}`, updateData, { headers: getAuthHeaders() })
  );
};

/**
 * Delete a source
 */
export const deleteSource = async (corpusId: string, sourceId: string): Promise<ApiResponse> => {
  return safeApiCall(() => axios.delete(`${API_BASE}/${corpusId}/sources/${sourceId}`, { headers: getAuthHeaders() }));
};

// ==================== DOCUMENT API ====================

/**
 * List documents for a source
 */
export const listDocuments = async (corpusId: string, sourceId: string): Promise<ApiResponse> => {
  return safeApiCall(() => 
    axios.get(`${API_BASE}/${corpusId}/sources/${sourceId}/documents`, { headers: getAuthHeaders() })
  );
};

/**
 * Create a file upload URL (returns presigned URL)
 */
export const createFileUpload = async (
  corpusId: string,
  uploadData: { mimeType: string; fileName?: string },
): Promise<ApiResponse> => {
  return safeApiCall(() => 
    axios.post(`${API_BASE}/${corpusId}/uploads`, uploadData, { headers: getAuthHeaders() })
  );
};

/**
 * Upload a file to the presigned URL
 * Use this after createFileUpload to actually upload the file
 */
export const uploadFileToPresignedUrl = async (presignedUrl: string, file: File) => {
  const res = await axios.put(presignedUrl, file, {
    headers: {
      'Content-Type': file.type,
    },
  });
  return res.status === 200;
};

// ==================== HELPER TYPES ====================

export interface Corpus {
  _id: string;
  talkrixCorpusId: string;
  userId: string;
  name: string;
  description?: string;
  stats?: {
    status: string;
    lastUpdated?: string;
    numChunks?: number;
    numDocs?: number;
    numVectors?: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface CorpusSource {
  _id: string;
  talkrixCorpusId: string;
  corpusId: string;
  sourceId: string;
  userId: string;
  name: string;
  description?: string;
  stats?: {
    status: string;
    lastUpdated?: string;
    numDocs?: number;
  };
  crawl?: {
    startUrls: string[];
    maxDocuments?: number;
    maxDepth?: number;
  };
  upload?: {
    documentIds: string[];
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface CorpusDocument {
  _id: string;
  corpusId: string;
  sourceId: string;
  documentId: string;
  userId: string;
  mimeType?: string;
  fileName?: string;
  sizeBytes?: string;
  metadata?: {
    publicUrl?: string;
    language?: string;
    title?: string;
    description?: string;
    published?: string;
    exampleQueries?: string[];
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface QueryResult {
  content: string;
  score: number;
  citation?: {
    sourceId: string;
    documentId: string;
    publicUrl?: string;
    title?: string;
  };
}
