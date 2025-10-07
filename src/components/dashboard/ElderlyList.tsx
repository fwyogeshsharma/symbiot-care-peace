import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User } from 'lucide-react';

interface ElderlyPerson {
  id: string;
  full_name: string;
  photo_url: string | null;
  status: string;
  medical_conditions: string[] | null;
}

interface ElderlyListProps {
  elderlyPersons: ElderlyPerson[];
}

const ElderlyList = ({ elderlyPersons }: ElderlyListProps) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Monitored Individuals</h3>
      
      {elderlyPersons.length === 0 ? (
        <div className="text-center py-8">
          <User className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No individuals are being monitored yet.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {elderlyPersons.map((person) => (
            <div 
              key={person.id}
              className="border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={person.photo_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {getInitials(person.full_name)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <h4 className="font-semibold">{person.full_name}</h4>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <Badge 
                      variant="outline" 
                      className={person.status === 'active' ? 'border-success text-success' : 'border-muted'}
                    >
                      {person.status}
                    </Badge>
                    
                    {person.medical_conditions && person.medical_conditions.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {person.medical_conditions.length} conditions
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