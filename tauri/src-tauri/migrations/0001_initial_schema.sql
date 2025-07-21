-- # Settings
PRAGMA journal_mode = 'WAL';

PRAGMA foreign_keys = ON;

-- Check foreign key consistancy when committing a transaction
PRAGMA defer_foreign_keys = ON;

-- Store temp tables in memory
PRAGMA temp_store = 2;

-- Set the cache size to 64,000 KiB (negative value indicates kibibytes)
PRAGMA cache_size = -64000;

-- # Tables
CREATE TABLE outlines (
  id TEXT PRIMARY KEY NOT NULL,
  parent_id TEXT REFERENCES outlines (id) ON DELETE CASCADE,
  findex TEXT NOT NULL, -- stores fractional-index
  attrs TEXT NOT NULL,
  doc TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  collapsed INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  deleted INTEGER NOT NULL DEFAULT 0,
  derived_deleted INTEGER NOT NULL DEFAULT 0,
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
  hash TEXT PRIMARY KEY NOT NULL, -- SHA-256 hash of the data
  data BLOB NOT NULL
) STRICT;

CREATE TABLE outline_asset_rel (
  outline_id TEXT REFERENCES outlines (id) ON DELETE CASCADE NOT NULL,
  asset_hash TEXT REFERENCES assets (hash) ON DELETE CASCADE NOT NULL,
  filename TEXT NOT NULL,
  extension TEXT NOT NULL,
  PRIMARY KEY (outline_id, asset_hash, filename, extension)
) STRICT;

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
  rowid = NEW.rowid;

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
  rowid = NEW.rowid;

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
  rowid = NEW.rowid;

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
  rowid = NEW.rowid;

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

CREATE TRIGGER set_derived_delete AFTER INSERT ON outlines FOR EACH ROW BEGIN
UPDATE outlines
SET
  derived_deleted = coalesce(
    (
      SELECT
        true
      FROM
        outlines AS ancestors
      WHERE
        ancestors.id IN (
          SELECT
            value
          FROM
            json_each(
              '[' || rtrim(rtrim(NEW.path, quote(NEW.id)), ',') || ']'
            )
        )
        AND ancestors.deleted = true
      LIMIT
        1
    ),
    false
  )
WHERE
  rowid = NEW.rowid;

END;

CREATE TRIGGER reconcile_derived_delete AFTER
UPDATE ON outlines FOR EACH ROW WHEN old.deleted != new.deleted BEGIN
-- Set derived_deleted of all descendatns and self true when the outline is deleted
UPDATE outlines
SET
  derived_deleted = true
WHERE
  NEW.deleted = true
  AND id IN (
    WITH RECURSIVE
      tree AS (
        SELECT
          id
        FROM
          outlines
        WHERE
          id = NEW.id
        UNION ALL
        SELECT
          child.id
        FROM
          outlines child
          INNER JOIN tree parent ON parent.id = child.parent_id
      )
    SELECT
      id
    FROM
      tree
  );

-- Recalculate derived_deleted when the outline is restored
UPDATE outlines
SET
  derived_deleted = coalesce(
    (
      SELECT
        true
      FROM
        outlines AS ancestor
      WHERE
        ancestor.id IN (
          SELECT
            value
          FROM
            json_each(
              '[' || rtrim(rtrim(NEW.path, quote(NEW.id)), ',') || ']'
            )
        )
        AND ancestor.deleted = true
      LIMIT
        1
    ),
    false
  )
WHERE
  NEW.deleted = false
  AND rowid = NEW.rowid;

-- Propagate derived_deleted to descendatns when the outline is restored
UPDATE outlines
SET
  derived_deleted = false
WHERE
  NEW.deleted = false
  AND (
    SELECT
      derived_deleted
    FROM
      outlines
    WHERE
      rowid = NEW.rowid
  ) = false
  AND id IN (
    WITH RECURSIVE
      tree AS (
        SELECT
          id
        FROM
          outlines
        WHERE
          parent_id = NEW.id
          AND deleted = false
        UNION ALL
        SELECT
          child.id
        FROM
          outlines child
          INNER JOIN tree parent ON parent.id = child.parent_id
        WHERE
          child.deleted = false
      )
    SELECT
      id
    FROM
      tree
  );

END;
