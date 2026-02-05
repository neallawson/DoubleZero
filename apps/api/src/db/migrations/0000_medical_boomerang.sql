CREATE TYPE "public"."app_role" AS ENUM('ADMIN', 'USER');--> statement-breakpoint
CREATE TYPE "public"."team_permission" AS ENUM('ADMIN', 'MEMBER', 'VIEWER');--> statement-breakpoint
CREATE TYPE "public"."official_role" AS ENUM('REFEREE', 'LINE_JUDGE', 'FOURTH_OFFICIAL');--> statement-breakpoint
CREATE TABLE "session" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255),
	"is_verified" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user_role" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"role" "app_role" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_session_state" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" varchar(255) NOT NULL,
	"active_team_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_session_state_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "person" (
	"id" serial PRIMARY KEY NOT NULL,
	"sandbox_id" integer,
	"user_id" integer,
	"display_name" varchar(100) NOT NULL,
	"first_name" varchar(50),
	"last_name" varchar(50),
	"email" varchar(255),
	"phone" varchar(20),
	"photo" text,
	"date_of_birth" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "person_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "locker_room" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"season_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team" (
	"id" serial PRIMARY KEY NOT NULL,
	"league_id" integer,
	"active_season_id" integer,
	"sandbox_id" integer,
	"name" varchar(100) NOT NULL,
	"short_name" varchar(20),
	"primary_color" varchar(20),
	"secondary_color" varchar(20),
	"icon" text,
	"icon_mime" varchar(50),
	"is_active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sandbox" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "league" (
	"id" serial PRIMARY KEY NOT NULL,
	"sandbox_id" integer,
	"name" varchar(100) NOT NULL,
	"description" text,
	"governing_body" varchar(100),
	"active_season_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "league_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "season" (
	"id" serial PRIMARY KEY NOT NULL,
	"league_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"start_date" date,
	"end_date" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "location" (
	"id" serial PRIMARY KEY NOT NULL,
	"sandbox_id" integer,
	"name" varchar(100) NOT NULL,
	"address" varchar(200),
	"city" varchar(100),
	"state" varchar(50),
	"zip" varchar(20),
	"country" varchar(50),
	"home_team_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_position" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"short_name" varchar(10),
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "player_position_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "team_member" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"person_id" integer NOT NULL,
	"season_id" integer NOT NULL,
	"permission" "team_permission" DEFAULT 'MEMBER' NOT NULL,
	"team_role_id" integer,
	"position_id" integer,
	"jersey_number" integer,
	"title" varchar(100),
	"is_active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_role" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "team_role_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "game" (
	"id" serial PRIMARY KEY NOT NULL,
	"season_id" integer NOT NULL,
	"location_id" integer,
	"sandbox_id" integer,
	"game_type_id" integer NOT NULL,
	"status_id" integer NOT NULL,
	"date" date NOT NULL,
	"start_time" varchar(10),
	"end_time" varchar(10),
	"home_team_id" integer NOT NULL,
	"away_team_id" integer NOT NULL,
	"home_score" integer,
	"away_score" integer,
	"attendance" integer,
	"weather" varchar(100),
	"notes" text,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_event" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_participant_id" integer NOT NULL,
	"event_type_id" integer NOT NULL,
	"match_minute" integer,
	"match_second" integer,
	"field_x" real,
	"field_y" real,
	"notes" text,
	"related_participant_id" integer
);
--> statement-breakpoint
CREATE TABLE "game_event_type" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "game_event_type_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "game_official" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_id" integer NOT NULL,
	"person_id" integer NOT NULL,
	"role" "official_role" NOT NULL,
	"version" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_participant" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_id" integer NOT NULL,
	"team_member_id" integer NOT NULL,
	"position_id" integer,
	"jersey_number" integer,
	"is_starter" boolean DEFAULT false NOT NULL,
	"is_captain" boolean DEFAULT false NOT NULL,
	"minutes_played" integer,
	"version" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "game_status_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "game_type" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "game_type_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"table_name" varchar(100) NOT NULL,
	"record_id" integer NOT NULL,
	"operation" varchar(10) NOT NULL,
	"user_id" integer,
	"changed_at" timestamp DEFAULT now() NOT NULL,
	"old_values" jsonb,
	"new_values" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"request_path" varchar(500)
);
--> statement-breakpoint
CREATE TABLE "audit_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"table_name" varchar(100) NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"track_old_values" boolean DEFAULT true NOT NULL,
	"track_new_values" boolean DEFAULT true NOT NULL,
	"retention_days" integer DEFAULT 90,
	CONSTRAINT "audit_settings_table_name_unique" UNIQUE("table_name")
);
--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_session_state" ADD CONSTRAINT "user_session_state_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_session_state" ADD CONSTRAINT "user_session_state_active_team_id_team_id_fk" FOREIGN KEY ("active_team_id") REFERENCES "public"."team"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person" ADD CONSTRAINT "person_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locker_room" ADD CONSTRAINT "locker_room_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sandbox" ADD CONSTRAINT "sandbox_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season" ADD CONSTRAINT "season_league_id_league_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."league"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location" ADD CONSTRAINT "location_home_team_id_team_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "public"."team"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_season_id_season_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."season"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_team_role_id_team_role_id_fk" FOREIGN KEY ("team_role_id") REFERENCES "public"."team_role"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_position_id_player_position_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."player_position"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game" ADD CONSTRAINT "game_season_id_season_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."season"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game" ADD CONSTRAINT "game_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game" ADD CONSTRAINT "game_game_type_id_game_type_id_fk" FOREIGN KEY ("game_type_id") REFERENCES "public"."game_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game" ADD CONSTRAINT "game_status_id_game_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."game_status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game" ADD CONSTRAINT "game_home_team_id_team_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "public"."team"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game" ADD CONSTRAINT "game_away_team_id_team_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "public"."team"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_event" ADD CONSTRAINT "game_event_game_participant_id_game_participant_id_fk" FOREIGN KEY ("game_participant_id") REFERENCES "public"."game_participant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_event" ADD CONSTRAINT "game_event_event_type_id_game_event_type_id_fk" FOREIGN KEY ("event_type_id") REFERENCES "public"."game_event_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_event" ADD CONSTRAINT "game_event_related_participant_id_game_participant_id_fk" FOREIGN KEY ("related_participant_id") REFERENCES "public"."game_participant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_official" ADD CONSTRAINT "game_official_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_official" ADD CONSTRAINT "game_official_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_participant" ADD CONSTRAINT "game_participant_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_participant" ADD CONSTRAINT "game_participant_team_member_id_team_member_id_fk" FOREIGN KEY ("team_member_id") REFERENCES "public"."team_member"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_participant" ADD CONSTRAINT "game_participant_position_id_player_position_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."player_position"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;