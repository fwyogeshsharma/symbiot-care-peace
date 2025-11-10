import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { ProcessedMovementData, calculateDwellTimes } from "@/lib/movementUtils";
import { HelpTooltip } from "@/components/help/HelpTooltip";

interface DwellTimeAnalysisProps {
  data: ProcessedMovementData;
  idealProfile?: {
    baseline_data: Record<string, { min_minutes: number; max_minutes: number; ideal_minutes: number }>;
  } | null;
}

export const DwellTimeAnalysis = ({ data, idealProfile }: DwellTimeAnalysisProps) => {
  const dwellTimes = calculateDwellTimes(data.events);

  // Prepare chart data with actual vs ideal comparison
  const chartData = Object.entries(dwellTimes).map(([location, actualMinutes]) => {
    const baseline = idealProfile?.baseline_data?.[location];
    const idealMinutes = baseline?.ideal_minutes || 0;
    const minMinutes = baseline?.min_minutes || 0;
    const maxMinutes = baseline?.max_minutes || 0;

    // Calculate deviation percentage
    const deviation = idealMinutes > 0 
      ? ((actualMinutes - idealMinutes) / idealMinutes) * 100 
      : 0;

    // Determine status
    let status: 'normal' | 'warning' | 'alert' = 'normal';
    if (baseline) {
      if (actualMinutes < minMinutes || actualMinutes > maxMinutes) {
        status = 'alert';
      } else if (Math.abs(deviation) > 25) {
        status = 'warning';
      }
    }

    return {
      location,
      actual: Math.round(actualMinutes),
      ideal: idealMinutes,
      min: minMinutes,
      max: maxMinutes,
      deviation: Math.round(deviation),
      status,
    };
  });

  // Sort by actual time descending
  chartData.sort((a, b) => b.actual - a.actual);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'alert': return 'hsl(var(--destructive))';
      case 'warning': return 'hsl(var(--warning))';
      default: return 'hsl(var(--primary))';
    }
  };

  const getStatusBadge = (status: string, deviation: number) => {
    switch (status) {
      case 'alert':
        return <Badge variant="destructive" className="text-xs">Alert</Badge>;
      case 'warning':
        return <Badge className="bg-warning text-xs">Warning</Badge>;
      default:
        if (Math.abs(deviation) < 10) {
          return <Badge variant="outline" className="text-xs text-success">Normal</Badge>;
        }
        return null;
    }
  };

  const totalDwellTime = Object.values(dwellTimes).reduce((sum, val) => sum + val, 0);
  const averageDwellTime = Object.keys(dwellTimes).length > 0 
    ? totalDwellTime / Object.keys(dwellTimes).length 
    : 0;

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Dwell Time Analysis
            </CardTitle>
            <HelpTooltip 
              title="Understanding Dwell Times"
              content={
                <div className="space-y-2">
                  <p>Dwell time is the amount of time spent in each location/zone.</p>
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-primary rounded" />
                      <span>Normal: Within ideal range</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-warning rounded" />
                      <span>Warning: 10-20% deviation</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-destructive rounded" />
                      <span>Alert: &gt;20% deviation or outside range</span>
                    </div>
                  </div>
                </div>
              }
            />
          </div>
          {idealProfile && (
            <Badge variant="outline" className="text-xs">
              Comparing to: {idealProfile?.baseline_data ? 'Active Profile' : 'No Profile'}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-base font-semibold mb-1">Total Dwell Time</p>
            <p className="text-xl font-bold">{Math.round(totalDwellTime)} min</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-base font-semibold mb-1">Average per Location</p>
            <p className="text-xl font-bold">{Math.round(averageDwellTime)} min</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-base font-semibold mb-1">Locations Visited</p>
            <p className="text-xl font-bold">{Object.keys(dwellTimes).length}</p>
          </div>
        </div>

        {/* Comparison Chart */}
        {chartData.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3">Actual vs Ideal Dwell Time by Location</h4>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="location"
                  angle={0}
                  textAnchor="middle"
                  height={80}
                  interval={0}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-card border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold mb-2">{data.location}</p>
                          <div className="space-y-1 text-sm">
                            <p>Actual: <span className="font-bold">{data.actual} min</span></p>
                            {data.ideal > 0 && (
                              <>
                                <p>Ideal: <span className="font-bold">{data.ideal} min</span></p>
                                <p>Range: <span className="font-bold">{data.min}-{data.max} min</span></p>
                                <p className={data.deviation > 0 ? 'text-warning' : 'text-success'}>
                                  Deviation: <span className="font-bold">{data.deviation > 0 ? '+' : ''}{data.deviation}%</span>
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Bar dataKey="actual" name="Actual Time" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getStatusColor(entry.status)} />
                  ))}
                </Bar>
                {idealProfile && <Bar dataKey="ideal" name="Ideal Time" fill="hsl(var(--muted-foreground))" opacity={0.3} radius={[8, 8, 0, 0]} />}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Detailed Breakdown */}
        <div>
          <h4 className="text-sm font-semibold mb-3">Detailed Breakdown</h4>
          <div className="space-y-2">
            {chartData.map((item) => (
              <div key={item.location} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{item.location}</span>
                    {getStatusBadge(item.status, item.deviation)}
                  </div>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>Actual: <strong>{item.actual} min</strong></span>
                    {item.ideal > 0 && (
                      <>
                        <span>Ideal: <strong>{item.ideal} min</strong></span>
                        <span>Range: <strong>{item.min}-{item.max} min</strong></span>
                      </>
                    )}
                  </div>
                </div>
                {item.ideal > 0 && (
                  <div className="flex items-center gap-2">
                    {item.deviation > 0 ? (
                      <TrendingUp className="w-4 h-4 text-warning" />
                    ) : item.deviation < 0 ? (
                      <TrendingDown className="w-4 h-4 text-success" />
                    ) : null}
                    <span className={`text-sm font-bold ${
                      item.status === 'alert' ? 'text-destructive' : 
                      item.status === 'warning' ? 'text-warning' : 
                      'text-muted-foreground'
                    }`}>
                      {item.deviation > 0 ? '+' : ''}{item.deviation}%
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {!idealProfile && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-accent/10 border border-accent">
            <AlertTriangle className="w-5 h-5 text-accent shrink-0" />
            <div>
              <p className="text-sm font-medium">No Ideal Profile Set</p>
              <p className="text-xs text-muted-foreground">
                Create an ideal profile to track deviations and receive alerts
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};