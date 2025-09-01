import React, { useState, useEffect } from 'react';
import { Search, Filter, FileText, Globe, Calendar } from 'lucide-react';
import { apiService, SearchResult, SearchResponse } from '../services/api';

interface SearchSuggestion {
  suggestions: string[];
}



const SearchInterface: React.FC = () => {
  const [searchTerms, setSearchTerms] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'any' | 'exact' | 'wildcard'>('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filters, setFilters] = useState({
    domain: '',
    file_type: ''
  });
  
  // Client-side filtering states
  const [clientFilters, setClientFilters] = useState({
    searchInResults: '',
    fileType: '',
    domain: '',
    dateFrom: '',
    dateTo: '',
    googleServices: [] as string[]
  });
  
  const [filteredResults, setFilteredResults] = useState<SearchResult[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({
    limit: 50,
    offset: 0,
    total: 0
  });
  const [searchProgress, setSearchProgress] = useState<{[key: string]: boolean}>({});

  // Debounced search suggestions
  useEffect(() => {
    const timer = setTimeout(() => {
      const lines = searchTerms.split('\n').filter(line => line.trim());
      const lastLine = lines[lines.length - 1];
      if (lastLine && lastLine.length > 2) {
        fetchSuggestions(lastLine);
      } else {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerms]);

  // Client-side filtering effect
  useEffect(() => {
    let filtered = [...results];

    // Search in results
    if (clientFilters.searchInResults.trim()) {
      const searchTerm = clientFilters.searchInResults.toLowerCase();
      filtered = filtered.filter(result => 
        result.title.toLowerCase().includes(searchTerm) || 
        (result.description && result.description.toLowerCase().includes(searchTerm)) || 
        result.url.toLowerCase().includes(searchTerm) 
      );
    }

    // File type filter
    if (clientFilters.fileType) {
      filtered = filtered.filter(result => 
        result.file_type?.toLowerCase() === clientFilters.fileType.toLowerCase()
      );
    }

    // Domain filter
    if (clientFilters.domain) {
      filtered = filtered.filter(result => 
        result.domain.toLowerCase().includes(clientFilters.domain.toLowerCase())
      );
    }

    // Date range filter
    if (clientFilters.dateFrom) {
      const fromDate = new Date(clientFilters.dateFrom);
      filtered = filtered.filter(result => 
        new Date(result.created_at) >= fromDate
      );
    }

    if (clientFilters.dateTo) {
      const toDate = new Date(clientFilters.dateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter(result => 
        new Date(result.created_at) <= toDate
      );
    }

    // Google services filter
    if (clientFilters.googleServices.length > 0) {
      filtered = filtered.filter(result => {
        const domain = result.domain.toLowerCase();
        return clientFilters.googleServices.some(service => {
          switch (service) {
            case 'docs':
              return domain.includes('docs.google.com') || domain.includes('drive.google.com');
            case 'drive':
              return domain.includes('drive.google.com');
            default:
              return false;
          }
        });
      });
    }

    setFilteredResults(filtered);
  }, [results, clientFilters]);

  const fetchSuggestions = async (term: string) => {
    try {
      const data = await apiService.getSuggestions(term, 5);
      setSuggestions(data?.suggestions || []);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      setSuggestions([]);
    }
  };

  const performSearch = async (isAdvanced: boolean = false) => {
    const queries = searchTerms.split('\n').filter(line => line.trim());
    if (queries.length === 0) return;

    setLoading(true);
    setSuggestions([]);
    setResults([]);
    setSearchProgress({});

    try {
      const allResults: SearchResult[] = [];
      const progressTracker: {[key: string]: boolean} = {};
      
      // Initialize progress tracking
      queries.forEach(query => {
        progressTracker[query] = false;
      });
      setSearchProgress(progressTracker);

      // Process queries sequentially to avoid timeouts and show progressive results
      for (let i = 0; i < queries.length; i++) {
        const query = queries[i].trim();
        
        try {
          console.log(`Processing query ${i + 1}/${queries.length}: ${query}`);
          
          const searchRequest = {
            query: query,
            max_pages: 3,
            language: 'en',
            time_range: '',
            safesearch: 1
          };

          // Set a longer timeout for individual requests
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout per query
          
          try {
            const response: SearchResponse = await apiService.search(searchRequest);
            clearTimeout(timeoutId);
            
            // Add results immediately as they come in
            if (response.results && response.results.length > 0) {
              const newResults = response.results.filter(newResult => 
                !allResults.some(existingResult => existingResult.url === newResult.url)
              );
              
              allResults.push(...newResults);
              
              // Update UI immediately with new results
              setResults([...allResults]);
              setPagination(prev => ({ ...prev, total: allResults.length }));
            }
            
            // Update progress
            setSearchProgress(prev => ({ ...prev, [query]: true }));
            
            console.log(`Completed query ${i + 1}/${queries.length}: ${query} - Found ${response.results?.length || 0} results`);
            
          } catch (searchError: any) {
            clearTimeout(timeoutId);
            
            if (searchError.name === 'AbortError') {
              console.warn(`Query timeout after 60s: ${query}`);
            } else {
              console.error(`Search error for query "${query}":`, searchError);
            }
            
            // Mark as completed even if failed
            setSearchProgress(prev => ({ ...prev, [query]: true }));
          }
          
          // Small delay between queries to prevent overwhelming the backend
          if (i < queries.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
        } catch (error) {
          console.error(`Unexpected error for query "${query}":`, error);
          setSearchProgress(prev => ({ ...prev, [query]: true }));
        }
      }

      console.log(`Search completed. Total unique results: ${allResults.length}`);
      
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
      setPagination(prev => ({ ...prev, total: 0 }));
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    const lines = searchTerms.split('\n');
    lines[lines.length - 1] = suggestion;
    setSearchTerms(lines.join('\n'));
    setSuggestions([]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      performSearch(showAdvanced);
    }
  };

  const handleGoogleServiceToggle = (service: string) => {
    setClientFilters(prev => ({
      ...prev,
      googleServices: prev.googleServices.includes(service)
        ? prev.googleServices.filter(s => s !== service)
        : [...prev.googleServices, service]
    }));
  };

  const clearAllFilters = () => {
    setClientFilters({
      searchInResults: '',
      fileType: '',
      domain: '',
      dateFrom: '',
      dateTo: '',
      googleServices: []
    });
  };

  const getUniqueFileTypes = () => {
    const types = results
      .map(r => r.file_type)
      .filter(Boolean)
      .map(type => type!.toLowerCase());
    return Array.from(new Set(types)).sort();
  };

  const getUniqueDomains = () => {
    const domains = results.map(r => r.domain);
    return Array.from(new Set(domains)).sort();
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (clientFilters.searchInResults.trim()) count++;
    if (clientFilters.fileType) count++;
    if (clientFilters.domain) count++;
    if (clientFilters.dateFrom) count++;
    if (clientFilters.dateTo) count++;
    if (clientFilters.googleServices.length > 0) count++;
    return count;
  };



  const getFileIcon = (fileType?: string) => {
    if (!fileType) return <Globe className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Search Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Multi-Query Search</h1>
        <p className="text-gray-600">Search multiple queries simultaneously across Searxng instances. Enter each query on a new line.</p>
      </div>

      {/* Search Input */}
      <div className="relative mb-6">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-4 text-gray-400 w-5 h-5" />
            <textarea
              value={searchTerms}
              onChange={(e) => setSearchTerms(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Enter search queries (one per line)...\nExample:\npython programming\njavascript tutorial\nreact components"
              rows={4}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
            />
            
            {/* Search Suggestions */}
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 mt-1">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-3 rounded-lg border transition-colors relative ${
              showFilters 
                ? 'bg-blue-500 text-white border-blue-500' 
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-5 h-5" />
            {getActiveFiltersCount() > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {getActiveFiltersCount()}
              </span>
            )}
          </button>
          
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`px-4 py-3 rounded-lg border transition-colors ${
              showAdvanced 
                ? 'bg-green-500 text-white border-green-500' 
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
            title="Advanced Search Options"
          >
            <Search className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => performSearch(showAdvanced)}
            disabled={loading || !searchTerms.trim()}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Searching...' : 'Search All'}
          </button>
        </div>
      </div>

      {/* Results Filter Panel */}
      {showFilters && results.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <Filter className="w-5 h-5" />
              <span>Filter Results</span>
              {getActiveFiltersCount() > 0 && (
                <span className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full">
                  {getActiveFiltersCount()} active
                </span>
              )}
            </h3>
            <button
              onClick={clearAllFilters}
              className="text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Clear All
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Search in Results */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search in Results
              </label>
              <input
                type="text"
                value={clientFilters.searchInResults}
                onChange={(e) => setClientFilters(prev => ({ ...prev, searchInResults: e.target.value }))}
                placeholder="Search titles, descriptions, URLs..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            
            {/* File Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                File Type
              </label>
              <select
                value={clientFilters.fileType}
                onChange={(e) => setClientFilters(prev => ({ ...prev, fileType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">All Types</option>
                {getUniqueFileTypes().map(type => (
                  <option key={type} value={type}>{type.toUpperCase()}</option>
                ))}
              </select>
            </div>
            
            {/* Domain Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Domain
              </label>
              <select
                value={clientFilters.domain}
                onChange={(e) => setClientFilters(prev => ({ ...prev, domain: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">All Domains</option>
                {getUniqueDomains().map(domain => (
                  <option key={domain} value={domain}>{domain}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Date Range */}
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>Date Range</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">From</label>
                <input
                  type="date"
                  value={clientFilters.dateFrom}
                  onChange={(e) => setClientFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">To</label>
                <input
                  type="date"
                  value={clientFilters.dateTo}
                  onChange={(e) => setClientFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
          </div>
          
          {/* Google Services */}
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Google Services</h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleGoogleServiceToggle('docs')}
                className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                  clientFilters.googleServices.includes('docs')
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Google Docs
              </button>
              <button
                onClick={() => handleGoogleServiceToggle('drive')}
                className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                  clientFilters.googleServices.includes('drive')
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Google Drive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Search Options */}
      {showAdvanced && (
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Advanced Search Options</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Type</label>
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All words (AND)</option>
                <option value="any">Any word (OR)</option>
                <option value="exact">Exact phrase</option>
                <option value="wildcard">Wildcard (*)</option>
              </select>
            </div>
            
            {/* Domain Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Domain</label>
              <input
                type="text"
                value={filters.domain}
                onChange={(e) => setFilters(prev => ({ ...prev, domain: e.target.value }))}
                placeholder="e.g., github.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* File Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">File Type</label>
              <input
                type="text"
                value={filters.file_type}
                onChange={(e) => setFilters(prev => ({ ...prev, file_type: e.target.value }))}
                placeholder="e.g., pdf, docx"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            

          </div>
        </div>
      )}

      {/* Search Progress */}
      {loading && Object.keys(searchProgress).length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold mb-3 text-blue-800">Search Progress</h3>
          <div className="space-y-2">
            {Object.entries(searchProgress).map(([query, completed]) => (
              <div key={query} className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                  completed ? 'bg-green-500' : 'bg-gray-300'
                }`}>
                  {completed && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <span className={`text-sm ${
                  completed ? 'text-green-700 line-through' : 'text-blue-700'
                }`}>
                  {query}
                </span>
                {!completed && (
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                )}
              </div>
            ))}
          </div>
          <p className="text-sm text-blue-600 mt-3">
            Tip: Press Ctrl+Enter to search, or click "Search All" button
          </p>
        </div>
      )}

      {/* Results */}
      <div className="space-y-4">
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-600">Searching...</p>
          </div>
        )}
        
        {!loading && results.length === 0 && searchTerms.trim() && (
          <div className="text-center py-8">
            <p className="text-gray-600">No results found for the provided queries</p>
            <p className="text-sm text-gray-500 mt-2">
              {searchTerms.split('\n').filter(q => q.trim()).length} quer{searchTerms.split('\n').filter(q => q.trim()).length === 1 ? 'y' : 'ies'} searched
            </p>
          </div>
        )}
        
        {!loading && results.length > 0 && filteredResults.length === 0 && getActiveFiltersCount() > 0 && (
          <div className="text-center py-8">
            <p className="text-gray-600">No results match the current filters</p>
            <p className="text-sm text-gray-500 mt-2">
              {getActiveFiltersCount()} filter{getActiveFiltersCount() === 1 ? '' : 's'} applied to {results.length} results
            </p>
            <button 
              onClick={clearAllFilters}
              className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        )}
        
        {!loading && results.length > 0 && (
          <div className="bg-green-50 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-green-800 mb-2">Search Results Summary</h3>
            <p className="text-green-700">
              {getActiveFiltersCount() > 0 ? (
                <>Showing <strong>{filteredResults.length}</strong> of <strong>{results.length}</strong> results</>
              ) : (
                <>Found <strong>{results.length}</strong> unique results from <strong>{searchTerms.split('\n').filter(q => q.trim()).length}</strong> quer{searchTerms.split('\n').filter(q => q.trim()).length === 1 ? 'y' : 'ies'}</>
              )}
            </p>
            <p className="text-sm text-green-600 mt-1">
              {getActiveFiltersCount() > 0 ? (
                <>Filters applied • <button onClick={clearAllFilters} className="underline hover:no-underline">Clear filters</button></>
              ) : (
                'Duplicates have been automatically removed'
              )}
            </p>
          </div>
        )}
        
        {(getActiveFiltersCount() > 0 ? filteredResults : results).map((result) => (
          <div key={result.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 mt-1">
                {getFileIcon(result.file_type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-blue-600 hover:text-blue-800">
                  <a href={result.url} target="_blank" rel="noopener noreferrer">
                    {result.title}
                  </a>
                </h3>
                
                <p className="text-sm text-green-600 mb-2">{result.url}</p>
                
                <p className="text-gray-700 mb-3">{result.description}</p>
                
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span className="flex items-center space-x-1">
                    <Globe className="w-4 h-4" />
                    <span>{result.domain}</span>
                  </span>
                  
                  {result.file_type && (
                    <span className="flex items-center space-x-1">
                      <FileText className="w-4 h-4" />
                      <span>{result.file_type.toUpperCase()}</span>
                    </span>
                  )}
                  
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(result.created_at).toLocaleDateString()}</span>
                  </span>
                  
                  <span>Engines: {result.engines.join(', ')}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Pagination - Note: For now showing all filtered results, pagination can be added later if needed */}
      {(getActiveFiltersCount() > 0 ? filteredResults : results).length > 50 && (
        <div className="mt-8 flex justify-center">
          <div className="text-sm text-gray-600 bg-blue-50 px-4 py-2 rounded-lg">
            Showing all {getActiveFiltersCount() > 0 ? filteredResults.length : results.length} results
            {getActiveFiltersCount() > 0 && (
              <span className="ml-2">• <button onClick={clearAllFilters} className="underline hover:no-underline">Clear filters</button></span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchInterface;