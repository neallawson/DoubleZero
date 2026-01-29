-- MariaDB dump 10.19  Distrib 10.5.23-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: doublezero
-- ------------------------------------------------------
-- Server version	10.5.23-MariaDB-1:10.5.23+maria~ubu2004

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `_migrations`
--

DROP TABLE IF EXISTS `_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `_migrations` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `applied_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `app_config`
--

DROP TABLE IF EXISTS `app_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `app_config` (
  `key_name` varchar(100) NOT NULL,
  `value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`value`)),
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `version` int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`key_name`),
  KEY `fk_app_config_created_by` (`created_by`),
  KEY `fk_app_config_updated_by` (`updated_by`),
  CONSTRAINT `fk_app_config_created_by` FOREIGN KEY (`created_by`) REFERENCES `user` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_app_config_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `auth_refresh_tokens`
--

DROP TABLE IF EXISTS `auth_refresh_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `auth_refresh_tokens` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `token_hash` char(64) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `revoked_at` datetime DEFAULT NULL,
  `replaced_by_token_hash` char(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_auth_rt_token_hash` (`token_hash`),
  KEY `idx_auth_rt_user` (`user_id`),
  KEY `idx_auth_rt_expires` (`expires_at`),
  CONSTRAINT `fk_auth_rt_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `email_verification_tokens`
--

DROP TABLE IF EXISTS `email_verification_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `email_verification_tokens` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `token` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `used_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_email_verification_token` (`token`),
  KEY `idx_evt_user` (`user_id`),
  KEY `idx_evt_expires` (`expires_at`),
  CONSTRAINT `fk_evt_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `game`
--

DROP TABLE IF EXISTS `game`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `game` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `date` date DEFAULT NULL,
  `starting_time` time DEFAULT NULL,
  `ending_time` time DEFAULT NULL,
  `location_id` bigint(20) unsigned DEFAULT NULL,
  `season_id` bigint(20) unsigned NOT NULL,
  `team1_id` bigint(20) unsigned NOT NULL,
  `team2_id` bigint(20) unsigned NOT NULL,
  `referee_id` bigint(20) unsigned DEFAULT NULL,
  `team1_score` smallint(5) unsigned DEFAULT NULL,
  `team2_score` smallint(5) unsigned DEFAULT NULL,
  `game_type_id` bigint(20) unsigned NOT NULL,
  `status_id` bigint(20) unsigned NOT NULL,
  `attendance_count` int(10) unsigned DEFAULT NULL,
  `weather_conditions` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `version` int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_game_is_deleted` (`is_deleted`),
  KEY `idx_game_season` (`season_id`),
  KEY `idx_game_location` (`location_id`),
  KEY `idx_game_team1` (`team1_id`),
  KEY `idx_game_team2` (`team2_id`),
  KEY `idx_game_type` (`game_type_id`),
  KEY `idx_game_status` (`status_id`),
  KEY `fk_game_referee` (`referee_id`),
  KEY `fk_game_created_by` (`created_by`),
  KEY `fk_game_updated_by` (`updated_by`),
  KEY `idx_game_is_active` (`is_active`),
  CONSTRAINT `fk_game_created_by` FOREIGN KEY (`created_by`) REFERENCES `user` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_game_location` FOREIGN KEY (`location_id`) REFERENCES `location` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_game_referee` FOREIGN KEY (`referee_id`) REFERENCES `user` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_game_season` FOREIGN KEY (`season_id`) REFERENCES `season` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_game_status` FOREIGN KEY (`status_id`) REFERENCES `game_status` (`id`),
  CONSTRAINT `fk_game_team1` FOREIGN KEY (`team1_id`) REFERENCES `team` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_game_team2` FOREIGN KEY (`team2_id`) REFERENCES `team` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_game_type` FOREIGN KEY (`game_type_id`) REFERENCES `game_type` (`id`),
  CONSTRAINT `fk_game_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `game_event`
--

DROP TABLE IF EXISTS `game_event`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `game_event` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `game_id` bigint(20) unsigned NOT NULL,
  `team_id` bigint(20) unsigned DEFAULT NULL,
  `person_id` bigint(20) unsigned DEFAULT NULL,
  `event_type_id` bigint(20) unsigned NOT NULL,
  `occurred_at` datetime DEFAULT NULL,
  `match_minute` smallint(5) unsigned DEFAULT NULL,
  `notes` varchar(1000) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `version` int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_game_event_game` (`game_id`),
  KEY `idx_game_event_team` (`team_id`),
  KEY `idx_game_event_type` (`event_type_id`),
  KEY `fk_game_event_created_by` (`created_by`),
  KEY `fk_game_event_updated_by` (`updated_by`),
  KEY `idx_game_event_match_minute` (`match_minute`),
  KEY `idx_game_event_is_deleted` (`is_deleted`),
  KEY `idx_game_event_is_active` (`is_active`),
  KEY `idx_game_event_person` (`person_id`),
  CONSTRAINT `fk_game_event_created_by` FOREIGN KEY (`created_by`) REFERENCES `user` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_game_event_game` FOREIGN KEY (`game_id`) REFERENCES `game` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_game_event_person` FOREIGN KEY (`person_id`) REFERENCES `person` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_game_event_team` FOREIGN KEY (`team_id`) REFERENCES `team` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_game_event_type` FOREIGN KEY (`event_type_id`) REFERENCES `game_event_type` (`id`),
  CONSTRAINT `fk_game_event_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `game_event_type`
--

DROP TABLE IF EXISTS `game_event_type`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `game_event_type` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` varchar(1000) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `version` int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_game_event_type_name` (`name`),
  KEY `fk_game_event_type_created_by` (`created_by`),
  KEY `fk_game_event_type_updated_by` (`updated_by`),
  KEY `idx_game_event_type_is_deleted` (`is_deleted`),
  KEY `idx_game_event_type_is_active` (`is_active`),
  CONSTRAINT `fk_game_event_type_created_by` FOREIGN KEY (`created_by`) REFERENCES `user` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_game_event_type_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `game_status`
--

DROP TABLE IF EXISTS `game_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `game_status` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `version` int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_game_status_name` (`name`),
  KEY `idx_game_status_is_deleted` (`is_deleted`),
  KEY `fk_game_status_created_by` (`created_by`),
  KEY `fk_game_status_updated_by` (`updated_by`),
  KEY `idx_game_status_is_active` (`is_active`),
  CONSTRAINT `fk_game_status_created_by` FOREIGN KEY (`created_by`) REFERENCES `user` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_game_status_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `game_type`
--

DROP TABLE IF EXISTS `game_type`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `game_type` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` varchar(1000) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `version` int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_game_type_name` (`name`),
  KEY `idx_game_type_is_deleted` (`is_deleted`),
  KEY `fk_game_type_created_by` (`created_by`),
  KEY `fk_game_type_updated_by` (`updated_by`),
  KEY `idx_game_type_is_active` (`is_active`),
  CONSTRAINT `fk_game_type_created_by` FOREIGN KEY (`created_by`) REFERENCES `user` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_game_type_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `game_user`
--

DROP TABLE IF EXISTS `game_user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `game_user` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `game_id` bigint(20) unsigned NOT NULL,
  `team_id` bigint(20) unsigned NOT NULL,
  `person_id` bigint(20) unsigned NOT NULL,
  `role_id` bigint(20) unsigned NOT NULL,
  `position_id` bigint(20) unsigned DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `version` int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_game_user_game` (`game_id`),
  KEY `idx_game_user_team` (`team_id`),
  KEY `idx_game_user_role` (`role_id`),
  KEY `idx_game_user_position` (`position_id`),
  KEY `fk_game_user_created_by` (`created_by`),
  KEY `fk_game_user_updated_by` (`updated_by`),
  KEY `idx_game_user_is_deleted` (`is_deleted`),
  KEY `idx_game_user_is_active` (`is_active`),
  KEY `idx_game_user_person` (`person_id`),
  CONSTRAINT `fk_game_user_created_by` FOREIGN KEY (`created_by`) REFERENCES `user` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_game_user_game` FOREIGN KEY (`game_id`) REFERENCES `game` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_game_user_person` FOREIGN KEY (`person_id`) REFERENCES `person` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_game_user_position` FOREIGN KEY (`position_id`) REFERENCES `player_position` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_game_user_role` FOREIGN KEY (`role_id`) REFERENCES `role` (`id`),
  CONSTRAINT `fk_game_user_team` FOREIGN KEY (`team_id`) REFERENCES `team` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_game_user_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `injury`
--

DROP TABLE IF EXISTS `injury`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `injury` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `game_id` bigint(20) unsigned DEFAULT NULL,
  `person_id` bigint(20) unsigned NOT NULL,
  `owner_team_id` bigint(20) unsigned DEFAULT NULL,
  `description` varchar(2000) DEFAULT NULL,
  `estimated_return_date` date DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `version` int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_injury_game` (`game_id`),
  KEY `fk_injury_created_by` (`created_by`),
  KEY `fk_injury_updated_by` (`updated_by`),
  KEY `idx_injury_is_deleted` (`is_deleted`),
  KEY `idx_injury_is_active` (`is_active`),
  KEY `idx_injury_person` (`person_id`),
  KEY `idx_injury_owner_team` (`owner_team_id`),
  CONSTRAINT `fk_injury_created_by` FOREIGN KEY (`created_by`) REFERENCES `user` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_injury_game` FOREIGN KEY (`game_id`) REFERENCES `game` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_injury_owner_team` FOREIGN KEY (`owner_team_id`) REFERENCES `team` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_injury_person` FOREIGN KEY (`person_id`) REFERENCES `person` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_injury_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `league`
--

DROP TABLE IF EXISTS `league`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `league` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` varchar(1000) DEFAULT NULL,
  `governing_body` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `version` int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_league_name` (`name`),
  KEY `idx_league_is_deleted` (`is_deleted`),
  KEY `fk_league_created_by` (`created_by`),
  KEY `fk_league_updated_by` (`updated_by`),
  KEY `idx_league_is_active` (`is_active`),
  CONSTRAINT `fk_league_created_by` FOREIGN KEY (`created_by`) REFERENCES `user` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_league_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `location`
--

DROP TABLE IF EXISTS `location`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `location` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `address` varchar(255) DEFAULT NULL,
  `city` varchar(120) DEFAULT NULL,
  `state` varchar(120) DEFAULT NULL,
  `zip` varchar(20) DEFAULT NULL,
  `country` varchar(120) DEFAULT NULL,
  `home_team_id` bigint(20) unsigned DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `version` int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_location_is_deleted` (`is_deleted`),
  KEY `idx_location_home_team` (`home_team_id`),
  KEY `fk_location_created_by` (`created_by`),
  KEY `fk_location_updated_by` (`updated_by`),
  KEY `idx_location_is_active` (`is_active`),
  CONSTRAINT `fk_location_created_by` FOREIGN KEY (`created_by`) REFERENCES `user` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_location_home_team` FOREIGN KEY (`home_team_id`) REFERENCES `team` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_location_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `media_upload`
--

DROP TABLE IF EXISTS `media_upload`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `media_upload` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `game_id` bigint(20) unsigned DEFAULT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `url` varchar(1000) NOT NULL,
  `description` varchar(1000) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `version` int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_media_upload_game` (`game_id`),
  KEY `idx_media_upload_user` (`user_id`),
  KEY `fk_media_upload_created_by` (`created_by`),
  KEY `fk_media_upload_updated_by` (`updated_by`),
  KEY `idx_media_upload_is_deleted` (`is_deleted`),
  KEY `idx_media_upload_is_active` (`is_active`),
  CONSTRAINT `fk_media_upload_created_by` FOREIGN KEY (`created_by`) REFERENCES `user` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_media_upload_game` FOREIGN KEY (`game_id`) REFERENCES `game` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_media_upload_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `user` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_media_upload_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `password_reset_tokens` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `token` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `used_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_password_reset_token` (`token`),
  KEY `idx_prt_user` (`user_id`),
  KEY `idx_prt_expires` (`expires_at`),
  CONSTRAINT `fk_prt_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `person`
