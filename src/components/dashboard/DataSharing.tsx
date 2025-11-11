import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Share2, Trash2, UserPlus, Edit2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

// Validation schema for data sharing inputs
const sharingSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(255, 'Email must be less than 255 characters'),
  relationship: z.string().trim().max(100, 'Relationship must be less than 100 characters').optional().or(z.literal(''))
});

export default function DataSharing({ userId }: DataSharingProps) {
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState('');
  const [editingUser, setEditingUser] = useState<SharedUser | null>(null);
  const [editRelationship, setEditRelationship] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch elderly persons that the current user OWNS (not just has access to)
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
      // First get assignments with elderly_persons info
      const { data: assignments, error: assignmentsError } = await supabase
        .from('relative_assignments')
        .select(`
          id,
          relationship,
          elderly_person_id,
          relative_user_id,
          elderly_persons!inner(full_name, user_id)
        `)
        .eq('elderly_persons.user_id', userId);
      
      if (assignmentsError) throw assignmentsError;
      if (!assignments || assignments.length === 0) return [];

      // Get unique user IDs
      const userIds = [...new Set(assignments.map((a: any) => a.relative_user_id))];

      // Fetch profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);
      
      if (profilesError) throw profilesError;

      // Create a map for quick profile lookup
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return assignments.map((item: any) => {
        const profile = profileMap.get(item.relative_user_id);
        return {
          id: item.id,
          email: profile?.email || '',
          full_name: profile?.full_name || null,
          relationship: item.relationship,
          elderly_person_name: item.elderly_persons?.full_name || '',
          elderly_person_id: item.elderly_person_id,
        };
      });
    },
    enabled: !!userId,
  });

  // Share data mutation
  const shareMutation = useMutation({
    mutationFn: async () => {
      // Validate inputs
      const validation = sharingSchema.safeParse({ email, relationship });
      if (!validation.success) {
        throw new Error(validation.error.errors[0].message);
      }

      if (elderlyPersons.length === 0) {
        throw new Error('No elderly persons found to share');
      }

      // Use secure lookup function to find user by email
      const { data: targetUserId, error: profileError } = await supabase
        .rpc('lookup_user_by_email', { _email: validation.data.email });

      if (profileError || !targetUserId) {
        throw new Error('User not found with this email');
      }

      // Create assignments for all elderly persons owned by the user
      const assignments = elderlyPersons.map((person) => ({
        relative_user_id: targetUserId,
        elderly_person_id: person.id,
        relationship: validation.data.relationship || 'shared',
      }));

      // Check for existing assignments and filter them out
      const { data: existing } = await supabase
        .from('relative_assignments')
        .select('elderly_person_id')
        .eq('relative_user_id', targetUserId)
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

  // Update access mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, relationship }: { id: string; relationship: string }) => {
      // Validate relationship input
      const validation = z.string().trim().max(100, 'Relationship must be less than 100 characters').safeParse(relationship);
      if (!validation.success) {
        throw new Error(validation.error.errors[0].message);
      }

      const { error } = await supabase
        .from('relative_assignments')
        .update({ relationship: validation.data })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-users'] });
      setEditingUser(null);
      setEditRelationship('');
      toast({
        title: 'Access updated',
        description: 'Relationship has been updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update',
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

  const handleEditClick = (user: SharedUser) => {
    setEditingUser(user);
    setEditRelationship(user.relationship || '');
  };

  const handleUpdateAccess = () => {
    if (editingUser) {
      updateMutation.mutate({
        id: editingUser.id,
        relationship: editRelationship,
      });
    }
  };

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
        <div className="space-y-4 p-4 border rounded-lg" data-tour="data-sharing-form">
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
        <div className="space-y-4" data-tour="data-sharing-list">
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
                  <div className="space-y-1 flex-1">
                    <p className="font-medium">{user.full_name || user.email}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    <p className="text-sm text-muted-foreground">
                      Monitoring: {user.elderly_person_name}
                      {user.relationship && ` • ${user.relationship}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2" data-tour="data-sharing-actions">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditClick(user)}
                      disabled={updateMutation.isPending || revokeMutation.isPending}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => revokeMutation.mutate(user.id)}
                      disabled={revokeMutation.isPending || updateMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Access</DialogTitle>
              <DialogDescription>
                Update the relationship for {editingUser?.full_name || editingUser?.email}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-relationship">Relationship</Label>
                <Input
                  id="edit-relationship"
                  type="text"
                  placeholder="e.g., Family, Friend, Caregiver"
                  value={editRelationship}
                  onChange={(e) => setEditRelationship(e.target.value)}
                />
              </div>
              <div className="text-sm text-muted-foreground">
                Monitoring: {editingUser?.elderly_person_name}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditingUser(null)}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateAccess}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? 'Updating...' : 'Update Access'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
