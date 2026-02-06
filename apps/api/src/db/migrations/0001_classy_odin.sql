CREATE TYPE "public"."annotation_type" AS ENUM('LINE', 'ARROW', 'DASHED_LINE', 'DASHED_ARROW');--> statement-breakpoint
CREATE TABLE "field_template" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"length_meters" real DEFAULT 100 NOT NULL,
	"width_meters" real DEFAULT 64 NOT NULL,
	"origin_position" varchar(20) DEFAULT 'center' NOT NULL,
	"markings" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "play" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" integer NOT NULL,
	"team_id" integer,
	"sandbox_id" integer,
	"name" varchar(200) NOT NULL,
	"description" text,
	"tags" text[],
	"field_template_id" integer,
	"viewport_zoom" real DEFAULT 1,
	"viewport_pan_x" real DEFAULT 0,
	"viewport_pan_y" real DEFAULT 0,
	"client_id" varchar(100),
	"last_synced_at" timestamp,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "play_annotation" (
	"id" serial PRIMARY KEY NOT NULL,
	"play_id" integer NOT NULL,
	"annotation_type" "annotation_type" NOT NULL,
	"start_x" real NOT NULL,
	"start_y" real NOT NULL,
	"end_x" real NOT NULL,
	"end_y" real NOT NULL,
	"color" varchar(20) DEFAULT '#ffffff',
	"stroke_width" real DEFAULT 2,
	"z_index" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "play_player" (
	"id" serial PRIMARY KEY NOT NULL,
	"play_id" integer NOT NULL,
	"team_member_id" integer,
	"x_meters" real NOT NULL,
	"y_meters" real NOT NULL,
	"display_number" integer,
	"display_name" varchar(50),
	"team_color_override" varchar(20),
	"team_side" integer DEFAULT 0 NOT NULL,
	"z_index" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "play" ADD CONSTRAINT "play_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play" ADD CONSTRAINT "play_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play" ADD CONSTRAINT "play_field_template_id_field_template_id_fk" FOREIGN KEY ("field_template_id") REFERENCES "public"."field_template"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play_annotation" ADD CONSTRAINT "play_annotation_play_id_play_id_fk" FOREIGN KEY ("play_id") REFERENCES "public"."play"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play_player" ADD CONSTRAINT "play_player_play_id_play_id_fk" FOREIGN KEY ("play_id") REFERENCES "public"."play"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play_player" ADD CONSTRAINT "play_player_team_member_id_team_member_id_fk" FOREIGN KEY ("team_member_id") REFERENCES "public"."team_member"("id") ON DELETE no action ON UPDATE no action;