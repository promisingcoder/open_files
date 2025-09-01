import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SnackbarProvider } from 'notistack';

// Components
import Navbar from './components/Navbar';
import SearchInterface from './components/SearchInterface';
import Analytics from './components/Analytics';
import Dashboard from './pages/Dashboard';
import InstanceManager from './pages/InstanceManager';
import SearchPage from './pages/SearchPage';
import ResultsViewer from './pages/ResultsViewer';
import Statistics from './pages/Statistics';

// Create theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderRadius: 12,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
  },
});

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SnackbarProvider 
          maxSnack={3}
          autoHideDuration={5000}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <Router>
            <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
              <Navbar />
              <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
                <Routes>
                  <Route path="/" element={<Navigate to="/search" replace />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/instances" element={<InstanceManager />} />
                  <Route path="/search-old" element={<SearchInterface />} />
                  <Route path="/results" element={<ResultsViewer />} />
                  <Route path="/statistics" element={<Statistics />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Box>
            </Box>
          </Router>
        </SnackbarProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;