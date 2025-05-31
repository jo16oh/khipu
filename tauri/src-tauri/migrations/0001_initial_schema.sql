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
  type TEXT NOT NULL,
  doc TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  collapsed INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  path TEXT NOT NULL DEFAULT '',
  root_id TEXT NOT NULL DEFAULT '',
  full_findex TEXT NOT NULL DEFAULT ''
) STRICT;

CREATE INDEX "IDX$outlines.parent_id" ON outlines (parent_id);

CREATE INDEX "IDX$outlines.created_at" ON outlines (created_at DESC);

CREATE INDEX "IDX$outlines.updated_at" ON outlines (updated_at DESC);

CREATE INDEX "IDX$outlines.path" ON outlines (path ASC);

CREATE INDEX "IDX$outlines.root_id" ON outlines (root_id ASC);

CREATE INDEX "IDX$outlines.full_findex" ON outlines (full_findex ASC);

CREATE TABLE deleted_outlines (
  id TEXT PRIMARY KEY NOT NULL,
  parent_id TEXT,
  findex TEXT NOT NULL,
  type TEXT NOT NULL,
  doc TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  collapsed INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  deleted_at INTEGER NOT NULL DEFAULT (unixepoch('now', 'subsec') * 1000)
) STRICT;

CREATE INDEX "IDX$deleted_outlines.parent_id" ON outlines (parent_id);

CREATE TABLE y_updates (
  id TEXT PRIMARY KEY NOT NULL,
  outline_id TEXT REFERENCES outlines (id) ON DELETE CASCADE NOT NULL,
  data BLOB NOT NULL,
  timestamp INTEGER NOT NULL
) STRICT;

CREATE INDEX "IDX$y_updates.outline_id" ON y_updates (outline_id);

CREATE TABLE deleted_y_updates (
  id TEXT PRIMARY KEY NOT NULL,
  outline_id TEXT NOT NULL,
  data BLOB NOT NULL,
  timestamp INTEGER NOT NULL
) STRICT;

CREATE INDEX "IDX$deleted_y_updates.outline_id" ON deleted_y_updates (outline_id);

CREATE TABLE outline_links (
  id_from TEXT REFERENCES outlines (id) ON DELETE CASCADE NOT NULL,
  id_to TEXT NOT NULL, -- implicitly referes to outlines(id)
  type TEXT NOT NULL,
  PRIMARY KEY (id_from, id_to)
) STRICT;

CREATE INDEX "IDX$outline_links.id_from" ON outline_links (id_from);

CREATE INDEX "IDX$outline_links.id_to" ON outline_links (id_to);

CREATE TABLE deleted_outline_links (
  id_from TEXT REFERENCES deleted_outlines (id) ON DELETE CASCADE NOT NULL,
  id_to TEXT NOT NULL,
  type TEXT NOT NULL,
  PRIMARY KEY (id_from, id_to)
) STRICT;

CREATE INDEX "IDX$deleted_outline_links.id_from" ON deleted_outline_links (id_from);

CREATE INDEX "IDX$deleted_outline_links.id_to" ON deleted_outline_links (id_to);

CREATE TABLE assets (
  hash TEXT PRIMARY KEY NOT NULL, -- SHA-256 hash of the data
  data BLOB NOT NULL
) STRICT;

CREATE TABLE deleted_assets (
  hash TEXT PRIMARY KEY NOT NULL,
  data BLOB NOT NULL
) STRICT;

CREATE TABLE outline_asset_rel (
  outline_id TEXT REFERENCES outlines (id) ON DELETE CASCADE NOT NULL,
  asset_hash TEXT REFERENCES assets (hash) ON DELETE CASCADE NOT NULL,
  filename TEXT NOT NULL,
  extension TEXT NOT NULL,
  PRIMARY KEY (outline_id, asset_hash, filename, extension)
) STRICT;

CREATE TABLE deleted_outline_asset_rel (
  outline_id TEXT REFERENCES deleted_outlines (id) ON DELETE CASCADE NOT NULL,
  asset_hash TEXT NOT NULL,
  filename TEXT NOT NULL,
  extension TEXT NOT NULL,
  PRIMARY KEY (outline_id, asset_hash, filename, extension)
) STRICT;

CREATE INDEX "IDX$deleted_outline_asset_rel.asset_hash" ON deleted_outline_asset_rel (asset_hash);

-- # FTS
CREATE VIRTUAL TABLE fts USING fts5 (
  doc,
  content = '', -- contentless table
  tokenize = "trigram remove_diacritics 1"
);

-- Table for searching one or two character queries with term prefix matching
-- To include the last one or two characters in the search target, meaningless 2 characters need to be added by application logic
CREATE VIRTUAL TABLE fts_vocab USING fts5vocab (fts, ROW);

