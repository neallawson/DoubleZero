import { useState, useEffect } from 'react';
import { teamMembersApi, type TeamMember } from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';

interface RosterPanelProps {
  onAddPlayer: (teamMember: TeamMember, teamSide: 0 | 1) => void;
  className?: string;
}

/**
 * Panel showing team roster for adding players to the playboard.
 * Allows selecting players from the current team or adding opponent placeholders.
 */
export function RosterPanel({ onAddPlayer, className = '' }: RosterPanelProps) {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'own' | 'opponent'>('own');

  // Get the first team from user's memberships
  const teamId = user?.teamMemberships?.[0]?.teamId;

  useEffect(() => {
    if (!teamId) return;

    setIsLoading(true);
    teamMembersApi.list(teamId).then((response) => {
      if (response.success && response.data) {
        // Filter to only active members with player roles
        setTeamMembers(response.data.filter((m) => m.isActive));
      }
      setIsLoading(false);
    });
  }, [teamId]);

  const handleAddPlayer = (member: TeamMember) => {
    onAddPlayer(member, activeTab === 'own' ? 0 : 1);
  };

  const handleAddGenericPlayer = (number: number) => {
    // Create a placeholder for opponent players
    const placeholder: TeamMember = {
      id: -number,
      teamId: 0,
      personId: 0,
      seasonId: 0,
      permission: 'MEMBER',
      teamRoleId: null,
      positionId: null,
      jerseyNumber: number.toString(),
      title: null,
      isActive: true,
      version: 0,
      person: {
        id: 0,
        displayName: `Player ${number}`,
        firstName: null,
        lastName: null,
      },
      role: null,
      position: null,
    };
    onAddPlayer(placeholder, 1);
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={`fixed right-4 top-1/2 -translate-y-1/2 bg-gray-800 hover:bg-gray-700 text-white px-2 py-4 rounded-l-lg shadow-lg ${className}`}
        title="Open Roster"
      >
        <span className="writing-mode-vertical text-sm">Roster</span>
      </button>
    );
  }

  return (
    <div className={`fixed right-0 top-16 bottom-16 w-64 bg-gray-800 border-l border-gray-700 shadow-xl flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <h3 className="text-sm font-semibold text-white">Add Players</h3>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab('own')}
          className={`flex-1 px-4 py-2 text-sm ${
            activeTab === 'own'
              ? 'text-white border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Your Team
        </button>
        <button
          onClick={() => setActiveTab('opponent')}
          className={`flex-1 px-4 py-2 text-sm ${
            activeTab === 'opponent'
              ? 'text-white border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Opponent
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {activeTab === 'own' ? (
          <>
            {isLoading ? (
              <div className="text-center text-gray-400 py-4">Loading...</div>
            ) : teamMembers.length === 0 ? (
              <div className="text-center text-gray-400 py-4 text-sm">
                {teamId ? 'No team members found' : 'Join a team to see roster'}
              </div>
            ) : (
              <div className="space-y-1">
                {teamMembers.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => handleAddPlayer(member)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-700 text-left"
                  >
                    <span className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                      {member.jerseyNumber || '?'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">
                        {member.person?.displayName || 'Unknown'}
                      </div>
                      {member.position && (
                        <div className="text-xs text-gray-400">
                          {member.position.shortName || member.position.name}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-gray-400 px-2 mb-3">
              Add numbered opponent players
            </p>
            <div className="grid grid-cols-4 gap-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((num) => (
                <button
                  key={num}
                  onClick={() => handleAddGenericPlayer(num)}
                  className="w-10 h-10 rounded bg-red-800 hover:bg-red-700 text-white text-sm font-bold"
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="p-2 border-t border-gray-700 text-xs text-gray-500">
        Click a player to add them to the field center
      </div>
    </div>
  );
}
