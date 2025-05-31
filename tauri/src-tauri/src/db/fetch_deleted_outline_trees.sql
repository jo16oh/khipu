WITH RECURSIVE
  roots AS (
    SELECT
      o.id,
      o.parent_id,
      o.findex,
      o.type,
      o.doc,
      o.created_at,
      o.updated_at,
      o.completed,
      o.collapsed
    FROM
      deleted_outlines o
      LEFT JOIN deleted_outlines parent ON o.parent_id = parent.id
    WHERE
      parent.id IS NULL
    ORDER BY
      o.deleted_at DESC
    LIMIT
      10
    OFFSET
      ?
  ),
  tree AS (
    SELECT
      *
    FROM
      roots
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
      child.collapsed
    FROM
      deleted_outlines child
      INNER JOIN tree parent ON child.parent_id = parent.id
  )
SELECT
  *
FROM
  tree;