--

DROP TABLE IF EXISTS `person`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `person` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `display_name` varchar(255) NOT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `cell` varchar(50) DEFAULT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `owner_team_id` bigint(20) unsigned DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `version` int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_person_user` (`user_id`),
  KEY `idx_person_is_deleted` (`is_deleted`),
  KEY `idx_person_is_active` (`is_active`),
  KEY `idx_person_owner_team` (`owner_team_id`),
  KEY `fk_person_created_by` (`created_by`),
  KEY `fk_person_updated_by` (`updated_by`),
  CONSTRAINT `fk_person_created_by` FOREIGN KEY (`created_by`) REFERENCES `user` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_person_owner_team` FOREIGN KEY (`owner_team_id`) REFERENCES `team` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_person_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `user` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_person_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `player_position`
--

DROP TABLE IF EXISTS `player_position`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `player_position` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` varchar(1000) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `version` int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_player_position_name` (`name`),
  KEY `fk_player_position_created_by` (`created_by`),
  KEY `fk_player_position_updated_by` (`updated_by`),
  KEY `idx_player_position_is_deleted` (`is_deleted`),
  KEY `idx_player_position_is_active` (`is_active`),
  CONSTRAINT `fk_player_position_created_by` FOREIGN KEY (`created_by`) REFERENCES `user` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_player_position_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `player_stats`
