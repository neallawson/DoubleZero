import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4">Your Profile</h1>
      <p className="text-muted-foreground mb-6 sm:mb-8">
        You're not on any team yet. Here's your profile information.
      </p>
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Email</label>
            <p className="text-lg">{user?.email}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Roles</label>
            <p className="text-lg">{user?.roles.join(', ') || 'None'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Status</label>
            <p className="text-lg">{user?.isActive ? 'Active' : 'Inactive'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
