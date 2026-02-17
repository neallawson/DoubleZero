import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { AppConfigProvider } from '@/contexts/AppConfigContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/LoginPage';
import { LockerRoomPage } from '@/pages/LockerRoomPage';
import { AdminDashboardPage } from '@/pages/AdminDashboardPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { TeamSelectPage } from '@/pages/TeamSelectPage';
import { PlayboardPage } from '@/pages/PlayboardPage';
import { PlaysListPage } from '@/pages/PlaysListPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function HomeRedirect() {
  const { isAdmin, isLoading, teamMemberships } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Admin users go to admin dashboard
  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  // No teams → profile
  if (teamMemberships.length === 0) {
    return <Navigate to="/profile" replace />;
  }

  // Multiple teams → go to team selection (they have a default, but can change)
  if (teamMemberships.length > 1) {
    return <Navigate to="/select-team" replace />;
  }

  // 1 team → go straight to locker room
  return <Navigate to="/locker-room" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      {/* Playboard has its own full-screen layout, separate from AppLayout */}
      <Route
        path="/playboard"
        element={
          <ProtectedRoute>
            <PlayboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/playboard/:id"
        element={
          <ProtectedRoute>
            <PlayboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomeRedirect />} />
        <Route path="admin" element={<AdminDashboardPage />} />
        <Route path="locker-room" element={<LockerRoomPage />} />
        <Route path="plays" element={<PlaysListPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="select-team" element={<TeamSelectPage />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppConfigProvider>
          <AppRoutes />
        </AppConfigProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
