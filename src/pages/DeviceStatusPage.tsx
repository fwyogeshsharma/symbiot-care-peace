import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DeviceStatus from '@/components/dashboard/DeviceStatus';
import Header from '@/components/layout/Header';
import ElderlyList from '@/components/dashboard/ElderlyList';

const DeviceStatusPage = () => {
  const { user } = useAuth();
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  const { data: elderlyPersons = [] } = useQuery({
    queryKey: ['elderly-persons', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .rpc('get_accessible_elderly_persons', { _user_id: user.id });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  useEffect(() => {
    if (elderlyPersons.length > 0 && !selectedPersonId) {
      setSelectedPersonId(elderlyPersons[0].id);
    }
  }, [elderlyPersons, selectedPersonId]);

  return (
    <div className="min-h-screen bg-background">
      <Header showBackButton title="Device Status" subtitle="Monitor your devices" />

      <main className="container mx-auto px-4 py-4 sm:py-6 lg:py-8">
        <div className="space-y-6">
          <ElderlyList 
            elderlyPersons={elderlyPersons}
            selectedPersonId={selectedPersonId}
            onSelectPerson={setSelectedPersonId}
          />
          <DeviceStatus selectedPersonId={selectedPersonId} />
        </div>
      </main>
    </div>
  );
};

export default DeviceStatusPage;
