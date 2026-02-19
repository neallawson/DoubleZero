import type { Response } from 'express';

/**
 * Field name to human-readable label mapping.
 * Keys are camelCase (matching Zod schema field names and JS conventions).
 */
const FIELD_LABELS: Record<string, string> = {
  // Common
  name: 'Name',
  description: 'Description',
  version: 'Version',
  isActive: 'Active status',

  // Person
  displayName: 'Display name',
  firstName: 'First name',
  lastName: 'Last name',
  email: 'Email',
  phone: 'Phone',
  dateOfBirth: 'Date of birth',
  userId: 'User',

  // Team / League
  shortName: 'Short name',
  leagueId: 'League',
  activeSeasonId: 'Active season',
  homeLocationId: 'Home location',
  primaryColor: 'Primary color',
  secondaryColor: 'Secondary color',
  governingBody: 'Governing body',

  // Season
  startDate: 'Start date',
  endDate: 'End date',

  // Location
  address: 'Address',
  city: 'City',
  state: 'State',
  zip: 'ZIP code',
  country: 'Country',
  homeTeamId: 'Home team',
  latitude: 'Latitude',
  longitude: 'Longitude',

  // Game
  seasonId: 'Season',
  locationId: 'Location',
  gameTypeId: 'Game type',
  statusId: 'Game status',
  date: 'Date',
  startTime: 'Start time',
  endTime: 'End time',
  awayTeamId: 'Away team',
  homeScore: 'Home score',
  awayScore: 'Away score',
  attendance: 'Attendance',
  weather: 'Weather',
  notes: 'Notes',

  // Team member
  personId: 'Person',
  teamRoleId: 'Team role',
  positionId: 'Position',
  jerseyNumber: 'Jersey number',
  title: 'Title',
  permission: 'Permission',
  teamId: 'Team',

  // Play
  ownerId: 'Owner',
  fieldTemplateId: 'Field template',
  clientId: 'Client ID',
  xMeters: 'X position',
  yMeters: 'Y position',
  annotationType: 'Annotation type',
  teamMemberId: 'Team member',
  displayNumber: 'Display number',
  teamColorOverride: 'Team color',
  teamSide: 'Team side',
  zIndex: 'Layer order',
  viewportZoom: 'Zoom',
  viewportPanX: 'Pan X',
  viewportPanY: 'Pan Y',
  startX: 'Start X',
  startY: 'Start Y',
  endX: 'End X',
  endY: 'End Y',
  color: 'Color',
  strokeWidth: 'Stroke width',
  tags: 'Tags',

  // User
  password: 'Password',
  role: 'Role',

  // Lookup
  sortOrder: 'Sort order',
};

/**
 * Converts snake_case to camelCase.
 */
function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

/**
 * Returns a human-readable label for a field name.
 * Accepts both camelCase and snake_case.
 */
export function labelForField(field: string): string {
  // Try camelCase lookup first
  if (FIELD_LABELS[field]) return FIELD_LABELS[field];
  // Try converting from snake_case
  const camel = snakeToCamel(field);
  if (FIELD_LABELS[camel]) return FIELD_LABELS[camel];
  // Fallback: humanize the field name
  return field
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\bid\b/gi, 'ID')
    .replace(/^./, c => c.toUpperCase());
}

interface PostgresError {
  code?: string;
  column_name?: string;
  constraint_name?: string;
  detail?: string;
  table_name?: string;
}

/**
 * Handles errors from route catch blocks.
 * Maps Postgres constraint violations to user-friendly messages.
 * Falls back to the provided generic message for unexpected errors.
 */
export function handleRouteError(res: Response, error: unknown, fallbackMessage: string): void {
  const pgError = error as PostgresError;

  // Postgres NOT NULL violation
  if (pgError.code === '23502' && pgError.column_name) {
    const label = labelForField(pgError.column_name);
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: `${label} is required`,
        details: [{ field: pgError.column_name, message: `${label} is required` }],
      },
    });
    return;
  }

  // Postgres unique violation
  if (pgError.code === '23505') {
    // detail is like: Key (email)=(foo@bar.com) already exists.
    const match = pgError.detail?.match(/Key \((.+?)\)=\((.+?)\)/);
    if (match) {
      const label = labelForField(match[1]!);
      res.status(409).json({
        success: false,
        error: {
          code: 'CONFLICT',
          message: `${label} "${match[2]}" already exists`,
          details: [{ field: match[1]!, message: `${label} already exists` }],
        },
      });
      return;
    }
    res.status(409).json({
      success: false,
      error: { code: 'CONFLICT', message: 'A record with that value already exists' },
    });
    return;
  }

  // Postgres foreign key violation
  if (pgError.code === '23503') {
    const match = pgError.detail?.match(/Key \((.+?)\)=\((.+?)\)/);
    if (match) {
      const label = labelForField(match[1]!);
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `${label} value "${match[2]}" does not exist`,
          details: [{ field: match[1]!, message: `${label} not found` }],
        },
      });
      return;
    }
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Referenced record not found' },
    });
    return;
  }

  // Postgres check constraint violation
  if (pgError.code === '23514') {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Value out of allowed range' },
    });
    return;
  }

  // Unknown error — log and return generic message
  console.error(`${fallbackMessage}:`, error);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: fallbackMessage },
  });
}
