import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  Storage as StorageIcon,
  Description as DescriptionIcon,
  TrendingUp as TrendingUpIcon,
  PlayArrow as PlayArrowIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  // Fetch dashboard data
  const { data: statistics, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['statistics'],
    queryFn: apiService.getStatistics,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: instances, isLoading: instancesLoading } = useQuery({
    queryKey: ['instances'],
    queryFn: apiService.getInstances,
  });

  const { data: recentQueries, isLoading: queriesLoading } = useQuery({
    queryKey: ['recent-queries'],
    queryFn: () => apiService.getRecentQueries(5),
  });

  const { data: fileTypes, isLoading: fileTypesLoading } = useQuery({
    queryKey: ['file-types'],
    queryFn: apiService.getFileTypes,
  });

  const activeInstances = instances?.filter(instance => instance.is_active) || [];
  const totalResults = statistics?.total_results || 0;
  const totalQueries = statistics?.total_queries || 0;

  if (statsError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Failed to load dashboard data. Please check your API connection.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
        Dashboard
      </Typography>

      {/* Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <StorageIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Active Instances</Typography>
              </Box>
              {instancesLoading ? (
                <CircularProgress size={24} />
              ) : (
                <Typography variant="h3" color="primary">
                  {activeInstances.length}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                Searxng instances
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SearchIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Total Queries</Typography>
              </Box>
              {statsLoading ? (
                <CircularProgress size={24} />
              ) : (
                <Typography variant="h3" color="primary">
                  {totalQueries.toLocaleString()}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                Search queries executed
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <DescriptionIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Total Results</Typography>
              </Box>
              {statsLoading ? (
                <CircularProgress size={24} />
              ) : (
                <Typography variant="h3" color="primary">
                  {totalResults.toLocaleString()}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                Files discovered
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUpIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">File Types</Typography>
              </Box>
              {fileTypesLoading ? (
                <CircularProgress size={24} />
              ) : (
                <Typography variant="h3" color="primary">
                  {fileTypes?.length || 0}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                Different file types
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Quick Actions */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<PlayArrowIcon />}
                  onClick={() => navigate('/search')}
                  fullWidth
                >
                  Start New Search
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<DescriptionIcon />}
                  onClick={() => navigate('/results')}
                  fullWidth
                >
                  View All Results
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<StorageIcon />}
                  onClick={() => navigate('/instances')}
                  fullWidth
                >
                  Manage Instances
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<TrendingUpIcon />}
                  onClick={() => navigate('/statistics')}
                  fullWidth
                >
                  View Statistics
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Queries */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Recent Queries</Typography>
                <Button
                  size="small"
                  startIcon={<RefreshIcon />}
                  onClick={() => window.location.reload()}
                >
                  Refresh
                </Button>
              </Box>
              {queriesLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                  <CircularProgress />
                </Box>
              ) : recentQueries && recentQueries.length > 0 ? (
                <List dense>
                  {recentQueries.map((query: any, index: number) => (
                    <ListItem key={index} divider={index < recentQueries.length - 1}>
                      <ListItemIcon>
                        <SearchIcon color="action" />
                      </ListItemIcon>
                      <ListItemText
                        primary={query.query_text}
                        secondary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <Typography variant="caption">
                              {new Date(query.created_at).toLocaleDateString()}
                            </Typography>
                            <Chip
                              label={`${query.total_results || 0} results`}
                              size="small"
                              variant="outlined"
                            />
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  No recent queries found. Start your first search!
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;