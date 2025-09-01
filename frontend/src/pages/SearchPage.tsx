import React, { useState } from 'react';
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
  Alert,
  CircularProgress,
  FormControlLabel,
  Switch,
  Slider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  Container,
  Fade,
  Zoom,
  useTheme,
  alpha,
  Tooltip,
  IconButton,
  Divider,
  LinearProgress,
  Avatar,
  Badge,
} from '@mui/material';
import {
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon,
  History as HistoryIcon,
  PlayArrow as PlayArrowIcon,
  CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Language as LanguageIcon,
  Schedule as ScheduleIcon,
  FilterList as FilterListIcon,
  Lightbulb as LightbulbIcon,
  AutoAwesome as AutoAwesomeIcon,
  Rocket as RocketIcon,
  Psychology as PsychologyIcon,
  Clear as ClearIcon,
  ContentCopy as ContentCopyIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar, closeSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import { apiService, SearchResponse, SearchResult } from '../services/api';

interface SearchFormData {
  query: string;
  instances: string[];
  max_pages: number;
  safesearch: number;
  file_types: string[];
}

const SearchPage: React.FC = () => {
  const theme = useTheme();
  const [formData, setFormData] = useState<SearchFormData>({
    query: '',
    instances: [],
    max_pages: 3,
    safesearch: 1,
    file_types: [],
  });

  const [isSearching, setIsSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [totalResults, setTotalResults] = useState(0);

  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  // Fetch instances
  const { data: instances, isLoading: instancesLoading } = useQuery({
    queryKey: ['instances'],
    queryFn: apiService.getInstances,
  });

  // Fetch recent queries for suggestions
  const { data: recentQueries } = useQuery({
    queryKey: ['recent-queries'],
    queryFn: () => apiService.getRecentQueries(10),
  });

  // Fetch available file types
  const { data: availableFileTypes } = useQuery({
    queryKey: ['available-file-types'],
    queryFn: apiService.getAvailableFileTypes,
  });

  // Fetch configuration
  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: apiService.getConfig,
  });

  // Update formData when config is loaded
  React.useEffect(() => {
    if (config) {
      setFormData(prev => ({
        ...prev,
        max_pages: config.max_pages_default,
        safesearch: config.safesearch_default,
      }));
    }
  }, [config]);

  // Search mutation
  const searchMutation = useMutation<
    SearchResponse,
    Error,
    {
      query: string;
      instance_ids: string[];
      max_pages: number;
      safesearch: number;
      file_types?: string[];
    }
  >({
    mutationFn: apiService.search,
    onSuccess: (data) => {
      enqueueSnackbar(data.message, { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['recent-queries'] });
      // Accumulate results instead of overwriting
      setSearchResults(prev => [...prev, ...data.results]);
      setTotalResults(prev => prev + data.results.length);
      setSearchProgress(`Search completed: ${data.message}`);
    },
    onError: (error: any) => {
      enqueueSnackbar(`Search failed: ${error.message}`, { variant: 'error' });
      setIsSearching(false);
    },
  });

  const activeInstances = instances?.filter(instance => instance.is_active) || [];

  const handleInstanceToggle = (instanceId: string) => {
    setFormData(prev => ({
      ...prev,
      instances: prev.instances.includes(instanceId)
        ? prev.instances.filter(id => id !== instanceId)
        : [...prev.instances, instanceId]
    }));
  };

  const handleSelectAllInstances = () => {
    setFormData(prev => ({
      ...prev,
      instances: prev.instances.length === activeInstances.length
        ? []
        : activeInstances.map(instance => instance.id)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.query.trim()) {
      enqueueSnackbar('Please enter search queries', { variant: 'error' });
      return;
    }

    if (formData.instances.length === 0) {
      enqueueSnackbar('Please select at least one instance', { variant: 'error' });
      return;
    }

    // Split queries by newlines and filter out empty lines
    const queries = formData.query
      .split('\n')
      .map(q => q.trim())
      .filter(q => q.length > 0);

    if (queries.length === 0) {
      enqueueSnackbar('Please enter at least one valid search query', { variant: 'error' });
      return;
    }

    setIsSearching(true);
    setSearchResults([]); // Clear previous results
    setTotalResults(0); // Reset total count
    setSearchProgress(`Initiating ${queries.length} search${queries.length > 1 ? 'es' : ''}...`);
    
    // Execute searches for each query
     let completedSearches = 0;
     const totalSearches = queries.length;
     
     for (let index = 0; index < queries.length; index++) {
       const query = queries[index];
       try {
         setSearchProgress(`Running search ${index + 1}/${totalSearches}: ${query.substring(0, 50)}${query.length > 50 ? '...' : ''}`);
         
         await new Promise((resolve, reject) => {
           searchMutation.mutate({
           query: query,
           instance_ids: formData.instances,
           max_pages: formData.max_pages,
           safesearch: formData.safesearch,
           file_types: formData.file_types.length > 0 ? formData.file_types : undefined,
         }, {
             onSuccess: () => {
               completedSearches++;
               resolve(undefined);
             },
             onError: (error) => {
               reject(error);
             }
           });
         });
         
         // Add a small delay between searches to avoid overwhelming the server
         if (index < queries.length - 1) {
           await new Promise(resolve => setTimeout(resolve, 1000));
         }
         
       } catch (error) {
         console.error(`Failed to execute search for query: ${query}`, error);
         enqueueSnackbar(`Failed to execute search: ${query}`, { variant: 'error' });
       }
     }
    
    setIsSearching(false);
    setSearchProgress('');
    
    if (completedSearches > 0) {
      enqueueSnackbar(
        `Completed ${completedSearches}/${totalSearches} searches. Click "View All Results" to see the full results page.`, 
        { 
          variant: completedSearches === totalSearches ? 'success' : 'warning',
          persist: true,
          action: (key) => (
            <Button 
              color="inherit" 
              onClick={() => {
                navigate('/results');
                closeSnackbar(key);
              }}
            >
              View Results
            </Button>
          )
        }
      );
    } else {
      enqueueSnackbar(`Completed ${completedSearches}/${totalSearches} searches`, { 
        variant: 'warning' 
      });
    }
  };

  const handleQuickSearch = (query: string) => {
    setFormData(prev => ({ ...prev, query }));
  };



  const safesearchLabels = {
    0: 'Off',
    1: 'Moderate',
    2: 'Strict',
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background decoration */}
      <Box sx={{
        position: 'absolute',
        top: -50,
        right: -50,
        width: 200,
        height: 200,
        borderRadius: '50%',
        background: `linear-gradient(45deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.secondary.main, 0.1)})`,
        zIndex: 0
      }} />
      <Box sx={{
        position: 'absolute',
        bottom: -100,
        left: -100,
        width: 300,
        height: 300,
        borderRadius: '50%',
        background: `linear-gradient(225deg, ${alpha(theme.palette.primary.main, 0.08)}, ${alpha(theme.palette.secondary.main, 0.08)})`,
        zIndex: 0
      }} />
      
      <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1, py: 4 }}>
        {/* Additional background pattern overlay */}
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `radial-gradient(circle at 20% 80%, ${alpha(theme.palette.primary.main, 0.03)} 0%, transparent 50%), radial-gradient(circle at 80% 20%, ${alpha(theme.palette.secondary.main, 0.03)} 0%, transparent 50%), radial-gradient(circle at 40% 40%, ${alpha(theme.palette.primary.main, 0.02)} 0%, transparent 50%)`,
          pointerEvents: 'none',
          zIndex: 0
        }} />
        {/* Hero Section */}
        <Fade in timeout={800}>
          <Box sx={{ 
            textAlign: 'center', 
            mb: 6,
            py: 6,
            position: 'relative'
          }}>
            {/* Floating elements */}
            <Box sx={{
              position: 'absolute',
              top: '20%',
              left: '10%',
              animation: 'float 6s ease-in-out infinite',
              '@keyframes float': {
                '0%, 100%': { transform: 'translateY(0px)' },
                '50%': { transform: 'translateY(-20px)' }
              }
            }}>
              <AutoAwesomeIcon sx={{ fontSize: 24, color: alpha(theme.palette.primary.main, 0.3) }} />
            </Box>
            <Box sx={{
              position: 'absolute',
              top: '30%',
              right: '15%',
              animation: 'float 8s ease-in-out infinite',
              animationDelay: '2s'
            }}>
              <RocketIcon sx={{ fontSize: 28, color: alpha(theme.palette.secondary.main, 0.3) }} />
            </Box>
            <Box sx={{
              position: 'absolute',
              bottom: '20%',
              left: '20%',
              animation: 'float 7s ease-in-out infinite',
              animationDelay: '4s'
            }}>
              <PsychologyIcon sx={{ fontSize: 26, color: alpha(theme.palette.primary.main, 0.25) }} />
            </Box>
            
            <Zoom in timeout={1000}>
              <Box sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 100,
                height: 100,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                mb: 4,
                boxShadow: `0 12px 40px ${alpha(theme.palette.primary.main, 0.4)}`,
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: -4,
                  left: -4,
                  right: -4,
                  bottom: -4,
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.3)}, ${alpha(theme.palette.secondary.main, 0.3)})`,
                  zIndex: -1,
                  animation: 'pulse 2s ease-in-out infinite',
                  '@keyframes pulse': {
                    '0%, 100%': { transform: 'scale(1)', opacity: 0.7 },
                    '50%': { transform: 'scale(1.1)', opacity: 0.3 }
                  }
                }
              }}>
                <SearchIcon sx={{ fontSize: 50, color: 'white' }} />
              </Box>
            </Zoom>
            
            <Typography 
              variant="h2" 
              component="h1"
              gutterBottom 
              sx={{ 
                fontWeight: 800,
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 3,
                fontSize: { xs: '2.5rem', md: '3.5rem' },
                letterSpacing: '-0.02em'
              }}
            >
              Multi-Query Search
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
              <Chip 
                icon={<RocketIcon />}
                label="Lightning Fast"
                variant="outlined"
                sx={{
                  borderColor: alpha(theme.palette.secondary.main, 0.3),
                  color: theme.palette.secondary.main,
                  fontWeight: 600,
                  '&:hover': {
                    background: alpha(theme.palette.secondary.main, 0.05)
                  }
                }}
              />
            </Box>
            
            <Typography 
              variant="h6" 
              color="text.secondary"
              sx={{ 
                maxWidth: 700, 
                mx: 'auto',
                lineHeight: 1.7,
                fontWeight: 400,
                fontSize: '1.1rem'
              }}
            >
              Search multiple queries simultaneously across Searxng instances. 
              <Box component="span" sx={{ color: 'primary.main', fontWeight: 600 }}>
                Enter each query on a new line
              </Box>
              {' '}and let our intelligent system handle the rest.
            </Typography>
          </Box>
        </Fade>

        <Grid container spacing={4}>
        {/* Main Search Form */}
        <Grid item xs={12} lg={8}>
          <Fade in timeout={1200}>
            <Card sx={{
              borderRadius: 3,
              boxShadow: `0 8px 40px ${alpha(theme.palette.common.black, 0.12)}`,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: `0 12px 48px ${alpha(theme.palette.common.black, 0.15)}`
              }
            }}>
              <CardContent sx={{ p: 4 }}>
              <form onSubmit={handleSubmit}>
                <Box sx={{ position: 'relative', mb: 3 }}>
                  <TextField
                    fullWidth
                    label="Search Queries"
                    value={formData.query}
                    onChange={(e) => setFormData({ ...formData, query: e.target.value })}
                    placeholder={`Enter your search terms, one per line:
