import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { format } from 'date-fns';
import { Pill, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Progress } from '@/components/ui/progress';

interface MedicationAdherenceReportProps {
  selectedPerson: string;
  dateRange: { from: Date; to: Date };
}

export const MedicationAdherenceReport = ({ selectedPerson, dateRange }: MedicationAdherenceReportProps) => {
  const { t } = useTranslation();

  const { data: medicationData = [], isLoading } = useQuery({
    queryKey: ['medication-report', selectedPerson, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('device_data')
        .select('*')
        .eq('data_type', 'medication_taken')
        .gte('recorded_at', dateRange.from.toISOString())
        .lte('recorded_at', dateRange.to.toISOString())
        .order('recorded_at', { ascending: true });

      if (selectedPerson !== 'all') {
        query = query.eq('elderly_person_id', selectedPerson);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate adherence statistics
  const taken = medicationData.filter(m => {
    let val = m.value;
    if (typeof val === 'object' && val !== null) {
      val = val.taken ?? val.value;
    }
    return val === true || val === 'true' || val === 1 || val === '1';
  }).length;

  const missed = medicationData.length - taken;
  const adherenceRate = medicationData.length > 0
    ? Math.round((taken / medicationData.length) * 100)
    : 0;

  const pieData = [
    { name: 'Taken', value: taken, color: '#10b981' },
    { name: 'Missed', value: missed, color: '#ef4444' },
  ];

  // Group by day
  const dailyAdherence = medicationData.reduce((acc: any[], item) => {
    const date = format(new Date(item.recorded_at), 'MMM dd');
    let val = item.value;
    if (typeof val === 'object' && val !== null) {
      val = val.taken ?? val.value;
    }
    const taken = val === true || val === 'true' || val === 1 || val === '1';

    const existing = acc.find(entry => entry.date === date);
    if (existing) {
      if (taken) existing.taken += 1;
      else existing.missed += 1;
    } else {
      acc.push({
        date,
        taken: taken ? 1 : 0,
        missed: taken ? 0 : 1,
      });
    }

    return acc;
  }, []);

  if (isLoading) {
    return <div className="text-center py-8">{t('common.loading')}</div>;
  }

  if (medicationData.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">{t('common.noData')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Adherence Rate</CardTitle>
            <Pill className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adherenceRate}%</div>
            <Progress value={adherenceRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Doses Taken</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{taken}</div>
            <p className="text-xs text-muted-foreground">
              Out of {medicationData.length} total doses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Doses Missed</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{missed}</div>
            <p className="text-xs text-muted-foreground">
              {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Adherence Overview</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Daily Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Adherence</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dailyAdherence.map((day, index) => {
              const total = day.taken + day.missed;
              const rate = Math.round((day.taken / total) * 100);
              const status = rate === 100 ? 'Perfect' : rate >= 80 ? 'Good' : rate >= 50 ? 'Fair' : 'Poor';
              const statusColor = rate === 100 ? 'text-success' : rate >= 80 ? 'text-success' : rate >= 50 ? 'text-warning' : 'text-destructive';

              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{day.date}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm">
                        {day.taken}/{total} taken
                      </span>
                      <span className={`text-sm font-semibold ${statusColor}`}>
                        {status}
                      </span>
                    </div>
                  </div>
                  <Progress value={rate} />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {adherenceRate < 80 && (
        <Card className="border-warning">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Consider setting up medication reminders</li>
              <li>Review medication schedule with healthcare provider</li>
              <li>Use pill organizers to track daily doses</li>
              <li>Involve family members or caregivers in medication management</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
