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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import Header from '@/components/layout/Header';

const DeviceTypeDataConfigs = () => {
  const { deviceTypeId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<any>(null);
  const [deleteConfig, setDeleteConfig] = useState<any>(null);

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

  const { data: dataConfigs = [], isLoading } = useQuery({
    queryKey: ['device-type-data-configs', deviceTypeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('device_type_data_configs')
        .select('*')
        .eq('device_type_id', deviceTypeId)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!deviceTypeId,
  });

  const [formData, setFormData] = useState({
    data_type: '',
    display_name: '',
    unit: '',
    value_type: 'number',
    sample_data_config: '{}',
    is_required: false,
    sort_order: 0,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        device_type_id: deviceTypeId,
        sample_data_config: JSON.parse(data.sample_data_config),
      };

      if (editingConfig) {
        const { error } = await supabase
          .from('device_type_data_configs')
          .update(payload)
          .eq('id', editingConfig.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('device_type_data_configs')
          .insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['device-type-data-configs'] });
      queryClient.invalidateQueries({ queryKey: ['all-device-type-data-configs'] });
      toast({
        title: editingConfig ? 'Config updated' : 'Config created',
        description: 'Data configuration saved successfully.',
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
        .from('device_type_data_configs')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['device-type-data-configs'] });
      queryClient.invalidateQueries({ queryKey: ['all-device-type-data-configs'] });
      toast({
        title: 'Config deleted',
        description: 'Data configuration removed successfully.',
      });
      setDeleteConfig(null);
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
      JSON.parse(formData.sample_data_config);
      saveMutation.mutate(formData);
    } catch (error) {
      toast({
        title: 'Invalid JSON',
        description: 'Sample data config must be valid JSON',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      data_type: '',
      display_name: '',
      unit: '',
      value_type: 'number',
      sample_data_config: '{}',
      is_required: false,
      sort_order: 0,
    });
    setEditingConfig(null);
    setOpen(false);
  };

  const handleEdit = (config: any) => {
    setEditingConfig(config);
    setFormData({
      data_type: config.data_type,
      display_name: config.display_name,
      unit: config.unit || '',
      value_type: config.value_type,
      sample_data_config: JSON.stringify(config.sample_data_config, null, 2),
      is_required: config.is_required,
      sort_order: config.sort_order,
    });
    setOpen(true);
  };

  const handleDelete = (config: any) => {
    setDeleteConfig(config);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        showBackButton
        title={`Data Configurations - ${deviceType?.name || 'Loading...'}`}
        subtitle="Manage data types for this device"
      />

      <main className="container mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {deviceType?.icon && <span className="text-2xl">{deviceType.icon}</span>}
                  {deviceType?.name} - Data Configurations
                </CardTitle>
                <CardDescription>Configure data types and their sample generation settings</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate('/admin/device-types')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Device Types
                </Button>
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setEditingConfig(null)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Data Config
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingConfig ? 'Edit Data Configuration' : 'Create Data Configuration'}
                      </DialogTitle>
                      <DialogDescription>
                        Define a data type and its sample generation configuration
                      </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="data_type">Data Type Code *</Label>
                          <Input
                            id="data_type"
                            value={formData.data_type}
                            onChange={(e) => setFormData({ ...formData, data_type: e.target.value })}
                            placeholder="e.g., heart_rate"
                            required
                            disabled={!!editingConfig}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="display_name">Display Name *</Label>
                          <Input
                            id="display_name"
                            value={formData.display_name}
                            onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                            placeholder="e.g., Heart Rate"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="unit">Unit</Label>
                          <Input
                            id="unit"
                            value={formData.unit}
                            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                            placeholder="e.g., bpm, °C"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="value_type">Value Type *</Label>
                          <Select
                            value={formData.value_type}
                            onValueChange={(value) => setFormData({ ...formData, value_type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="string">String</SelectItem>
                              <SelectItem value="boolean">Boolean</SelectItem>
                              <SelectItem value="object">Object</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="sort_order">Sort Order</Label>
                          <Input
                            id="sort_order"
                            type="number"
                            value={formData.sort_order}
                            onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="sample_data_config">Sample Data Config (JSON) *</Label>
                        <Textarea
                          id="sample_data_config"
                          value={formData.sample_data_config}
                          onChange={(e) => setFormData({ ...formData, sample_data_config: e.target.value })}
                          placeholder='{"type": "random_number", "min": 60, "max": 100, "precision": 0}'
                          rows={6}
                          className="font-mono text-sm"
                          required
                        />
                        <p className="text-xs text-muted-foreground">
                          Examples: random_number, boolean, enum, blood_pressure, gps, position, timestamp
                        </p>
                      </div>

                      <div className="flex gap-2 justify-end">
                        <Button type="button" variant="outline" onClick={resetForm}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={saveMutation.isPending}>
                          {saveMutation.isPending ? 'Saving...' : editingConfig ? 'Update' : 'Create'}
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
              <p className="text-center text-muted-foreground py-8">Loading configurations...</p>
            ) : dataConfigs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No data configurations yet. Add your first config to get started.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Data Type</TableHead>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Value Type</TableHead>
                    <TableHead>Sample Config</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dataConfigs.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell>{config.sort_order}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">{config.data_type}</code>
                      </TableCell>
                      <TableCell className="font-medium">{config.display_name}</TableCell>
                      <TableCell>{config.unit || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{config.value_type}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <code className="text-xs bg-muted px-2 py-1 rounded block truncate">
                          {JSON.stringify(config.sample_data_config)}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(config)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDelete(config)}>
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
      <AlertDialog open={!!deleteConfig} onOpenChange={() => setDeleteConfig(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Data Configuration?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfig?.display_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfig && deleteMutation.mutate(deleteConfig.id)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DeviceTypeDataConfigs;
