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
      path
    FROM
      outlines o
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
      child.path
    FROM
      outlines child
      INNER JOIN tree ON tree.id = child.parent_id
  ),
  headings AS (
    SELECT
      `to`.id,
      `to`.parent_id,
      `to`.findex,
      `to`.type,
      `to`.doc,
      `to`.created_at,
      `to`.updated_at,
      `to`.completed,
      `to`.collapsed,
      `to`.path
    FROM
      tree `from`
      INNER JOIN outline_links links ON links.id_from = `from`.id
      INNER JOIN outlines `to` ON links.id_to = `to`.id
  )
SELECT
  o.id,
  o.parent_id,
  o.findex,
  o.type,
  o.doc,
  o.created_at,
  o.updated_at,
  o.completed,
  o.collapsed,
  json_group_array(
    json_object('id', links.id_to, 'type', links.type)
  ) FILTER (
    WHERE
      links.id_to IS NOT NULL
  ) AS linklist
FROM
  headings o
  LEFT JOIN outline_links links ON links.id_from = o.id
  LEFT JOIN tree ON links.id_to = tree.id
WHERE
  o.type = 'heading'
  AND NOT EXISTS (
    SELECT
      1
    FROM
      headings p
    WHERE
      o.path LIKE p.path || '/%'
  )
GROUP BY
  (o.id)
ORDER BY
  tree.path ASC;
