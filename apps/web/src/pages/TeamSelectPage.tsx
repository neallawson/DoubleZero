import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

export function TeamSelectPage() {
  const { teamMemberships, activeTeam, setActiveTeam } = useAuth();
  const navigate = useNavigate();

  function handleSelectTeam(teamId: number) {
    const team = teamMemberships.find(m => m.teamId === teamId);
    if (team) {
      setActiveTeam(team);
      navigate('/locker-room');
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">Select a Team</h1>
      <p className="text-muted-foreground mb-6">
        You're on multiple teams. Choose which team you'd like to work with.
      </p>

      <div className="space-y-3">
        {teamMemberships.map((membership) => {
          const isActive = activeTeam?.teamId === membership.teamId;
          return (
            <Card 
              key={membership.teamId} 
              className={`cursor-pointer transition-colors ${isActive ? 'border-primary bg-primary/5' : 'hover:border-primary'}`}
              onClick={() => handleSelectTeam(membership.teamId)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{membership.teamName}</CardTitle>
                  {isActive && <Check className="h-5 w-5 text-primary" />}
                </div>
                <CardDescription>
                  {membership.permission === 'ADMIN' ? 'Team Admin' : 
                   membership.permission === 'MEMBER' ? 'Member' : 'Viewer'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button size="sm" variant={isActive ? 'default' : 'outline'}>
                  {isActive ? 'Continue' : 'Switch to this team'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
