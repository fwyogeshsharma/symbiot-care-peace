import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Printer, X } from 'lucide-react';
import { VitalSignsTrendsReport } from './VitalSignsTrendsReport';
import { DailyActivityReport } from './DailyActivityReport';
import { MedicationAdherenceReport } from './MedicationAdherenceReport';
import { MedicationTimingAnalysisReport } from './MedicationTimingAnalysisReport';
import { AlertHistoryReport } from './AlertHistoryReport';
import { EmergencyEventsReport } from './EmergencyEventsReport';
import { ResponseTimeAnalysisReport } from './ResponseTimeAnalysisReport';
import { HealthAnomaliesReport } from './HealthAnomaliesReport';
import { BloodSugarAnalysisReport } from './BloodSugarAnalysisReport';
import { SleepQualityReport } from './SleepQualityReport';
import { SleepPatternsReport } from './SleepPatternsReport';
import { AirQualityReport } from './AirQualityReport';
import { EnvironmentalComfortReport } from './EnvironmentalComfortReport';
import { ILQScoreTrendsReport } from './ILQScoreTrendsReport';
import { ContributingFactorsReport } from './ContributingFactorsReport';
import { WeekOverWeekReport } from './WeekOverWeekReport';
import { MonthOverMonthReport } from './MonthOverMonthReport';
import { EndOfDayReport } from './EndOfDayReport';
import { FallIncidentsReport } from './FallIncidentsReport';
import { EnvironmentalSafetyReport } from './EnvironmentalSafetyReport';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { exportReportById } from '@/lib/reportExport';
import { toast } from 'sonner';

interface ReportViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportName: string;
  selectedPerson: string;
  dateRange: { from: Date; to: Date };
}

export const ReportViewer = ({
  open,
  onOpenChange,
  reportName,
  selectedPerson,
  dateRange,
}: ReportViewerProps) => {
  const { t } = useTranslation();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      toast.info(t('reports.preparingExport', { defaultValue: 'Preparing report for export...' }));

      console.log('ReportViewer: Starting export for', reportName);

      // Wait for report to be fully rendered with data
      await exportReportById('report-content', reportName, 'pdf', 1500);

      console.log('ReportViewer: Export completed');

      toast.success(t('reports.exportSuccess', { defaultValue: 'Report exported successfully!' }));
    } catch (error) {
      console.error('ReportViewer: Export error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(t('reports.exportError', { defaultValue: 'Failed to export report. Please try again.' }) + ` (${errorMessage})`);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const renderReport = () => {
    console.log('Rendering report:', reportName);
    switch (reportName) {
      // Special Reports
      case 'End of Day Summary':
      case t('reports.special.eodSummary'):
      case t('reports.daily.eodSummary'):
        return <EndOfDayReport selectedPerson={selectedPerson} dateRange={dateRange} />;

      // Health Summary Reports
      case 'Vital Signs Trends':
      case t('reports.health.vitalTrends'):
        return <VitalSignsTrendsReport selectedPerson={selectedPerson} dateRange={dateRange} />;

      case 'Health Anomalies':
      case t('reports.health.anomalies'):
        return <HealthAnomaliesReport selectedPerson={selectedPerson} dateRange={dateRange} />;

      case 'Blood Sugar Analysis':
      case t('reports.health.bloodSugar'):
        return <BloodSugarAnalysisReport selectedPerson={selectedPerson} dateRange={dateRange} />;

      // Activity & Mobility Reports
      case 'Daily Activity Summary':
      case t('reports.activity.dailyActivity'):
        return <DailyActivityReport selectedPerson={selectedPerson} dateRange={dateRange} />;

      case 'Movement Patterns':
      case t('reports.activity.movementPatterns'):
        return <DailyActivityReport selectedPerson={selectedPerson} dateRange={dateRange} />;

      case 'Fall Incidents':
      case t('reports.activity.fallIncidents'):
        return <FallIncidentsReport selectedPerson={selectedPerson} dateRange={dateRange} />;

      // Sleep Analysis Reports
      case 'Sleep Quality Report':
      case t('reports.sleep.quality'):
        return <SleepQualityReport selectedPerson={selectedPerson} dateRange={dateRange} />;

      case 'Sleep Patterns':
      case t('reports.sleep.patterns'):
        return <SleepPatternsReport selectedPerson={selectedPerson} dateRange={dateRange} />;

      // Medication Reports
      case 'Adherence Report':
      case t('reports.medication.adherence'):
        return <MedicationAdherenceReport selectedPerson={selectedPerson} dateRange={dateRange} />;

      case 'Timing Analysis':
      case t('reports.medication.timing'):
        return <MedicationTimingAnalysisReport selectedPerson={selectedPerson} dateRange={dateRange} />;

      // Alert Summary Reports
      case 'Alert History':
      case t('reports.alerts.history'):
        return <AlertHistoryReport selectedPerson={selectedPerson} dateRange={dateRange} />;

      case 'Emergency Events':
      case t('reports.alerts.emergency'):
        return <EmergencyEventsReport selectedPerson={selectedPerson} dateRange={dateRange} />;

      case 'Response Time Analysis':
      case t('reports.alerts.responseTime'):
        return <ResponseTimeAnalysisReport selectedPerson={selectedPerson} dateRange={dateRange} />;

      // Environmental Safety Reports
      case 'Environmental Safety Assessment':
      case t('reports.environment.safetyAssessment'):
        return <EnvironmentalSafetyReport selectedPerson={selectedPerson} dateRange={dateRange} />;

      case 'Air Quality Report':
      case t('reports.environment.airQuality'):
        return <AirQualityReport selectedPerson={selectedPerson} dateRange={dateRange} />;

      case 'Comfort Analysis':
      case t('reports.environment.comfort'):
        return <EnvironmentalComfortReport selectedPerson={selectedPerson} dateRange={dateRange} />;

      // Wellness Score Reports
      case 'ILQ Score Trends':
      case t('reports.wellness.ilqTrends'):
        return <ILQScoreTrendsReport selectedPerson={selectedPerson} dateRange={dateRange} />;

      case 'Contributing Factors':
      case t('reports.wellness.factors'):
        return <ContributingFactorsReport selectedPerson={selectedPerson} dateRange={dateRange} />;

      // Comparative Analysis Reports
      case 'Week-over-Week':
      case t('reports.comparative.weekly'):
        return <WeekOverWeekReport selectedPerson={selectedPerson} dateRange={dateRange} />;

      case 'Month-over-Month':
      case t('reports.comparative.monthly'):
        return <MonthOverMonthReport selectedPerson={selectedPerson} dateRange={dateRange} />;

      default:
        return (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {t('reports.underDevelopment', { defaultValue: 'This report is under development. Please check back later.' })}
            </p>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl">{reportName}</DialogTitle>
              <DialogDescription>
                {t('reports.subtitle', { defaultValue: 'Comprehensive analysis and insights' })}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                title={t('reports.printReport', { defaultValue: 'Print Report' })}
              >
                <Printer className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={isExporting}
                title={t('reports.exportToPDF', { defaultValue: 'Export to PDF' })}
              >
                <Download className="w-4 h-4" />
                {isExporting && <span className="ml-2">{t('common.loading', { defaultValue: 'Loading...' })}</span>}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div id="report-content" className="mt-6">
          {renderReport()}
        </div>
      </DialogContent>
    </Dialog>
  );
};
