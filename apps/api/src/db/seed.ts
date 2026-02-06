import 'dotenv/config';
import { db } from './index.js';
import { teamRole, playerPosition, gameType, gameStatus, gameEventType, fieldTemplate } from './schema/index.js';

async function seed() {
  console.log('🌱 Seeding database...');

  // Seed team roles (descriptive labels, not permissions)
  console.log('  → Team roles...');
  await db.insert(teamRole).values([
    { name: 'Head Coach', description: 'Head coach of the team' },
    { name: 'Assistant Coach', description: 'Assistant coach' },
    { name: 'Goalkeeper Coach', description: 'Specialized goalkeeper coach' },
    { name: 'Manager', description: 'Team manager' },
    { name: 'Player', description: 'Team player' },
    { name: 'Goalkeeper', description: 'Team goalkeeper' },
    { name: 'Parent', description: 'Parent or guardian of a player' },
    { name: 'Volunteer', description: 'Team volunteer' },
  ]).onConflictDoNothing();

  // Seed player positions (soccer field positions)
  console.log('  → Player positions...');
  await db.insert(playerPosition).values([
    { name: 'Goalkeeper', shortName: 'GK', description: 'Goalkeeper' },
    { name: 'Right Back', shortName: 'RB', description: 'Right defender' },
    { name: 'Left Back', shortName: 'LB', description: 'Left defender' },
    { name: 'Center Back', shortName: 'CB', description: 'Central defender' },
    { name: 'Defensive Midfielder', shortName: 'CDM', description: 'Defensive midfielder' },
    { name: 'Central Midfielder', shortName: 'CM', description: 'Central midfielder' },
    { name: 'Attacking Midfielder', shortName: 'CAM', description: 'Attacking midfielder' },
    { name: 'Right Midfielder', shortName: 'RM', description: 'Right midfielder' },
    { name: 'Left Midfielder', shortName: 'LM', description: 'Left midfielder' },
    { name: 'Right Winger', shortName: 'RW', description: 'Right winger' },
    { name: 'Left Winger', shortName: 'LW', description: 'Left winger' },
    { name: 'Striker', shortName: 'ST', description: 'Center forward / Striker' },
    { name: 'Center Forward', shortName: 'CF', description: 'Center forward' },
  ]).onConflictDoNothing();

  // Seed game types
  console.log('  → Game types...');
  await db.insert(gameType).values([
    { name: 'League', description: 'Regular league match' },
    { name: 'Friendly', description: 'Friendly / exhibition match' },
    { name: 'Tournament', description: 'Tournament match' },
    { name: 'Cup', description: 'Cup competition match' },
    { name: 'Playoff', description: 'Playoff match' },
    { name: 'Scrimmage', description: 'Practice scrimmage' },
  ]).onConflictDoNothing();

  // Seed game statuses
  console.log('  → Game statuses...');
  await db.insert(gameStatus).values([
    { name: 'Scheduled' },
    { name: 'In Progress' },
    { name: 'Completed' },
    { name: 'Cancelled' },
    { name: 'Postponed' },
    { name: 'Forfeit' },
  ]).onConflictDoNothing();

  // Seed game event types
  console.log('  → Game event types...');
  await db.insert(gameEventType).values([
    { name: 'Goal', description: 'Goal scored' },
    { name: 'Own Goal', description: 'Own goal' },
    { name: 'Assist', description: 'Goal assist' },
    { name: 'Yellow Card', description: 'Yellow card issued' },
    { name: 'Red Card', description: 'Red card issued' },
    { name: 'Second Yellow', description: 'Second yellow card (red)' },
    { name: 'Substitution In', description: 'Player substituted in' },
    { name: 'Substitution Out', description: 'Player substituted out' },
    { name: 'Injury', description: 'Player injury' },
    { name: 'Penalty Kick', description: 'Penalty kick awarded' },
    { name: 'Penalty Scored', description: 'Penalty kick scored' },
    { name: 'Penalty Missed', description: 'Penalty kick missed' },
    { name: 'Penalty Saved', description: 'Penalty kick saved' },
    { name: 'Free Kick', description: 'Free kick awarded' },
    { name: 'Corner Kick', description: 'Corner kick' },
    { name: 'Offside', description: 'Offside called' },
    { name: 'Foul', description: 'Foul committed' },
    { name: 'Shot on Target', description: 'Shot on target' },
    { name: 'Shot off Target', description: 'Shot off target' },
    { name: 'Save', description: 'Goalkeeper save' },
    { name: 'Timeout', description: 'Timeout called' },
    { name: 'Half Time', description: 'Half time' },
    { name: 'Full Time', description: 'Full time' },
  ]).onConflictDoNothing();

  // Seed field templates for playboard
  console.log('  → Field templates...');
  await db.insert(fieldTemplate).values([
    {
      name: 'Standard 11v11',
      description: 'Standard full-size 11v11 soccer pitch (100m x 64m)',
      lengthMeters: 100,
      widthMeters: 64,
      originPosition: 'center',
      isDefault: true,
      markings: {
        centerCircleRadius: 9.15,
        penaltyAreaLength: 16.5,
        penaltyAreaWidth: 40.3,
        goalAreaLength: 5.5,
        goalAreaWidth: 18.3,
        penaltySpotDistance: 11,
        cornerArcRadius: 1,
        goalWidth: 7.32,
      },
    },
  ]).onConflictDoNothing();

  console.log('✅ Seeding complete!');
}

seed()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
