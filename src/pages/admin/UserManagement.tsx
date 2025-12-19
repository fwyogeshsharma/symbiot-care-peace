import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { UserX, UserCheck, Trash2, Shield, Key, Copy, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  blocked_at: string | null;
  created_at: string;
  roles: string[];
}

export default function UserManagement() {
  const { userRole } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [actionDialog, setActionDialog] = useState<{ open: boolean; action: 'block' | 'unblock' | 'delete' | null; userId: string | null; userName: string | null }>({
    open: false,
    action: null,
    userId: null,
    userName: null,
  });

  const [passwordDialog, setPasswordDialog] = useState<{ open: boolean; userId: string | null; userName: string | null; email: string | null }>({
    open: false,
    userId: null,
    userName: null,
    email: null,
  });

  const [newPassword, setNewPassword] = useState('');

  // Redirect if not super admin
  useEffect(() => {
    if (userRole && userRole !== 'super_admin') {
      navigate('/dashboard');
    }
  }, [userRole, navigate]);

  const { data: users, isLoading } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone, blocked_at, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Get all user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combine the data
      const usersWithRoles: UserProfile[] = profiles.map(profile => ({
        ...profile,
        roles: roles.filter(r => r.user_id === profile.id).map(r => r.role)
      }));

      return usersWithRoles;
    },
  });

  const manageUserMutation = useMutation({
    mutationFn: async ({ action, userId }: { action: 'block' | 'unblock' | 'delete'; userId: string }) => {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action, userId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      const actionText = variables.action === 'delete' ? 'deleted' : variables.action === 'block' ? 'blocked' : 'unblocked';
      toast({
        title: 'Success',
        description: `User ${actionText} successfully`,
      });
      setActionDialog({ open: false, action: null, userId: null, userName: null });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to perform action',
        variant: 'destructive',
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'reset-password', userId, password },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Password reset successfully',
      });
      setPasswordDialog({ open: false, userId: null, userName: null, email: null });
      setNewPassword('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reset password',
        variant: 'destructive',
      });
    },
  });

  const handleAction = (action: 'block' | 'unblock' | 'delete', userId: string, userName: string) => {
    setActionDialog({ open: true, action, userId, userName });
  };

  const confirmAction = () => {
    if (actionDialog.action && actionDialog.userId) {
      manageUserMutation.mutate({ action: actionDialog.action, userId: actionDialog.userId });
    }
  };

  const generatePassword = () => {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setNewPassword(password);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(newPassword);
      toast({
        title: 'Copied',
        description: 'Password copied to clipboard',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to copy password',
        variant: 'destructive',
      });
    }
  };

  const handleResetPassword = (userId: string, userName: string, email: string) => {
    setPasswordDialog({ open: true, userId, userName, email });
    generatePassword(); // Auto-generate a password when dialog opens
  };

  const confirmPasswordReset = () => {
    if (passwordDialog.userId && newPassword) {
      resetPasswordMutation.mutate({ userId: passwordDialog.userId, password: newPassword });
    }
  };

  const getActionDialogContent = () => {
    switch (actionDialog.action) {
      case 'block':
        return {
          title: 'Block User',
          description: `Are you sure you want to block ${actionDialog.userName}? They will not be able to log in until unblocked.`,
          actionText: 'Block User',
        };
      case 'unblock':
        return {
          title: 'Unblock User',
          description: `Are you sure you want to unblock ${actionDialog.userName}? They will be able to log in again.`,
          actionText: 'Unblock User',
        };
      case 'delete':
        return {
          title: 'Delete User',
          description: `Are you sure you want to permanently delete ${actionDialog.userName}? This will remove all their data and cannot be undone.`,
          actionText: 'Delete Permanently',
        };
      default:
        return { title: '', description: '', actionText: '' };
    }
  };

  const dialogContent = getActionDialogContent();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage all users in the system</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading users...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((user) => {
                    const isBlocked = !!user.blocked_at;
                    const roles = user.roles.join(', ');
                    const isSuperAdmin = user.roles.includes('super_admin');

                    return (
                      <TableRow key={user.id}>
                        <TableCell>{user.full_name || 'N/A'}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.phone || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={isSuperAdmin ? 'default' : 'secondary'}>
                            {roles || 'No role'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={isBlocked ? 'destructive' : 'default'}>
                            {isBlocked ? 'Blocked' : 'Active'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2 flex-wrap">
                            {!isSuperAdmin && (
                              <>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  onClick={() => handleResetPassword(user.id, user.full_name || user.email, user.email)}
                                  title="Reset Password"
                                  className="h-8 w-8"
                                >
                                  <Key className="h-4 w-4" />
                                </Button>
                                {isBlocked ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleAction('unblock', user.id, user.full_name || user.email)}
                                  >
                                    <UserCheck className="h-4 w-4 mr-1" />
                                    Unblock
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleAction('block', user.id, user.full_name || user.email)}
                                  >
                                    <UserX className="h-4 w-4 mr-1" />
                                    Block
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleAction('delete', user.id, user.full_name || user.email)}
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Delete
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      <AlertDialog open={actionDialog.open} onOpenChange={(open) => !open && setActionDialog({ open: false, action: null, userId: null, userName: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogContent.title}</AlertDialogTitle>
            <AlertDialogDescription>{dialogContent.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              className={actionDialog.action === 'delete' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {dialogContent.actionText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={passwordDialog.open} onOpenChange={(open) => !open && setPasswordDialog({ open: false, userId: null, userName: null, email: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Reset password for <strong>{passwordDialog.userName}</strong> ({passwordDialog.email})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="flex gap-2">
                <Input
                  id="new-password"
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={generatePassword}
                  title="Generate Password"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                  title="Copy Password"
                  disabled={!newPassword}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Click the refresh icon to generate a secure password, or enter your own.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPasswordDialog({ open: false, userId: null, userName: null, email: null })}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmPasswordReset}
              disabled={!newPassword || resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending ? 'Resetting...' : 'Reset Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
