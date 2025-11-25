import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

export interface DeviceModel {
  id: string;
  device_type_id: string;
  company_id: string | null;
  manufacturer: string | null;
  code: string;
  name: string;
  description: string | null;
  model_number: string | null;
  image_url: string | null;
  specifications: Json | null;
  supported_data_types: string[] | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  // Joined relations
  device_types?: {
    id: string;
    code: string;
    name: string;
    icon: string | null;
  };
  device_companies?: {
    id: string;
    code: string;
    name: string;
  } | null;
}

export const useDeviceModels = (deviceTypeId?: string) => {
  return useQuery({
    queryKey: ['device-models', deviceTypeId],
    queryFn: async () => {
      let query = supabase
        .from('device_models')
        .select(`
          *,
          device_types(id, code, name, icon),
          device_companies(id, code, name)
        `)
        .eq('is_active', true)
        .order('name');

      if (deviceTypeId) {
        query = query.eq('device_type_id', deviceTypeId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as DeviceModel[];
    },
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
  });
};

export const useAllDeviceModels = (deviceTypeId?: string) => {
  return useQuery({
    queryKey: ['all-device-models', deviceTypeId],
    queryFn: async () => {
      let query = supabase
        .from('device_models')
        .select(`
          *,
          device_types(id, code, name, icon),
          device_companies(id, code, name)
        `)
        .order('name');

      if (deviceTypeId) {
        query = query.eq('device_type_id', deviceTypeId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as DeviceModel[];
    },
    staleTime: 1000 * 60 * 30,
  });
};

export const useDeviceModelsByCompany = (companyId?: string) => {
  return useQuery({
    queryKey: ['device-models-by-company', companyId],
    queryFn: async () => {
      let query = supabase
        .from('device_models')
        .select(`
          *,
          device_types(id, code, name, icon),
          device_companies(id, code, name)
        `)
        .eq('is_active', true)
        .order('name');

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as DeviceModel[];
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 30,
  });
};
