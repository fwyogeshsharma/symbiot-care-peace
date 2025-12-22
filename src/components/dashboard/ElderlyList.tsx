import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="p-4 sm:p-6">
      <h3 className="text-base sm:text-lg font-semibold mb-4">{t('movement.elderlyList.title')}</h3>

      {elderlyPersons.length === 0 ? (
        <div className="text-center py-8">
          <User className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t('movement.elderlyList.noIndividuals')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {elderlyPersons.map((person) => (
            <div
              key={person.id}
              onClick={() => onSelectPerson(selectedPersonId === person.id ? null : person.id)}
              className={`border rounded-lg hover:shadow-md hover:border-primary/50 transition-all cursor-pointer overflow-hidden ${
                selectedPersonId === person.id
                  ? 'ring-2 ring-primary bg-primary/5 border-primary'
                  : 'hover:bg-accent/50'
              }`}
            >
              <div className="flex items-stretch">
                {/* Photo section - takes up 1/4 of the card */}
                <div className="w-1/4 min-w-[100px] relative bg-gradient-to-br from-primary/5 to-primary/10">
                  <Avatar className="w-full h-full rounded-none">
                    <AvatarImage
                      src={person.photo_url || undefined}
                      alt={person.full_name}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-2xl rounded-none">
                      {getInitials(person.full_name)}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Content section - takes up 3/4 of the card */}
                <div className="flex-1 p-4 flex flex-col justify-center">
                  <h4 className="font-semibold text-base leading-tight mb-3 break-words">
                    {person.full_name}
                  </h4>

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
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default ElderlyList;