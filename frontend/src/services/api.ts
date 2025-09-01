import axios, { AxiosResponse } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// For development, we'll use the direct backend URL to bypass proxy issues
const DEVELOPMENT_API_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: process.env.NODE_ENV === 'development' ? DEVELOPMENT_API_URL : API_BASE_URL,
  timeout: 90000, // Increased to 90 seconds to handle longer searches
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Response Error:', error);
    if (error.response?.status === 500) {
      console.error('Server Error:', error.response.data);
    }
    return Promise.reject(error);
  }
);

// Types
export interface SearxngInstance {
  id: string;
  name: string;
  url: string;
  is_active: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface SearxngInstanceCreate {
  name: string;
  url: string;
  is_active?: boolean;
  description?: string;
}

export interface SearxngInstanceUpdate {
  name?: string;
  url?: string;
  is_active?: boolean;
  description?: string;
}

export interface SearchRequest {
  query: string;
  instance_ids?: string[];
  max_pages?: number;
  safesearch?: number;
  file_types?: string[];
}

export interface SearchResponse {
  query_id: string;
  status: string;
  message: string;
  results: SearchResult[];
}

export interface SearchResult {
  id: string;
  query_id: string;
  title: string;
  url: string;
  description?: string;
  domain: string;
  file_type?: string;
  is_google_doc: boolean;
  is_google_drive: boolean;
  engines: string[];
  cached_url?: string;
  created_at: string;
}

export interface SearchQuery {
  id: string;
  query_text: string;
  instance_id: string;
  max_pages: number;
  language: string;
  time_range?: string;
  safesearch: number;
  status: string;
  total_results: number;
  created_at: string;
  updated_at: string;
}

export interface SearchResultsResponse {
  results: SearchResult[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface Statistics {
  total_queries: number;
  total_results: number;
  active_instances: number;
  recent_queries: SearchQuery[];
}

export interface FileTypeCount {
  file_type: string;
  count: number;
}

export interface DomainCount {
  domain: string;
  count: number;
}

export interface HealthStatus {
  status: string;
  database: string;
  timestamp: string;
}

// API Service Class
export class ApiService {
  // Health Check
  async getHealth(): Promise<HealthStatus> {
    const response: AxiosResponse<HealthStatus> = await api.get('/api/health');
    return response.data;
  }

  // Searxng Instances
  async getInstances(): Promise<SearxngInstance[]> {
    const response: AxiosResponse<SearxngInstance[]> = await api.get('/api/instances');
    return response.data;
  }

  async createInstance(instance: SearxngInstanceCreate): Promise<SearxngInstance> {
    const response: AxiosResponse<SearxngInstance> = await api.post('/api/instances', instance);
    return response.data;
  }

  async updateInstance(id: string, instance: SearxngInstanceUpdate): Promise<SearxngInstance> {
    const response: AxiosResponse<SearxngInstance> = await api.put(`/api/instances/${id}`, instance);
    return response.data;
  }

  async deleteInstance(id: string): Promise<void> {
    await api.delete(`/api/instances/${id}`);
  }

  async testInstance(id: string): Promise<{ success: boolean; message: string; response_time?: number }> {
    const response = await api.post(`/api/instances/${id}/test`);
    return response.data;
  }

  // Search Operations
  async search(searchRequest: SearchRequest): Promise<SearchResponse> {
    const response: AxiosResponse<SearchResponse> = await api.post('/api/search', searchRequest);
    return response.data;
  }

  async getSearchResults(
    filters: {
      page?: number;
      page_size?: number;
      search?: string;
      file_type?: string;
      file_types?: string[];
      domain?: string;
      is_google_doc?: boolean;
      is_google_drive?: boolean;
      date_from?: string;
      date_to?: string;
    } = {}
  ): Promise<SearchResultsResponse> {
    const params = new URLSearchParams();

    // Add all filters to params
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (key === 'file_types' && Array.isArray(value)) {
          // Convert array to comma-separated string
          params.append('file_types', value.join(','));
        } else {
          params.append(key, value.toString());
        }
      }
    });

    const response: AxiosResponse<SearchResult[] | SearchResultsResponse> = await api.get(`/api/results?${params}`);
    
    // If the response is an array (live scraping), convert it to SearchResultsResponse format
    if (Array.isArray(response.data)) {
      const results = response.data as SearchResult[];
      const page = filters.page || 1;
      const page_size = filters.page_size || 50;
      
      return {
        results: results,
        total: results.length,
        page: page,
        per_page: page_size,
        total_pages: Math.ceil(results.length / page_size)
      };
    }
    
    // Otherwise, return the paginated response as-is
    return response.data as SearchResultsResponse;
  }

  async getSearchQuery(queryId: string): Promise<SearchQuery> {
    const response: AxiosResponse<SearchQuery> = await api.get(`/api/queries/${queryId}`);
    return response.data;
  }

  async getRecentQueries(limit: number = 10): Promise<SearchQuery[]> {
    const response: AxiosResponse<SearchQuery[]> = await api.get(`/api/queries/recent?limit=${limit}`);
    return response.data;
  }

  // Statistics
  async getStatistics(): Promise<Statistics> {
    const response: AxiosResponse<Statistics> = await api.get('/api/statistics');
    return response.data;
  }