-- # Triggers
CREATE TRIGGER set_path_and_root_id AFTER INSERT ON outlines FOR EACH ROW BEGIN
UPDATE outlines
SET
  path = CASE
    WHEN NEW.parent_id IS NULL THEN '''' || NEW.id || ''''
    ELSE (
      SELECT
        path
      FROM
        outlines
      WHERE
        id = NEW.parent_id
    ) || ',' || '''' || NEW.id || ''''
  END,
  root_id = CASE
    WHEN NEW.parent_id IS NULL THEN NEW.id
    ELSE (
      SELECT
        root_id
      FROM
        outlines
      WHERE
        id = NEW.parent_id
    )
  END
WHERE
  id = NEW.id;

END;

CREATE TRIGGER reconsile_path_and_root_id AFTER
UPDATE ON outlines FOR EACH ROW WHEN OLD.parent_id IS DISTINCT
FROM
  NEW.parent_id BEGIN
UPDATE outlines
SET
  path = CASE
    WHEN NEW.parent_id IS NULL THEN '''' || NEW.id || ''''
    ELSE (
      SELECT
        path
      FROM
        outlines
      WHERE
        id = NEW.parent_id
    ) || ',' || '''' || NEW.id || ''''
  END,
  root_id = CASE
    WHEN NEW.parent_id IS NULL THEN NEW.id
    ELSE (
      SELECT
        root_id
      FROM
        outlines outlines
      WHERE
        id = NEW.parent_id
    )
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
  ) || substr(path, length(OLD.path) + 1),
  root_id = CASE
    WHEN NEW.parent_id IS NULL THEN NEW.id
    ELSE (
      SELECT
        root_id
      FROM
        outlines
      WHERE
        id = NEW.parent_id
    )
  END
WHERE
  path LIKE OLD.path || ',%';

END;

CREATE TRIGGER set_full_findex AFTER INSERT ON outlines FOR EACH ROW BEGIN
UPDATE outlines
SET
  full_findex = CASE
    WHEN NEW.parent_id IS NULL THEN NEW.findex
    ELSE (
      SELECT
        full_findex || '/' || NEW.findex
      FROM
        outlines
      WHERE
        id = NEW.parent_id
    )
  END
WHERE
  id = NEW.id;

END;

CREATE TRIGGER reconcile_full_findex AFTER
UPDATE ON outlines FOR EACH ROW WHEN OLD.parent_id IS DISTINCT
FROM
  NEW.parent_id BEGIN
UPDATE outlines
SET
  full_findex = CASE
    WHEN NEW.parent_id IS NULL THEN NEW.findex
    ELSE (
      SELECT
        full_findex || '/' || NEW.findex
      FROM
        outlines
      WHERE
        id = NEW.parent_id
    )
  END
WHERE
  id = NEW.id;

UPDATE outlines
SET
  full_findex = (
    SELECT
      full_findex
    FROM
      outlines
    WHERE
      id = NEW.id
  ) || substr(full_findex, length(OLD.full_findex) + 1)
WHERE
  path LIKE OLD.path || ',%';

END;

CREATE TRIGGER before_delete_on_outlines BEFORE DELETE ON outlines FOR EACH ROW BEGIN
INSERT INTO
  deleted_outlines (
    id,
    parent_id,
    findex,
    type,
    doc,
    created_at,
    updated_at,
    collapsed,
    completed
  )
SELECT
  OLD.id,
  OLD.parent_id,
  OLD.findex,
  OLD.type,
  OLD.doc,
  OLD.created_at,
  OLD.updated_at,
  OLD.collapsed,
  OLD.completed;

INSERT INTO
  deleted_y_updates
SELECT
  *
FROM
  y_updates
WHERE
  outline_id = OLD.id;

INSERT INTO
  deleted_outline_links
SELECT
  *
FROM
  outline_links
WHERE
  id_from = OLD.id;

INSERT INTO
  deleted_outline_asset_rel
SELECT
  *
FROM
  outline_asset_rel
WHERE
  outline_id = OLD.id;

END;

CREATE TRIGGER before_delete_on_outline_asset_rel AFTER DELETE ON outline_asset_rel FOR EACH ROW WHEN NOT EXISTS (
  SELECT
    1
  FROM
    outline_asset_rel
  WHERE
    asset_hash = OLD.asset_hash
  LIMIT
    1
) BEGIN
INSERT INTO
  deleted_assets (hash, data)
SELECT
  hash,
  data
FROM
  assets
WHERE
  hash = OLD.asset_hash;

DELETE FROM assets
WHERE
  hash = OLD.asset_hash;

END;
