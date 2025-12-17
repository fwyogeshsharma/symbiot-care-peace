import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Header from '@/components/layout/Header';
import {
  Heart,
  Activity,
  Moon,
  Pill,
  AlertTriangle,
  TrendingUp,
  Calendar as CalendarIcon,
  Download,
  FileText,
  BarChart3,
  Droplets,
  Wind,
  Home,
  Clock,
  Target
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ReportViewer } from '@/components/reports/ReportViewer';
import { ReportSubscriptionManager } from '@/components/reports/ReportSubscriptionManager';
import { Footer } from '@/components/Footer';

const Reports = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });
  const [selectedPerson, setSelectedPerson] = useState<string>('all');
  const [currentReport, setCurrentReport] = useState<string | null>(null);
  const [reportViewerOpen, setReportViewerOpen] = useState(false);

  // Fetch elderly persons
  const { data: elderlyPersons = [] } = useQuery({
    queryKey: ['elderly-persons', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .rpc('get_accessible_elderly_persons', { _user_id: user.id });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Auto-select person when data loads
  useEffect(() => {
    if (elderlyPersons.length > 0 && selectedPerson === 'all') {
      // Check if logged-in user is in the list
      const loggedInPerson = elderlyPersons.find((person: any) => person.id === user?.id);

      if (loggedInPerson) {
        // Select the logged-in user if they're in the list
        setSelectedPerson(loggedInPerson.id);
      } else if (elderlyPersons.length === 1) {
        // If only one person, select them
        setSelectedPerson(elderlyPersons[0].id);
      } else {
        // Otherwise select the first person in the list
        setSelectedPerson(elderlyPersons[0].id);
      }
    }
  }, [elderlyPersons, user?.id]);

  const reportCategories = [
    {
      id: 'daily',
      title: t('reports.categories.daily', { defaultValue: 'Daily Summary' }),
      icon: Clock,
      description: t('reports.categories.dailyDesc', { defaultValue: 'End of day comprehensive overview for families' }),
      reports: [
        {
          name: t('reports.daily.eodSummary', { defaultValue: 'End of Day Summary' }),
          description: t('reports.daily.eodSummaryDesc', { defaultValue: 'Complete daily health and activity overview for family members' })
        },
      ]
    },
    {
      id: 'health',
      title: t('reports.categories.health', { defaultValue: 'Health Summary' }),
      icon: Heart,
      description: t('reports.categories.healthDesc', { defaultValue: 'Vital signs and health metrics overview' }),
      reports: [
        {
          name: t('reports.health.vitalTrends', { defaultValue: 'Vital Signs Trends' }),
          description: t('reports.health.vitalTrendsDesc', { defaultValue: 'Heart rate, blood pressure, oxygen levels over time' })
        },
        {
          name: t('reports.health.anomalies', { defaultValue: 'Health Anomalies' }),
          description: t('reports.health.anomaliesDesc', { defaultValue: 'Out-of-range readings and concerning patterns' })
        },
        {
          name: t('reports.health.bloodSugar', { defaultValue: 'Blood Sugar Analysis' }),
          description: t('reports.health.bloodSugarDesc', { defaultValue: 'Glucose levels and patterns' })
        },
      ]
    },
    {
      id: 'activity',
      title: t('reports.categories.activity', { defaultValue: 'Activity & Mobility' }),
      icon: Activity,
      description: t('reports.categories.activityDesc', { defaultValue: 'Movement patterns and physical activity' }),
      reports: [
        {
          name: t('reports.activity.dailyActivity', { defaultValue: 'Daily Activity Summary' }),
          description: t('reports.activity.dailyActivityDesc', { defaultValue: 'Steps, active time, and sedentary periods' })
        },
        {
          name: t('reports.activity.movementPatterns', { defaultValue: 'Movement Patterns' }),
          description: t('reports.activity.movementPatternsDesc', { defaultValue: 'Room transitions and mobility analysis' })
        },
        {
          name: t('reports.activity.fallIncidents', { defaultValue: 'Fall Incidents' }),
          description: t('reports.activity.fallIncidentsDesc', { defaultValue: 'Fall detection events and risk analysis' })
        },
      ]
    },
    {
      id: 'sleep',
      title: t('reports.categories.sleep', { defaultValue: 'Sleep Analysis' }),
      icon: Moon,
      description: t('reports.categories.sleepDesc', { defaultValue: 'Sleep quality and patterns' }),
      reports: [
        {
          name: t('reports.sleep.quality', { defaultValue: 'Sleep Quality Report' }),
          description: t('reports.sleep.qualityDesc', { defaultValue: 'Duration, quality scores, and disturbances' })
        },
        {
          name: t('reports.sleep.patterns', { defaultValue: 'Sleep Patterns' }),
          description: t('reports.sleep.patternsDesc', { defaultValue: 'Sleep stages and cycle analysis' })
        },
      ]
    },
    {
      id: 'medication',
      title: t('reports.categories.medication', { defaultValue: 'Medication Adherence' }),
      icon: Pill,
      description: t('reports.categories.medicationDesc', { defaultValue: 'Medication compliance tracking' }),
      reports: [
        {
          name: t('reports.medication.adherence', { defaultValue: 'Adherence Report' }),
          description: t('reports.medication.adherenceDesc', { defaultValue: 'Doses taken vs missed' })
        },
        {
          name: t('reports.medication.timing', { defaultValue: 'Timing Analysis' }),
          description: t('reports.medication.timingDesc', { defaultValue: 'Medication schedule compliance' })
        },
      ]
    },
    {
      id: 'alerts',
      title: t('reports.categories.alerts', { defaultValue: 'Alert Summary' }),
      icon: AlertTriangle,
      description: t('reports.categories.alertsDesc', { defaultValue: 'Alert history and response times' }),
      reports: [
        {
          name: t('reports.alerts.history', { defaultValue: 'Alert History' }),
          description: t('reports.alerts.historyDesc', { defaultValue: 'All alerts with resolution status' })
        },
        {
          name: t('reports.alerts.emergency', { defaultValue: 'Emergency Events' }),
          description: t('reports.alerts.emergencyDesc', { defaultValue: 'Panic button and critical alerts' })
        },
        {
          name: t('reports.alerts.responseTime', { defaultValue: 'Response Time Analysis' }),
          description: t('reports.alerts.responseTimeDesc', { defaultValue: 'Average time to acknowledge and resolve' })
        },
      ]
    },
    {
      id: 'environment',
      title: t('reports.categories.environment', { defaultValue: 'Environmental Safety' }),
      icon: Home,
      description: t('reports.categories.environmentDesc', { defaultValue: 'Home environment conditions' }),
      reports: [
        {
          name: t('reports.environment.airQuality', { defaultValue: 'Air Quality Report' }),
          description: t('reports.environment.airQualityDesc', { defaultValue: 'Temperature, humidity, and air quality trends' })
        },
        {
          name: t('reports.environment.comfort', { defaultValue: 'Comfort Analysis' }),
          description: t('reports.environment.comfortDesc', { defaultValue: 'Optimal vs actual environmental conditions' })
        },
      ]
    },
    {
      id: 'wellness',
      title: t('reports.categories.wellness', { defaultValue: 'Wellness Score' }),
      icon: Target,
      description: t('reports.categories.wellnessDesc', { defaultValue: 'Independent living quality assessment' }),
      reports: [
        {
          name: t('reports.wellness.ilqTrends', { defaultValue: 'ILQ Score Trends' }),
          description: t('reports.wellness.ilqTrendsDesc', { defaultValue: 'Independence quality over time' })
        },
        {
          name: t('reports.wellness.factors', { defaultValue: 'Contributing Factors' }),
          description: t('reports.wellness.factorsDesc', { defaultValue: 'Key metrics affecting wellness score' })
        },
      ]
    },
    {
      id: 'comparative',
      title: t('reports.categories.comparative', { defaultValue: 'Comparative Analysis' }),
      icon: TrendingUp,
      description: t('reports.categories.comparativeDesc', { defaultValue: 'Period-over-period comparisons' }),
      reports: [
        {
          name: t('reports.comparative.weekly', { defaultValue: 'Week-over-Week' }),
          description: t('reports.comparative.weeklyDesc', { defaultValue: 'Weekly comparison of key metrics' })
        },
        {
          name: t('reports.comparative.monthly', { defaultValue: 'Month-over-Month' }),
          description: t('reports.comparative.monthlyDesc', { defaultValue: 'Monthly trends and changes' })
        },
      ]
    },
  ];

  const handleExport = (reportType: string) => {
    // TODO: Implement export functionality
    console.log('Exporting report:', reportType);
  };

  const handleGenerate = (reportName: string) => {
    setCurrentReport(reportName);
    setReportViewerOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Report Viewer Dialog */}
      <ReportViewer
        open={reportViewerOpen}
        onOpenChange={setReportViewerOpen}
        reportName={currentReport || ''}
        selectedPerson={selectedPerson}
        dateRange={dateRange}
      />

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">
            {t('reports.title', { defaultValue: 'Reports' })}
          </h1>
          <p className="text-muted-foreground">
            {t('reports.subtitle', { defaultValue: 'Generate comprehensive reports and analytics' })}
          </p>
        </div>

        {/* Filters Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">
              {t('reports.filters', { defaultValue: 'Report Filters' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              {/* Person Selection */}
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">
                  {t('reports.selectPerson', { defaultValue: 'Select Person' })}
                </label>
                <Select value={selectedPerson} onValueChange={setSelectedPerson}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t('reports.allPersons', { defaultValue: 'All Persons' })}
                    </SelectItem>
                    {elderlyPersons.map((person: any) => (
                      <SelectItem key={person.id} value={person.id}>
                        {person.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range */}
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">
                  {t('reports.dateRange', { defaultValue: 'Date Range' })}
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !dateRange && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, 'LLL dd, y')} -{' '}
                            {format(dateRange.to, 'LLL dd, y')}
                          </>
                        ) : (
                          format(dateRange.from, 'LLL dd, y')
                        )
                      ) : (
                        <span>{t('reports.pickDate', { defaultValue: 'Pick a date range' })}</span>
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
                        if (range?.from && range?.to) {
                          setDateRange({ from: range.from, to: range.to });
                        }
                      }}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Quick Ranges */}
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">
                  {t('reports.quickSelect', { defaultValue: 'Quick Select' })}
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDateRange({
                      from: new Date(new Date().setDate(new Date().getDate() - 7)),
                      to: new Date(),
                    })}
                  >
                    {t('reports.last7Days', { defaultValue: 'Last 7 Days' })}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDateRange({
                      from: new Date(new Date().setDate(new Date().getDate() - 30)),
                      to: new Date(),
                    })}
                  >
                    {t('reports.last30Days', { defaultValue: 'Last 30 Days' })}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDateRange({
                      from: new Date(new Date().setMonth(new Date().getMonth() - 3)),
                      to: new Date(),
                    })}
                  >
                    {t('reports.last3Months', { defaultValue: 'Last 3 Months' })}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report Categories */}
        <Tabs defaultValue="daily" className="space-y-6">
          <TabsList className="grid grid-cols-5 grid-rows-2 w-full h-auto gap-2 p-2">
            {reportCategories.map((category) => {
              const Icon = category.icon;
              return (
                <TabsTrigger key={category.id} value={category.id} className="gap-2">
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{category.title}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {reportCategories.map((category) => (
            <TabsContent key={category.id} value={category.id}>
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {React.createElement(category.icon, { className: 'w-5 h-5' })}
                        {category.title}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {category.description}
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport(category.id)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {t('reports.exportAll', { defaultValue: 'Export All' })}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {category.reports.map((report, index) => (
                      <Card key={index} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            {report.name}
                          </CardTitle>
                          <CardDescription className="text-sm">
                            {report.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={() => handleGenerate(report.name)}
                            >
                              <BarChart3 className="w-4 h-4 mr-2" />
                              {t('reports.generate', { defaultValue: 'Generate' })}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleExport(report.name)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* Email Subscription for Daily Reports */}
        <div className="max-w-3xl mt-6">
          <ReportSubscriptionManager selectedPerson={selectedPerson} />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Reports;
