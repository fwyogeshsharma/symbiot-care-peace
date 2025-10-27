import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DeviceTypeDataConfig {
  id: string;
  device_type_id: string;
  data_type: string;
  display_name: string;
  unit: string | null;
  value_type: string;
  sample_data_config: any;
  is_required: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const useDeviceTypeDataConfigs = (deviceTypeCode?: string) => {
  return useQuery({
    queryKey: ['device-type-data-configs', deviceTypeCode],
    queryFn: async () => {
      let query = supabase
        .from('device_type_data_configs')
        .select(`
          *,
          device_types!inner(code)
        `)
        .order('sort_order');
      
      if (deviceTypeCode) {
        query = query.eq('device_types.code', deviceTypeCode);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as DeviceTypeDataConfig[];
    },
    enabled: !!deviceTypeCode,
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
  });
};

export const useAllDeviceTypeDataConfigs = () => {
  return useQuery({
    queryKey: ['all-device-type-data-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('device_type_data_configs')
        .select(`
          *,
          device_types!inner(code, name)
        `)
        .order('sort_order');
      
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 30,
  });
};
