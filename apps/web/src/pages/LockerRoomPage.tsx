import { useAuth } from '@/contexts/AuthContext';

export function LockerRoomPage() {
  const { user } = useAuth();

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4">Team Locker Room</h1>
      <p className="text-muted-foreground mb-8">
        Welcome, {user?.email}. This is your team's locker room.
      </p>
      <div className="bg-muted/50 rounded-lg p-8 text-center text-muted-foreground">
        <p>Locker room content coming soon...</p>
        <p className="text-sm mt-2">Use the menu in the header to manage data.</p>
      </div>
    </div>
  );
}
