import { Card } from '@/components/ui/card';
import { Heart, Activity, Thermometer, Wind } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const VitalMetrics = () => {
  const { data: recentData } = useQuery({
    queryKey: ['recent-vitals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('device_data')
        .select('*, elderly_persons(full_name)')
        .order('recorded_at', { ascending: false })
        .limit(8);
      
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
    // Simple logic for color coding
    const numValue = typeof value === 'object' && value !== null && 'value' in value 
      ? (value as any).value 
      : typeof value === 'number' ? value : 0;
    
    switch (type) {
      case 'heart_rate':
        if (numValue < 60 || numValue > 100) return 'text-warning';
        return 'text-success';
      case 'oxygen_level':
        if (numValue < 95) return 'text-destructive';
        return 'text-success';
      default:
        return 'text-foreground';
    }
  };

  const formatValue = (value: any) => {
    if (typeof value === 'object' && value !== null && 'value' in value) {
      return (value as any).value;
    }
    return value;
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Recent Vital Signs</h3>
      
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
                  {formatValue(vital.value)}
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