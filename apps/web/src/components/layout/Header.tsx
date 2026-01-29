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
import { Menu, LogOut, User, Database } from 'lucide-react';

interface HeaderProps {
  onOpenCrudMenu: () => void;
}

export function Header({ onOpenCrudMenu }: HeaderProps) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <header className="border-b bg-background">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-lg font-semibold hover:text-primary transition-colors">
            DoubleZero
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
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
