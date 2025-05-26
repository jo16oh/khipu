INSERT INTO
  outlines (
    id,
    parent_id,
    findex,
    type,
    doc,
    created_at,
    updated_at,
    completed,
    collapsed
  )
VALUES
  (?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT DO UPDATE
SET
  parent_id = excluded.parent_id,
  findex = excluded.findex,
  type = excluded.type,
  doc = excluded.doc,
  updated_at = excluded.updated_at,
  completed = excluded.completed,
  collapsed = excluded.collapsed
WHERE
  id = excluded.id RETURNING rowid;
