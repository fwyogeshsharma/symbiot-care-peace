import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ZoneVisit } from '@/lib/positionUtils';
import { format } from 'date-fns';
import { ArrowUpDown, Clock, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ZoneHistoryProps {
  visits: ZoneVisit[];
}

type SortField = 'entryTime' | 'zoneName' | 'duration';
type SortOrder = 'asc' | 'desc';

export const ZoneHistory = ({ visits = [] }: ZoneHistoryProps) => {
  const { t } = useTranslation();
  const [sortField, setSortField] = useState<SortField>('entryTime');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getDurationColor = (seconds: number) => {
    // Color coding based on duration
    if (seconds < 60) return 'outline'; // Very short stays
    if (seconds < 300) return 'secondary'; // < 5 minutes
    if (seconds < 1800) return 'default'; // < 30 minutes
    return 'default'; // Long stays
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedVisits = [...visits].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case 'zoneName':
        comparison = a.zoneName.localeCompare(b.zoneName);
        break;
      case 'duration':
        comparison = a.duration - b.duration;
        break;
      case 'entryTime':
      default:
        comparison = a.entryTime.getTime() - b.entryTime.getTime();
        break;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  if (visits.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t('tracking.zoneHistory.title', 'Zone Visit History')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            {t('tracking.zoneHistory.noData', 'No zone visit history available for this time period')}
          </p>
          <p className="text-xs text-center text-muted-foreground mt-2">
            Create a floor plan and populate device data from the Dashboard to see zone visit history.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          {t('tracking.zoneHistory.title', 'Zone Visit History')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('tracking.zoneHistory.description', 'Detailed record of zone entries and exits')}
        </p>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Fixed Header Table */}
          <div className="border-b overflow-hidden">
            <div className="overflow-y-scroll" style={{ scrollbarGutter: 'stable' }}>
              <Table className="table-fixed">
                <colgroup>
                  <col style={{ width: '35%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '25%' }} />
                </colgroup>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('zoneName')}
                        className="h-8 px-2 lg:px-3"
                      >
                        {t('tracking.zoneHistory.zone', 'Zone')}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('entryTime')}
                        className="h-8 px-2 lg:px-3"
                      >
                        {t('tracking.zoneHistory.entryTime', 'Entry Time')}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>{t('tracking.zoneHistory.exitTime', 'Exit Time')}</TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('duration')}
                        className="h-8 px-2 lg:px-3"
                      >
                        {t('tracking.zoneHistory.duration', 'Duration')}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
              </Table>
            </div>
          </div>

          {/* Scrollable Body Table */}
          <div className="overflow-auto h-[400px]">
            <Table className="table-fixed">
              <colgroup>
                <col style={{ width: '35%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '25%' }} />
              </colgroup>
              <TableBody>
                {sortedVisits.map((visit) => (
                  <TableRow key={visit.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{visit.zoneName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(visit.entryTime, 'HH:mm:ss')}
                    </TableCell>
                    <TableCell>
                      {format(visit.exitTime, 'HH:mm:ss')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getDurationColor(visit.duration)}>
                        {formatDuration(visit.duration)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