site:docs.google.com "files"
filetype:pdf budget report
site:drive.google.com presentation`}
                    margin="normal"
                    required
                    disabled={isSearching}
                    multiline
                    rows={5}
                    InputProps={{
                      startAdornment: (
                        <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                          <SearchIcon sx={{ color: 'primary.main' }} />
                        </Box>
                      ),
                      endAdornment: (
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mt: 1 }}>
                          {formData.query && (
                            <Tooltip title="Clear all">
                              <IconButton
                                size="small"
                                onClick={() => setFormData({ ...formData, query: '' })}
                                disabled={isSearching}
                                sx={{ 
                                  color: 'text.secondary',
                                  '&:hover': { color: 'error.main' }
                                }}
                              >
                                <ClearIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {isSearching && <CircularProgress size={20} />}
                        </Box>
                      ),
                      sx: {
                        borderRadius: 3,
                        background: 'rgba(255, 255, 255, 0.9)',
                        backdropFilter: 'blur(10px)',
                        fontSize: '1rem',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: alpha(theme.palette.primary.main, 0.2),
                          borderWidth: 2
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: alpha(theme.palette.primary.main, 0.4)
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: theme.palette.primary.main,
                          borderWidth: 2,
                          boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`
                        }
                      }
                    }}
                    InputLabelProps={{
                      sx: {
                        color: theme.palette.primary.main,
                        fontWeight: 600,
                        fontSize: '1.1rem'
                      }
                    }}
                    helperText={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                        <LightbulbIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                          Enter multiple search queries, one per line. Each query will be executed separately.
                        </Typography>
                      </Box>
                    }
                  />
                  
                  {/* Query counter */}
                  {formData.query && (
                    <Chip
                      size="small"
                      label={`${formData.query.split('\n').filter(q => q.trim()).length} queries`}
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        background: alpha(theme.palette.primary.main, 0.1),
                        color: 'primary.main',
                        fontWeight: 600
                      }}
                    />
                  )}
                </Box>

                {/* Instance Selection */}
                <Box sx={{ mt: 4, mb: 3 }}>
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    mb: 3,
                    p: 3,
                    borderRadius: 3,
                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.06)}, ${alpha(theme.palette.secondary.main, 0.04)})`,
                    border: `2px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                    boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.1)}`
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                        mr: 2,
                        boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`
                      }}>
                        <TrendingUpIcon sx={{ color: 'white', fontSize: 20 }} />
                      </Box>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main', mb: 0.5 }}>
                          Select Instances
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                          {formData.instances.length} of {activeInstances.length} selected
                        </Typography>
                      </Box>
                    </Box>
                    <Button
                      size="medium"
                      variant="contained"
                      onClick={handleSelectAllInstances}
                      disabled={isSearching || instancesLoading}
                      sx={{
                        borderRadius: 3,
                        textTransform: 'none',
                        fontWeight: 600,
                        background: `linear-gradient(135deg, ${theme.palette.secondary.main}, ${theme.palette.secondary.dark})`,
                        boxShadow: `0 4px 16px ${alpha(theme.palette.secondary.main, 0.3)}`,
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: `0 6px 20px ${alpha(theme.palette.secondary.main, 0.4)}`
                        }
                      }}
                    >
                      {formData.instances.length === activeInstances.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </Box>
                  
                  {instancesLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                      <CircularProgress size={40} thickness={4} />
                    </Box>
                  ) : activeInstances.length === 0 ? (
                    <Alert 
                      severity="warning" 
                      sx={{ 
                        borderRadius: 3,
                        border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                        background: alpha(theme.palette.warning.main, 0.05)
                      }}
                    >
                      No active instances found. Please add and activate instances first.
                    </Alert>
                  ) : (
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2 }}>
                      {activeInstances.map((instance) => (
                        <Paper
                          key={instance.id}
                          onClick={() => handleInstanceToggle(instance.id)}
                          sx={{
                            p: 2.5,
                            borderRadius: 3,
                            cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            border: `2px solid ${formData.instances.includes(instance.id) 
                              ? theme.palette.primary.main 
                              : alpha(theme.palette.divider, 0.2)}`,
                            background: formData.instances.includes(instance.id)
                              ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)}, ${alpha(theme.palette.primary.main, 0.04)})`
                              : 'background.paper',
                            boxShadow: formData.instances.includes(instance.id)
                              ? `0 8px 32px ${alpha(theme.palette.primary.main, 0.2)}`
                              : `0 2px 8px ${alpha(theme.palette.common.black, 0.08)}`,
                            '&:hover': {
                              transform: 'translateY(-4px)',
                              boxShadow: `0 12px 40px ${alpha(theme.palette.primary.main, 0.25)}`,
                              border: `2px solid ${theme.palette.primary.main}`
                            },
                            '&:active': {
                              transform: 'translateY(-2px)'
                            }
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Avatar
                                sx={{
                                  width: 36,
                                  height: 36,
                                  mr: 1.5,
                                  background: formData.instances.includes(instance.id)
                                    ? `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`
                                    : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.6)}, ${alpha(theme.palette.primary.dark, 0.6)})`,
                                  fontSize: '0.875rem',
                                  fontWeight: 700,
                                  color: 'white'
                                }}
                              >
                                {instance.name.charAt(0).toUpperCase()}
                              </Avatar>
                              <Box>
                                <Typography 
                                  variant="subtitle1" 
                                  sx={{ 
                                    fontWeight: 600, 
                                    color: formData.instances.includes(instance.id) ? 'primary.main' : 'text.primary',
                                    lineHeight: 1.2
                                  }}
                                >
                                  {instance.name}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                  <Badge
                                    color="success"
                                    variant="dot"
                                    sx={{
                                      '& .MuiBadge-dot': {
                                        width: 8,
                                        height: 8
                                      }
                                    }}
                                  />
                                  <Typography 
                                    variant="caption" 
                                    sx={{ 
                                      color: 'success.main', 
                                      fontWeight: 600,
                                      textTransform: 'uppercase',
                                      letterSpacing: 0.5
                                    }}
                                  >
                                    Active
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>
                            
                            <Box sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              background: formData.instances.includes(instance.id)
                                ? `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`
                                : alpha(theme.palette.divider, 0.1),
                              border: `2px solid ${formData.instances.includes(instance.id)
                                ? 'transparent'
                                : alpha(theme.palette.divider, 0.2)}`,
                              transition: 'all 0.2s ease-in-out'
                            }}>
                              {formData.instances.includes(instance.id) && (
                                <CheckCircleIcon 
                                  sx={{ 
                                    fontSize: 16, 
                                    color: 'white'
                                  }} 
                                />
                              )}
                            </Box>
                          </Box>
                          
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: 'text.secondary',
                              fontSize: '0.875rem',
                              fontWeight: 500
                            }}
                          >
                            Click to {formData.instances.includes(instance.id) ? 'deselect' : 'select'} this instance
                          </Typography>
                        </Paper>
                      ))}
                    </Box>
                  )}
                </Box>

                {/* Advanced Settings */}
                <Accordion sx={{ 
                  mt: 4, 
                  borderRadius: 2,
                  boxShadow: `0 4px 20px ${alpha(theme.palette.common.black, 0.08)}`,
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                  '&:before': {
                    display: 'none'
                  }
                }}>
                  <AccordionSummary 
                    expandIcon={<ExpandMoreIcon sx={{ color: 'primary.main' }} />}
                    sx={{
                      background: alpha(theme.palette.primary.main, 0.02),
                      borderRadius: '8px 8px 0 0',
                      '&.Mui-expanded': {
                        borderRadius: '8px 8px 0 0'
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <SettingsIcon sx={{ mr: 2, color: 'primary.main' }} />
                      <Typography sx={{ fontWeight: 600, color: 'primary.main' }}>Advanced Settings</Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 3 }}>
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ 
                          p: 2, 
                          borderRadius: 2, 
                          background: alpha(theme.palette.info.main, 0.04),
                          border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <SpeedIcon sx={{ mr: 1, color: 'info.main' }} />
                            <Typography gutterBottom sx={{ fontWeight: 600, color: 'info.main', mb: 0 }}>
                              Max Pages per Instance
                            </Typography>
                          </Box>
                          <Slider
                            value={formData.max_pages}
                            onChange={(_, value) => setFormData({ ...formData, max_pages: value as number })}
                            min={config?.max_pages_min || 1}
                            max={config?.max_pages_max || 10}
                            step={1}
                            marks
                            valueLabelDisplay="auto"
                            disabled={isSearching}
                            sx={{
                              '& .MuiSlider-thumb': {
                                background: `linear-gradient(135deg, ${theme.palette.info.main}, ${theme.palette.info.dark})`
                              },
                              '& .MuiSlider-track': {
                                background: `linear-gradient(135deg, ${theme.palette.info.main}, ${theme.palette.info.dark})`
                              }
                            }}
                          />
                        </Box>
                      </Grid>
                      

                      
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ 
                          p: 2, 
                          borderRadius: 2, 
                          background: alpha(theme.palette.error.main, 0.04),
                          border: `1px solid ${alpha(theme.palette.error.main, 0.1)}`
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <SecurityIcon sx={{ mr: 1, color: 'error.main' }} />
                            <Typography gutterBottom sx={{ fontWeight: 600, color: 'error.main', mb: 0 }}>
                              Safe Search
                            </Typography>
                          </Box>
                          <Slider
                            value={formData.safesearch}
                            onChange={(_, value) => setFormData({ ...formData, safesearch: value as number })}
                            min={config?.safesearch_min || 0}
                            max={config?.safesearch_max || 2}
                            step={1}
                            marks={[
                              { value: 0, label: 'Off' },
                              { value: 1, label: 'Moderate' },
                              { value: 2, label: 'Strict' },
                            ]}
                            valueLabelDisplay="auto"
                            valueLabelFormat={(value) => safesearchLabels[value as keyof typeof safesearchLabels]}
                            disabled={isSearching}
                            sx={{
                              '& .MuiSlider-thumb': {
                                background: `linear-gradient(135deg, ${theme.palette.error.main}, ${theme.palette.error.dark})`
                              },
                              '& .MuiSlider-track': {
                                background: `linear-gradient(135deg, ${theme.palette.error.main}, ${theme.palette.error.dark})`
                              }
                            }}
                          />
                        </Box>
                      </Grid>
                      
                      <Grid item xs={12}>
                        <Box sx={{ 
                          p: 2, 
                          borderRadius: 2, 
                          background: alpha(theme.palette.secondary.main, 0.04),
                          border: `1px solid ${alpha(theme.palette.secondary.main, 0.1)}`
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <FilterListIcon sx={{ mr: 1, color: 'secondary.main' }} />
                            <Typography gutterBottom sx={{ fontWeight: 600, color: 'secondary.main', mb: 0 }}>
                              File Types
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                            {availableFileTypes && availableFileTypes.length > 0 ? (
                              availableFileTypes.map((fileType) => (
                                <Chip
                                  key={fileType}
                                  label={fileType.toUpperCase()}
                                  onClick={() => {
                                    setFormData(prev => ({
                                      ...prev,
                                      file_types: prev.file_types.includes(fileType)
                                        ? prev.file_types.filter(ft => ft !== fileType)
                                        : [...prev.file_types, fileType]
                                    }));
                                  }}
                                  color={formData.file_types.includes(fileType) ? 'secondary' : 'default'}
                                  variant={formData.file_types.includes(fileType) ? 'filled' : 'outlined'}
                                  disabled={isSearching}
                                  sx={{
                                    borderRadius: 2,
                                    height: 36,
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    transition: 'all 0.2s ease-in-out',
                                    '&:hover': {
                                      transform: 'translateY(-1px)',
                                      boxShadow: `0 4px 12px ${alpha(theme.palette.secondary.main, 0.2)}`
                                    },
                                    ...(formData.file_types.includes(fileType) && {
                                      background: `linear-gradient(135deg, ${theme.palette.secondary.main}, ${theme.palette.secondary.dark})`,
                                      color: theme.palette.secondary.contrastText
                                    })
                                  }}
                                />
                              ))
                            ) : (
                              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                No file types available. Perform some searches first to see available file types.
                              </Typography>
                            )}
                          </Box>
                          {formData.file_types.length > 0 && (
                            <Typography variant="caption" color="secondary.main" sx={{ mt: 2, display: 'block', fontWeight: 500 }}>
                              Selected: {formData.file_types.join(', ')}
                            </Typography>
                          )}
                        </Box>
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>

                <Divider sx={{ my: 4, opacity: 0.6 }} />
                
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={isSearching || formData.query.trim() === '' || formData.instances.length === 0}
                    sx={{
                      borderRadius: 4,
                      px: 8,
                      py: 2,
                      fontSize: '1.2rem',
                      fontWeight: 700,
                      textTransform: 'none',
                      background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                      boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.4)}`,
                      position: 'relative',
                      overflow: 'hidden',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: '-100%',
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                        transition: 'left 0.5s ease-in-out'
                      },
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: `0 12px 48px ${alpha(theme.palette.primary.main, 0.5)}`,
                        '&::before': {
                          left: '100%'
                        }
                      },
                      '&:active': {
                        transform: 'translateY(-2px)'
                      },
                      '&:disabled': {
                        background: alpha(theme.palette.action.disabled, 0.12),
                        color: alpha(theme.palette.action.disabled, 0.26),
                        transform: 'none',
                        boxShadow: 'none'
                      }
                    }}
                    startIcon={
                      isSearching ? (
                        <CircularProgress size={24} color="inherit" thickness={4} />
                      ) : (
                        <Box sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: 'rgba(255, 255, 255, 0.2)',
                          mr: 0.5
                        }}>
                          <RocketIcon sx={{ fontSize: 16 }} />
                        </Box>
                      )
                    }
                    endIcon={
                      !isSearching && (
                        <AutoAwesomeIcon sx={{ 
                          fontSize: 20,
                          animation: 'sparkle 2s ease-in-out infinite',
                          '@keyframes sparkle': {
                            '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                            '50%': { opacity: 0.7, transform: 'scale(1.1)' }
                          }
                        }} />
                      )
                    }
                  >
                    {isSearching ? 'Searching Across Instances...' : 'Launch Multi-Query Search'}
                  </Button>
                </Box>
                
                {/* Search tips */}
                {!isSearching && (
                  <Box sx={{ 
                    mt: 4, 
                    p: 3, 
                    borderRadius: 3,
                    background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.05)}, ${alpha(theme.palette.info.main, 0.02)})`,
                    border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`
                  }}>
                    <Typography variant="h6" sx={{ 
                      color: 'info.main', 
                      fontWeight: 600, 
                      mb: 2,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}>
                      <LightbulbIcon sx={{ fontSize: 20 }} />
                      Pro Tips for Better Results
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <Chip size="small" label="1" color="info" sx={{ minWidth: 24, fontWeight: 600 }} />
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          Use <strong>site:</strong> to search specific domains (e.g., site:docs.google.com)
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <Chip size="small" label="2" color="info" sx={{ minWidth: 24, fontWeight: 600 }} />
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          Use <strong>filetype:</strong> to find specific file types (e.g., filetype:pdf)
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <Chip size="small" label="3" color="info" sx={{ minWidth: 24, fontWeight: 600 }} />
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          Use <strong>quotes</strong> for exact phrases (e.g., "quarterly report")
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <Chip size="small" label="4" color="info" sx={{ minWidth: 24, fontWeight: 600 }} />
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          Combine operators for precise results (e.g., site:drive.google.com filetype:xlsx)
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                )}
                
                <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                  
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/results')}
                    disabled={isSearching}
                    sx={{
                      borderRadius: 3,
                      borderColor: alpha(theme.palette.primary.main, 0.3),
                      color: theme.palette.primary.main,
                      fontWeight: 600,
                      textTransform: 'none',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        borderColor: theme.palette.primary.main,
                        background: alpha(theme.palette.primary.main, 0.04),
                        boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.2)}`
                      }
                    }}
                  >
                    View Results
                  </Button>
                </Box>

                {isSearching && searchProgress && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    {searchProgress}
                  </Alert>
                )}
              </form>
            </CardContent>
          </Card>
          </Fade>
        </Grid>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    Search Results ({totalResults} found)
                  </Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => navigate('/results')}
                    startIcon={<SearchIcon />}
                  >
                    View All Results
                  </Button>
                </Box>
                <List>
                  {searchResults.map((result, index) => (
                    <ListItem key={index} divider>
                      <ListItemText
                        primary={
                          <Typography
                            component="a"
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            variant="h6"
                            color="primary"
                            sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                          >
                            {result.title}
                          </Typography>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              {result.url}
                            </Typography>
                            <Typography variant="body2">
                               {result.description}
                             </Typography>
                             {result.engines && result.engines.length > 0 && (
                               <Box sx={{ mt: 1 }}>
                                 {result.engines.map((engine, idx) => (
                                   <Chip
                                     key={idx}
                                     label={engine}
                                     size="small"
                                     variant="outlined"
                                     sx={{ mr: 0.5 }}
                                   />
                                 ))}
                               </Box>
                             )}
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Recent Queries Sidebar */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <HistoryIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Recent Queries</Typography>
              </Box>
              
              {recentQueries && recentQueries.length > 0 ? (
                <List dense>
                  {recentQueries.map((query: any, index: number) => (
                    <ListItem
                      key={index}
                      button
                      onClick={() => handleQuickSearch(query.query_text)}
                      disabled={isSearching}
                    >
                      <ListItemIcon>
                        <SearchIcon color="action" />
                      </ListItemIcon>
                      <ListItemText
                        primary={query.query_text}
                        secondary={`${query.total_results || 0} results • ${new Date(query.created_at).toLocaleDateString()}`}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No recent queries found.
                </Typography>
              )}
            </CardContent>
          </Card>

          {/* Search Tips */}
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Search Tips
              </Typography>
              <Typography variant="body2" paragraph>
                • Use <code>filetype:pdf</code> to find specific file types
              </Typography>
              <Typography variant="body2" paragraph>
                • Use <code>site:drive.google.com</code> to search specific sites
              </Typography>
              <Typography variant="body2" paragraph>
                • Use quotes for exact phrases: <code>"annual report"</code>
              </Typography>
              <Typography variant="body2" paragraph>
                • Use <code>-word</code> to exclude terms
              </Typography>
              <Typography variant="body2">
                • Combine operators: <code>filetype:xlsx budget -draft</code>
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      </Container>
    </Box>
  );
};

export default SearchPage;