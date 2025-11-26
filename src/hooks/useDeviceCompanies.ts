import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DeviceCompany {
  id: string;
  code: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  website: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export const useDeviceCompanies = () => {
  return useQuery({
    queryKey: ['device-companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('device_companies')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as DeviceCompany[];
    },
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
  });
};

export const useAllDeviceCompanies = () => {
  return useQuery({
    queryKey: ['all-device-companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('device_companies')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as DeviceCompany[];
    },
    staleTime: 1000 * 60 * 30,
  });
};

// Only returns companies that have at least one device model associated
export const useDeviceCompaniesWithModels = () => {
  return useQuery({
    queryKey: ['device-companies-with-models'],
    queryFn: async () => {
      // First get all company IDs that have device models
      const { data: modelsData, error: modelsError } = await supabase
        .from('device_models')
        .select('company_id')
        .eq('is_active', true)
        .not('company_id', 'is', null);

      if (modelsError) throw modelsError;

      // Get unique company IDs
      const companyIds = [...new Set(modelsData?.map(m => m.company_id).filter(Boolean))];

      if (companyIds.length === 0) {
        return [] as DeviceCompany[];
      }

      // Fetch only companies that have device models
      const { data, error } = await supabase
        .from('device_companies')
        .select('*')
        .eq('is_active', true)
        .in('id', companyIds)
        .order('name');

      if (error) throw error;
      return data as DeviceCompany[];
    },
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
  });
};
