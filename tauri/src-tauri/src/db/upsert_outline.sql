INSERT INTO
  outlines (
    id,
    parent_id,
    findex,
    doc,
    created_at,
    updated_at,
    hidden,
    collapsed,
    deleted
  )
VALUES
  (?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT DO UPDATE
SET
  id = excluded.id,
  parent_id = excluded.parent_id,
  findex = excluded.findex,
  doc = excluded.doc,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at,
  hidden = excluded.hidden,
  collapsed = excluded.collapsed,
  deleted = excluded.deleted
WHERE
  id = excluded.id RETURNING rowid;
