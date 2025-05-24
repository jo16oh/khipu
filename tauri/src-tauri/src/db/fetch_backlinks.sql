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
      deleted,
      path
    FROM
      outlines o
    WHERE
      id = ?1
      AND deleted = false
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
      child.deleted,
      child.path
    FROM
      outlines child
      INNER JOIN tree ON tree.id = child.parent_id
      AND child.deleted = false
  ),
  headings AS (
    SELECT
      `from`.id,
      `from`.parent_id,
      `from`.findex,
      `from`.type,
      `from`.doc,
      `from`.created_at,
      `from`.updated_at,
      `from`.completed,
      `from`.collapsed,
      `from`.deleted,
      `from`.path
    FROM
      tree `to`
      INNER JOIN outline_links links ON links.id_to = `to`.id
      INNER JOIN outlines `from` ON links.id_from = `from`.id
      AND `from`.deleted = false
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
      parent.deleted,
      parent.path
    FROM
      outlines parent
      INNER JOIN headings child ON parent.id = child.parent_id
      AND child.type != 'heading'
      AND parent.deleted = false
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
  o.deleted,
  json_group_array(
    json_object('id', links.id_to, 'type', links.type)
  ) FILTER (
    WHERE
      links.id_to IS NOT NULL
  ) AS links
FROM
  headings o
  LEFT JOIN outline_links links ON links.id_from = o.id
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
  (
    SELECT
      count(*)
    FROM
      outline_links
      INNER JOIN outlines ON outlines.id = outline_links.id_from
    WHERE
      outline_links.id_to = ?1
      AND outlines.path like o.path || '%'
  ) DESC,
  o.updated_at DESC;
