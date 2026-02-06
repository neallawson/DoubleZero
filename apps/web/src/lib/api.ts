const API_BASE = '/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();
      return data as ApiResponse<T>;
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network error',
        },
      };
    }
  }

  get<T>(path: string) {
    return this.request<T>('GET', path);
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>('POST', path, body);
  }

  patch<T>(path: string, body?: unknown) {
    return this.request<T>('PATCH', path, body);
  }

  put<T>(path: string, body?: unknown) {
    return this.request<T>('PUT', path, body);
  }

  delete<T>(path: string) {
    return this.request<T>('DELETE', path);
  }
}

export const api = new ApiClient();

// Auth API
export interface TeamMembership {
  teamId: number;
  teamName: string;
  permission: 'ADMIN' | 'MEMBER' | 'VIEWER';
  seasonId: number;
}

export interface User {
  id: number;
  email: string;
  isVerified: boolean;
  isActive: boolean;
  roles: string[];
  teamMemberships?: TeamMembership[];
  person?: {
    id: number;
    displayName: string;
  } | null;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { email, password }),

  register: (email: string, password: string) =>
    api.post<LoginResponse>('/auth/register', { email, password }),

  logout: () => api.post('/auth/logout'),

  me: () => api.get<User>('/auth/me'),
};

// Leagues API
export interface League {
  id: number;
  name: string;
  description: string | null;
  governingBody: string | null;
  activeSeasonId: number | null;
  isActive: boolean;
  version: number;
  createdAt: string;
}

export interface Season {
  id: number;
  leagueId: number;
  name: string;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  version: number;
  createdAt: string;
}

export const leaguesApi = {
  list: () => api.get<League[]>('/v1/leagues'),
  get: (id: number) => api.get<League>(`/v1/leagues/${id}`),
  create: (data: Partial<League>) => api.post<League>('/v1/leagues', data),
  update: (id: number, data: Partial<League>) => api.patch<League>(`/v1/leagues/${id}`, data),
  delete: (id: number) => api.delete(`/v1/leagues/${id}`),

  // Seasons
  listSeasons: (leagueId: number) => api.get<Season[]>(`/v1/leagues/${leagueId}/seasons`),
  getSeason: (leagueId: number, id: number) => api.get<Season>(`/v1/leagues/${leagueId}/seasons/${id}`),
  createSeason: (leagueId: number, data: Partial<Season>) => api.post<Season>(`/v1/leagues/${leagueId}/seasons`, data),
  updateSeason: (leagueId: number, id: number, data: Partial<Season>) => api.patch<Season>(`/v1/leagues/${leagueId}/seasons/${id}`, data),
  deleteSeason: (leagueId: number, id: number) => api.delete(`/v1/leagues/${leagueId}/seasons/${id}`),
};

// Teams API
export interface Team {
  id: number;
  leagueId: number | null;
  activeSeasonId: number | null;
  name: string;
  shortName: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  isActive: boolean;
  version: number;
}

export const teamsApi = {
  list: () => api.get<Team[]>('/v1/teams'),
  get: (id: number) => api.get<Team>(`/v1/teams/${id}`),
  create: (data: Partial<Team>) => api.post<Team>('/v1/teams', data),
  update: (id: number, data: Partial<Team>) => api.patch<Team>(`/v1/teams/${id}`, data),
  delete: (id: number) => api.delete(`/v1/teams/${id}`),
};

// Locations API
export interface Location {
  id: number;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  homeTeamId: number | null;
  isActive: boolean;
  version: number;
  createdAt: string;
}

export const locationsApi = {
  list: () => api.get<Location[]>('/v1/locations'),
  get: (id: number) => api.get<Location>(`/v1/locations/${id}`),
  create: (data: Partial<Location>) => api.post<Location>('/v1/locations', data),
  update: (id: number, data: Partial<Location>) => api.patch<Location>(`/v1/locations/${id}`, data),
  delete: (id: number) => api.delete(`/v1/locations/${id}`),
};

