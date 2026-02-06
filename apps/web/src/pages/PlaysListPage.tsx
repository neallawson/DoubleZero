import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { playsApi, type Play } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getAllPlays, savePlay, getPlay, deletePlay as deleteLocalPlay } from '../lib/playboard/offlineStorage';
import { Pencil, Trash2 } from 'lucide-react';

interface PlayItem {
  id: string | number;
  name: string;
  description?: string | null;
  tags?: string[] | null;
  isLocal: boolean;
  updatedAt?: string | Date;
}

export function PlaysListPage() {
  const navigate = useNavigate();
  const { activeTeam } = useAuth();
  const [plays, setPlays] = useState<PlayItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [editingPlay, setEditingPlay] = useState<PlayItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editTags, setEditTags] = useState('');

  useEffect(() => {
    async function fetchPlays() {
      setIsLoading(true);
      const allPlays: PlayItem[] = [];

      // Fetch local plays from IndexedDB
      try {
        const localPlays = await getAllPlays();
        for (const p of localPlays) {
          allPlays.push({
            id: p.clientId,
            name: p.name,
            description: p.description,
            tags: p.tags,
            isLocal: true,
            updatedAt: p.lastModified,
          });
        }
      } catch (e) {
        console.error('Failed to load local plays:', e);
      }

      // Fetch server plays if we have a team
      if (activeTeam) {
        try {
          const response = await playsApi.list({ teamId: activeTeam.teamId });
          if (response.success && response.data) {
            for (const p of response.data) {
              // Check if already in local (by clientId)
              const existingIndex = allPlays.findIndex(
                (local) => p.clientId && local.id === p.clientId
              );
              if (existingIndex >= 0) {
                // Update with server data
                allPlays[existingIndex] = {
                  id: p.id,
                  name: p.name,
                  description: p.description,
                  tags: p.tags,
                  isLocal: false,
                  updatedAt: p.updatedAt,
                };
              } else {
                allPlays.push({
                  id: p.id,
                  name: p.name,
                  description: p.description,
                  tags: p.tags,
                  isLocal: false,
                  updatedAt: p.updatedAt,
                });
              }
            }
          }
        } catch (e) {
          console.error('Failed to load server plays:', e);
        }
      }

      // Sort by updated date
      allPlays.sort((a, b) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateB - dateA;
      });

      setPlays(allPlays);
      setIsLoading(false);
    }

    fetchPlays();
  }, [activeTeam]);

  // Get unique tags
  const allTags = [...new Set(plays.flatMap((p) => p.tags ?? []))].sort();

  // Filter plays by selected tag
  const filteredPlays = selectedTag
    ? plays.filter((p) => p.tags?.includes(selectedTag))
    : plays;

  const handleOpenPlay = (play: PlayItem) => {
    navigate(`/playboard/${play.id}`);
  };

  const handleEditClick = useCallback((e: React.MouseEvent, play: PlayItem) => {
    e.stopPropagation();
    setEditingPlay(play);
    setEditName(play.name);
    setEditTags(play.tags?.join(', ') ?? '');
  }, []);

  const handleEditSave = useCallback(async () => {
    if (!editingPlay) return;

    const newTags = editTags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (editingPlay.isLocal && typeof editingPlay.id === 'string') {
      // Update local play
      const localPlay = await getPlay(editingPlay.id);
      if (localPlay) {
        await savePlay({
          ...localPlay,
          name: editName,
          tags: newTags.length > 0 ? newTags : null,
          lastModified: new Date(),
        });
      }
    } else if (typeof editingPlay.id === 'number') {
      // Update server play
      await playsApi.update(editingPlay.id, {
        name: editName,
        tags: newTags.length > 0 ? newTags : undefined,
      });
    }

    // Update local state
    setPlays((prev) =>
      prev.map((p) =>
        p.id === editingPlay.id
          ? { ...p, name: editName, tags: newTags.length > 0 ? newTags : null }
          : p
      )
    );
    setEditingPlay(null);
  }, [editingPlay, editName, editTags]);

  const handleEditCancel = useCallback(() => {
    setEditingPlay(null);
  }, []);

  const handleDeleteClick = useCallback(async (e: React.MouseEvent, play: PlayItem) => {
    e.stopPropagation();

    const confirmed = window.confirm(`Delete "${play.name}"? This cannot be undone.`);
    if (!confirmed) return;

    if (play.isLocal && typeof play.id === 'string') {
      // Delete local play
      await deleteLocalPlay(play.id);
    } else if (typeof play.id === 'number') {
      // Delete server play
      await playsApi.delete(play.id);
    }

    // Remove from local state
    setPlays((prev) => prev.filter((p) => p.id !== play.id));
  }, []);

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Playbook</h1>
          <p className="text-muted-foreground">
            Manage your tactical plays and formations
          </p>
        </div>
        <Button onClick={() => navigate('/playboard')}>
          New Play
        </Button>
      </div>

      {/* Tag filters */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            variant={selectedTag === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedTag(null)}
          >
            All
          </Button>
          {allTags.map((tag) => (
            <Button
              key={tag}
              variant={selectedTag === tag ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTag(tag)}
            >
              {tag}
            </Button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : filteredPlays.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">
              {selectedTag ? 'No plays found with this tag.' : 'No plays yet. Create your first play!'}
            </p>
            {!selectedTag && (
              <Button onClick={() => navigate('/playboard')}>
                Create Play
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPlays.map((play) => (
            <Card
              key={play.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleOpenPlay(play)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg flex-1">{play.name}</CardTitle>
                  <div className="flex items-center gap-1 ml-2">
                    {play.isLocal && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                        Local
                      </span>
                    )}
                    <button
                      onClick={(e) => handleEditClick(e, play)}
                      className="p-1.5 hover:bg-muted rounded transition-colors"
                      title="Edit play"
                    >
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteClick(e, play)}
                      className="p-1.5 hover:bg-destructive/10 rounded transition-colors"
                      title="Delete play"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </div>
                {play.description && (
                  <CardDescription className="line-clamp-2">
                    {play.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {play.tags && play.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {play.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-muted px-2 py-1 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {play.updatedAt && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(play.updatedAt).toLocaleString()}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-6">
        <Button variant="outline" onClick={() => navigate('/locker-room')}>
          Back to Locker Room
        </Button>
      </div>

      {/* Edit Dialog */}
      {editingPlay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Edit Play</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  placeholder="offense, set-piece, corner"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={handleEditCancel}>
                Cancel
              </Button>
              <Button onClick={handleEditSave}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
