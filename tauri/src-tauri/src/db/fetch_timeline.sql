WITH RECURSIVE
  tree AS (
    SELECT
      *
    FROM
      outlines
    WHERE
      (
        created_at BETWEEN ? AND ?
        OR updated_at BETWEEN ? AND ?
      )
      AND deleted = false
    UNION ALL
    SELECT
      parent.*
    FROM
      outlines parent
      INNER JOIN tree child ON parent.parent_id = child.id
    WHERE
      parent.deleted = false
  ),
  links AS (
    SELECT
      `to`.id,
      `to`.parent_id,
      `to`.findex,
      `to`.type,
      `to`.doc,
      `to`.created_at,
      `to`.updated_at,
      `to`.hidden,
      `to`.collapsed,
      `to`.deleted
    FROM
      tree `from`
      INNER JOIN outline_links links ON links.id_from = `from`.id
      INNER JOIN outlines `to` ON links.id_to = `to`.id
      AND `to`.deleted = false
    UNION ALL
    SELECT
      parent.id,
      parent.parent_id,
      parent.findex,
      parent.type,
      parent.doc,
      parent.created_at,
      parent.updated_at,
      parent.hidden,
      parent.collapsed,
      parent.deleted
    FROM
      outlines parent
      INNER JOIN links ON parent.id = links.parent_id
      AND parent.deleted = false
      INNER JOIN outline_links l ON l.id_from = parent.id
      AND l.type = "tag"
  )
SELECT
  o.id,
  o.parent_id,
  o.findex,
  o.type,
  o.doc,
  o.created_at,
  o.updated_at,
  o.hidden,
  o.collapsed,
  o.deleted,
  json_group_array(
    json_object('id', links.id_to, 'type', links.type)
  ) FILTER (
    WHERE
      links.id_to IS NOT NULL
  ) AS links
FROM
  tree o
  LEFT JOIN outline_links links ON links.id_from = o.id
WHERE
  NOT EXISTS (
    SELECT
      1
    FROM
      tree
    WHERE
      o.path LIKE tree.path || '/%'
      AND tree.collapsed = true
  )
GROUP BY
  (id)
UNION ALL
SELECT
  o.*,
  json_group_array(
    json_object('id', links.id_to, 'type', links.type)
  ) FILTER (
    WHERE
      links.id_to IS NOT NULL
  ) AS links
FROM
  links o
  LEFT JOIN outline_links links ON links.id_from = o.id
GROUP BY
  (id);
