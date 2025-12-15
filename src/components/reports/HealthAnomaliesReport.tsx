import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { AlertTriangle, Heart, Wind, Droplets, Thermometer } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface HealthAnomaliesReportProps {
  selectedPerson: string;
  dateRange: { from: Date; to: Date };
}

export const HealthAnomaliesReport = ({ selectedPerson, dateRange }: HealthAnomaliesReportProps) => {
  const { t } = useTranslation();

  const { data: vitalData = [], isLoading } = useQuery({
    queryKey: ['health-anomalies', selectedPerson, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('device_data')
        .select('*')
        .in('data_type', ['heart_rate', 'blood_pressure', 'oxygen_saturation', 'spo2', 'temperature', 'blood_sugar', 'glucose'])
        .gte('recorded_at', dateRange.from.toISOString())
        .lte('recorded_at', dateRange.to.toISOString())
        .order('recorded_at', { ascending: false });

      if (selectedPerson !== 'all') {
        query = query.eq('elderly_person_id', selectedPerson);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Define normal ranges
  const normalRanges: Record<string, { min: number; max: number; unit: string }> = {
    heart_rate: { min: 60, max: 100, unit: 'BPM' },
    oxygen_saturation: { min: 95, max: 100, unit: '%' },
    spo2: { min: 95, max: 100, unit: '%' },
    temperature: { min: 97, max: 99, unit: '°F' },
    blood_sugar: { min: 70, max: 140, unit: 'mg/dL' },
    glucose: { min: 70, max: 140, unit: 'mg/dL' },
  };

  // Extract numeric value from various formats
  const extractValue = (value: any, dataType: string) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'object' && value !== null) {
      if ('bpm' in value) return Number(value.bpm);
      if ('value' in value) return Number(value.value);
      if ('systolic' in value) return Number(value.systolic); // For blood pressure
    }
    return Number(value);
  };

  // Identify anomalies
  const anomalies = vitalData.filter(item => {
    const range = normalRanges[item.data_type];
    if (!range) return false;

    const value = extractValue(item.value, item.data_type);
    if (isNaN(value)) return false;

    return value < range.min || value > range.max;
  });

  // Group anomalies by type
  const anomaliesByType = anomalies.reduce((acc: any, item) => {
    const type = item.data_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(item);
    return acc;
  }, {});

  const getSeverity = (value: number, range: { min: number; max: number }) => {
    const deviation = value < range.min
      ? ((range.min - value) / range.min) * 100
      : ((value - range.max) / range.max) * 100;

    if (deviation > 20) return { level: 'Critical', color: 'destructive' };
    if (deviation > 10) return { level: 'High', color: 'destructive' };
    return { level: 'Moderate', color: 'warning' };
  };

  const getIcon = (dataType: string) => {
    switch (dataType) {
      case 'heart_rate': return Heart;
      case 'oxygen_saturation':
      case 'spo2': return Wind;
      case 'blood_sugar':
      case 'glucose': return Droplets;
      case 'temperature': return Thermometer;
      default: return AlertTriangle;
    }
  };

  const getTypeName = (dataType: string) => {
    const names: Record<string, string> = {
      heart_rate: 'Heart Rate',
      oxygen_saturation: 'Oxygen Saturation',
      spo2: 'Oxygen Saturation',
      temperature: 'Body Temperature',
      blood_sugar: 'Blood Sugar',
      glucose: 'Blood Glucose',
    };
    return names[dataType] || dataType;
  };

  if (isLoading) {
    return <div className="text-center py-8">{t('common.loading')}</div>;
  }

  if (anomalies.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
              <Heart className="w-8 h-8 text-success" />
            </div>
            <h3 className="text-lg font-semibold text-success">All Readings Normal</h3>
            <p className="text-muted-foreground">
              No health anomalies detected in the selected period
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="border-warning">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <CardTitle>Anomalies Detected</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Total Anomalies</p>
              <p className="text-3xl font-bold text-warning">{anomalies.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Affected Metrics</p>
              <p className="text-3xl font-bold">{Object.keys(anomaliesByType).length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date Range</p>
              <p className="text-sm font-medium">
                {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Anomalies by Type */}
      {Object.entries(anomaliesByType).map(([dataType, items]: [string, any]) => {
        const Icon = getIcon(dataType);
        const range = normalRanges[dataType];

        return (
          <Card key={dataType}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon className="h-5 w-5" />
                {getTypeName(dataType)} Anomalies
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Normal range: {range.min} - {range.max} {range.unit}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {items.map((item: any, index: number) => {
                  const value = extractValue(item.value, dataType);
                  const severity = getSeverity(value, range);
                  const isLow = value < range.min;

                  return (
                    <div
                      key={item.id || index}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-lg">
                            {value} {range.unit}
                          </span>
                          <Badge variant={severity.color as any}>
                            {severity.level}
                          </Badge>
                          <Badge variant="outline">
                            {isLow ? 'Below' : 'Above'} Normal
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(item.recorded_at), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {isLow ? 'Low' : 'High'} by{' '}
                          {Math.abs(
                            isLow
                              ? range.min - value
                              : value - range.max
                          ).toFixed(1)}{' '}
                          {range.unit}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Recommendations */}
      <Card className="border-info">
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li>Consult with a healthcare provider about these readings</li>
            <li>Ensure devices are properly calibrated and worn correctly</li>
            <li>Monitor for patterns or recurring anomalies</li>
            <li>Keep a log of activities and medications when anomalies occur</li>
            <li>Seek immediate medical attention for critical readings</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
