import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function ProfilePage() {
  const { user, teamMemberships } = useAuth();
  const navigate = useNavigate();

  const hasTeams = teamMemberships.length > 0;

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4">Your Profile</h1>
      <p className="text-muted-foreground mb-6 sm:mb-8">
        {hasTeams 
          ? `You're on ${teamMemberships.length} team${teamMemberships.length > 1 ? 's' : ''}.`
          : "You're not on any team yet."
        }
      </p>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <p className="text-lg">{user?.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">System Roles</label>
              <p className="text-lg">{user?.roles.join(', ') || 'None'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <p className="text-lg">{user?.isActive ? 'Active' : 'Inactive'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Teams</CardTitle>
            <CardDescription>Your team memberships</CardDescription>
          </CardHeader>
          <CardContent>
            {hasTeams ? (
              <div className="space-y-3">
                {teamMemberships.map((membership) => (
                  <div key={`${membership.teamId}-${membership.seasonId}`} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">{membership.teamName}</p>
                      <p className="text-sm text-muted-foreground">
                        {membership.permission === 'ADMIN' ? 'Team Admin' : 
                         membership.permission === 'MEMBER' ? 'Member' : 'Viewer'}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => navigate('/locker-room')}>
                      Locker Room
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground py-4 text-center">
                You haven't been added to any teams yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
