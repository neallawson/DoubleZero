import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Users, Trophy, UserCircle } from 'lucide-react';
import { LeagueCrudModal } from './LeagueCrudModal';
import { LocationCrudModal } from './LocationCrudModal';
import { PersonCrudModal } from './PersonCrudModal';
import { TeamCrudModal } from './TeamCrudModal';
import { GameCrudModal } from './GameCrudModal';

interface CrudMenuModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type CrudDomain = 'leagues' | 'seasons' | 'teams' | 'persons' | 'locations' | 'games' | null;

const menuItems = [
  { id: 'leagues' as const, label: 'Leagues', icon: Trophy, description: 'Manage leagues and seasons' },
  { id: 'teams' as const, label: 'Teams', icon: Users, description: 'Manage teams' },
  { id: 'persons' as const, label: 'Persons', icon: UserCircle, description: 'Manage person profiles' },
  { id: 'locations' as const, label: 'Locations', icon: MapPin, description: 'Manage game locations' },
  { id: 'games' as const, label: 'Games', icon: Calendar, description: 'Manage games' },
];

export function CrudMenuModal({ open, onOpenChange }: CrudMenuModalProps) {
  const [activeDomain, setActiveDomain] = useState<CrudDomain>(null);

  function handleSelectDomain(domain: CrudDomain) {
    setActiveDomain(domain);
  }

  function handleCloseDomain() {
    setActiveDomain(null);
  }

  function handleCloseAll() {
    setActiveDomain(null);
    onOpenChange(false);
  }

  // If a domain is selected, show that domain's CRUD modal
  if (activeDomain === 'leagues') {
    return (
      <LeagueCrudModal
        open={true}
        onOpenChange={(isOpen: boolean) => {
          if (!isOpen) handleCloseDomain();
        }}
        onClose={handleCloseAll}
        onBack={handleCloseDomain}
      />
    );
  }

  if (activeDomain === 'locations') {
    return (
      <LocationCrudModal
        open={true}
        onOpenChange={(isOpen: boolean) => {
          if (!isOpen) handleCloseDomain();
        }}
        onClose={handleCloseAll}
        onBack={handleCloseDomain}
      />
    );
  }

  if (activeDomain === 'persons') {
    return (
      <PersonCrudModal
        open={true}
        onOpenChange={(isOpen: boolean) => {
          if (!isOpen) handleCloseDomain();
        }}
        onClose={handleCloseAll}
        onBack={handleCloseDomain}
      />
    );
  }

  if (activeDomain === 'teams') {
    return (
      <TeamCrudModal
        open={true}
        onOpenChange={(isOpen: boolean) => {
          if (!isOpen) handleCloseDomain();
        }}
        onClose={handleCloseAll}
        onBack={handleCloseDomain}
      />
    );
  }

  if (activeDomain === 'games') {
    return (
      <GameCrudModal
        open={true}
        onOpenChange={(isOpen: boolean) => {
          if (!isOpen) handleCloseDomain();
        }}
        onClose={handleCloseAll}
        onBack={handleCloseDomain}
      />
    );
  }

  // Show the main menu
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Data</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2">
          {menuItems.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              className="w-full justify-start h-auto py-3"
              onClick={() => handleSelectDomain(item.id)}
            >
              <item.icon className="h-5 w-5 mr-3 text-muted-foreground" />
              <div className="text-left">
                <div className="font-medium">{item.label}</div>
                <div className="text-xs text-muted-foreground">{item.description}</div>
              </div>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
