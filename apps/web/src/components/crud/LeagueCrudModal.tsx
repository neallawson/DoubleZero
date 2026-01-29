import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { leaguesApi, type League } from '@/lib/api';
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, Calendar } from 'lucide-react';
import { useState as useStateReact } from 'react';
import { SeasonCrudModal } from './SeasonCrudModal';

interface LeagueCrudModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  onBack: () => void;
}

type ViewMode = 'list' | 'view' | 'edit' | 'create';

// Track if seasons modal is open

export function LeagueCrudModal({ open, onOpenChange, onClose, onBack }: LeagueCrudModalProps) {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSeasonsOpen, setIsSeasonsOpen] = useStateReact(false);
  const [activeSeasonName, setActiveSeasonName] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    governingBody: '',
  });

  useEffect(() => {
    if (open) {
      loadLeagues();
    }
  }, [open]);

  async function loadLeagues() {
    setIsLoading(true);
    setError('');
    const response = await leaguesApi.list();
    setIsLoading(false);
    if (response.success && response.data) {
      setLeagues(response.data);
    } else {
      setError(response.error?.message || 'Failed to load leagues');
    }
  }

  async function handleSelectLeague(league: League) {
    setSelectedLeague(league);
    setViewMode('view');
    // Fetch active season name if there is one
    if (league.activeSeasonId) {
      const response = await leaguesApi.listSeasons(league.id);
      if (response.success && response.data) {
        const activeSeason = response.data.find(s => s.id === league.activeSeasonId);
        setActiveSeasonName(activeSeason?.name || null);
      }
    } else {
      setActiveSeasonName(null);
    }
  }

  function handleCreate() {
    setFormData({ name: '', description: '', governingBody: '' });
    setSelectedLeague(null);
    setViewMode('create');
  }

  function handleEdit() {
    if (selectedLeague) {
      setFormData({
        name: selectedLeague.name,
        description: selectedLeague.description || '',
        governingBody: selectedLeague.governingBody || '',
      });
      setViewMode('edit');
    }
  }

  function handleBack() {
    if (viewMode === 'view' || viewMode === 'create') {
      setViewMode('list');
      setSelectedLeague(null);
    } else if (viewMode === 'edit') {
      setViewMode('view');
    }
  }

  async function handleSave() {
    setIsLoading(true);
    setError('');

    if (viewMode === 'create') {
      const response = await leaguesApi.create(formData);
      setIsLoading(false);
      if (response.success && response.data) {
        setLeagues([...leagues, response.data]);
        setSelectedLeague(response.data);
        setViewMode('view');
      } else {
        setError(response.error?.message || 'Failed to create league');
      }
    } else if (viewMode === 'edit' && selectedLeague) {
      const response = await leaguesApi.update(selectedLeague.id, {
        ...formData,
        version: selectedLeague.version,
      });
      setIsLoading(false);
      if (response.success && response.data) {
        setLeagues(leagues.map(l => l.id === response.data!.id ? response.data! : l));
        setSelectedLeague(response.data);
        setViewMode('view');
      } else {
        setError(response.error?.message || 'Failed to update league');
      }
    }
  }

  async function handleDelete() {
    if (!selectedLeague) return;
    
    if (!confirm(`Delete "${selectedLeague.name}"?`)) return;

    setIsLoading(true);
    setError('');
    const response = await leaguesApi.delete(selectedLeague.id);
    setIsLoading(false);
    if (response.success) {
      setLeagues(leagues.filter(l => l.id !== selectedLeague.id));
      setSelectedLeague(null);
      setViewMode('list');
    } else {
      setError(response.error?.message || 'Failed to delete league');
    }
  }

  function renderList() {
    return (
      <>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <DialogTitle>Leagues</DialogTitle>
            <Button size="sm" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-1" />
              New
            </Button>
          </div>
        </DialogHeader>
        <div className="max-h-80 overflow-y-auto">
          {leagues.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No leagues found</p>
          ) : (
            <div className="space-y-1">
              {leagues.map((league) => (
                <button
                  key={league.id}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-accent transition-colors"
                  onClick={() => handleSelectLeague(league)}
                >
                  <div className="font-medium">{league.name}</div>
                  {league.description && (
                    <div className="text-sm text-muted-foreground truncate">
                      {league.description}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </>
    );
  }

  async function handleLeagueUpdated(updatedLeague: League) {
    setLeagues(leagues.map(l => l.id === updatedLeague.id ? updatedLeague : l));
    setSelectedLeague(updatedLeague);
    // Refresh active season name
    if (updatedLeague.activeSeasonId) {
      const response = await leaguesApi.listSeasons(updatedLeague.id);
      if (response.success && response.data) {
        const activeSeason = response.data.find(s => s.id === updatedLeague.activeSeasonId);
        setActiveSeasonName(activeSeason?.name || null);
      }
    } else {
      setActiveSeasonName(null);
    }
  }

  function renderView() {
    if (!selectedLeague) return null;
    return (
      <>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <DialogTitle>{selectedLeague.name}</DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-muted-foreground">Name</Label>
            <p className="text-lg">{selectedLeague.name}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Description</Label>
            <p>{selectedLeague.description || '—'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Governing Body</Label>
            <p>{selectedLeague.governingBody || '—'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Active Season</Label>
            <p>{activeSeasonName || (selectedLeague.activeSeasonId ? 'Loading...' : 'None')}</p>
          </div>
        </div>
        <DialogFooter className="gap-2 flex-wrap">
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setIsSeasonsOpen(true)}>
            <Calendar className="h-4 w-4 mr-1" />
            Seasons
          </Button>
          <Button variant="outline" onClick={handleEdit}>
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
        </DialogFooter>
        {selectedLeague && (
          <SeasonCrudModal
            open={isSeasonsOpen}
            onOpenChange={setIsSeasonsOpen}
            league={selectedLeague}
            onLeagueUpdated={handleLeagueUpdated}
          />
        )}
      </>
    );
  }

  function renderForm() {
    const isCreate = viewMode === 'create';
    return (
      <>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <DialogTitle>{isCreate ? 'New League' : 'Edit League'}</DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="League name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="governingBody">Governing Body</Label>
            <Input
              id="governingBody"
              value={formData.governingBody}
              onChange={(e) => setFormData({ ...formData, governingBody: e.target.value })}
              placeholder="e.g., FIFA, USSF"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleBack}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!formData.name || isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {isCreate ? 'Create' : 'Save'}
          </Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mb-4">
            {error}
          </div>
        )}
        {isLoading && viewMode === 'list' ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : viewMode === 'list' ? (
          renderList()
        ) : viewMode === 'view' ? (
          renderView()
        ) : (
          renderForm()
        )}
      </DialogContent>
    </Dialog>
  );
}