--

DROP TABLE IF EXISTS `player_stats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `player_stats` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `game_id` bigint(20) unsigned NOT NULL,
  `team_id` bigint(20) unsigned NOT NULL,
  `person_id` bigint(20) unsigned NOT NULL,
  `minutes_played` smallint(5) unsigned NOT NULL DEFAULT 0,
  `goals` smallint(5) unsigned NOT NULL DEFAULT 0,
  `assists` smallint(5) unsigned NOT NULL DEFAULT 0,
  `shots_on_goal` smallint(5) unsigned NOT NULL DEFAULT 0,
  `fouls_committed` smallint(5) unsigned NOT NULL DEFAULT 0,
  `fouls_suffered` smallint(5) unsigned NOT NULL DEFAULT 0,
  `yellow_cards` smallint(5) unsigned NOT NULL DEFAULT 0,
  `red_cards` smallint(5) unsigned NOT NULL DEFAULT 0,
  `offsides` smallint(5) unsigned NOT NULL DEFAULT 0,
  `saves` smallint(5) unsigned NOT NULL DEFAULT 0,
  `shots_faced` smallint(5) unsigned NOT NULL DEFAULT 0,
  `passes_completed` int(10) unsigned NOT NULL DEFAULT 0,
  `passes_attempted` int(10) unsigned NOT NULL DEFAULT 0,
  `distance_covered` int(10) unsigned NOT NULL DEFAULT 0,
  `rating` decimal(4,2) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `version` int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_player_stats_game` (`game_id`),
  KEY `idx_player_stats_team` (`team_id`),
  KEY `fk_player_stats_created_by` (`created_by`),
  KEY `fk_player_stats_updated_by` (`updated_by`),
  KEY `idx_player_stats_is_deleted` (`is_deleted`),
  KEY `idx_player_stats_is_active` (`is_active`),
  KEY `idx_player_stats_person` (`person_id`),
  CONSTRAINT `fk_player_stats_created_by` FOREIGN KEY (`created_by`) REFERENCES `user` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_player_stats_game` FOREIGN KEY (`game_id`) REFERENCES `game` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_player_stats_person` FOREIGN KEY (`person_id`) REFERENCES `person` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_player_stats_team` FOREIGN KEY (`team_id`) REFERENCES `team` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_player_stats_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `role`
--

DROP TABLE IF EXISTS `role`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `role` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` varchar(1000) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `version` int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_role_name` (`name`),
  KEY `fk_role_created_by` (`created_by`),
  KEY `fk_role_updated_by` (`updated_by`),
  KEY `idx_role_is_deleted` (`is_deleted`),
  KEY `idx_role_is_active` (`is_active`),
  CONSTRAINT `fk_role_created_by` FOREIGN KEY (`created_by`) REFERENCES `user` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_role_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `season`
--

DROP TABLE IF EXISTS `season`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `season` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `league_id` bigint(20) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `version` int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_season_league_name` (`league_id`,`name`),
  KEY `idx_season_league` (`league_id`),
  KEY `idx_season_is_deleted` (`is_deleted`),
  KEY `fk_season_created_by` (`created_by`),
  KEY `fk_season_updated_by` (`updated_by`),
  KEY `idx_season_is_active` (`is_active`),
  CONSTRAINT `fk_season_created_by` FOREIGN KEY (`created_by`) REFERENCES `user` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_season_league` FOREIGN KEY (`league_id`) REFERENCES `league` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_season_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `standings`
--

DROP TABLE IF EXISTS `standings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `standings` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `season_id` bigint(20) unsigned NOT NULL,
  `team_id` bigint(20) unsigned NOT NULL,
  `played` smallint(5) unsigned NOT NULL DEFAULT 0,
  `won` smallint(5) unsigned NOT NULL DEFAULT 0,
  `drawn` smallint(5) unsigned NOT NULL DEFAULT 0,
  `lost` smallint(5) unsigned NOT NULL DEFAULT 0,
  `goals_for` smallint(5) unsigned NOT NULL DEFAULT 0,
  `goals_against` smallint(5) unsigned NOT NULL DEFAULT 0,
  `goal_difference` smallint(6) NOT NULL DEFAULT 0,
  `points` smallint(5) unsigned NOT NULL DEFAULT 0,
  `position` smallint(5) unsigned DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `version` int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_standings_season_team` (`season_id`,`team_id`),
  KEY `idx_standings_position` (`position`),
  KEY `fk_standings_created_by` (`created_by`),
  KEY `fk_standings_updated_by` (`updated_by`),
  KEY `fk_standings_team` (`team_id`),
  KEY `idx_standings_is_deleted` (`is_deleted`),
  KEY `idx_standings_is_active` (`is_active`),
  CONSTRAINT `fk_standings_created_by` FOREIGN KEY (`created_by`) REFERENCES `user` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_standings_season` FOREIGN KEY (`season_id`) REFERENCES `season` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_standings_team` FOREIGN KEY (`team_id`) REFERENCES `team` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_standings_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `team`
--

DROP TABLE IF EXISTS `team`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `team` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `league_id` bigint(20) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `short_name` varchar(50) DEFAULT NULL,
  `primary_color` varchar(20) DEFAULT NULL,
  `secondary_color` varchar(20) DEFAULT NULL,
  `icon_mime` varchar(50) DEFAULT NULL,
  `icon` mediumblob DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `version` int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_team_league_name` (`league_id`,`name`),
  KEY `idx_team_league` (`league_id`),
  KEY `idx_team_is_deleted` (`is_deleted`),
  KEY `fk_team_created_by` (`created_by`),
  KEY `fk_team_updated_by` (`updated_by`),
  KEY `idx_team_is_active` (`is_active`),
  CONSTRAINT `fk_team_created_by` FOREIGN KEY (`created_by`) REFERENCES `user` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_team_league` FOREIGN KEY (`league_id`) REFERENCES `league` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_team_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `team_roster`
--

DROP TABLE IF EXISTS `team_roster`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `team_roster` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `team_id` bigint(20) unsigned NOT NULL,
  `season_id` bigint(20) unsigned NOT NULL,
  `person_id` bigint(20) unsigned NOT NULL,
  `role_id` bigint(20) unsigned NOT NULL,
  `position_id` bigint(20) unsigned DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `jersey_number` smallint(5) unsigned DEFAULT NULL,
  `is_captain` tinyint(1) NOT NULL DEFAULT 0,
  `joined_at` datetime DEFAULT NULL,
  `left_at` datetime DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `version` int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_roster_team_season_person` (`team_id`,`season_id`,`person_id`),
  KEY `idx_roster_team` (`team_id`),
  KEY `idx_roster_season` (`season_id`),
  KEY `idx_roster_is_deleted` (`is_deleted`),
  KEY `fk_roster_created_by` (`created_by`),
  KEY `fk_roster_updated_by` (`updated_by`),
  KEY `idx_roster_is_active` (`is_active`),
  KEY `idx_roster_role` (`role_id`),
  KEY `idx_roster_position` (`position_id`),
  KEY `idx_roster_person` (`person_id`),
  CONSTRAINT `fk_roster_created_by` FOREIGN KEY (`created_by`) REFERENCES `user` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_roster_person` FOREIGN KEY (`person_id`) REFERENCES `person` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_roster_position` FOREIGN KEY (`position_id`) REFERENCES `player_position` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_roster_role` FOREIGN KEY (`role_id`) REFERENCES `role` (`id`) ON DELETE NO ACTION,
  CONSTRAINT `fk_roster_season` FOREIGN KEY (`season_id`) REFERENCES `season` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_roster_team` FOREIGN KEY (`team_id`) REFERENCES `team` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_roster_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `training_session`
