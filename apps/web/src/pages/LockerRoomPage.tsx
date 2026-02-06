import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function LockerRoomPage() {
  const { user, activeTeam } = useAuth();
  const navigate = useNavigate();

  // If somehow no active team (e.g., not on any team), redirect to profile
  if (!activeTeam) {
    return <Navigate to="/profile" replace />;
  }

  const teamName = activeTeam.teamName;
  const permissionLabel = activeTeam.permission === 'ADMIN' ? 'Team Admin' : 
                          activeTeam.permission === 'MEMBER' ? 'Member' : 'Viewer';
  const displayName = user?.person?.displayName || user?.email;

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{teamName} Locker Room</h1>
          <p className="text-muted-foreground">
            Welcome, {displayName}. You're a {permissionLabel}.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Announcements</CardTitle>
            <CardDescription>Team news and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-4">Coming soon...</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Games</CardTitle>
            <CardDescription>Next matches on the schedule</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-4">Coming soon...</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Roster</CardTitle>
            <CardDescription>Players and staff</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-4">Coming soon...</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle>Playbook</CardTitle>
            <CardDescription>Tactical plays and formations</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Create and manage tactical diagrams for your team.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => navigate('/playboard')}>
                New Play
              </Button>
              <Button variant="outline" onClick={() => navigate('/plays')}>
                View All Plays
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
