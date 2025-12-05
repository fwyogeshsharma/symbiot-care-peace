import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PanicSosChartsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPersonId?: string | null;
}

export const PanicSosCharts = ({ open, onOpenChange, selectedPersonId }: PanicSosChartsProps) => {
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const { data: panicData, isLoading } = useQuery({
    queryKey: ['panic-sos-charts', selectedPersonId, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('device_data')
        .select(`
          *,
          elderly_persons!inner(full_name),
          devices!inner(device_type)
        `)
        .eq('data_type', 'button_pressed')
        .gte('recorded_at', startOfDay(dateRange.from).toISOString())
        .lte('recorded_at', endOfDay(dateRange.to).toISOString())
        .order('recorded_at', { ascending: true });

      if (selectedPersonId) {
        query = query.eq('elderly_person_id', selectedPersonId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Group events by date
  const eventsByDate = panicData?.reduce((acc: any, event: any) => {
    const date = format(new Date(event.recorded_at), 'MMM dd');
    if (!acc[date]) {
      acc[date] = { date, total: 0, critical: 0, warning: 0, info: 0 };
    }
    acc[date].total += 1;
    
    const status = event.value?.status || 'info';
    if (status === 'critical' || status === 'emergency') {
      acc[date].critical += 1;
    } else if (status === 'warning' || status === 'high') {
      acc[date].warning += 1;
    } else {
      acc[date].info += 1;
    }
    
    return acc;
  }, {});

  const chartData = eventsByDate ? Object.values(eventsByDate) : [];

  // Events by time of day
  const eventsByHour = panicData?.reduce((acc: any, event: any) => {
    const hour = new Date(event.recorded_at).getHours();
    if (!acc[hour]) {
      acc[hour] = { hour: `${hour}:00`, count: 0 };
    }
    acc[hour].count += 1;
    return acc;
  }, {});

  const hourlyData = eventsByHour ? Object.values(eventsByHour) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Panic/SOS Event History</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Date Range Selector */}
          <div className="flex items-center gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={{ from: dateRange?.from, to: dateRange?.to }}
                  onSelect={(range: any) => {
                    if (range?.from) {
                      setDateRange({ from: range.from, to: range.to || range.from });
                    }
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            <div className="text-sm text-muted-foreground">
              Total Events: {panicData?.length || 0}
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8">Loading charts...</div>
          ) : !panicData || panicData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No panic/SOS events recorded in this period
            </div>
          ) : (
            <>
              {/* Events Over Time */}
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4">Events Over Time</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="critical" stackId="a" fill="hsl(var(--destructive))" name="Critical" />
                    <Bar dataKey="warning" stackId="a" fill="hsl(var(--warning))" name="Warning" />
                    <Bar dataKey="info" stackId="a" fill="hsl(var(--primary))" name="Info" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* Events by Time of Day */}
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4">Events by Time of Day</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="hsl(var(--primary))" 
                      name="Events"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              {/* Summary Statistics */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="p-4">
                  <div className="text-base font-semibold">Total Events</div>
                  <div className="text-xl font-bold">{panicData.length}</div>
                </Card>
                <Card className="p-4">
                  <div className="text-base font-semibold">Critical Events</div>
                  <div className="text-xl font-bold text-destructive">
                    {panicData.filter((e: any) =>
                      e.value?.status === 'critical' || e.value?.status === 'emergency'
                    ).length}
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="text-base font-semibold">Avg Per Day</div>
                  <div className="text-xl font-bold">
                    {chartData.length > 0
                      ? (panicData.length / chartData.length).toFixed(1)
                      : 0
                    }
                  </div>
                </Card>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
