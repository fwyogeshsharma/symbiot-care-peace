import { Card } from '@/components/ui/card';
import { Heart, Activity, Thermometer, Wind } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface VitalMetricsProps {
  selectedPersonId?: string | null;
}

const VitalMetrics = ({ selectedPersonId }: VitalMetricsProps) => {
  const { data: recentData } = useQuery({
    queryKey: ['recent-vitals', selectedPersonId],
    queryFn: async () => {
      let query = supabase
        .from('device_data')
        .select('*, elderly_persons(full_name)')
        .in('data_type', ['heart_rate', 'blood_pressure', 'blood_sugar', 'oxygen_level', 'temperature', 'steps'])
        .order('recorded_at', { ascending: false });
      
      if (selectedPersonId) {
        query = query.eq('elderly_person_id', selectedPersonId);
      }
      
      const { data, error } = await query.limit(8);
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const getVitalIcon = (type: string) => {
    switch (type) {
      case 'heart_rate':
        return <Heart className="w-5 h-5" />;
      case 'blood_pressure':
        return <Activity className="w-5 h-5" />;
      case 'temperature':
        return <Thermometer className="w-5 h-5" />;
      case 'oxygen_level':
        return <Wind className="w-5 h-5" />;
      default:
        return <Activity className="w-5 h-5" />;
    }
  };

  const getVitalColor = (type: string, value: any) => {
    let numValue = 0;
    
    if (typeof value === 'object' && value !== null) {
      if ('bpm' in value) numValue = value.bpm;
      else if ('level' in value) numValue = value.level;
      else if ('temp' in value) numValue = value.temp;
      else if ('systolic' in value) numValue = value.systolic;
    } else if (typeof value === 'number') {
      numValue = value;
    }
    
    switch (type) {
      case 'heart_rate':
        if (numValue < 60 || numValue > 100) return 'text-warning';
        return 'text-success';
      case 'oxygen_level':
        if (numValue < 95) return 'text-destructive';
        return 'text-success';
      case 'blood_pressure':
        if (numValue > 140) return 'text-warning';
        return 'text-success';
      default:
        return 'text-foreground';
    }
  };

  const formatValue = (value: any, type: string) => {
    if (typeof value === 'object' && value !== null) {
      // Handle different data structures
      if ('bpm' in value) return Number(value.bpm).toFixed(2);
      if ('level' in value) return Number(value.level).toFixed(2);
      if ('temp' in value) return Number(value.temp).toFixed(2);
      if ('systolic' in value && 'diastolic' in value) {
        return `${Number(value.systolic).toFixed(2)}/${Number(value.diastolic).toFixed(2)}`;
      }
      // Fallback for unknown objects - convert to string
      return JSON.stringify(value);
    }
    return typeof value === 'number' ? Number(value).toFixed(2) : String(value);
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">
        Recent Vital Signs {selectedPersonId && '(Filtered)'}
      </h3>
      
      {!recentData || recentData.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          No vital sign data available yet
        </p>
      ) : (
        <div className="space-y-3">
          {recentData.map((vital) => (
            <div 
              key={vital.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center ${getVitalColor(vital.data_type, vital.value)}`}>
                  {getVitalIcon(vital.data_type)}
                </div>
                <div>
                  <p className="font-medium capitalize">
                    {vital.data_type.replace('_', ' ')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {vital.elderly_persons?.full_name || 'Unknown'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-lg font-semibold ${getVitalColor(vital.data_type, vital.value)}`}>
                  {formatValue(vital.value, vital.data_type)}
                  {vital.unit && <span className="text-sm ml-1">{vital.unit}</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(vital.recorded_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default VitalMetrics;