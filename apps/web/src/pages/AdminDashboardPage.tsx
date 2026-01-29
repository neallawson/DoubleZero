import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usersApi, personsApi, type AdminUser, type Person } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Shield, 
  ShieldOff, 
  UserCheck, 
  UserX, 
  Link2, 
  Unlink, 
  Loader2,
  ChevronRight,
  Users
} from 'lucide-react';

export function AdminDashboardPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    setError('');
    
    const [usersRes, personsRes] = await Promise.all([
      usersApi.list(),
      personsApi.list(),
    ]);

    setIsLoading(false);
    
    if (usersRes.success && usersRes.data) {
      setUsers(usersRes.data);
    } else {
      setError(usersRes.error?.message || 'Failed to load users');
    }

    if (personsRes.success && personsRes.data) {
      setPersons(personsRes.data);
    }
  }

  async function handleToggleActive(user: AdminUser) {
    const action = user.isActive ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} ${user.email}?`)) return;

    const response = await usersApi.update(user.id, {
      isActive: !user.isActive,
      version: user.version,
    });

    if (response.success) {
      setUsers(users.map(u => u.id === user.id ? { ...u, isActive: !u.isActive, version: u.version + 1 } : u));
      if (selectedUser?.id === user.id) {
        setSelectedUser({ ...selectedUser, isActive: !selectedUser.isActive, version: selectedUser.version + 1 });
      }
    } else {
      alert(response.error?.message || `Failed to ${action} user`);
    }
  }

  async function handleToggleAdmin(user: AdminUser) {
    const isAdmin = user.roles.includes('ADMIN');
    const action = isAdmin ? 'remove admin from' : 'make admin';
    if (!confirm(`Are you sure you want to ${action} ${user.email}?`)) return;

    const response = isAdmin 
      ? await usersApi.removeRole(user.id, 'ADMIN')
      : await usersApi.addRole(user.id, 'ADMIN');

    if (response.success) {
      const newRoles = isAdmin 
        ? user.roles.filter(r => r !== 'ADMIN')
        : [...user.roles, 'ADMIN' as const];
      setUsers(users.map(u => u.id === user.id ? { ...u, roles: newRoles } : u));
      if (selectedUser?.id === user.id) {
        setSelectedUser({ ...selectedUser, roles: newRoles });
      }
    } else {
      alert(response.error?.message || 'Failed to update role');
    }
  }

  async function handleLinkPerson(personId: number) {
    if (!selectedUser) return;

    const response = await usersApi.linkPerson(selectedUser.id, personId);
    if (response.success) {
      const linkedPerson = persons.find(p => p.id === personId) || null;
      setUsers(users.map(u => u.id === selectedUser.id ? { ...u, person: linkedPerson } : u));
      setSelectedUser({ ...selectedUser, person: linkedPerson });
      setIsLinkDialogOpen(false);
    } else {
      alert(response.error?.message || 'Failed to link person');
    }
  }

  async function handleUnlinkPerson() {
    if (!selectedUser) return;
    if (!confirm('Unlink this person from the user account?')) return;

    const response = await usersApi.unlinkPerson(selectedUser.id);
    if (response.success) {
      setUsers(users.map(u => u.id === selectedUser.id ? { ...u, person: null } : u));
      setSelectedUser({ ...selectedUser, person: null });
    } else {
      alert(response.error?.message || 'Failed to unlink person');
    }
  }

  // Get unlinked persons for the link dialog
  const unlinkedPersons = persons.filter(p => !p.userId);

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString();
  }

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">Admin Dashboard</h1>
      <p className="text-muted-foreground mb-6">
        Welcome, {currentUser?.email}. Manage users and system settings.
      </p>

      {error && (
        <div className="bg-destructive/10 text-destructive p-3 rounded-md mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Users ({users.length})
            </CardTitle>
            <CardDescription>Manage user accounts and permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors flex items-center justify-between ${
                    selectedUser?.id === user.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:bg-muted/50'
                  } ${!user.isActive ? 'opacity-50' : ''}`}
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{user.email}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                      {user.roles.includes('ADMIN') && (
                        <span className="inline-flex items-center gap-1 text-amber-600">
                          <Shield className="h-3 w-3" />
                          Admin
                        </span>
                      )}
                      {user.person && (
                        <span className="inline-flex items-center gap-1">
                          <Link2 className="h-3 w-3" />
                          {user.person.displayName}
                        </span>
                      )}
                      {!user.isActive && (
                        <span className="text-destructive">Inactive</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </button>
              ))}
              {users.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No users found</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* User Details */}
        <Card>
          <CardHeader>
            <CardTitle>User Details</CardTitle>
            <CardDescription>
              {selectedUser ? selectedUser.email : 'Select a user to view details'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedUser ? (
              <div className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{selectedUser.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <p className={selectedUser.isActive ? 'text-green-600' : 'text-destructive'}>
                    {selectedUser.isActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Roles</Label>
                  <p>{selectedUser.roles.length > 0 ? selectedUser.roles.join(', ') : 'None'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Linked Person</Label>
                  <p>{selectedUser.person?.displayName || 'Not linked'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Created</Label>
                  <p>{formatDate(selectedUser.createdAt)}</p>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <Button
                    variant={selectedUser.isActive ? 'destructive' : 'default'}
                    size="sm"
                    className="w-full"
                    onClick={() => handleToggleActive(selectedUser)}
                    disabled={selectedUser.id === currentUser?.id}
                  >
                    {selectedUser.isActive ? (
                      <>
                        <UserX className="h-4 w-4 mr-2" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-4 w-4 mr-2" />
                        Activate
                      </>
                    )}
                  </Button>

                  <Button
                    variant={selectedUser.roles.includes('ADMIN') ? 'outline' : 'secondary'}
                    size="sm"
                    className="w-full"
                    onClick={() => handleToggleAdmin(selectedUser)}
                    disabled={selectedUser.id === currentUser?.id}
                  >
                    {selectedUser.roles.includes('ADMIN') ? (
                      <>
                        <ShieldOff className="h-4 w-4 mr-2" />
                        Remove Admin
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4 mr-2" />
                        Make Admin
                      </>
                    )}
                  </Button>

                  {selectedUser.person ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={handleUnlinkPerson}
                    >
                      <Unlink className="h-4 w-4 mr-2" />
                      Unlink Person
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setIsLinkDialogOpen(true)}
                      disabled={unlinkedPersons.length === 0}
                    >
                      <Link2 className="h-4 w-4 mr-2" />
                      Link Person
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Select a user from the list to view and manage their account.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Link Person Dialog */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link Person to User</DialogTitle>
          </DialogHeader>
          <div className="max-h-60 overflow-y-auto">
            {unlinkedPersons.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No unlinked persons available. Create a person first.
              </p>
            ) : (
              <div className="space-y-1">
                {unlinkedPersons.map((person) => (
                  <button
                    key={person.id}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-blue-100 transition-colors"
                    onClick={() => handleLinkPerson(person.id)}
                  >
                    <div className="font-medium">{person.displayName}</div>
                    {person.email && (
                      <div className="text-sm text-muted-foreground">{person.email}</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLinkDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
