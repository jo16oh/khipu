-- # Settings
PRAGMA foreign_keys = ON;

PRAGMA defer_foreign_keys = ON;

-- Check foreign key consistancy when committing a transaction
PRAGMA journal_mode = 'WAL';

-- Store temp tables in memory
PRAGMA temp_store = 2;

-- Set the cache size to 64,000 KiB (negative value indicates kibibytes)
PRAGMA cache_size = -64000;

-- # Tables
CREATE TABLE outlines (
  id TEXT PRIMARY KEY NOT NULL,
  parent_id TEXT REFERENCES outlines (id) ON DELETE CASCADE,
  findex TEXT NOT NULL, -- stores fractional-index
  doc TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  collapsed INTEGER NOT NULL DEFAULT 0,
  hidden INTEGER NOT NULL DEFAULT 0,
  deleted INTEGER NOT NULL DEFAULT 0,
  path TEXT NOT NULL DEFAULT ''
) STRICT;

CREATE INDEX "IDX$outlines.parent_id" ON outlines (parent_id);

CREATE INDEX "IDX$outlines.created_at" ON outlines (created_at DESC);

CREATE INDEX "IDX$outlines.updated_at" ON outlines (updated_at DESC);

CREATE INDEX "IDX$outlines.path" ON outlines (path ASC);

CREATE TRIGGER set_path AFTER INSERT ON outlines FOR EACH ROW BEGIN
UPDATE outlines
SET
  path = CASE
    WHEN NEW.parent_id IS NULL THEN NEW.id
    ELSE (
      SELECT
        path
      FROM
        outlines
      WHERE
        id = NEW.parent_id
    ) || '/' || NEW.id
  END
WHERE
  id = NEW.id;

END;

CREATE TRIGGER reconsile_path AFTER
UPDATE ON outlines FOR EACH ROW WHEN OLD.parent_id IS DISTINCT
FROM
  NEW.parent_id BEGIN
UPDATE outlines
SET
  path = CASE
    WHEN NEW.parent_id IS NULL THEN NEW.id
    ELSE (
      SELECT
        path
      FROM
        outlines
      WHERE
        id = NEW.parent_id
    ) || '/' || NEW.id
  END
WHERE
  id = NEW.id;

UPDATE outlines
SET
  path = (
    SELECT
      path
    FROM
      outlines
    WHERE
      id = NEW.id
  ) || substr(path, length(OLD.path) + 1)
WHERE
  path LIKE OLD.path || '/%'
  AND id != NEW.id;

END;

CREATE TABLE y_updates (
  id TEXT PRIMARY KEY NOT NULL,
  outline_id TEXT REFERENCES outlines (id) ON DELETE CASCADE NOT NULL,
  data BLOB NOT NULL,
  timestamp INTEGER NOT NULL
) STRICT;

CREATE INDEX "IDX$y_updates.outline_id" ON y_updates (outline_id);

CREATE TABLE outline_links (
  id_from TEXT REFERENCES outlines (id) ON DELETE CASCADE NOT NULL,
  id_to TEXT NOT NULL, -- implicitly referes to outlines(id)
  type TEXT NOT NULL,
  PRIMARY KEY (id_from, id_to)
) STRICT;

CREATE INDEX "IDX$outline_links.id_from" ON outline_links (id_from);

CREATE INDEX "IDX$outline_links.id_to" ON outline_links (id_to);

CREATE TABLE assets (
  id TEXT PRIMARY KEY NOT NULL,
  filename TEXT NOT NULL,
  extension TEXT NOT NULL,
  data BLOB NOT NULL
) STRICT;

CREATE TABLE outline_asset_rel (
  asset_id TEXT REFERENCES assets (id) ON DELETE CASCADE NOT NULL,
  outline_id TEXT REFERENCES outlines (id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (asset_id, outline_id)
) STRICT;

-- # FTS
CREATE VIRTUAL TABLE fts USING fts5 (
  id UNINDEXED,
  type UNINDEXED,
  content,
  content = '', -- don't store content
  tokenize = "trigram"
);

-- Table for searching one or two character queries with term prefix matching
-- To include the last one or two characters in the search target, meaningless 2 characters need to be added by application logic
CREATE VIRTUAL TABLE fts_vocab USING fts5vocab (fts, ROW);

-- Since triggers cannot be set on virtual tables, relations need to be managed manually
CREATE TABLE fts_outline_rel (
  outline_id TEXT REFERENCES outlines (id) ON DELETE CASCADE NOT NULL,
  fts_rowid INTEGER REFERENCES fts (rowid) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (outline_id, fts_rowid)
) STRICT;

-- Deletion from virtual tables is possible with triggers
CREATE TRIGGER after_delete_outlines BEFORE DELETE ON outlines BEGIN
DELETE FROM fts
WHERE
  rowid IN (
    SELECT
      rowid
    FROM
      fts_outline_rel
    WHERE
      id = OLD.id
  );

END;
