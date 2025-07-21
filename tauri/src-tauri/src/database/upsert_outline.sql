INSERT INTO
  outlines (
    id,
    parent_id,
    findex,
    attrs,
    doc,
    created_at,
    updated_at,
    completed,
    collapsed,
    deleted
  )
VALUES
  (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT DO UPDATE
SET
  parent_id = excluded.parent_id,
  findex = excluded.findex,
  attrs = excluded.attrs,
  doc = excluded.doc,
  updated_at = excluded.updated_at,
  completed = excluded.completed,
  collapsed = excluded.collapsed,
  deleted = excluded.deleted
WHERE
  id = excluded.id RETURNING rowid;
