import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Settings, Smartphone } from 'lucide-react';
import * as Icons from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAllDeviceTypes, DeviceType } from '@/hooks/useDeviceTypes';
import Header from '@/components/layout/Header';
import { useNavigate } from 'react-router-dom';
import { PopulateDeviceConfigs } from '@/components/admin/PopulateDeviceConfigs';

const DeviceTypesManagement = () => {
  const { data: deviceTypes = [], isLoading } = useAllDeviceTypes();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [editingType, setEditingType] = useState<DeviceType | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    icon: '',
    category: 'health',
    is_active: true,
    supports_position_tracking: false,
    data_frequency_per_day: 48,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingType) {
        const { error } = await supabase
          .from('device_types')
          .update(data)
          .eq('id', editingType.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('device_types')
          .insert([data]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['device-types'] });
      queryClient.invalidateQueries({ queryKey: ['all-device-types'] });
      toast({
        title: editingType ? 'Device type updated' : 'Device type created',
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      icon: '',
      category: 'health',
      is_active: true,
      supports_position_tracking: false,
      data_frequency_per_day: 48,
    });
    setEditingType(null);
    setOpen(false);
  };

  const handleEdit = (type: DeviceType) => {
    setEditingType(type);
    setFormData({
      code: type.code,
      name: type.name,
      description: type.description || '',
      icon: type.icon || '',
      category: type.category,
      is_active: type.is_active,
      supports_position_tracking: type.supports_position_tracking,
      data_frequency_per_day: type.data_frequency_per_day,
    });
    setOpen(true);
  };

  const getIconComponent = (iconName: string | null) => {
    if (!iconName) return null;
    const IconComponent = Icons[iconName as keyof typeof Icons] as React.ComponentType<any>;
    return IconComponent ? <IconComponent className="w-5 h-5" /> : null;
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      health: 'bg-blue-500',
      tracking: 'bg-purple-500',
      environment: 'bg-green-500',
      safety: 'bg-red-500',
      security: 'bg-orange-500',
      automation: 'bg-indigo-500',
    };
    return colors[category] || 'bg-gray-500';
  };

  return (
    <div className="min-h-screen bg-background">
      <Header showBackButton title="Device Types Management" subtitle="Configure device types and categories" />

      <main className="container mx-auto px-4 py-6 space-y-6">
        <PopulateDeviceConfigs />
        
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Device Types</CardTitle>
                <CardDescription>Manage device types and their configurations</CardDescription>
              </div>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingType(null)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Device Type
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingType ? 'Edit Device Type' : 'Create Device Type'}</DialogTitle>
                    <DialogDescription>
                      {editingType ? 'Update device type information' : 'Add a new device type to the system'}
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
                          placeholder="e.g., wearable"
                          required
                          disabled={!!editingType}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="name">Name *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="e.g., Wearable Device"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Brief description of the device type"
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="icon">Icon (Emoji)</Label>
                        <Input
                          id="icon"
                          value={formData.icon}
                          onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                          placeholder="⌚"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="category">Category *</Label>
                        <Select
                          value={formData.category}
                          onValueChange={(value) => setFormData({ ...formData, category: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="health">Health</SelectItem>
                            <SelectItem value="tracking">Tracking</SelectItem>
                            <SelectItem value="environment">Environment</SelectItem>
                            <SelectItem value="safety">Safety</SelectItem>
                            <SelectItem value="security">Security</SelectItem>
                            <SelectItem value="automation">Automation</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="data_frequency_per_day">Data Frequency (per 24h) *</Label>
                      <Input
                        id="data_frequency_per_day"
                        type="number"
                        min="1"
                        value={formData.data_frequency_per_day}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          data_frequency_per_day: parseInt(e.target.value) || 1 
                        })}
                        placeholder="e.g., 48 (every 30 minutes)"
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        How many times per day should this device send data on average
                      </p>
                    </div>

                    <div className="flex items-center justify-between space-x-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="is_active"
                          checked={formData.is_active}
                          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                        />
                        <Label htmlFor="is_active">Active</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="supports_position_tracking"
                          checked={formData.supports_position_tracking}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, supports_position_tracking: checked })
                          }
                        />
                        <Label htmlFor="supports_position_tracking">Supports Position Tracking</Label>
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="outline" onClick={resetForm}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={saveMutation.isPending}>
                        {saveMutation.isPending ? 'Saving...' : editingType ? 'Update' : 'Create'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">Loading device types...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Icon</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Frequency/Day</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deviceTypes.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell>{getIconComponent(type.icon)}</TableCell>
                      <TableCell className="font-medium">{type.name}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">{type.code}</code>
                      </TableCell>
                      <TableCell>
                        <Badge className={getCategoryBadge(type.category)}>{type.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{type.data_frequency_per_day}x</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{type.description}</TableCell>
                      <TableCell>
                        <Badge variant={type.is_active ? 'default' : 'secondary'}>
                          {type.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(type)} title="Edit Device Type">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/admin/device-types/${type.id}/models`)}
                            title="Manage Device Models"
                          >
                            <Smartphone className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/admin/device-types/${type.id}/configs`)}
                            title="Data Configurations"
                          >
                            <Settings className="w-4 h-4" />
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
    </div>
  );
};

export default DeviceTypesManagement;
