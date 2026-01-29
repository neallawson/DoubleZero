import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  teamsApi, 
  teamMembersApi, 
  personsApi, 
  lookupsApi,
  type Team, 
  type TeamMember, 
  type Person,
  type TeamRole,
  type PlayerPosition
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { 
  Users, 
  UserPlus, 
  Pencil, 
  Trash2, 
  Loader2,
  ChevronRight,
  Shield,
  ArrowLeft,
  RefreshCw,
  Calendar,
  Info
} from 'lucide-react';

type ViewMode = 'teams' | 'teamDetail' | 'addMember' | 'editMember';

export function TeamManagementPage() {
  useAuth(); // Verify user is authenticated
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [teamRoles, setTeamRoles] = useState<TeamRole[]>([]);
  const [positions, setPositions] = useState<PlayerPosition[]>([]);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('teams');
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state for add/edit member
  const [formData, setFormData] = useState({
    personId: '',
    permission: 'MEMBER' as 'ADMIN' | 'MEMBER',
    teamRoleId: '',
    positionId: '',
    jerseyNumber: '',
    title: '',
  });

  useEffect(() => {
    loadTeams();
    loadLookups();
  }, []);

  async function loadTeams() {
    setIsLoading(true);
    const response = await teamsApi.list();
    setIsLoading(false);
    if (response.success && response.data) {
      setTeams(response.data);
    } else {
      setError(response.error?.message || 'Failed to load teams');
    }
  }

  async function loadLookups() {
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
      setError(response.error?.message || 'Failed to load team members');
    }
  }

  function handleSelectTeam(team: Team) {
    setSelectedTeam(team);
    setViewMode('teamDetail');
    setActiveTab('overview');
    loadMembers(team.id);
  }

  function handleBack() {
    if (viewMode === 'teamDetail') {
      setViewMode('teams');
      setSelectedTeam(null);
      setMembers([]);
    } else if (viewMode === 'addMember' || viewMode === 'editMember') {
      setViewMode('teamDetail');
      setActiveTab('roster');
      setSelectedMember(null);
    }
  }

  function handleAddMember() {
    setFormData({
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
    setFormData({
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
      personId: parseInt(formData.personId, 10),
      seasonId: selectedTeam.activeSeasonId!,
      permission: formData.permission,
      teamRoleId: formData.teamRoleId ? parseInt(formData.teamRoleId, 10) : undefined,
      positionId: formData.positionId ? parseInt(formData.positionId, 10) : undefined,
      jerseyNumber: formData.jerseyNumber || undefined,
      title: formData.title || undefined,
    };

    if (viewMode === 'addMember') {
      const response = await teamMembersApi.create(selectedTeam.id, payload);
      setIsLoading(false);
      if (response.success) {
        await loadMembers(selectedTeam.id);
        setViewMode('teamDetail');
        setActiveTab('roster');
      } else {
        const errMsg = response.error?.message || 'Failed to add member';
        const errCode = response.error?.code || 'UNKNOWN';
        setError(`${errMsg} (Code: ${errCode}, Payload: personId=${payload.personId}, seasonId=${payload.seasonId})`);
      }
    } else if (viewMode === 'editMember' && selectedMember) {
      const response = await teamMembersApi.update(selectedTeam.id, selectedMember.id, {
        permission: formData.permission,
        teamRoleId: formData.teamRoleId ? parseInt(formData.teamRoleId, 10) : undefined,
        positionId: formData.positionId ? parseInt(formData.positionId, 10) : undefined,
        jerseyNumber: formData.jerseyNumber || undefined,
        title: formData.title || undefined,
        version: selectedMember.version,
      });
      setIsLoading(false);
      if (response.success) {
        await loadMembers(selectedTeam.id);
        setViewMode('teamDetail');
        setActiveTab('roster');
        setSelectedMember(null);
      } else {
        const errMsg = response.error?.message || 'Failed to update member';
        const errCode = response.error?.code || 'UNKNOWN';
        setError(`${errMsg} (Code: ${errCode})`);
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

  function renderTeamsList() {
    return (
      <>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Team Management</h1>
        <p className="text-muted-foreground mb-6">
          Select a team to manage its roster and settings.
        </p>

        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-md mb-6">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Teams ({teams.length})
            </CardTitle>
            <CardDescription>Select a team to manage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {teams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => handleSelectTeam(team)}
                  className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {team.primaryColor && (
                      <div 
                        className="w-4 h-4 rounded-full border flex-shrink-0" 
                        style={{ backgroundColor: team.primaryColor }}
                      />
                    )}
                    <div className="min-w-0">
                      <div className="font-medium truncate">{team.name}</div>
                      {team.shortName && (
                        <div className="text-sm text-muted-foreground">{team.shortName}</div>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </button>
              ))}
              {teams.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No teams found. Create a team first using the Manage Data menu.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  function renderTeamDetail() {
    if (!selectedTeam) return null;

    return (
      <>
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            {selectedTeam.primaryColor && (
              <div 
                className="w-8 h-8 rounded-full border-2 flex-shrink-0" 
                style={{ backgroundColor: selectedTeam.primaryColor }}
              />
            )}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">{selectedTeam.name}</h1>
              <p className="text-muted-foreground text-sm">Team Management</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {!selectedTeam.activeSeasonId ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <p>This team has no active season set.</p>
              <p className="text-sm mt-2">Set an active season in Manage Data → Teams to enable roster and game management.</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="roster" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Roster</span>
              </TabsTrigger>
              <TabsTrigger value="games" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Games</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              {renderOverviewTab()}
            </TabsContent>

            <TabsContent value="roster" className="mt-4">
              {renderRosterTab()}
            </TabsContent>

            <TabsContent value="games" className="mt-4">
              {renderGamesTab()}
            </TabsContent>
          </Tabs>
        )}
      </>
    );
  }

  function renderOverviewTab() {
    if (!selectedTeam) return null;
    const adminCount = members.filter(m => m.permission === 'ADMIN').length;
    const memberCount = members.filter(m => m.permission === 'MEMBER').length;

    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Team Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <span className="text-sm text-muted-foreground">Full Name:</span>
                <p className="font-medium">{selectedTeam.name}</p>
              </div>
              {selectedTeam.shortName && (
                <div>
                  <span className="text-sm text-muted-foreground">Short Name:</span>
                  <p className="font-medium">{selectedTeam.shortName}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setActiveTab('roster')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Roster
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{members.length}</p>
            <p className="text-sm text-muted-foreground">
              {adminCount} admin{adminCount !== 1 ? 's' : ''}, {memberCount} member{memberCount !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderRosterTab() {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Roster ({members.length})
              </CardTitle>
              <CardDescription>Team members for the current season</CardDescription>
            </div>
            <Button size="sm" onClick={handleAddMember} disabled={availablePersons.length === 0}>
              <UserPlus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Add Member</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="p-3 rounded-lg border border-border flex items-center justify-between"
              >
                <div className="min-w-0">
                  <div className="font-medium flex items-center gap-2">
                    {member.person?.displayName || 'Unknown'}
                    {member.permission === 'ADMIN' && (
                      <Shield className="h-3 w-3 text-amber-600" />
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground flex flex-wrap gap-2">
                    {member.role && <span>{member.role.name}</span>}
                    {member.position && <span>• {member.position.name}</span>}
                    {member.jerseyNumber && <span>• #{member.jerseyNumber}</span>}
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
            {members.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No members on this team yet. Add members to build your roster.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  function renderGamesTab() {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Games
          </CardTitle>
          <CardDescription>Scheduled and completed games</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Game management coming soon. Create games using Manage Data → Games.
          </p>
        </CardContent>
      </Card>
    );
  }

  function renderMemberForm() {
    const isEdit = viewMode === 'editMember';
    const isValid = formData.personId || isEdit;

    return (
      <>
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              {isEdit ? 'Edit Member' : 'Add Member'}
            </h1>
            <p className="text-muted-foreground">{selectedTeam?.name}</p>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-md mb-6">
            {error}
          </div>
        )}

        <Card>
          <CardContent className="pt-6 space-y-4">
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
                  value={formData.personId}
                  onChange={(e) => setFormData({ ...formData, personId: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">Select a person</option>
                  {availablePersons.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.displayName}
                    </option>
                  ))}
                </select>
                {availablePersons.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    All persons are already on this team, or no persons exist.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="permission">Permission Level</Label>
              <select
                id="permission"
                value={formData.permission}
                onChange={(e) => setFormData({ ...formData, permission: e.target.value as 'ADMIN' | 'MEMBER' })}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="MEMBER">Team Member</option>
                <option value="ADMIN">Team Admin (can manage roster)</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="teamRoleId">Team Role</Label>
                <select
                  id="teamRoleId"
                  value={formData.teamRoleId}
                  onChange={(e) => setFormData({ ...formData, teamRoleId: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">No role</option>
                  {teamRoles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="positionId">Position</Label>
                <select
                  id="positionId"
                  value={formData.positionId}
                  onChange={(e) => setFormData({ ...formData, positionId: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">No position</option>
                  {positions.map((pos) => (
                    <option key={pos.id} value={pos.id}>
                      {pos.name} {pos.shortName && `(${pos.shortName})`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="jerseyNumber">Jersey Number</Label>
                <Input
                  id="jerseyNumber"
                  value={formData.jerseyNumber}
                  onChange={(e) => setFormData({ ...formData, jerseyNumber: e.target.value })}
                  placeholder="e.g., 10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Captain"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleBack}>
                Cancel
              </Button>
              <Button onClick={handleSaveMember} disabled={!isValid || isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEdit ? 'Save Changes' : 'Add Member'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  if (isLoading && viewMode === 'teams') {
    return (
      <div className="p-4 sm:p-6 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      {viewMode === 'teams' && renderTeamsList()}
      {viewMode === 'teamDetail' && renderTeamDetail()}
      {(viewMode === 'addMember' || viewMode === 'editMember') && renderMemberForm()}
    </div>
  );
}
