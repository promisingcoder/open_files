import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Search as SearchIcon,
  Storage as StorageIcon,
  ViewList as ViewListIcon,
  BarChart as BarChartIcon,
  Settings as SettingsIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const navigationItems = [
    {
      label: 'Search',
      path: '/search',
      icon: <SearchIcon />,
    },
    {
      label: 'Analytics',
      path: '/analytics',
      icon: <BarChartIcon />,
    },
    {
      label: 'Results',
      path: '/results',
      icon: <ViewListIcon />,
    },
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: <DashboardIcon />,
    },
    {
      label: 'Instances',
      path: '/instances',
      icon: <StorageIcon />,
    },
    {
      label: 'Statistics',
      path: '/statistics',
      icon: <SettingsIcon />,
    },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <AppBar position="static" elevation={2}>
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          <SearchIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
            Searxng File Scraper
          </Typography>
        </Box>

        {/* Desktop Navigation */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
          {navigationItems.map((item) => (
            <Button
              key={item.path}
              color="inherit"
              startIcon={item.icon}
              onClick={() => navigate(item.path)}
              sx={{
                backgroundColor: isActive(item.path) ? 'rgba(255,255,255,0.1)' : 'transparent',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.1)',
                },
                borderRadius: 2,
                px: 2,
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>

        {/* Mobile Navigation */}
        <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
          <IconButton
            color="inherit"
            onClick={handleMenuOpen}
            aria-label="navigation menu"
          >
            <MoreVertIcon />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            {navigationItems.map((item) => (
              <MenuItem
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  handleMenuClose();
                }}
                selected={isActive(item.path)}
                sx={{ minWidth: 150 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {item.icon}
                  {item.label}
                </Box>
              </MenuItem>
            ))}
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;