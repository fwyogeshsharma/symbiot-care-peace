import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DeviceType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  category: string;
  is_active: boolean;
  supports_position_tracking: boolean;
  created_at: string;
  updated_at: string;
}

export const useDeviceTypes = () => {
  return useQuery({
    queryKey: ['device-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('device_types')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data as DeviceType[];
    },
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
  });
};

export const useAllDeviceTypes = () => {
  return useQuery({
    queryKey: ['all-device-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('device_types')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as DeviceType[];
    },
    staleTime: 1000 * 60 * 30,
  });
};
