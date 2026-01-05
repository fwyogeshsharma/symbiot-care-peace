import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bath } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO, startOfHour } from "date-fns";

interface ToiletEvent {
  timestamp: string;
  location: string;
  dataType: string;
  value: any;
  deviceName: string;
}

interface ToiletActivityGraphProps {
  events: ToiletEvent[];
}

export const ToiletActivityGraph = ({ events }: ToiletActivityGraphProps) => {
  const { t } = useTranslation();

  // Filter toilet events - comprehensive filtering
  const toiletEvents = events.filter(e => {
    const location = e.location?.toLowerCase() || '';
    const deviceName = e.deviceName?.toLowerCase() || '';
    const dataType = e.dataType?.toLowerCase() || '';

    return location.includes('toilet') ||
           location.includes('bathroom') ||
           location.includes('washroom') ||
           location.includes('restroom') ||
           deviceName.includes('toilet') ||
           dataType.includes('toilet');
  });

  // Group events by hour
  const groupedData = toiletEvents.reduce((acc, event) => {
    const hour = format(startOfHour(parseISO(event.timestamp)), 'HH:mm');
    if (!acc[hour]) {
      acc[hour] = { time: hour, visits: 0 };
    }
    acc[hour].visits += 1;
    return acc;
  }, {} as Record<string, { time: string; visits: number }>);

  const chartData = Object.values(groupedData).sort((a, b) =>
    a.time.localeCompare(b.time)
  );

  if (toiletEvents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bath className="h-5 w-5 text-green-500" />
            {t('activity.toilet.graph.title', 'Toilet Activity Over Time')}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <p className="text-muted-foreground">
            {t('activity.toilet.graph.noData', 'No toilet activity data available')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bath className="h-5 w-5 text-green-500" />
          {t('activity.toilet.graph.title', 'Toilet Activity Over Time')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="time"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}
              labelStyle={{ color: '#374151', fontWeight: 'bold' }}
            />
            <Bar
              dataKey="visits"
              fill="#22c55e"
              radius={[8, 8, 0, 0]}
              name={t('activity.toilet.graph.visits', 'Toilet Visits')}
            />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500"></div>
            <span>{t('activity.toilet.graph.legend', 'Visits per Hour')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