--

DROP TABLE IF EXISTS `training_session`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `training_session` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `team_id` bigint(20) unsigned NOT NULL,
  `season_id` bigint(20) unsigned NOT NULL,
  `location_id` bigint(20) unsigned DEFAULT NULL,
  `start_time` datetime NOT NULL,
  `end_time` datetime DEFAULT NULL,
  `notes` varchar(2000) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `version` int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_training_session_team` (`team_id`),
  KEY `idx_training_session_season` (`season_id`),
  KEY `idx_training_session_location` (`location_id`),
  KEY `fk_training_session_created_by` (`created_by`),
  KEY `fk_training_session_updated_by` (`updated_by`),
  KEY `idx_training_session_is_deleted` (`is_deleted`),
  KEY `idx_training_session_is_active` (`is_active`),
  CONSTRAINT `fk_training_session_created_by` FOREIGN KEY (`created_by`) REFERENCES `user` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_training_session_location` FOREIGN KEY (`location_id`) REFERENCES `location` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_training_session_season` FOREIGN KEY (`season_id`) REFERENCES `season` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_training_session_team` FOREIGN KEY (`team_id`) REFERENCES `team` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_training_session_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user`
--

DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `is_verified` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `version` int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_email` (`email`),
  KEY `fk_user_created_by` (`created_by`),
  KEY `fk_user_updated_by` (`updated_by`),
  KEY `idx_user_is_deleted` (`is_deleted`),
  KEY `idx_user_is_active` (`is_active`),
  CONSTRAINT `fk_user_created_by` FOREIGN KEY (`created_by`) REFERENCES `user` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_roles`
--

DROP TABLE IF EXISTS `user_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_roles` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `role_id` bigint(20) unsigned NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `version` int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_role` (`user_id`,`role_id`),
  KEY `idx_user_roles_user` (`user_id`),
  KEY `fk_user_roles_role` (`role_id`),
  KEY `fk_user_roles_created_by` (`created_by`),
  KEY `fk_user_roles_updated_by` (`updated_by`),
  KEY `idx_user_roles_is_deleted` (`is_deleted`),
  KEY `idx_user_roles_is_active` (`is_active`),
  CONSTRAINT `fk_user_roles_created_by` FOREIGN KEY (`created_by`) REFERENCES `user` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_roles_role` FOREIGN KEY (`role_id`) REFERENCES `role` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_roles_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `user` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_roles_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-08-11 20:33:49