// Persons API
export interface Person {
  id: number;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  userId: number | null;
  isActive: boolean;
  version: number;
  createdAt: string;
}

export const personsApi = {
  list: () => api.get<Person[]>('/v1/persons'),
  get: (id: number) => api.get<Person>(`/v1/persons/${id}`),
  create: (data: Partial<Person>) => api.post<Person>('/v1/persons', data),
  update: (id: number, data: Partial<Person>) => api.patch<Person>(`/v1/persons/${id}`, data),
  delete: (id: number) => api.delete(`/v1/persons/${id}`),
};

// Games API
export interface Game {
  id: number;
  seasonId: number;
  locationId: number | null;
  gameTypeId: number | null;
  statusId: number | null;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  homeTeamId: number;
  awayTeamId: number;
  homeScore: number | null;
  awayScore: number | null;
  attendance: number | null;
  weather: string | null;
  notes: string | null;
  version: number;
  createdAt: string;
}

export const gamesApi = {
  list: (params?: { teamId?: number; seasonId?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.teamId) searchParams.set('teamId', params.teamId.toString());
    if (params?.seasonId) searchParams.set('seasonId', params.seasonId.toString());
    const query = searchParams.toString();
    return api.get<Game[]>(`/v1/games${query ? `?${query}` : ''}`);
  },
  get: (id: number) => api.get<Game>(`/v1/games/${id}`),
  create: (data: Partial<Game>) => api.post<Game>('/v1/games', data),
  update: (id: number, data: Partial<Game>) => api.patch<Game>(`/v1/games/${id}`, data),
  delete: (id: number) => api.delete(`/v1/games/${id}`),
};

// Users API (Admin)
export interface AdminUser {
  id: number;
  email: string;
  isVerified: boolean;
  isActive: boolean;
  version: number;
  createdAt: string;
  roles: ('ADMIN' | 'USER')[];
  person: Person | null;
}

export const usersApi = {
  list: () => api.get<AdminUser[]>('/v1/users'),
  get: (id: number) => api.get<AdminUser>(`/v1/users/${id}`),
  create: (data: { email: string; password: string }) => api.post<AdminUser>('/v1/users', data),
  update: (id: number, data: { isActive?: boolean; isVerified?: boolean; version: number }) => 
    api.patch<AdminUser>(`/v1/users/${id}`, data),
  addRole: (id: number, role: 'ADMIN' | 'USER') => api.post(`/v1/users/${id}/roles`, { role }),
  removeRole: (id: number, role: 'ADMIN' | 'USER') => api.delete(`/v1/users/${id}/roles/${role}`),
  linkPerson: (id: number, personId: number) => api.post(`/v1/users/${id}/link-person`, { personId }),
  unlinkPerson: (id: number) => api.delete(`/v1/users/${id}/link-person`),
};

