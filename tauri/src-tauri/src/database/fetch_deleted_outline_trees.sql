WITH RECURSIVE
  roots AS (
    SELECT
      o.id,
      o.parent_id,
      o.findex,
      o.attrs,
      o.doc,
      o.created_at,
      o.updated_at,
      o.completed,
      o.collapsed,
      o.deleted
    FROM
      outlines o
      LEFT JOIN outlines parent ON o.parent_id = parent.id
    WHERE
      o.deleted = true
      AND (
        o.parent_id IS NULL
        OR parent.derived_deleted = false
      )
    ORDER BY
      o.updated_at DESC
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
      child.attrs,
      child.doc,
      child.created_at,
      child.updated_at,
      child.completed,
      child.collapsed,
      child.deleted
    FROM
      outlines child
      INNER JOIN tree parent ON child.parent_id = parent.id
  )
SELECT
  *
FROM
  tree;
