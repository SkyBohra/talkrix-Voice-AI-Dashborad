import axios from 'axios';

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL}/corpora`;

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

// ==================== CORPUS API ====================

/**
 * Create a new corpus (knowledge base)
 */
export const createCorpus = async (corpusData: { name: string; description?: string }) => {
  const res = await axios.post(API_BASE, corpusData, {
    headers: getAuthHeaders(),
  });
  return normalizeResponse(res);
};

/**
 * List all corpora for current user
 */
export const listCorpora = async () => {
  const res = await axios.get(API_BASE, {
    headers: getAuthHeaders(),
  });
  return normalizeResponse(res);
};

/**
 * Get a specific corpus by ID
 */
export const getCorpus = async (id: string) => {
  const res = await axios.get(`${API_BASE}/${id}`, {
    headers: getAuthHeaders(),
  });
  return normalizeResponse(res);
};

/**
 * Update a corpus
 */
export const updateCorpus = async (id: string, updateData: { name?: string; description?: string }) => {
  const res = await axios.patch(`${API_BASE}/${id}`, updateData, {
    headers: getAuthHeaders(),
  });
  return normalizeResponse(res);
};

/**
 * Delete a corpus
 */
export const deleteCorpus = async (id: string) => {
  const res = await axios.delete(`${API_BASE}/${id}`, {
    headers: getAuthHeaders(),
  });
  return normalizeResponse(res);
};

/**
 * Query a corpus (RAG search)
 */
export const queryCorpus = async (id: string, query: string, maxResults?: number) => {
  const res = await axios.post(
    `${API_BASE}/${id}/query`,
    { query, maxResults },
    { headers: getAuthHeaders() },
  );
  return normalizeResponse(res);
};

/**
 * Sync corpora from Ultravox API
 */
export const syncCorpora = async () => {
  const res = await axios.post(`${API_BASE}/sync`, {}, {
    headers: getAuthHeaders(),
  });
  return normalizeResponse(res);
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
) => {
  const res = await axios.post(
    `${API_BASE}/${corpusId}/sources/crawl`,
    sourceData,
    { headers: getAuthHeaders() },
  );
  return normalizeResponse(res);
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
) => {
  const res = await axios.post(
    `${API_BASE}/${corpusId}/sources/upload`,
    sourceData,
    { headers: getAuthHeaders() },
  );
  return normalizeResponse(res);
};

/**
 * List sources for a corpus
 */
export const listSources = async (corpusId: string) => {
  const res = await axios.get(`${API_BASE}/${corpusId}/sources`, {
    headers: getAuthHeaders(),
  });
  return normalizeResponse(res);
};

/**
 * Get a specific source
 */
export const getSource = async (corpusId: string, sourceId: string) => {
  const res = await axios.get(`${API_BASE}/${corpusId}/sources/${sourceId}`, {
    headers: getAuthHeaders(),
  });
  return normalizeResponse(res);
};

/**
 * Update a source
 */
export const updateSource = async (corpusId: string, sourceId: string, updateData: any) => {
  const res = await axios.patch(
    `${API_BASE}/${corpusId}/sources/${sourceId}`,
    updateData,
    { headers: getAuthHeaders() },
  );
  return normalizeResponse(res);
};

/**
 * Delete a source
 */
export const deleteSource = async (corpusId: string, sourceId: string) => {
  const res = await axios.delete(`${API_BASE}/${corpusId}/sources/${sourceId}`, {
    headers: getAuthHeaders(),
  });
  return normalizeResponse(res);
};

// ==================== DOCUMENT API ====================

/**
 * List documents for a source
 */
export const listDocuments = async (corpusId: string, sourceId: string) => {
  const res = await axios.get(
    `${API_BASE}/${corpusId}/sources/${sourceId}/documents`,
    { headers: getAuthHeaders() },
  );
  return normalizeResponse(res);
};

/**
 * Create a file upload URL (returns presigned URL)
 */
export const createFileUpload = async (
  corpusId: string,
  uploadData: { mimeType: string; fileName?: string },
) => {
  const res = await axios.post(
    `${API_BASE}/${corpusId}/uploads`,
    uploadData,
    { headers: getAuthHeaders() },
  );
  return normalizeResponse(res);
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
