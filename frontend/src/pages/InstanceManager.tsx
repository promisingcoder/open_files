import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  IconButton,
  Alert,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Language as LanguageIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { apiService } from '../services/api';

interface SearxngInstance {
  id: string;
  name: string;
  url: string;
  is_active: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface InstanceFormData {
  name: string;
  url: string;
  description: string;
  is_active: boolean;
}

const InstanceManager: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInstance, setEditingInstance] = useState<SearxngInstance | null>(null);
  const [formData, setFormData] = useState<InstanceFormData>({
    name: '',
    url: '',
    description: '',
    is_active: true,
  });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [instanceToDelete, setInstanceToDelete] = useState<SearxngInstance | null>(null);

  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  // Fetch instances
  const { data: instances, isLoading, error } = useQuery({
    queryKey: ['instances'],
    queryFn: apiService.getInstances,
  });

  // Create instance mutation
  const createMutation = useMutation({
    mutationFn: apiService.createInstance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instances'] });
      enqueueSnackbar('Instance created successfully', { variant: 'success' });
      handleCloseDialog();
    },
    onError: (error: any) => {
      enqueueSnackbar(`Failed to create instance: ${error.message}`, { variant: 'error' });
    },
  });

  // Update instance mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InstanceFormData> }) =>
      apiService.updateInstance(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instances'] });
      enqueueSnackbar('Instance updated successfully', { variant: 'success' });
      handleCloseDialog();
    },
    onError: (error: any) => {
      enqueueSnackbar(`Failed to update instance: ${error.message}`, { variant: 'error' });
    },
  });

  // Delete instance mutation
  const deleteMutation = useMutation({
    mutationFn: apiService.deleteInstance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instances'] });
      enqueueSnackbar('Instance deleted successfully', { variant: 'success' });
      setDeleteConfirmOpen(false);
      setInstanceToDelete(null);
    },
    onError: (error: any) => {
      enqueueSnackbar(`Failed to delete instance: ${error.message}`, { variant: 'error' });
    },
  });

  const handleOpenDialog = (instance?: SearxngInstance) => {
    if (instance) {
      setEditingInstance(instance);
      setFormData({
        name: instance.name,
        url: instance.url,
        description: instance.description || '',
        is_active: instance.is_active,
      });
    } else {
      setEditingInstance(null);
      setFormData({
        name: '',
        url: '',
        description: '',
        is_active: true,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingInstance(null);
    setFormData({
      name: '',
      url: '',
      description: '',
      is_active: true,
    });
  };

  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.url.trim()) {
      enqueueSnackbar('Name and URL are required', { variant: 'error' });
      return;
    }

    if (editingInstance) {
      updateMutation.mutate({ id: editingInstance.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (instance: SearxngInstance) => {
    setInstanceToDelete(instance);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (instanceToDelete) {
      deleteMutation.mutate(instanceToDelete.id);
    }
  };

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Failed to load instances. Please check your API connection.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4">Searxng Instances</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Instance
        </Button>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {instances?.map((instance: SearxngInstance) => (
            <Grid item xs={12} md={6} lg={4} key={instance.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" component="div">
                      {instance.name}
                    </Typography>
                    <Chip
                      icon={instance.is_active ? <CheckCircleIcon /> : <ErrorIcon />}
                      label={instance.is_active ? 'Active' : 'Inactive'}
                      color={instance.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <LanguageIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                      {instance.url}
                    </Typography>
                  </Box>
                  
                  {instance.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {instance.description}
                    </Typography>
                  )}
                  
                  <Typography variant="caption" color="text.secondary">
                    Created: {new Date(instance.created_at).toLocaleDateString()}
                  </Typography>
                </CardContent>
                
                <CardActions>
                  <Tooltip title="Edit instance">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(instance)}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete instance">
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(instance)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </CardActions>
              </Card>
            </Grid>
          ))}
          
          {instances?.length === 0 && (
            <Grid item xs={12}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No instances configured
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Add your first Searxng instance to start scraping
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                  >
                    Add Instance
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingInstance ? 'Edit Instance' : 'Add New Instance'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="URL"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              margin="normal"
              required
              placeholder="https://searx.example.com"
            />
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              margin="normal"
              multiline
              rows={2}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
              }
              label="Active"
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending ? (
              <CircularProgress size={20} />
            ) : editingInstance ? (
              'Update'
            ) : (
              'Create'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the instance "{instanceToDelete?.name}"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button
            onClick={confirmDelete}
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InstanceManager;