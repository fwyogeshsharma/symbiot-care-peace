import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ElderlyPhotoUpload } from './ElderlyPhotoUpload';

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

const ElderlyList = ({ elderlyPersons, selectedPersonId, onSelectPerson }: ElderlyListProps) => {
  const { t } = useTranslation();

  return (
    <Card className="p-4 sm:p-6">
      <h3 className="text-base sm:text-lg font-semibold mb-4">{t('movement.elderlyList.title')}</h3>

      {elderlyPersons.length === 0 ? (
        <div className="text-center py-8">
          <User className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t('movement.elderlyList.noIndividuals')}</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {elderlyPersons.map((person) => (
            <div
              key={person.id}
              onClick={() => onSelectPerson(selectedPersonId === person.id ? null : person.id)}
              className={`border rounded-lg p-4 hover:shadow-md hover:border-primary/50 transition-all cursor-pointer min-w-[280px] flex-1 ${
                selectedPersonId === person.id
                  ? 'ring-2 ring-primary bg-primary/5 border-primary'
                  : 'hover:bg-accent/50'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <ElderlyPhotoUpload
                  elderlyPersonId={person.id}
                  currentPhotoUrl={person.photo_url}
                  fullName={person.full_name}
                  size="md"
                  editable={true}
                />

                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-base leading-tight mb-1 break-words">
                    {person.full_name}
                  </h4>
                </div>
              </div>

              <div className="flex items-center flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className={`text-xs whitespace-nowrap ${person.status === 'active' ? 'border-success text-success' : 'border-muted'}`}
                >
                  {t(`movement.elderlyList.status.${person.status}`, { defaultValue: person.status })}
                </Badge>

                {person.medical_conditions && person.medical_conditions.length > 0 && (
                  <Badge variant="secondary" className="text-xs whitespace-nowrap">
                    {person.medical_conditions.length} {person.medical_conditions.length > 1 ? t('movement.elderlyList.conditions') : t('movement.elderlyList.condition')}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default ElderlyList;