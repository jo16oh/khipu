WITH RECURSIVE
  tree AS (
    SELECT
      id,
      parent_id,
      findex,
      type,
      doc,
      created_at,
      updated_at,
      completed,
      collapsed,
      0 AS depth
    FROM
      deleted_outlines
    WHERE
      id = ?
    UNION ALL
    SELECT
      child.id,
      child.parent_id,
      child.findex,
      child.type,
      child.doc,
      child.created_at,
      child.updated_at,
      child.completed,
      child.collapsed,
      parent.depth + 1 AS depth
    FROM
      deleted_outlines child
      INNER JOIN tree parent ON child.parent_id = parent.id
  )
SELECT
  id,
  parent_id,
  findex,
  type,
  doc,
  created_at,
  updated_at,
  completed,
  collapsed
FROM
  tree
ORDER BY
  depth ASC;
