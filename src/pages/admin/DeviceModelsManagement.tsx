import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, ArrowLeft, Smartphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import Header from '@/components/layout/Header';
import { DeviceModel } from '@/hooks/useDeviceModels';

const DeviceModelsManagement = () => {
  const { deviceTypeId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<DeviceModel | null>(null);
  const [deleteModel, setDeleteModel] = useState<DeviceModel | null>(null);

  const { data: deviceType } = useQuery({
    queryKey: ['device-type', deviceTypeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('device_types')
        .select('*')
        .eq('id', deviceTypeId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!deviceTypeId,
  });

  const { data: deviceModels = [], isLoading } = useQuery({
    queryKey: ['device-models', deviceTypeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('device_models')
        .select(`
          *,
          device_companies(id, code, name)
        `)
        .eq('device_type_id', deviceTypeId)
        .order('name');
      if (error) throw error;
      return data as DeviceModel[];
    },
    enabled: !!deviceTypeId,
  });

  // Fetch data configs for this device type to show available data types
  const { data: dataConfigs = [] } = useQuery({
    queryKey: ['device-type-data-configs', deviceTypeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('device_type_data_configs')
        .select('data_type, display_name')
        .eq('device_type_id', deviceTypeId)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!deviceTypeId,
  });

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    manufacturer: '',
    model_number: '',
    image_url: '',
    specifications: '{}',
    supported_data_types: [] as string[],
    is_active: true,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        device_type_id: deviceTypeId,
        manufacturer: data.manufacturer || null,
        specifications: JSON.parse(data.specifications),
      };

      if (editingModel) {
        const { error } = await supabase
          .from('device_models')
          .update(payload)
          .eq('id', editingModel.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('device_models')
          .insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['device-models'] });
      queryClient.invalidateQueries({ queryKey: ['all-device-models'] });
      toast({
        title: editingModel ? 'Device model updated' : 'Device model created',
        description: 'Changes have been saved successfully.',
      });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('device_models')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['device-models'] });
      queryClient.invalidateQueries({ queryKey: ['all-device-models'] });
      toast({
        title: 'Device model deleted',
        description: 'Device model removed successfully.',
      });
      setDeleteModel(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      JSON.parse(formData.specifications);
      saveMutation.mutate(formData);
    } catch {
      toast({
        title: 'Invalid JSON',
        description: 'Specifications must be valid JSON',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      manufacturer: '',
      model_number: '',
      image_url: '',
      specifications: '{}',
      supported_data_types: [],
      is_active: true,
    });
    setEditingModel(null);
    setOpen(false);
  };

  const handleEdit = (model: DeviceModel) => {
    setEditingModel(model);
    setFormData({
      code: model.code,
      name: model.name,
      description: model.description || '',
      manufacturer: model.manufacturer || '',
      model_number: model.model_number || '',
      image_url: model.image_url || '',
      specifications: JSON.stringify(model.specifications || {}, null, 2),
      supported_data_types: model.supported_data_types || [],
      is_active: model.is_active ?? true,
    });
    setOpen(true);
  };

  const handleDelete = (model: DeviceModel) => {
    setDeleteModel(model);
  };

  const toggleDataType = (dataType: string) => {
    setFormData((prev) => ({
      ...prev,
      supported_data_types: prev.supported_data_types.includes(dataType)
        ? prev.supported_data_types.filter((dt) => dt !== dataType)
        : [...prev.supported_data_types, dataType],
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        showBackButton
        title={`Device Models - ${deviceType?.name || 'Loading...'}`}
        subtitle="Manage specific device products and models"
      />

      <main className="container mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {deviceType?.icon && <span className="text-2xl">{deviceType.icon}</span>}
                  {deviceType?.name} - Device Models
                </CardTitle>
                <CardDescription>
                  Add specific device products/models from various manufacturers
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate('/admin/device-types')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Device Types
                </Button>
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setEditingModel(null)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Device Model
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingModel ? 'Edit Device Model' : 'Create Device Model'}
                      </DialogTitle>
                      <DialogDescription>
                        Add a specific device product with its specifications
                      </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="code">Code *</Label>
                          <Input
                            id="code"
                            value={formData.code}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                            placeholder="e.g., apple-watch-series-9"
                            required
                            disabled={!!editingModel}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="name">Name *</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., Apple Watch Series 9"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="manufacturer">Company/Manufacturer</Label>
                          <Input
                            id="manufacturer"
                            value={formData.manufacturer}
                            onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                            placeholder="e.g., Apple, Samsung, Fitbit"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="model_number">Model Number</Label>
                          <Input
                            id="model_number"
                            value={formData.model_number}
                            onChange={(e) => setFormData({ ...formData, model_number: e.target.value })}
                            placeholder="e.g., MRX92LL/A"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Brief description of the device"
                          rows={2}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="image_url">Image URL</Label>
                        <Input
                          id="image_url"
                          value={formData.image_url}
                          onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                          placeholder="https://..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="specifications">Specifications (JSON)</Label>
                        <Textarea
                          id="specifications"
                          value={formData.specifications}
                          onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
                          placeholder='{"display": "AMOLED", "battery": "7 days"}'
                          rows={4}
                          className="font-mono text-sm"
                        />
                      </div>

                      {dataConfigs.length > 0 && (
                        <div className="space-y-2">
                          <Label>Supported Data Types</Label>
                          <p className="text-xs text-muted-foreground mb-2">
                            Select which data types this device model supports
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {dataConfigs.map((config) => (
                              <Badge
                                key={config.data_type}
                                variant={
                                  formData.supported_data_types.includes(config.data_type)
                                    ? 'default'
                                    : 'outline'
                                }
                                className="cursor-pointer"
                                onClick={() => toggleDataType(config.data_type)}
                              >
                                {config.display_name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="is_active"
                          checked={formData.is_active}
                          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                        />
                        <Label htmlFor="is_active">Active</Label>
                      </div>

                      <div className="flex gap-2 justify-end">
                        <Button type="button" variant="outline" onClick={resetForm}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={saveMutation.isPending}>
                          {saveMutation.isPending ? 'Saving...' : editingModel ? 'Update' : 'Create'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">Loading device models...</p>
            ) : deviceModels.length === 0 ? (
              <div className="text-center py-8">
                <Smartphone className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No device models yet. Add your first model to get started.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Model #</TableHead>
                    <TableHead>Supported Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deviceModels.map((model) => (
                    <TableRow key={model.id}>
                      <TableCell className="font-medium">{model.name}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">{model.code}</code>
                      </TableCell>
                      <TableCell>
                        {model.manufacturer || (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{model.model_number || '-'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {model.supported_data_types?.slice(0, 3).map((dt) => (
                            <Badge key={dt} variant="outline" className="text-xs">
                              {dt}
                            </Badge>
                          ))}
                          {(model.supported_data_types?.length || 0) > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{(model.supported_data_types?.length || 0) - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={model.is_active ? 'default' : 'secondary'}>
                          {model.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(model)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDelete(model)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteModel} onOpenChange={() => setDeleteModel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Device Model?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteModel?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteModel && deleteMutation.mutate(deleteModel.id)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DeviceModelsManagement;
