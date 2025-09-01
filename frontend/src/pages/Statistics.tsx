import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from 'recharts';
import {
  TrendingUp as TrendingUpIcon,
  Storage as StorageIcon,
  Search as SearchIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'];

const Statistics: React.FC = () => {
  // Fetch statistics data
  const { data: statistics, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['statistics'],
    queryFn: apiService.getStatistics,
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: fileTypes, isLoading: fileTypesLoading } = useQuery({
    queryKey: ['file-types'],
    queryFn: apiService.getFileTypes,
  });

  const { data: topDomains, isLoading: domainsLoading } = useQuery({
    queryKey: ['top-domains'],
    queryFn: () => apiService.getTopDomains(20),
  });

  const { data: instances, isLoading: instancesLoading } = useQuery({
    queryKey: ['instances'],
    queryFn: apiService.getInstances,
  });

  const { data: instanceStats, isLoading: instanceStatsLoading } = useQuery({
    queryKey: ['instance-stats'],
    queryFn: apiService.getInstanceStats,
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: recentQueries, isLoading: queriesLoading } = useQuery({
    queryKey: ['recent-queries'],
    queryFn: () => apiService.getRecentQueries(10),
  });

  // Fetch daily analytics data
  const { data: dailyAnalytics, isLoading: isDailyAnalyticsLoading } = useQuery({
    queryKey: ['dailyAnalytics'],
    queryFn: () => apiService.getDailyAnalytics(7), // Last 7 days
  });

  if (statsError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Failed to load statistics. Please check your API connection.
        </Alert>
      </Box>
    );
  }

  const activeInstances = instances?.filter(instance => instance.is_active) || [];
  const totalResults = statistics?.total_results || 0;
  const totalQueries = statistics?.total_queries || 0;

  // Prepare chart data
  const fileTypeChartData = fileTypes?.slice(0, 10).map((item: any) => ({
    name: item.file_type.toUpperCase(),
    value: item.count,
    percentage: totalResults > 0 ? ((item.count / totalResults) * 100).toFixed(1) : 0,
  })) || [];

  const domainChartData = topDomains?.slice(0, 10).map((item: any) => ({
    name: item.domain.length > 20 ? item.domain.substring(0, 20) + '...' : item.domain,
    fullName: item.domain,
    value: item.count,
    percentage: totalResults > 0 ? ((item.count / totalResults) * 100).toFixed(1) : 0,
  })) || [];

  if (statsLoading || fileTypesLoading || domainsLoading || instancesLoading || queriesLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  const timeSeriesData = dailyAnalytics?.data || [];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Paper sx={{ p: 2, border: 1, borderColor: 'divider' }}>
          <Typography variant="body2" fontWeight="bold">
            {label}
          </Typography>
          {payload.map((entry: any, index: number) => (
            <Typography key={index} variant="body2" sx={{ color: entry.color }}>
              {entry.name}: {entry.value.toLocaleString()}
              {entry.payload.percentage && ` (${entry.payload.percentage}%)`}
            </Typography>
          ))}
        </Paper>
      );
    }
    return null;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
        Statistics & Analytics
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
                of {instances?.length || 0} total
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
                search queries executed
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
                files discovered
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUpIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Avg Results/Query</Typography>
              </Box>
              {statsLoading ? (
                <CircularProgress size={24} />
              ) : (
                <Typography variant="h3" color="primary">
                  {totalQueries > 0 ? Math.round(totalResults / totalQueries) : 0}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                results per search
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* File Types Distribution */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                File Types Distribution
              </Typography>
              {fileTypesLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : fileTypeChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={fileTypeChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name} (${percentage}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {fileTypeChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  No file type data available
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Top Domains */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top Domains
              </Typography>
              {domainsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : domainChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={domainChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      fontSize={12}
                    />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  No domain data available
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Search Activity Timeline */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Search Activity Timeline (Last 7 Days)
              </Typography>
              {isDailyAnalyticsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : timeSeriesData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                    />
                    <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="searches"
                      stackId="1"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.6}
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="results"
                      stackId="2"
                      stroke="#82ca9d"
                      fill="#82ca9d"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300, color: 'text.secondary' }}>
                  <Typography variant="body2">No search activity data available</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Instance Performance */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Instance Performance
              </Typography>
              {instancesLoading || instanceStatsLoading ? (
                <CircularProgress />
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Instance</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Usage</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {instances?.map((instance: any) => {
                        const stats = instanceStats?.find((stat: any) => stat.instance_id === instance.id);
                        const totalQueries = stats?.total_queries || 0;
                        const maxQueries = Math.max(...(instanceStats?.map((s: any) => s.total_queries) || [1]));
                        const usagePercentage = maxQueries > 0 ? (totalQueries / maxQueries) * 100 : 0;
                        
                        return (
                          <TableRow key={instance.id}>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {instance.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {instance.url}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={instance.is_active ? 'Active' : 'Inactive'}
                                color={instance.is_active ? 'success' : 'default'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Box sx={{ minWidth: 100 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={usagePercentage}
                                  sx={{ mb: 1 }}
                                />
                                <Typography variant="caption">
                                  {totalQueries.toLocaleString()} queries
                                </Typography>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Query Activity */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Query Activity
              </Typography>
              {queriesLoading ? (
                <CircularProgress />
              ) : recentQueries && recentQueries.length > 0 ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Query</TableCell>
                        <TableCell align="right">Results</TableCell>
                        <TableCell align="right">Date</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentQueries.map((query: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                              {query.query_text}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              label={query.total_results || 0}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="caption">
                              {new Date(query.created_at).toLocaleDateString()}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  No recent queries found
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Statistics;