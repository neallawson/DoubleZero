import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Menu, LogOut, User, Database } from 'lucide-react';

interface HeaderProps {
  onOpenCrudMenu: () => void;
}

export function Header({ onOpenCrudMenu }: HeaderProps) {
  const { user, logout, isAdmin, isTeamAdmin, teamMemberships, activeTeam, setActiveTeam } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  // Show Manage button for system admins or team admins
  const canManage = isAdmin || isTeamAdmin;

  // Show team picker if user has multiple teams
  const showTeamPicker = teamMemberships.length > 1;

  return (
    <header className="border-b bg-background pt-[env(safe-area-inset-top)]">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-lg font-semibold hover:text-primary transition-colors">
            DoubleZero
          </Link>
          
          {/* Team picker for users with multiple teams */}
          {showTeamPicker && (
            <Select
              value={activeTeam?.teamId.toString() ?? ''}
              onValueChange={(value) => {
                const team = teamMemberships.find(m => m.teamId.toString() === value);
                if (team) setActiveTeam(team);
              }}
            >
              <SelectTrigger className="w-[180px] h-8">
                <SelectValue placeholder="Select team" />
              </SelectTrigger>
              <SelectContent>
                {teamMemberships.map((membership) => (
                  <SelectItem key={membership.teamId} value={membership.teamId.toString()}>
                    {membership.teamName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex items-center gap-2">
          {canManage && (
            <Button variant="outline" size="sm" onClick={onOpenCrudMenu}>
              <Database className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Manage</span>
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <User className="h-4 w-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
