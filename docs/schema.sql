-- MindTrack relational schema (MySQL 8 / MariaDB 10.4+).
-- Import this in phpMyAdmin (Import tab) into if0_42898579_Mindtrack.
-- It DROPS and recreates every MindTrack table, so only run it on an empty database
-- or when you are happy to lose the existing data.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS deleted_accounts, security_events, notifications, challenge_progress, wellness_activities, wellness_challenges,
  appointments, availability_slots, journal_entries, wellness_flags, wellness_scores, survey_responses,
  survey_questions, surveys, daily_moods, login_attempts, email_verifications, users;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
  id               CHAR(36)     NOT NULL PRIMARY KEY,
  first_name       VARCHAR(80)  NOT NULL,
  last_name        VARCHAR(80)  NOT NULL,
  email            VARCHAR(160) NOT NULL UNIQUE,         -- must end with @smcbi.edu.ph
  password_hash    VARCHAR(255) NOT NULL,                -- PHP password_hash(), never plain text
  role             ENUM('student','counselor','admin') NOT NULL DEFAULT 'student',
  title            VARCHAR(80)  NULL,                    -- counselors, e.g. "Guidance Counselor"
  is_super         TINYINT(1)   NOT NULL DEFAULT 0,      -- the superadmin counselor: manages staff, questionnaires, officers
  officer_position VARCHAR(40)  NULL,                    -- students who are officers, e.g. "President"
  session_token    CHAR(32)     NULL,                    -- the one device currently signed in to this account
  session_seen_at  DATETIME     NULL,                    -- when that device last checked in (see SESSION_ALIVE_SECONDS)
  student_id       VARCHAR(20)  NULL UNIQUE,
  grade_level      VARCHAR(20)  NULL,
  section          VARCHAR(40)  NULL,
  photo            MEDIUMTEXT   NULL,                    -- small JPEG data URL (256x256)
  email_verified   TINYINT(1)   NOT NULL DEFAULT 0,
  profile_complete TINYINT(1)   NOT NULL DEFAULT 0,
  settings         TEXT         NULL,                    -- JSON: notification + privacy preferences
  archived_at      DATETIME     NULL,                    -- set when a counselor archives the account (cannot sign in)
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Emails of student accounts a counselor deleted, with the old password hash only, so a later login attempt
-- can be told the account was removed. Cleared if the student registers again.
CREATE TABLE deleted_accounts (
  email          VARCHAR(160) NOT NULL PRIMARY KEY,
  password_hash  VARCHAR(255) NOT NULL,
  deleted_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE email_verifications (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  email       VARCHAR(160) NOT NULL,
  purpose     ENUM('verify','reset') NOT NULL,
  code_hash   VARCHAR(255) NOT NULL,
  attempts    TINYINT      NOT NULL DEFAULT 0,
  expires_at  DATETIME     NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY one_code (email, purpose)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE login_attempts (
  email         VARCHAR(160) NOT NULL PRIMARY KEY,
  count         TINYINT      NOT NULL DEFAULT 0,
  locked_until  DATETIME     NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE daily_moods (
  id            CHAR(36)     NOT NULL PRIMARY KEY,
  user_id       CHAR(36)     NOT NULL,
  mood          ENUM('very_good','good','okay','stressed','sad','overwhelmed','excited','calm','tired','anxious','angry','lonely') NOT NULL,
  mood_value    TINYINT      NOT NULL,
  note          VARCHAR(500) NULL,
  mood_factors  TEXT         NULL,                       -- JSON array
  date          DATE         NOT NULL,
  time          TIME         NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY one_per_day (user_id, date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE surveys (
  id          CHAR(36)     NOT NULL PRIMARY KEY,
  title       VARCHAR(120) NOT NULL,
  description TEXT         NULL,
  active      TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE survey_questions (
  id            CHAR(36)     NOT NULL PRIMARY KEY,
  survey_id     CHAR(36)     NOT NULL,
  sort_order    INT          NOT NULL,
  question      VARCHAR(255) NOT NULL,
  question_type VARCHAR(20)  NOT NULL DEFAULT 'frequency',
  scoring_rule  ENUM('positive','negative') NOT NULL,
  area          VARCHAR(60)  NULL,
  is_critical   TINYINT(1)   NOT NULL DEFAULT 0,
  FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE survey_responses (
  id            CHAR(36)     NOT NULL PRIMARY KEY,
  user_id       CHAR(36)     NOT NULL,
  survey_id     CHAR(36)     NOT NULL,
  answers       TEXT         NOT NULL,                   -- JSON array of 0..4
  score         TINYINT      NOT NULL,
  status        VARCHAR(40)  NOT NULL,
  areas         TEXT         NULL,                       -- JSON array of low-scoring areas
  flagged       TINYINT(1)   NOT NULL DEFAULT 0,
  date          DATE         NOT NULL,
  submitted_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (survey_id) REFERENCES surveys(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE wellness_scores (
  id          CHAR(36)    NOT NULL PRIMARY KEY,
  user_id     CHAR(36)    NOT NULL,
  score       TINYINT     NOT NULL,
  status      VARCHAR(40) NOT NULL,
  date        DATE        NOT NULL,
  created_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY one_per_day (user_id, date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE wellness_flags (
  id           CHAR(36)     NOT NULL PRIMARY KEY,
  user_id      CHAR(36)     NOT NULL,
  source       VARCHAR(40)  NOT NULL,                    -- 'Wellness Check' | 'Daily Mood'
  reason       VARCHAR(255) NOT NULL,
  status       ENUM('open','follow_up','reviewed') NOT NULL DEFAULT 'open',
  reviewed_by  CHAR(36)     NULL,
  reviewed_at  DATETIME     NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE journal_entries (
  id          CHAR(36)    NOT NULL PRIMARY KEY,
  user_id     CHAR(36)    NOT NULL,
  title       VARCHAR(80) NOT NULL,
  content     TEXT        NOT NULL,
  mood        VARCHAR(20) NULL,
  tags        TEXT        NULL,                          -- JSON array
  entry_date  DATE        NOT NULL,
  is_shared   TINYINT(1)  NOT NULL DEFAULT 0,
  shared_at   DATETIME    NULL,
  created_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE availability_slots (
  id              CHAR(36) NOT NULL PRIMARY KEY,
  counselor_id    CHAR(36) NOT NULL,
  date            DATE     NOT NULL,
  time            TIME     NOT NULL,
  status          ENUM('open','booked','blocked') NOT NULL DEFAULT 'open',
  appointment_id  CHAR(36) NULL,
  UNIQUE KEY one_slot (counselor_id, date, time),
  FOREIGN KEY (counselor_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE appointments (
  id             CHAR(36)     NOT NULL PRIMARY KEY,
  student_id     CHAR(36)     NOT NULL,
  counselor_id   CHAR(36)     NOT NULL,
  slot_id        CHAR(36)     NULL,
  date           DATE         NOT NULL,
  time           TIME         NOT NULL,
  status         ENUM('pending','confirmed','completed','canceled') NOT NULL DEFAULT 'pending',
  reason         VARCHAR(200) NULL,
  notes          TEXT         NULL,                      -- counselor-only, never sent to students
  reminder       TINYINT(1)   NOT NULL DEFAULT 0,
  auto_reminded  TINYINT(1)   NOT NULL DEFAULT 0,
  canceled_by    VARCHAR(20)  NULL,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (counselor_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (slot_id) REFERENCES availability_slots(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE wellness_challenges (
  id           CHAR(36)     NOT NULL PRIMARY KEY,
  emoji        VARCHAR(16)  NULL,
  title        VARCHAR(120) NOT NULL,
  description  VARCHAR(255) NULL,
  link         VARCHAR(120) NULL,
  active       TINYINT(1)   NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE challenge_progress (
  user_id       CHAR(36) NOT NULL,
  challenge_id  CHAR(36) NOT NULL,
  date          DATE     NOT NULL,
  completed_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, challenge_id, date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (challenge_id) REFERENCES wellness_challenges(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE wellness_activities (
  id             CHAR(36) NOT NULL PRIMARY KEY,
  user_id        CHAR(36) NOT NULL,
  activity_type  ENUM('breathing','bubble_pop','challenge','journal','survey') NOT NULL,
  duration       INT      NOT NULL DEFAULT 0,            -- seconds
  date           DATE     NOT NULL,
  completed_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notifications (
  id          CHAR(36)     NOT NULL PRIMARY KEY,
  user_id     CHAR(36)     NOT NULL,
  title       VARCHAR(120) NOT NULL,
  message     VARCHAR(255) NOT NULL,
  icon        VARCHAR(16)  NULL,
  link        VARCHAR(120) NULL,
  kind        VARCHAR(20)  NOT NULL DEFAULT 'general',
  is_read     TINYINT(1)   NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE security_events (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id     CHAR(36)     NULL,
  event_type  VARCHAR(40)  NOT NULL,
  detail      VARCHAR(255) NULL,
  ip_address  VARCHAR(45)  NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Starter content (not demo data) ----------

INSERT INTO surveys (id, title, description, active) VALUES
('srv_wellness', 'Wellness Check', 'A short self-reflection check-in. There are no right or wrong answers.', 1);

INSERT INTO survey_questions (id, survey_id, sort_order, question, scoring_rule, area, is_critical) VALUES
('q1',  'srv_wellness', 1,  'How often have you felt overwhelmed by school responsibilities recently?', 'negative', 'School workload', 0),
('q2',  'srv_wellness', 2,  'How often have you been able to get enough restful sleep?', 'positive', 'Sleep & rest', 0),
('q3',  'srv_wellness', 3,  'How often have you felt nervous, worried, or on edge?', 'negative', 'Worry & tension', 0),
('q4',  'srv_wellness', 4,  'How often have you enjoyed activities that usually make you happy?', 'positive', 'Enjoyment', 0),
('q5',  'srv_wellness', 5,  'How often have you felt supported by friends or family?', 'positive', 'Support network', 0),
('q6',  'srv_wellness', 6,  'How often have you found it hard to concentrate on your studies?', 'negative', 'Focus', 0),
('q7',  'srv_wellness', 7,  'How often have you felt lonely or left out?', 'negative', 'Connection', 0),
('q8',  'srv_wellness', 8,  'How often have you been able to handle stress in healthy ways?', 'positive', 'Coping', 0),
('q9',  'srv_wellness', 9,  'How often have you felt good about yourself?', 'positive', 'Self-view', 0),
('q10', 'srv_wellness', 10, 'How often have you felt hopeless, or that things won’t get better?', 'negative', 'Hope & outlook', 1);

INSERT INTO wellness_challenges (id, emoji, title, description, link) VALUES
('chl_1', '🫁', 'Take 3 minutes to breathe slowly.', 'Try the Guided Breathing exercise.', '/s/breathe'),
('chl_2', '💧', 'Drink a glass of water.', 'Your body and mind will thank you.', ''),
('chl_3', '🚶', 'Take a short walk.', 'Even 5 minutes outside can help.', ''),
('chl_4', '🙏', 'Write something you’re grateful for.', 'Big or small — it all counts.', '/s/journal/new'),
('chl_5', '📵', 'Take a 10-minute screen break.', 'Rest your eyes and stretch.', ''),
('chl_6', '📝', 'Write in your journal.', 'A few lines is enough.', '/s/journal/new'),
('chl_7', '🫧', 'Pop some bubble wrap.', 'A minute of calm, one pop at a time.', '/s/bubbles'),
('chl_8', '💬', 'Send a kind message to a friend.', 'Connection lifts everyone.', '');

-- Self Assessment Checklist No.1 (Personality Development, TLA 1). Added as a Draft; a counselor makes it active
-- from Wellness Check in the counselor portal. Every statement describes a concern, so all are reverse-scored.
INSERT INTO surveys (id, title, description, active) VALUES
('srv_checklist1', 'Self Assessment Checklist No.1', 'Read each statement carefully and choose how often it describes your experience. This checklist is for self-awareness and personal development only. It is not a clinical diagnosis. If you are going through prolonged or overwhelming distress, please reach out to the Guidance and Counseling Office.', 0);

INSERT INTO survey_questions (id, survey_id, sort_order, question, scoring_rule, area, is_critical) VALUES
('c1q1',  'srv_checklist1', 1,  'I doubt my own abilities and decisions regarding my career.', 'negative', 'Career confidence', 0),
('c1q2',  'srv_checklist1', 2,  'I feel anxious about not achieving my goals quickly enough.', 'negative', 'Goals & pressure', 0),
('c1q3',  'srv_checklist1', 3,  'I tend to pressure myself to succeed, which often leads to overworking.', 'negative', 'Goals & pressure', 0),
('c1q4',  'srv_checklist1', 4,  'I withdraw from opportunities offered to me because of fear or self-doubt.', 'negative', 'Career confidence', 0),
('c1q5',  'srv_checklist1', 5,  'I compare myself to others.', 'negative', 'Self-comparison', 0),
('c1q6',  'srv_checklist1', 6,  'I feel afraid of the responsibilities that come with building a family.', 'negative', 'Family responsibilities', 0),
('c1q7',  'srv_checklist1', 7,  'I worry about my ability to meet financial obligations.', 'negative', 'Finances', 0),
('c1q8',  'srv_checklist1', 8,  'I feel uneasy when thinking about my future financial security.', 'negative', 'Finances', 0),
('c1q9',  'srv_checklist1', 9,  'I struggle to manage my money properly—sometimes I spend impulsively or save excessively.', 'negative', 'Finances', 0),
('c1q10', 'srv_checklist1', 10, 'I question the meaning or direction of my life.', 'negative', 'Life direction', 0),
('c1q11', 'srv_checklist1', 11, 'I feel uncertain if what I am doing truly fulfills me.', 'negative', 'Life direction', 0),
('c1q12', 'srv_checklist1', 12, 'I change jobs or hobbies frequently and feel indecisive about many things.', 'negative', 'Life direction', 0),
('c1q13', 'srv_checklist1', 13, 'I tend to neglect my health and skip some of my healthy routines.', 'negative', 'Health & self-care', 0),
('c1q14', 'srv_checklist1', 14, 'I do not have time for self-care.', 'negative', 'Health & self-care', 0),
('c1q15', 'srv_checklist1', 15, 'I experience anxiety related to my health.', 'negative', 'Health & self-care', 0);