// Team Members API
export interface TeamMember {
  id: number;
  teamId: number;
  personId: number;
  seasonId: number;
  permission: 'ADMIN' | 'MEMBER' | 'VIEWER';
  teamRoleId: number | null;
  positionId: number | null;
  jerseyNumber: string | null;
  title: string | null;
  isActive: boolean;
  version: number;
  person: {
    id: number;
    displayName: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
  role: {
    id: number;
    name: string;
  } | null;
  position: {
    id: number;
    name: string;
    shortName: string | null;
  } | null;
}

export const teamMembersApi = {
  list: (teamId: number) => api.get<TeamMember[]>(`/v1/teams/${teamId}/members`),
  get: (teamId: number, id: number) => api.get<TeamMember>(`/v1/teams/${teamId}/members/${id}`),
  create: (teamId: number, data: {
    personId: number;
    seasonId: number;
    permission?: 'ADMIN' | 'MEMBER';
    teamRoleId?: number;
    positionId?: number;
    jerseyNumber?: string;
    title?: string;
  }) => api.post<TeamMember>(`/v1/teams/${teamId}/members`, data),
  update: (teamId: number, id: number, data: {
    permission?: 'ADMIN' | 'MEMBER';
    teamRoleId?: number;
    positionId?: number;
    jerseyNumber?: string;
    title?: string;
    isActive?: boolean;
    version: number;
  }) => api.patch<TeamMember>(`/v1/teams/${teamId}/members/${id}`, data),
  delete: (teamId: number, id: number) => api.delete(`/v1/teams/${teamId}/members/${id}`),
};

// Lookups API (for team roles, positions, etc.)
export interface TeamRole {
  id: number;
  name: string;
  description: string | null;
}

export interface PlayerPosition {
  id: number;
  name: string;
  shortName: string | null;
  category: string | null;
}

export const lookupsApi = {
  teamRoles: () => api.get<TeamRole[]>('/v1/lookups/team-roles'),
  playerPositions: () => api.get<PlayerPosition[]>('/v1/lookups/player-positions'),
};

// Plays API (Playboard Composer)
export type AnnotationType = 'LINE' | 'ARROW' | 'DASHED_LINE' | 'DASHED_ARROW';

export interface PlayPlayer {
  id?: number;
  teamMemberId: number | null;
  xMeters: number;
  yMeters: number;
  displayNumber: number | null;
  displayName: string | null;
  teamColorOverride: string | null;
  teamSide: number;
  zIndex: number;
}

export interface PlayAnnotation {
  id?: number;
  annotationType: AnnotationType;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  strokeWidth: number;
  zIndex: number;
}

export interface Play {
  id: number;
  ownerId: number;
  teamId: number | null;
  name: string;
  description: string | null;
  tags: string[] | null;
  fieldTemplateId: number | null;
  viewportZoom: number | null;
  viewportPanX: number | null;
  viewportPanY: number | null;
  clientId: string | null;
  lastSyncedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  players?: PlayPlayer[];
  annotations?: PlayAnnotation[];
}

export interface FieldTemplate {
  id: number;
  name: string;
  description: string | null;
  lengthMeters: number;
  widthMeters: number;
  originPosition: string;
  markings: Record<string, number> | null;
  isDefault: boolean;
}

export const playsApi = {
  list: (params?: { teamId?: number; tags?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.teamId) searchParams.set('teamId', params.teamId.toString());
    if (params?.tags) searchParams.set('tags', params.tags);
    const query = searchParams.toString();
    return api.get<Play[]>(`/v1/plays${query ? `?${query}` : ''}`);
  },
  get: (id: number) => api.get<Play>(`/v1/plays/${id}`),
  create: (data: {
    name: string;
    description?: string;
    tags?: string[];
    teamId?: number;
    fieldTemplateId?: number;
    clientId?: string;
  }) => api.post<Play>('/v1/plays', data),
  update: (id: number, data: {
    name?: string;
    description?: string;
    tags?: string[];
    viewportZoom?: number;
    viewportPanX?: number;
    viewportPanY?: number;
    version: number;
  }) => api.patch<Play>(`/v1/plays/${id}`, data),
  delete: (id: number) => api.delete(`/v1/plays/${id}`),

  // Bulk operations for players and annotations
  updatePlayers: (playId: number, players: PlayPlayer[]) =>
    api.put<PlayPlayer[]>(`/v1/plays/${playId}/players`, { players }),
  updateAnnotations: (playId: number, annotations: PlayAnnotation[]) =>
    api.put<PlayAnnotation[]>(`/v1/plays/${playId}/annotations`, { annotations }),

  // Field templates
  getFieldTemplates: () => api.get<FieldTemplate[]>('/v1/plays/field-templates'),

  // Offline sync
  sync: (data: {
    plays: Array<{
      clientId: string;
      serverId?: number;
      play: {
        name: string;
        description?: string;
        tags?: string[];
        fieldTemplateId?: number;
      };
      players: PlayPlayer[];
      annotations: PlayAnnotation[];
      deletedAt?: string;
    }>;
  }) => api.post<{
    results: Array<{
      clientId: string;
      serverId: number | null;
      status: 'created' | 'updated' | 'deleted' | 'error';
      message?: string;
    }>;
    serverTimestamp: string;
  }>('/v1/plays/sync', data),
};
