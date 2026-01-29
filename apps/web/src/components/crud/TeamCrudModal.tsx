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
import { 
  teamsApi, 
  leaguesApi, 
  teamMembersApi, 
  personsApi, 
  lookupsApi,
  type Team, 
  type League, 
  type Season,
  type TeamMember,
  type Person,
  type TeamRole,
  type PlayerPosition
} from '@/lib/api';
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, Users, Shield, RefreshCw } from 'lucide-react';

interface TeamCrudModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  onBack: () => void;
}

type ViewMode = 'list' | 'view' | 'edit' | 'create' | 'roster' | 'addMember' | 'editMember';

export function TeamCrudModal({ open, onOpenChange, onClose, onBack }: TeamCrudModalProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [activeSeasonName, setActiveSeasonName] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Roster state
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [teamRoles, setTeamRoles] = useState<TeamRole[]>([]);
  const [positions, setPositions] = useState<PlayerPosition[]>([]);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    shortName: '',
    leagueId: '',
    activeSeasonId: '',
    primaryColor: '',
    secondaryColor: '',
  });

  // Member form state
  const [memberFormData, setMemberFormData] = useState({
    personId: '',
    permission: 'MEMBER' as 'ADMIN' | 'MEMBER',
    teamRoleId: '',
    positionId: '',
    jerseyNumber: '',
    title: '',
  });

  useEffect(() => {
    if (open) {
      loadTeams();
      loadLeagues();
    }
  }, [open]);

  async function loadTeams() {
    setIsLoading(true);
    setError('');
    const response = await teamsApi.list();
    setIsLoading(false);
    if (response.success && response.data) {
      setTeams(response.data);
    } else {
      setError(response.error?.message || 'Failed to load teams');
    }
  }

  async function loadLeagues() {
    const response = await leaguesApi.list();
    if (response.success && response.data) {
      setLeagues(response.data);
    }
  }

  function getLeagueName(leagueId: number | null) {
    if (!leagueId) return null;
    const league = leagues.find(l => l.id === leagueId);
    return league?.name || `League #${leagueId}`;
  }

  async function loadSeasonsForLeague(leagueId: number) {
    const response = await leaguesApi.listSeasons(leagueId);
    if (response.success && response.data) {
      setSeasons(response.data);
    } else {
      setSeasons([]);
    }
  }

  async function handleSelectTeam(team: Team) {
    setSelectedTeam(team);
    setViewMode('view');
    // Load seasons for this team's league and get active season name
    if (team.leagueId) {
      const response = await leaguesApi.listSeasons(team.leagueId);
      if (response.success && response.data) {
        setSeasons(response.data);
        if (team.activeSeasonId) {
          const activeSeason = response.data.find(s => s.id === team.activeSeasonId);
          setActiveSeasonName(activeSeason?.name || null);
        } else {
          setActiveSeasonName(null);
        }
      }
    } else {
      setSeasons([]);
      setActiveSeasonName(null);
    }
  }

  function handleCreate() {
    setFormData({ name: '', shortName: '', leagueId: '', activeSeasonId: '', primaryColor: '', secondaryColor: '' });
    setSelectedTeam(null);
    setSeasons([]);
    setViewMode('create');
  }

  async function handleEdit() {
    if (selectedTeam) {
      // Load seasons if we have a league
      if (selectedTeam.leagueId) {
        await loadSeasonsForLeague(selectedTeam.leagueId);
      }
      setFormData({
        name: selectedTeam.name,
        shortName: selectedTeam.shortName || '',
        leagueId: selectedTeam.leagueId?.toString() || '',
        activeSeasonId: selectedTeam.activeSeasonId?.toString() || '',
        primaryColor: selectedTeam.primaryColor || '',
        secondaryColor: selectedTeam.secondaryColor || '',
      });
      setViewMode('edit');
    }
  }

  function handleBack() {
    if (viewMode === 'view' || viewMode === 'create') {
      setViewMode('list');
      setSelectedTeam(null);
    } else if (viewMode === 'edit') {
      setViewMode('view');
    } else if (viewMode === 'roster') {
      setViewMode('view');
      setMembers([]);
    } else if (viewMode === 'addMember' || viewMode === 'editMember') {
      setViewMode('roster');
      setSelectedMember(null);
    }
  }

  async function loadRosterData() {
    const [rolesRes, positionsRes, personsRes] = await Promise.all([
      lookupsApi.teamRoles(),
      lookupsApi.playerPositions(),
      personsApi.list(),
    ]);
    if (rolesRes.success && rolesRes.data) setTeamRoles(rolesRes.data);
    if (positionsRes.success && positionsRes.data) setPositions(positionsRes.data);
    if (personsRes.success && personsRes.data) setPersons(personsRes.data);
  }

  async function loadMembers(teamId: number) {
    setIsLoading(true);
    setError('');
    const response = await teamMembersApi.list(teamId);
    setIsLoading(false);
    if (response.success && response.data) {
      setMembers(response.data);
    } else {
      setError(response.error?.message || 'Failed to load roster');
    }
  }

  async function handleOpenRoster() {
    if (!selectedTeam) return;
    if (!selectedTeam.activeSeasonId) {
      setError('Set an active season before managing the roster');
      return;
    }
    await loadRosterData();
    await loadMembers(selectedTeam.id);
    setViewMode('roster');
  }

  function handleAddMember() {
    setMemberFormData({
      personId: '',
      permission: 'MEMBER',
      teamRoleId: '',
      positionId: '',
      jerseyNumber: '',
      title: '',
    });
    setSelectedMember(null);
    setViewMode('addMember');
  }

  function handleEditMember(member: TeamMember) {
    setSelectedMember(member);
    setMemberFormData({
      personId: member.personId.toString(),
      permission: member.permission === 'ADMIN' ? 'ADMIN' : 'MEMBER',
      teamRoleId: member.teamRoleId?.toString() || '',
      positionId: member.positionId?.toString() || '',
      jerseyNumber: member.jerseyNumber?.toString() || '',
      title: member.title || '',
    });
    setViewMode('editMember');
  }

  async function handleSaveMember() {
    if (!selectedTeam) return;
    setIsLoading(true);
    setError('');

    const payload = {
      personId: parseInt(memberFormData.personId, 10),
      seasonId: selectedTeam.activeSeasonId!,
      permission: memberFormData.permission,
      teamRoleId: memberFormData.teamRoleId ? parseInt(memberFormData.teamRoleId, 10) : undefined,
      positionId: memberFormData.positionId ? parseInt(memberFormData.positionId, 10) : undefined,
      jerseyNumber: memberFormData.jerseyNumber || undefined,
      title: memberFormData.title || undefined,
    };

    if (viewMode === 'addMember') {
      const response = await teamMembersApi.create(selectedTeam.id, payload);
      setIsLoading(false);
      if (response.success) {
        await loadMembers(selectedTeam.id);
        setViewMode('roster');
      } else {
        setError(response.error?.message || 'Failed to add member');
      }
    } else if (viewMode === 'editMember' && selectedMember) {
      const response = await teamMembersApi.update(selectedTeam.id, selectedMember.id, {
        permission: memberFormData.permission,
        teamRoleId: memberFormData.teamRoleId ? parseInt(memberFormData.teamRoleId, 10) : undefined,
        positionId: memberFormData.positionId ? parseInt(memberFormData.positionId, 10) : undefined,
        jerseyNumber: memberFormData.jerseyNumber || undefined,
        title: memberFormData.title || undefined,
        version: selectedMember.version,
      });
      setIsLoading(false);
      if (response.success) {
        await loadMembers(selectedTeam.id);
        setViewMode('roster');
        setSelectedMember(null);
      } else {
        setError(response.error?.message || 'Failed to update member');
      }
    }
  }

  async function handleRemoveMember(member: TeamMember) {
    if (!selectedTeam) return;
    if (!confirm(`Remove ${member.person?.displayName || 'this member'} from the team?`)) return;

    setIsLoading(true);
    const response = await teamMembersApi.delete(selectedTeam.id, member.id);
    setIsLoading(false);
    if (response.success) {
      setMembers(members.filter(m => m.id !== member.id));
    } else {
      setError(response.error?.message || 'Failed to remove member');
    }
  }

  // Get persons not already on the team
  const availablePersons = persons.filter(
    p => !members.some(m => m.personId === p.id)
  );

  async function handleSave() {
    setIsLoading(true);
    setError('');

    const payload = {
      name: formData.name,
      shortName: formData.shortName || null,
      leagueId: formData.leagueId ? parseInt(formData.leagueId, 10) : null,
      activeSeasonId: formData.activeSeasonId ? parseInt(formData.activeSeasonId, 10) : null,
      primaryColor: formData.primaryColor || null,
      secondaryColor: formData.secondaryColor || null,
    };

    if (viewMode === 'create') {
      const response = await teamsApi.create(payload);
      setIsLoading(false);
      if (response.success && response.data) {
        setTeams([...teams, response.data]);
        setSelectedTeam(response.data);
        setViewMode('view');
      } else {
        setError(response.error?.message || 'Failed to create team');
      }
    } else if (viewMode === 'edit' && selectedTeam) {
      const response = await teamsApi.update(selectedTeam.id, {
        ...payload,
        version: selectedTeam.version,
      });
      setIsLoading(false);
      if (response.success && response.data) {
        setTeams(teams.map(t => t.id === response.data!.id ? response.data! : t));
        setSelectedTeam(response.data);
        // Update active season name from the already-loaded seasons
        if (response.data.activeSeasonId) {
          const activeSeason = seasons.find(s => s.id === response.data!.activeSeasonId);
          setActiveSeasonName(activeSeason?.name || null);
        } else {
          setActiveSeasonName(null);
        }
        setViewMode('view');
      } else {
        setError(response.error?.message || 'Failed to update team');
      }
    }
  }

  async function handleDelete() {
    if (!selectedTeam) return;
    
    if (!confirm(`Delete "${selectedTeam.name}"?`)) return;

    setIsLoading(true);
    setError('');
    const response = await teamsApi.delete(selectedTeam.id);
    setIsLoading(false);
    if (response.success) {
      setTeams(teams.filter(t => t.id !== selectedTeam.id));
      setSelectedTeam(null);
      setViewMode('list');
    } else {
      setError(response.error?.message || 'Failed to delete team');
    }
  }

  function renderColorSwatch(color: string | null) {
    if (!color) return '—';
    return (
      <div className="flex items-center gap-2">
        <div 
          className="w-6 h-6 rounded border" 
          style={{ backgroundColor: color }}
        />
        <span>{color}</span>
      </div>
    );
  }

  function renderList() {
    return (
      <>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <DialogTitle>Teams</DialogTitle>
            <Button size="sm" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-1" />
              New
            </Button>
          </div>
        </DialogHeader>
        <div className="max-h-80 overflow-y-auto">
          {teams.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No teams found</p>
          ) : (
            <div className="space-y-1">
              {teams.map((team) => (
                <button
                  key={team.id}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-blue-100 transition-colors flex items-center gap-3"
                  onClick={() => handleSelectTeam(team)}
                >
                  {team.primaryColor && (
                    <div 
                      className="w-4 h-4 rounded-full border flex-shrink-0" 
                      style={{ backgroundColor: team.primaryColor }}
                    />
                  )}
                  <div className="min-w-0">
                    <div className="font-medium">{team.name}</div>
                    {getLeagueName(team.leagueId) && (
                      <div className="text-sm text-muted-foreground truncate">
                        {getLeagueName(team.leagueId)}
                      </div>
                    )}
                  </div>
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

  function renderView() {
    if (!selectedTeam) return null;
    return (
      <>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <DialogTitle>{selectedTeam.name}</DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Name</Label>
              <p className="text-lg">{selectedTeam.name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Short Name</Label>
              <p>{selectedTeam.shortName || '—'}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">League</Label>
              <p>{getLeagueName(selectedTeam.leagueId) || '—'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Active Season</Label>
              <p>{activeSeasonName || (selectedTeam.activeSeasonId ? 'Loading...' : 'None set')}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Primary Color</Label>
              {renderColorSwatch(selectedTeam.primaryColor)}
            </div>
            <div>
              <Label className="text-muted-foreground">Secondary Color</Label>
              {renderColorSwatch(selectedTeam.secondaryColor)}
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 flex-wrap">
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
          <Button variant="outline" onClick={handleOpenRoster}>
            <Users className="h-4 w-4 mr-1" />
            Roster
          </Button>
          <Button variant="outline" onClick={handleEdit}>
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
        </DialogFooter>
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
            <DialogTitle>{isCreate ? 'New Team' : 'Edit Team'}</DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Team name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shortName">Short Name</Label>
              <Input
                id="shortName"
                value={formData.shortName}
                onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                placeholder="e.g., ATL"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="leagueId">League</Label>
              <select
                id="leagueId"
                value={formData.leagueId}
                onChange={async (e) => {
                  const newLeagueId = e.target.value;
                  setFormData({ ...formData, leagueId: newLeagueId, activeSeasonId: '' });
                  if (newLeagueId) {
                    await loadSeasonsForLeague(parseInt(newLeagueId, 10));
                  } else {
                    setSeasons([]);
                  }
                }}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">No league</option>
                {leagues.map((league) => (
                  <option key={league.id} value={league.id}>
                    {league.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="activeSeasonId">Active Season</Label>
              <select
                id="activeSeasonId"
                value={formData.activeSeasonId}
                onChange={(e) => setFormData({ ...formData, activeSeasonId: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                disabled={!formData.leagueId || seasons.length === 0}
              >
                <option value="">No active season</option>
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.name}
                  </option>
                ))}
              </select>
              {formData.leagueId && seasons.length === 0 && (
                <p className="text-xs text-muted-foreground">No seasons in this league yet</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={formData.primaryColor || '#000000'}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondaryColor">Secondary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="secondaryColor"
                  type="color"
                  value={formData.secondaryColor || '#ffffff'}
                  onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={formData.secondaryColor}
                  onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                  placeholder="#ffffff"
                  className="flex-1"
                />
              </div>
            </div>
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

  function renderRoster() {
    if (!selectedTeam) return null;
    return (
      <>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <DialogTitle>{selectedTeam.name} - Roster</DialogTitle>
          </div>
        </DialogHeader>
        <div className="max-h-80 overflow-y-auto">
          {members.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No members on this team yet</p>
          ) : (
            <div className="space-y-1">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="px-3 py-2 rounded-md hover:bg-muted/50 flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <div className="font-medium flex items-center gap-2">
                      {member.person?.displayName || 'Unknown'}
                      {member.permission === 'ADMIN' && (
                        <Shield className="h-3 w-3 text-amber-600" />
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {member.role?.name}
                      {member.position && ` • ${member.position.name}`}
                      {member.jerseyNumber && ` • #${member.jerseyNumber}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEditMember(member)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveMember(member)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleBack}>
            Back
          </Button>
          <Button onClick={handleAddMember} disabled={availablePersons.length === 0}>
            <Plus className="h-4 w-4 mr-1" />
            Add Member
          </Button>
        </DialogFooter>
      </>
    );
  }

  function renderMemberForm() {
    const isEdit = viewMode === 'editMember';
    const isValid = memberFormData.personId || isEdit;

    return (
      <>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <DialogTitle>{isEdit ? 'Edit Member' : 'Add Member'}</DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-4">
          {!isEdit && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="personId">Person *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    const res = await personsApi.list();
                    if (res.success && res.data) setPersons(res.data);
                  }}
                  title="Refresh person list"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <select
                id="personId"
                value={memberFormData.personId}
                onChange={(e) => setMemberFormData({ ...memberFormData, personId: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">Select a person</option>
                {availablePersons.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.displayName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="permission">Permission Level</Label>
            <select
              id="permission"
              value={memberFormData.permission}
              onChange={(e) => setMemberFormData({ ...memberFormData, permission: e.target.value as 'ADMIN' | 'MEMBER' })}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="MEMBER">Team Member</option>
              <option value="ADMIN">Team Admin</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="teamRoleId">Role</Label>
              <select
                id="teamRoleId"
                value={memberFormData.teamRoleId}
                onChange={(e) => setMemberFormData({ ...memberFormData, teamRoleId: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">None</option>
                {teamRoles.map((role) => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="positionId">Position</Label>
              <select
                id="positionId"
                value={memberFormData.positionId}
                onChange={(e) => setMemberFormData({ ...memberFormData, positionId: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">None</option>
                {positions.map((pos) => (
                  <option key={pos.id} value={pos.id}>{pos.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="jerseyNumber">Jersey #</Label>
              <Input
                id="jerseyNumber"
                value={memberFormData.jerseyNumber}
                onChange={(e) => setMemberFormData({ ...memberFormData, jerseyNumber: e.target.value })}
                placeholder="e.g., 10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={memberFormData.title}
                onChange={(e) => setMemberFormData({ ...memberFormData, title: e.target.value })}
                placeholder="e.g., Captain"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleBack}>
            Cancel
          </Button>
          <Button onClick={handleSaveMember} disabled={!isValid || isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {isEdit ? 'Save' : 'Add'}
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
        ) : viewMode === 'roster' ? (
          renderRoster()
        ) : viewMode === 'addMember' || viewMode === 'editMember' ? (
          renderMemberForm()
        ) : (
          renderForm()
        )}
      </DialogContent>
    </Dialog>
  );
}
