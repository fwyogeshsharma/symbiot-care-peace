import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { extractNumericValue } from '@/lib/valueExtractor';

interface ElderlyPerson {
  id: string;
  full_name: string;
  photo_url: string | null;
  status: string;
  medical_conditions: string[] | null;
}

interface ElderlyListProps {
  elderlyPersons: ElderlyPerson[];
  selectedPersonId: string | null;
  onSelectPerson: (id: string | null) => void;
}

/**
 * Get health status for an elderly person
 * Returns status text and color based on active alerts
 */
const usePersonHealthStatus = (personId: string) => {
  return useQuery({
    queryKey: ['person-health-status', personId],
    queryFn: async () => {
      // Check for critical alerts
      const { data: criticalAlerts } = await supabase
        .from('alerts')
        .select('id, severity')
        .eq('elderly_person_id', personId)
        .eq('status', 'active')
        .eq('severity', 'critical')
        .limit(1);

      if (criticalAlerts && criticalAlerts.length > 0) {
        return {
          label: 'Emergency',
          color: 'text-destructive',
          variant: 'destructive' as const
        };
      }

      // Check for high/medium severity alerts
      const { data: warningAlerts } = await supabase
        .from('alerts')
        .select('id, severity')
        .eq('elderly_person_id', personId)
        .eq('status', 'active')
        .in('severity', ['high', 'medium'])
        .limit(1);

      if (warningAlerts && warningAlerts.length > 0) {
        return {
          label: 'Need Attention',
          color: 'text-warning',
          variant: 'secondary' as const
        };
      }

      return {
        label: 'Normal',
        color: 'text-success',
        variant: 'outline' as const
      };
    },
    refetchInterval: 15000, // Refresh every 15 seconds
  });
};

/**
 * Get live heart rate for an elderly person
 */
const usePersonHeartRate = (personId: string) => {
  return useQuery({
    queryKey: ['person-heart-rate', personId],
    queryFn: async () => {
      const { data } = await supabase
        .from('device_data')
        .select('value, recorded_at')
        .eq('elderly_person_id', personId)
        .eq('data_type', 'heart_rate')
        .order('recorded_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const heartRate = extractNumericValue(data[0].value);
        return heartRate;
      }

      return null;
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });
};

/**
 * Individual Person Card Component - With status and live heart rate
 * Shows health status and real-time heart rate data
 */
const PersonCard = ({ person, isSelected, onSelect }: any) => {
  const { t } = useTranslation();
  const { data: healthStatus } = usePersonHealthStatus(person.id);
  const { data: heartRate } = usePersonHeartRate(person.id);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div
      onClick={onSelect}
      className={`border rounded-lg hover:border-primary/50 transition-all cursor-pointer overflow-hidden ${
        isSelected
          ? 'ring-1 ring-primary bg-primary/5 border-primary'
          : 'hover:bg-accent/30'
      }`}
    >
      <div className="flex items-center gap-3 p-3">
        {/* Avatar */}
        <Avatar className="w-12 h-12 flex-shrink-0">
          <AvatarImage
            src={person.photo_url || undefined}
            alt={person.full_name}
            className="object-cover"
          />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {getInitials(person.full_name)}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm leading-tight mb-1 truncate">
            {person.full_name}
          </h4>

          {/* Health Status */}
          {healthStatus && (
            <Badge variant={healthStatus.variant} className="text-xs mb-1">
              {healthStatus.label}
            </Badge>
          )}

          {/* Live Heart Rate */}
          {heartRate && (
            <div className="flex items-center gap-1 mt-1">
              <Heart className="w-3 h-3 text-red-500 animate-pulse" />
              <span className="text-xs font-medium text-foreground">
                {heartRate} bpm
              </span>
            </div>
          )}

          {/* Medical Conditions - only show if no heart rate */}
          {!heartRate && person.medical_conditions && person.medical_conditions.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {person.medical_conditions.length} {person.medical_conditions.length > 1 ? t('movement.elderlyList.conditions') : t('movement.elderlyList.condition')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const ElderlyList = ({ elderlyPersons, selectedPersonId, onSelectPerson }: ElderlyListProps) => {
  const { t } = useTranslation();

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Monitored Individuals</h3>
        <Badge variant="outline" className="text-xs">
          {elderlyPersons.length}
        </Badge>
      </div>

      {elderlyPersons.length === 0 ? (
        <div className="flex items-center gap-3 py-4">
          <User className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <p className="text-sm text-muted-foreground">{t('movement.elderlyList.noIndividuals')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {elderlyPersons.map((person) => (
            <PersonCard
              key={person.id}
              person={person}
              isSelected={selectedPersonId === person.id}
              onSelect={() => onSelectPerson(selectedPersonId === person.id ? null : person.id)}
            />
          ))}
        </div>
      )}
    </Card>
  );
};

export default ElderlyList;