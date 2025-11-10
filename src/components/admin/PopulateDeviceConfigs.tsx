import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from 'lucide-react';
import { useState } from 'react';

export const PopulateDeviceConfigs = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handlePopulate = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke('populate-device-configs');
      
      if (error) throw error;
      
      toast.success(data.message || 'Device configurations populated successfully');
      
      // Refresh the page to show new configs
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Error populating configs:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to populate device configurations');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Device Data Configurations
        </CardTitle>
        <CardDescription>
          Populate missing data configurations for device types (Bed Pad, Chair Seat, Commercial Scale, Smart Phone, Toilet Seat)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handlePopulate} disabled={isLoading}>
          {isLoading ? 'Populating...' : 'Populate Device Configs'}
        </Button>
      </CardContent>
    </Card>
  );
};
