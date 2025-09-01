import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Chip,
  Avatar,
  Divider,
  useTheme,
  alpha,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import {
  Search,
  Assessment,
  Analytics as AnalyticsIcon,
  CheckCircle,
  Language,
  InsertDriveFile,
} from '@mui/icons-material';
import { apiService } from '../services/api';

interface SearchAnalytics {
  period_days: number;
  total_queries: number;
  successful_queries: number;
  failed_queries: number;
  success_rate: number;
  total_results: number;
  file_results: number;
  file_percentage: number;
  top_file_types: [string, number][];
  top_domains: [string, number][];
}

interface StatCard {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  change?: string;
}

const Analytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<SearchAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(30);

  useEffect(() => {
    fetchAnalytics(selectedPeriod);
  }, [selectedPeriod]);

  const fetchAnalytics = async (days: number) => {
    setLoading(true);
    try {
      const data: SearchAnalytics = await apiService.getAnalytics(days);
      setAnalytics(data);
    } catch (error) {
      console.error('Analytics fetch error:', error);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  const theme = useTheme();

  const StatCard: React.FC<StatCard> = ({ title, value, icon, color, change }) => (
    <Card 
      elevation={2}
      sx={{ 
        height: '100%',
        background: `linear-gradient(135deg, ${color} 0%, ${alpha(color, 0.8)} 100%)`,
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          right: 0,
          width: '100px',
          height: '100px',
          background: alpha('#fff', 0.1),
          borderRadius: '50%',
          transform: 'translate(30px, -30px)',
        }
      }}
    >
      <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Avatar sx={{ bgcolor: alpha('#fff', 0.2), color: 'inherit' }}>
            {icon}
          </Avatar>
          {change && (
            <Chip
              label={change}
              size="small"
              sx={{
                bgcolor: alpha('#fff', 0.2),
                color: 'inherit',
                fontWeight: 'bold'
              }}
            />
          )}
        </Box>
        <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
          {value}
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.9 }}>
          {title}
        </Typography>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={60} thickness={4} />
          <Typography variant="h6" sx={{ mt: 2, color: 'text.secondary' }}>
            Loading analytics...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (!analytics) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ maxWidth: 600, mx: 'auto' }}>
          <Typography variant="h6">Failed to load analytics data</Typography>
          <Typography variant="body2">Please check your connection and try again.</Typography>
        </Alert>
      </Box>
    );
  }

  // Prepare chart data from real analytics data
  const fileTypeData = (analytics.top_file_types || []).map(([type, count]) => ({
    name: type.toUpperCase(),
    value: count,
    percentage: analytics.total_results > 0 ? ((count / analytics.total_results) * 100).toFixed(1) : '0.0'
  }));

  const domainData = (analytics.top_domains || []).slice(0, 10).map(([domain, count]) => ({
    domain: domain.length > 20 ? domain.substring(0, 20) + '...' : domain,
    count,
    percentage: analytics.total_results > 0 ? ((count / analytics.total_results) * 100).toFixed(1) : '0.0'
  }));

  const queryStatusData = [
    { name: 'Successful', value: analytics.successful_queries || 0, color: '#10B981' },
    { name: 'Failed', value: analytics.failed_queries || 0, color: '#EF4444' }
  ].filter(item => item.value > 0); // Only show categories with actual data

  const contentTypeData = [
    { name: 'Files', value: analytics.file_results || 0, color: '#3B82F6' },
    { name: 'Web Pages', value: (analytics.total_results || 0) - (analytics.file_results || 0), color: '#8B5CF6' }
  ];



  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, ${alpha(theme.palette.secondary.main, 0.02)} 100%)`,
      py: 4
    }}>
      <Box sx={{ maxWidth: '1600px', mx: 'auto', px: { xs: 2, sm: 3, md: 4 } }}>
        {/* Enhanced Header */}
        <Box sx={{ mb: 6 }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            flexWrap: 'wrap', 
            gap: 3,
            mb: 3
          }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2 }}>
                <Box sx={{
                  p: 2,
                  borderRadius: 3,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  boxShadow: theme.shadows[8]
                }}>
                  <AnalyticsIcon sx={{ fontSize: 48, color: 'white' }} />
                </Box>
                <Box>
                  <Typography variant="h2" component="h1" sx={{ 
                    fontWeight: 800, 
                    color: 'text.primary',
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    mb: 1
                  }}>
                    Analytics Dashboard
                  </Typography>
                  <Typography variant="h6" sx={{ 
                    color: 'text.secondary', 
                    fontWeight: 400,
                    maxWidth: 600
                  }}>
                    Comprehensive insights and performance metrics from your search activities
                  </Typography>
                </Box>
              </Box>
            </Box>
            
            <Paper elevation={3} sx={{ p: 1, borderRadius: 2 }}>
              <FormControl sx={{ minWidth: 220 }}>
                <InputLabel sx={{ fontWeight: 600 }}>Time Period</InputLabel>
                <Select
                  value={selectedPeriod}
                  label="Time Period"
                  onChange={(e) => setSelectedPeriod(Number(e.target.value))}
                  sx={{ 
                    bgcolor: 'background.paper',
                    '& .MuiSelect-select': {
                      fontWeight: 600
                    }
                  }}
                >
                  <MenuItem value={7}>📅 Last 7 days</MenuItem>
                  <MenuItem value={30}>📊 Last 30 days</MenuItem>
                  <MenuItem value={90}>📈 Last 90 days</MenuItem>
                  <MenuItem value={365}>🗓️ Last year</MenuItem>
                </Select>
              </FormControl>
            </Paper>
          </Box>
          <Divider sx={{ 
            background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            height: 3,
            borderRadius: 2
          }} />
        </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Total Queries"
            value={(analytics.total_queries || 0).toLocaleString()}
            icon={<Search />}
            color={theme.palette.primary.main}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Success Rate"
            value={`${(analytics.success_rate || 0).toFixed(1)}%`}
            icon={<CheckCircle />}
            color={theme.palette.success.main}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Total Results"
            value={(analytics.total_results || 0).toLocaleString()}
            icon={<Assessment />}
            color={theme.palette.info.main}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="File Results"
            value={`${(analytics.file_percentage || 0).toFixed(1)}%`}
            icon={<InsertDriveFile />}
            color={theme.palette.warning.main}
          />
        </Grid>
      </Grid>

      {/* Charts Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Query Status Chart */}
        <Grid item xs={12} lg={6}>
          <Card elevation={3} sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <CheckCircle sx={{ color: 'success.main' }} />
                <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold' }}>
                  Query Status Distribution
                </Typography>
              </Box>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={queryStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    {queryStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: theme.shape.borderRadius,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Content Type Chart */}
        <Grid item xs={12} lg={6}>
          <Card elevation={3} sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Language sx={{ color: 'info.main' }} />
                <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold' }}>
                  Content Type Distribution
                </Typography>
              </Box>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={contentTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    {contentTypeData.map((entry, index) => {
                      const colors = [theme.palette.primary.main, theme.palette.secondary.main];
                      return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                    })}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: theme.shape.borderRadius,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* File Types Chart */}
      <Card elevation={3} sx={{ mb: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <InsertDriveFile sx={{ color: 'warning.main' }} />
            <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold' }}>
              Top File Types
            </Typography>
            {fileTypeData.length > 0 && (
              <Chip 
                label={`${fileTypeData.length} types`} 
                size="small" 
                sx={{ 
                  bgcolor: alpha(theme.palette.warning.main, 0.1),
                  color: 'warning.main',
                  fontWeight: 'bold'
                }}
              />
            )}
          </Box>
          
          {fileTypeData.length > 0 ? (
            <>
              {/* Enhanced visualization with multiple chart types */}
              <Grid container spacing={3} sx={{ mb: 3 }}>
                {/* Bar Chart */}
                <Grid item xs={12} lg={8}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1 }}>
                    Distribution by Count
                  </Typography>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart 
                      data={fileTypeData} 
                      margin={{ top: 20, right: 30, left: 40, bottom: 70 }}
                      barCategoryGap={fileTypeData.length === 1 ? '90%' : fileTypeData.length === 2 ? '60%' : '30%'}
                      maxBarSize={fileTypeData.length <= 2 ? 50 : 48}
                    >
                      <CartesianGrid 
                        strokeDasharray="3 3" 
                        stroke={alpha(theme.palette.divider, 0.3)}
                        horizontal={true}
                        vertical={false}
                      />
                      <XAxis 
                        dataKey="name" 
                        tick={{ 
                          fill: theme.palette.text.secondary, 
                          fontSize: 12
                        }}
                        axisLine={{ stroke: theme.palette.divider }}
                        tickLine={{ stroke: theme.palette.divider }}
                        angle={fileTypeData.length > 2 ? -45 : 0}
                        textAnchor={fileTypeData.length > 2 ? 'end' : 'middle'}
                        height={fileTypeData.length > 2 ? 70 : 40}
                        interval={0}
                        padding={fileTypeData.length === 1 ? { left: 60, right: 60 } : fileTypeData.length === 2 ? { left: 40, right: 40 } : { left: 30, right: 30 }}
                      />
                      <YAxis 
                        tick={{ 
                          fill: theme.palette.text.secondary, 
                          fontSize: 12
                        }}
                        axisLine={{ stroke: theme.palette.divider }}
                        tickLine={{ stroke: theme.palette.divider }}
                        label={{ 
                          value: 'File Count', 
                          angle: -90, 
                          position: 'insideLeft',
                          style: { textAnchor: 'middle', fill: theme.palette.text.secondary }
                        }}
                        allowDecimals={false}
                        tickCount={6}
                        domain={[0, (dataMax: number) => Math.max(3, Math.ceil(dataMax * 1.2))]}
                      />
                      <Tooltip 
                        formatter={(value, name, props) => [
                          `${value} files (${props.payload.percentage}%)`, 
                          'Count'
                        ]}
                        labelFormatter={(label) => `File Type: ${label}`}
                        contentStyle={{
                          backgroundColor: theme.palette.background.paper,
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: 8,
                          boxShadow: theme.shadows[4]
                        }}
                      />
                      <Bar 
                        dataKey="value" 
                        fill={theme.palette.primary.main}
                        radius={[4, 4, 0, 0]}
                        minPointSize={5}
                        barSize={fileTypeData.length === 1 ? 40 : fileTypeData.length === 2 ? 50 : undefined}
                      >
                        {fileTypeData.map((entry, index) => {
                          const colors = [
                            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
                            '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'
                          ];
                          return (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={colors[index % colors.length]}
                            />
                          );
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Grid>
              
              {/* Pie Chart */}
              <Grid item xs={12} lg={4}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1 }}>
                    Percentage Distribution
                  </Typography>
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={fileTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) => {
                          // Only show label if percentage is significant enough
                          return parseFloat(percentage) > 5 ? `${name}: ${percentage}%` : '';
                        }}
                        outerRadius={100}
                        innerRadius={30}
                        dataKey="value"
                        stroke={theme.palette.background.paper}
                        strokeWidth={2}
                      >
                        {fileTypeData.map((entry, index) => {
                          const colors = [
                            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
                            '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'
                          ];
                          return (
                            <Cell 
                              key={`pie-cell-${index}`} 
                              fill={colors[index % colors.length]} 
                            />
                          );
                        })}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name, props) => [
                          `${value} files (${props.payload.percentage}%)`, 
                          'Count'
                        ]}
                        contentStyle={{
                          backgroundColor: theme.palette.background.paper,
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: 8,
                          boxShadow: theme.shadows[4]
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </Grid>
            </Grid>
            
            {/* File Type Summary Cards */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 2 }}>
                File Type Details
              </Typography>
              <Grid container spacing={2}>
                {fileTypeData.slice(0, 6).map((item, index) => {
                  const colors = [
                    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'
                  ];
                  return (
                    <Grid item xs={12} sm={6} md={4} lg={2} key={item.name}>
                      <Paper 
                        elevation={2} 
                        sx={{ 
                          p: 2, 
                          textAlign: 'center',
                          background: `linear-gradient(135deg, ${colors[index % colors.length]}15 0%, ${colors[index % colors.length]}25 100%)`,
                          border: `2px solid ${colors[index % colors.length]}30`,
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: theme.shadows[8],
                            border: `2px solid ${colors[index % colors.length]}60`,
                          }
                        }}
                      >
                        <Avatar 
                          sx={{ 
                            bgcolor: colors[index % colors.length], 
                            mx: 'auto', 
                            mb: 1,
                            width: 40,
                            height: 40,
                            fontSize: '0.875rem',
                            fontWeight: 'bold'
                          }}
                        >
                          {item.name}
                        </Avatar>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                          {item.value}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {item.percentage}%
                        </Typography>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
            </>
          ) : (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              py: 8,
              textAlign: 'center'
            }}>
              <InsertDriveFile sx={{ 
                fontSize: 64, 
                color: 'text.disabled', 
                mb: 2 
              }} />
              <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1 }}>
                No File Type Data Available
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                File type statistics will appear here once you have search results with files.
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Top Domains Chart */}
      {domainData.length > 0 && (
        <Card elevation={3} sx={{ mb: 4 }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Language sx={{ color: 'success.main' }} />
              <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold' }}>
                Top Domains
              </Typography>
            </Box>
            <ResponsiveContainer width="100%" height={450}>
              <BarChart data={domainData} layout="vertical" margin={{ top: 20, right: 50, left: 200, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
                <XAxis type="number" tick={{ fill: theme.palette.text.secondary }} axisLine={{ stroke: theme.palette.divider }} />
                <YAxis dataKey="domain" type="category" width={180} tick={{ fill: theme.palette.text.secondary, fontSize: 12 }} axisLine={{ stroke: theme.palette.divider }} />
                <Tooltip 
                  formatter={(value, name) => [value, 'Results']}
                  labelFormatter={(label) => `Domain: ${label}`}
                  contentStyle={{
                    backgroundColor: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: theme.shape.borderRadius,
                  }}
                />
                <Bar 
                  dataKey="count" 
                  fill={theme.palette.success.main}
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Summary Statistics */}
      <Card elevation={3}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Assessment sx={{ color: 'primary.main' }} />
            <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold' }}>
              Summary Statistics
            </Typography>
          </Box>
          
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Paper elevation={1} sx={{ p: 3, bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', fontWeight: 'bold' }}>
                  Query Statistics
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Total Queries:</Typography>
                    <Chip 
                      label={(analytics.total_queries || 0).toLocaleString()} 
                      color="primary" 
                      variant="outlined"
                      size="small"
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Successful:</Typography>
                    <Chip 
                      label={(analytics.successful_queries || 0).toLocaleString()} 
                      sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), color: 'success.main' }}
                      size="small"
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Failed:</Typography>
                    <Chip 
                      label={(analytics.failed_queries || 0).toLocaleString()} 
                      sx={{ bgcolor: alpha(theme.palette.error.main, 0.1), color: 'error.main' }}
                      size="small"
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Success Rate:</Typography>
                    <Chip 
                      label={`${(analytics.success_rate || 0).toFixed(2)}%`} 
                      color="success"
                      size="small"
                    />
                  </Box>
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper elevation={1} sx={{ p: 3, bgcolor: alpha(theme.palette.secondary.main, 0.05) }}>
                <Typography variant="h6" sx={{ mb: 2, color: 'secondary.main', fontWeight: 'bold' }}>
                  Result Statistics
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Total Results:</Typography>
                    <Chip 
                      label={(analytics.total_results || 0).toLocaleString()} 
                      color="secondary" 
                      variant="outlined"
                      size="small"
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">File Results:</Typography>
                    <Chip 
                      label={(analytics.file_results || 0).toLocaleString()} 
                      sx={{ bgcolor: alpha(theme.palette.info.main, 0.1), color: 'info.main' }}
                      size="small"
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Web Page Results:</Typography>
                    <Chip 
                      label={((analytics.total_results || 0) - (analytics.file_results || 0)).toLocaleString()} 
                      sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1), color: 'warning.main' }}
                      size="small"
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">File Percentage:</Typography>
                    <Chip 
                      label={`${(analytics.file_percentage || 0).toFixed(2)}%`} 
                      color="warning"
                      size="small"
                    />
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      </Box>
    </Box>
  );
};

export default Analytics;