import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Share2, Trash2, UserPlus } from 'lucide-react';

interface SharedUser {
  id: string;
  email: string;
  full_name: string | null;
  relationship: string | null;
  elderly_person_name: string;
  elderly_person_id: string;
}

interface DataSharingProps {
  userId: string;
}

export default function DataSharing({ userId }: DataSharingProps) {
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch elderly persons that the current user owns
  const { data: elderlyPersons = [] } = useQuery({
    queryKey: ['owned-elderly-persons', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('elderly_persons')
        .select('id, full_name')
        .eq('user_id', userId);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  // Fetch current shared users
  const { data: sharedUsers = [], isLoading } = useQuery({
    queryKey: ['shared-users', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('relative_assignments')
        .select(`
          id,
          relationship,
          elderly_person_id,
          elderly_persons!inner(full_name, user_id),
          profiles!relative_assignments_relative_user_id_fkey(email, full_name)
        `)
        .eq('elderly_persons.user_id', userId);
      
      if (error) throw error;
      
      return (data || []).map((item: any) => ({
        id: item.id,
        email: item.profiles?.email || '',
        full_name: item.profiles?.full_name || null,
        relationship: item.relationship,
        elderly_person_name: item.elderly_persons?.full_name || '',
        elderly_person_id: item.elderly_person_id,
      }));
    },
    enabled: !!userId,
  });

  // Share data mutation
  const shareMutation = useMutation({
    mutationFn: async () => {
      if (!email) {
        throw new Error('Email is required');
      }

      if (elderlyPersons.length === 0) {
        throw new Error('No elderly persons found to share');
      }

      // Look up user by email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (profileError || !profile) {
        throw new Error('User not found with this email');
      }

      // Create assignments for all elderly persons owned by the user
      const assignments = elderlyPersons.map((person) => ({
        relative_user_id: profile.id,
        elderly_person_id: person.id,
        relationship: relationship || 'shared',
      }));

      // Check for existing assignments and filter them out
      const { data: existing } = await supabase
        .from('relative_assignments')
        .select('elderly_person_id')
        .eq('relative_user_id', profile.id)
        .in('elderly_person_id', elderlyPersons.map(p => p.id));

      const existingIds = new Set(existing?.map(e => e.elderly_person_id) || []);
      const newAssignments = assignments.filter(a => !existingIds.has(a.elderly_person_id));

      if (newAssignments.length === 0) {
        throw new Error('Access already granted to this user for all persons');
      }

      // Create new assignments
      const { error: assignError } = await supabase
        .from('relative_assignments')
        .insert(newAssignments);

      if (assignError) throw assignError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-users'] });
      setEmail('');
      setRelationship('');
      toast({
        title: 'Access granted',
        description: 'User can now view monitoring data',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to share',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Revoke access mutation
  const revokeMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from('relative_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-users'] });
      toast({
        title: 'Access revoked',
        description: 'User can no longer view monitoring data',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to revoke',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          Data Sharing
        </CardTitle>
        <CardDescription>
          Share monitoring data with family members or other caregivers. Access will be granted to all your monitored persons.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Share form */}
        <div className="space-y-4 p-4 border rounded-lg">
          <h3 className="font-semibold flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Grant Access
          </h3>

          <div className="space-y-2">
            <Label htmlFor="email">User Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="relationship">Relationship (Optional)</Label>
            <Input
              id="relationship"
              type="text"
              placeholder="e.g., Family, Friend, Caregiver"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
            />
          </div>

          <Button
            onClick={() => shareMutation.mutate()}
            disabled={!email || shareMutation.isPending}
            className="w-full"
          >
            {shareMutation.isPending ? 'Granting Access...' : 'Grant Access'}
          </Button>
        </div>

        {/* Shared users list */}
        <div className="space-y-4">
          <h3 className="font-semibold">Current Access</h3>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : sharedUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data sharing active</p>
          ) : (
            <div className="space-y-2">
              {sharedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{user.full_name || user.email}</p>
                    <p className="text-sm text-muted-foreground">
                      {user.elderly_person_name}
                      {user.relationship && ` • ${user.relationship}`}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => revokeMutation.mutate(user.id)}
                    disabled={revokeMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
