import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bed } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO, startOfHour } from "date-fns";

interface BedEvent {
  timestamp: string;
  location: string;
  dataType: string;
  value: any;
  deviceName: string;
}

interface BedActivityGraphProps {
  events: BedEvent[];
}

export const BedActivityGraph = ({ events }: BedActivityGraphProps) => {
  const { t } = useTranslation();

  // Filter bed events - comprehensive filtering
  const bedEvents = events.filter(e => {
    const location = e.location?.toLowerCase() || '';
    const deviceName = e.deviceName?.toLowerCase() || '';
    const dataType = e.dataType?.toLowerCase() || '';

    return location.includes('bed') ||
           location.includes('bedroom') ||
           deviceName.includes('bed') ||
           dataType.includes('bed') ||
           dataType.includes('pressure') ||
           dataType.includes('mat');
  });

  // Group events by hour
  const groupedData = bedEvents.reduce((acc, event) => {
    const hour = format(startOfHour(parseISO(event.timestamp)), 'HH:mm');
    if (!acc[hour]) {
      acc[hour] = { time: hour, count: 0, occupancy: 0 };
    }
    acc[hour].count += 1;
    // If value is a boolean or presence indicator
    if (event.value === true || event.value === 'occupied' || event.value === 1) {
      acc[hour].occupancy += 1;
    }
    return acc;
  }, {} as Record<string, { time: string; count: number; occupancy: number }>);

  const chartData = Object.values(groupedData).sort((a, b) =>
    a.time.localeCompare(b.time)
  );

  if (bedEvents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bed className="h-5 w-5 text-blue-500" />
            {t('activity.bed.graph.title', 'Bed Activity Over Time')}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <p className="text-muted-foreground">
            {t('activity.bed.graph.noData', 'No bed activity data available')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bed className="h-5 w-5 text-blue-500" />
          {t('activity.bed.graph.title', 'Bed Activity Over Time')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorBed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="time"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}
              labelStyle={{ color: '#374151', fontWeight: 'bold' }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#3b82f6"
              fillOpacity={1}
              fill="url(#colorBed)"
              name={t('activity.bed.graph.events', 'Bed Events')}
            />
          </AreaChart>
        </ResponsiveContainer>
        <div className="mt-4 flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>{t('activity.bed.graph.legend', 'Activity Events')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
