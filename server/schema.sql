CREATE TABLE IF NOT EXISTS teams (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  abbr        TEXT NOT NULL DEFAULT '',
  alias       TEXT NOT NULL DEFAULT '',
  color       TEXT NOT NULL DEFAULT '#3b82f6',
  photo_path  TEXT,
  category    TEXT NOT NULL DEFAULT 'Free',   -- Senior | Junior | Free
  archived    INTEGER NOT NULL DEFAULT 0,     -- 0 = no, 1 = yes
  coach       TEXT NOT NULL DEFAULT '',
  assistant   TEXT NOT NULL DEFAULT '',
  captain_id  INTEGER                         -- a player id (checked in code, not by SQLite)
);

CREATE TABLE IF NOT EXISTS players (
  id           INTEGER PRIMARY KEY,
  team_id      INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  first        TEXT NOT NULL DEFAULT '',
  last         TEXT NOT NULL DEFAULT '',
  nick         TEXT NOT NULL DEFAULT '',
  number       TEXT NOT NULL DEFAULT '',      -- TEXT on purpose: '09' is not '9'
  locale       TEXT NOT NULL DEFAULT '',
  photo_path   TEXT,
  archived     INTEGER NOT NULL DEFAULT 0,
  verified     INTEGER NOT NULL DEFAULT 0,
  verified_at  TEXT
);

CREATE TABLE IF NOT EXISTS games (
  id            INTEGER PRIMARY KEY,
  season        TEXT NOT NULL,
  date          TEXT NOT NULL,
  time          TEXT NOT NULL DEFAULT '',
  no            INTEGER NOT NULL DEFAULT 0,
  competition   TEXT NOT NULL DEFAULT 'BCBL',
  place         TEXT NOT NULL DEFAULT '',
  home_id       INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  away_id       INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'scheduled',  -- scheduled | live | final
  running_time  INTEGER NOT NULL DEFAULT 0,
  rt_last2      INTEGER NOT NULL DEFAULT 1,
  lineup_period INTEGER NOT NULL DEFAULT 0,
  is_default    INTEGER NOT NULL DEFAULT 0
);

-- who is on the court right now, per game and team
CREATE TABLE IF NOT EXISTS game_active (
  game_id    INTEGER NOT NULL REFERENCES games(id)   ON DELETE CASCADE,
  team_id    INTEGER NOT NULL REFERENCES teams(id)   ON DELETE CASCADE,
  player_id  INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  PRIMARY KEY (game_id, team_id, player_id)
);

-- everyone who has played in the game
CREATE TABLE IF NOT EXISTS game_played (
  game_id    INTEGER NOT NULL REFERENCES games(id)   ON DELETE CASCADE,
  player_id  INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  PRIMARY KEY (game_id, player_id)
);

-- manual score corrections
CREATE TABLE IF NOT EXISTS game_adj (
  game_id  INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  team_id  INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  pts      INTEGER NOT NULL,
  PRIMARY KEY (game_id, team_id)
);

CREATE TABLE IF NOT EXISTS events (
  id         INTEGER PRIMARY KEY,
  game_id    INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  seq        INTEGER NOT NULL,                 -- order of the event inside the game
  period     INTEGER NOT NULL,
  clock      INTEGER NOT NULL,                 -- milliseconds left
  team_id    INTEGER,
  player_id  INTEGER REFERENCES players(id) ON DELETE SET NULL,
  type       TEXT NOT NULL,                    -- pts, foul, sub, timeout, tech, reb, ast...
  out_id     INTEGER REFERENCES players(id) ON DELETE SET NULL,
  pts        INTEGER,
  secs       INTEGER,
  foul_type  TEXT,                             -- personal | technical | flagrant
  team_foul  INTEGER,                          -- NULL = old event, counts like the default (yes)
  staff      TEXT                              -- coach | assistant | NULL
);
CREATE INDEX IF NOT EXISTS idx_events_game ON events(game_id, seq);

-- the live scoreboard and the custom scoreboard: one row each
CREATE TABLE IF NOT EXISTS live_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS custom_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  json TEXT NOT NULL
);