import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface ElderlyPerson {
  id: string;
  full_name: string;
  photo_url: string | null;
  status: string;
  medical_conditions: string[] | null;
}

interface ElderlyContextType {
  elderlyPersons: ElderlyPerson[];
  selectedPersonId: string | null;
  setSelectedPersonId: (id: string | null) => void;
  isLoading: boolean;
  refetch: () => void;
}

const ElderlyContext = createContext<ElderlyContextType | undefined>(undefined);

export const ElderlyProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  // Fetch elderly persons based on user access
  const { data: elderlyPersons = [], isLoading, refetch } = useQuery({
    queryKey: ['accessible-elderly-persons', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .rpc('get_accessible_elderly_persons', { _user_id: user.id });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Auto-select first person if none selected
  useEffect(() => {
    if (elderlyPersons.length > 0 && !selectedPersonId) {
      setSelectedPersonId(elderlyPersons[0].id);
    }
  }, [elderlyPersons, selectedPersonId]);

  // Clear selection when elderly persons list changes and selected is no longer available
  useEffect(() => {
    if (selectedPersonId && elderlyPersons.length > 0) {
      const stillExists = elderlyPersons.some(p => p.id === selectedPersonId);
      if (!stillExists) {
        setSelectedPersonId(elderlyPersons[0]?.id || null);
      }
    }
  }, [elderlyPersons, selectedPersonId]);

  return (
    <ElderlyContext.Provider value={{
      elderlyPersons,
      selectedPersonId,
      setSelectedPersonId,
      isLoading,
      refetch,
    }}>
      {children}
    </ElderlyContext.Provider>
  );
};

export const useElderly = () => {
  const context = useContext(ElderlyContext);
  if (context === undefined) {
    throw new Error('useElderly must be used within an ElderlyProvider');
  }
  return context;
};
