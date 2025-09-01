import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Pagination,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  Link,
  Divider,
  Badge,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  ExpandMore as ExpandMoreIcon,
  OpenInNew as OpenInNewIcon,
  Description as DescriptionIcon,
  Folder as FolderIcon,
  Image as ImageIcon,
  VideoFile as VideoFileIcon,
  AudioFile as AudioFileIcon,
  Code as CodeIcon,
  Archive as ArchiveIcon,
  Clear as ClearIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { apiService, SearchResult, SearchResultsResponse } from '../services/api';

interface FilterState {
  search: string;
  file_type: string;
  domain: string;
  is_google_doc?: boolean;
  is_google_drive?: boolean;
  date_from?: string;
  date_to?: string;
}

const ResultsViewer: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<FilterState>({
    search: searchParams.get('search') || '',
    file_type: searchParams.get('file_type') || '',
    domain: searchParams.get('domain') || '',
    is_google_doc: searchParams.get('is_google_doc') === 'true' || undefined,
    is_google_drive: searchParams.get('is_google_drive') === 'true' || undefined,
    date_from: searchParams.get('date_from') || '',
    date_to: searchParams.get('date_to') || '',
  });
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [pageSize] = useState(100);

  // Fetch results with server-side filtering
  const { data: resultsData, isLoading, error, refetch } = useQuery<SearchResultsResponse>({
    queryKey: ['search-results', filters, page, pageSize],
    queryFn: () => {
       const apiFilters: any = { ...filters };
       // Convert file_type string to file_types array for API
       if (filters.file_type && filters.file_type !== '') {
         apiFilters.file_types = [filters.file_type];
         delete apiFilters.file_type;
       }
       return apiService.getSearchResults({
          ...apiFilters,
          page,
          page_size: pageSize,
        });
      },
      placeholderData: (previousData) => previousData,
   });

  // Fetch file types for filter dropdown
  const { data: fileTypes } = useQuery({
    queryKey: ['file-types'],
    queryFn: () => apiService.getFileTypes(),
  });

  // Fetch top domains for filter dropdown
  const { data: topDomains } = useQuery({
    queryKey: ['top-domains'],
    queryFn: () => apiService.getTopDomains(50),
  });

  const results = resultsData?.results || [];
  const totalResults = resultsData?.total || 0;
  const totalPages = Math.ceil(totalResults / pageSize);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== undefined) {
        params.set(key, value.toString());
      }
    });
    if (page > 1) {
      params.set('page', page.toString());
    }
    setSearchParams(params);
  }, [filters, page, setSearchParams]);

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      file_type: '',
      domain: '',
      is_google_doc: undefined,
      is_google_drive: undefined,
      date_from: '',
      date_to: '',
    });
    setPage(1);
  };

  const getFileIcon = (fileType: string, isGoogleDoc: boolean, isGoogleDrive: boolean) => {
    if (isGoogleDoc) return <DescriptionIcon color="primary" />;
    if (isGoogleDrive) return <FolderIcon color="primary" />;
    
    const type = fileType.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'].includes(type)) {
      return <ImageIcon color="action" />;
    }
    if (['mp4', 'avi', 'mov', 'wmv', 'flv'].includes(type)) {
      return <VideoFileIcon color="action" />;
    }
    if (['mp3', 'wav', 'flac', 'aac'].includes(type)) {
      return <AudioFileIcon color="action" />;
    }
    if (['js', 'html', 'css', 'py', 'java', 'cpp'].includes(type)) {
      return <CodeIcon color="action" />;
    }
    if (['zip', 'rar', '7z', 'tar'].includes(type)) {
      return <ArchiveIcon color="action" />;
    }
    return <DescriptionIcon color="action" />;
  };

  const getFileTypeColor = (fileType: string, isGoogleDoc: boolean, isGoogleDrive: boolean) => {
    if (isGoogleDoc) return 'primary';
    if (isGoogleDrive) return 'secondary';
    
    const type = fileType.toLowerCase();
    if (['pdf'].includes(type)) return 'error';
    if (['doc', 'docx'].includes(type)) return 'info';
    if (['xls', 'xlsx'].includes(type)) return 'success';
    if (['ppt', 'pptx'].includes(type)) return 'warning';
    return 'default';
  };

  const activeFiltersCount = Object.values(filters).filter(value => 
    value !== '' && value !== undefined
  ).length;

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Failed to load search results. Please check your API connection.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4">Search Results</Typography>
        <Button
          startIcon={<RefreshIcon />}
          onClick={() => refetch()}
          disabled={isLoading}
        >
          Refresh
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Filters Sidebar */}
        <Grid item xs={12} lg={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  <Badge badgeContent={activeFiltersCount} color="primary">
                    <FilterListIcon sx={{ mr: 1 }} />
                  </Badge>
                  Filters
                </Typography>
                {activeFiltersCount > 0 && (
                  <Button
                    size="small"
                    startIcon={<ClearIcon />}
                    onClick={clearFilters}
                  >
                    Clear
                  </Button>
                )}
              </Box>

              <TextField
                fullWidth
                label="Search in results"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                margin="normal"
                size="small"
              />

              <FormControl fullWidth margin="normal" size="small">
                <InputLabel>File Type</InputLabel>
                <Select
                  value={filters.file_type}
                  onChange={(e) => handleFilterChange('file_type', e.target.value)}
                >
                  <MenuItem value="">All Types</MenuItem>
                  {(fileTypes || []).map((type: any) => (
                    <MenuItem key={type.file_type} value={type.file_type}>
                      {type.file_type.toUpperCase()} ({type.count})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth margin="normal" size="small">
                <InputLabel>Domain</InputLabel>
                <Select
                  value={filters.domain}
                  onChange={(e) => handleFilterChange('domain', e.target.value)}
                >
                  <MenuItem value="">All Domains</MenuItem>
                  {(topDomains || []).map((domain: any) => (
                    <MenuItem key={domain.domain} value={domain.domain}>
                      {domain.domain} ({domain.count})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Google Services
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  <Chip
                    label="Google Docs"
                    onClick={() => handleFilterChange('is_google_doc', 
                      filters.is_google_doc ? undefined : true
                    )}
                    color={filters.is_google_doc ? 'primary' : 'default'}
                    variant={filters.is_google_doc ? 'filled' : 'outlined'}
                    size="small"
                  />
                  <Chip
                    label="Google Drive"
                    onClick={() => handleFilterChange('is_google_drive', 
                      filters.is_google_drive ? undefined : true
                    )}
                    color={filters.is_google_drive ? 'primary' : 'default'}
                    variant={filters.is_google_drive ? 'filled' : 'outlined'}
                    size="small"
                  />
                </Box>
              </Box>

              <Accordion sx={{ mt: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle2">Date Range</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <TextField
                    fullWidth
                    label="From"
                    type="date"
                    value={filters.date_from}
                    onChange={(e) => handleFilterChange('date_from', e.target.value)}
                    margin="normal"
                    size="small"
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    fullWidth
                    label="To"
                    type="date"
                    value={filters.date_to}
                    onChange={(e) => handleFilterChange('date_to', e.target.value)}
                    margin="normal"
                    size="small"
                    InputLabelProps={{ shrink: true }}
                  />
                </AccordionDetails>
              </Accordion>
            </CardContent>
          </Card>
        </Grid>

        {/* Results List */}
        <Grid item xs={12} lg={9}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">
                  {totalResults.toLocaleString()} results found
                </Typography>
                {isLoading && <CircularProgress size={24} />}
              </Box>

              {isLoading && results.length === 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : results.length === 0 ? (
                <Alert severity="info">
                  {totalResults === 0 ? (
                    <Box>
                      <Typography variant="body1" gutterBottom>
                        No search results available. 
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Please go to the Search page to perform a search first, then return here to view and filter your results.
                      </Typography>
                      <Button
                        variant="outlined"
                        color="primary"
                        onClick={() => window.location.href = '/search'}
                        sx={{ mt: 2 }}
                        startIcon={<SearchIcon />}
                      >
                        Go to Search Page
                      </Button>
                    </Box>
                  ) : (
                    "No results found. Try adjusting your filters or search terms."
                  )}
                </Alert>
              ) : (
                <>
                  <List>
                    {results.map((result: SearchResult, index: number) => (
                      <React.Fragment key={result.id}>
                        <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                          <ListItemIcon sx={{ mt: 1 }}>
                            {getFileIcon(result.file_type || '', result.is_google_doc, result.is_google_drive)}
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <Link
                                  href={result.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  sx={{ 
                                    textDecoration: 'none',
                                    '&:hover': { textDecoration: 'underline' },
                                    fontWeight: 500,
                                    color: 'primary.main'
                                  }}
                                >
                                  {result.title}
                                </Link>
                                <IconButton
                                  size="small"
                                  href={result.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <OpenInNewIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            }
                            secondary={
                              <Box>
                                <Typography variant="body2" color="text.secondary" paragraph>
                                  {result.description}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                  <Typography variant="caption" color="text.secondary">
                                    {result.domain}
                                  </Typography>
                                  <Chip
                                    label={result.file_type?.toUpperCase() || 'UNKNOWN'}
                                    size="small"
                                    color={getFileTypeColor(result.file_type || '', result.is_google_doc, result.is_google_drive) as any}
                                    variant="outlined"
                                  />
                                  {result.is_google_doc && (
                                    <Chip label="Google Doc" size="small" color="primary" variant="outlined" />
                                  )}
                                  {result.is_google_drive && (
                                    <Chip label="Google Drive" size="small" color="secondary" variant="outlined" />
                                  )}
                                  <Typography variant="caption" color="text.secondary">
                                    {new Date(result.created_at).toLocaleDateString()}
                                  </Typography>
                                </Box>
                                {result.engines && result.engines.length > 0 && (
                                  <Box sx={{ mt: 1 }}>
                                    <Typography variant="caption" color="text.secondary">
                                      Found via: {result.engines.join(', ')}
                                    </Typography>
                                  </Box>
                                )}
                                {result.cached_url && (
                                  <Box sx={{ mt: 1 }}>
                                    <Link
                                      href={result.cached_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      variant="caption"
                                    >
                                      View Cached
                                    </Link>
                                  </Box>
                                )}
                              </Box>
                            }
                          />
                        </ListItem>
                        {index < results.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>

                  {totalPages > 1 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                      <Pagination
                        count={totalPages}
                        page={page}
                        onChange={(_, newPage) => setPage(newPage)}
                        color="primary"
                        size="large"
                        showFirstButton
                        showLastButton
                      />
                    </Box>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ResultsViewer;