  async getFileTypes(): Promise<FileTypeCount[]> {
    const response: AxiosResponse<{ file_types: FileTypeCount[], total_files: number }> = await api.get('/api/file-types-summary');
    return response.data.file_types || [];
  }

  async getAvailableFileTypes(): Promise<string[]> {
    const response: AxiosResponse<{ file_types: string[] }> = await api.get('/api/file-types');
    return response.data.file_types;
  }

  async getTopDomains(limit: number = 10): Promise<DomainCount[]> {
    const response: AxiosResponse<{ domains: DomainCount[], total_domains: number }> = await api.get(`/api/statistics/domains?limit=${limit}`);
    return response.data.domains || [];
  }

  async getInstanceStats(): Promise<any[]> {
    const response = await api.get('/api/statistics/instances');
    return response.data;
  }

  async getAnalytics(days: number = 30): Promise<any> {
    const response = await api.get(`/api/analytics?days=${days}`);
    return response.data;
  }

  async getDailyAnalytics(days: number = 30): Promise<{ period_days: number; data: Array<{ date: string; searches: number; results: number }> }> {
    const response = await api.get(`/api/analytics/daily?days=${days}`);
    return response.data;
  }

  // Cleanup
  async cleanup(days: number = 30): Promise<{ message: string; deleted_results: number; deleted_queries: number }> {
    const response = await api.post('/api/cleanup', { days });
    return response.data;
  }

  // Full-text search
  async fullTextSearch(
    query: string,
    page: number = 1,
    perPage: number = 20
  ): Promise<SearchResultsResponse> {
    const params = new URLSearchParams({
      q: query,
      page: page.toString(),
      per_page: perPage.toString(),
    });

    const response: AxiosResponse<SearchResultsResponse> = await api.get(`/api/search/fulltext?${params}`);
    return response.data;
  }

  // Export results
  async exportResults(
    format: 'csv' | 'json' = 'csv',
    filters: {
      search?: string;
      file_type?: string;
      domain?: string;
      is_google_doc?: boolean;
      is_google_drive?: boolean;
      start_date?: string;
      end_date?: string;
    } = {}
  ): Promise<Blob> {
    const params = new URLSearchParams({ format });

    // Add filters to params
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(`/api/export?${params}`, {
      responseType: 'blob',
    });

    return response.data;
  }

  // Batch operations
  async deleteResults(resultIds: string[]): Promise<{ message: string; deleted_count: number }> {
    const response = await api.post('/api/results/batch-delete', { result_ids: resultIds });
    return response.data;
  }

  async markResultsAsReviewed(resultIds: string[]): Promise<{ message: string; updated_count: number }> {
    const response = await api.post('/api/results/batch-review', { result_ids: resultIds });
    return response.data;
  }

  async getSuggestions(term: string, limit: number = 5): Promise<{ suggestions: string[] }> {
    const response: AxiosResponse<{ suggestions: string[] }> = await api.get(`/api/suggestions?partial_term=${encodeURIComponent(term)}&limit=${limit}`);
    return response.data;
  }

  async getConfig(): Promise<{
    max_pages_default: number;
    max_pages_min: number;
    max_pages_max: number;
    safesearch_default: number;
    safesearch_min: number;
    safesearch_max: number;
  }> {
    const response = await api.get('/api/config');
    return response.data;
  }

  async advancedSearch(searchParams: {
    search_term: string;
    search_type: 'all' | 'any' | 'exact' | 'wildcard';
    domain?: string;
    file_type?: string;
    is_file?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<SearchResult[]> {
    const response: AxiosResponse<SearchResult[]> = await api.post('/api/advanced-search', searchParams);
    return response.data;
  }
}

// Create and export a singleton instance
export const apiService = new ApiService();

// Export the axios instance for direct use if needed
export { api };

// Utility functions
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileTypeIcon = (fileType: string): string => {
  const type = fileType?.toLowerCase() || '';
  
  if (type.includes('pdf')) return '📄';
  if (type.includes('doc') || type.includes('docx')) return '📝';
  if (type.includes('xls') || type.includes('xlsx')) return '📊';
  if (type.includes('ppt') || type.includes('pptx')) return '📈';
  if (type.includes('txt')) return '📃';
  if (type.includes('zip') || type.includes('rar')) return '🗜️';
  if (type.includes('image') || type.includes('jpg') || type.includes('png')) return '🖼️';
  if (type.includes('video') || type.includes('mp4') || type.includes('avi')) return '🎥';
  if (type.includes('audio') || type.includes('mp3') || type.includes('wav')) return '🎵';
  
  return '📄'; // Default file icon
};

export const getFileTypeColor = (fileType: string): string => {
  const type = fileType?.toLowerCase() || '';
  
  if (type.includes('pdf')) return '#d32f2f';
  if (type.includes('doc') || type.includes('docx')) return '#1976d2';
  if (type.includes('xls') || type.includes('xlsx')) return '#388e3c';
  if (type.includes('ppt') || type.includes('pptx')) return '#f57c00';
  if (type.includes('txt')) return '#616161';
  if (type.includes('zip') || type.includes('rar')) return '#7b1fa2';
  if (type.includes('image')) return '#e91e63';
  if (type.includes('video')) return '#3f51b5';
  if (type.includes('audio')) return '#ff5722';
  
  return '#757575'; // Default color
};

export const truncateText = (text: string, maxLength: number = 100): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};