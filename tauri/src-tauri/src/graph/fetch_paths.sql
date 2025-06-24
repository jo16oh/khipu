WITH RECURSIVE
  path AS (
    SELECT
      parent.id,
      parent.parent_id,
      parent.findex,
      parent.type,
      parent.doc,
      parent.created_at,
      parent.updated_at,
      parent.completed,
      parent.collapsed,
      parent.deleted
    FROM
      outlines o
      INNER JOIN json_each(json(?)) AS ids ON ids.value = o.id
      INNER JOIN outlines parent ON parent.id = o.parent_id
    UNION ALL
    SELECT
      parent.id,
      parent.parent_id,
      parent.findex,
      parent.type,
      parent.doc,
      parent.created_at,
      parent.updated_at,
      parent.completed,
      parent.collapsed,
      parent.deleted
    FROM
      outlines parent
      INNER JOIN path ON parent.id = path.parent_id
  )
SELECT
  o.*
FROM
  path o
GROUP BY
  o.id;
