WITH RECURSIVE
  tree AS (
    SELECT
      *
    FROM
      outlines
    WHERE
      CASE
        WHEN ?2 = 'created_at' THEN created_at BETWEEN ?1 AND ?1  + (60 * 60 * 24 * 1000)
        WHEN ?2 = 'updated_at' THEN updated_at BETWEEN ?1 AND ?1  + (60 * 60 * 24 * 1000)
        ELSE false
      END
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
  temp_linked_outlines AS (
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
      `to`.deleted
    FROM
      tree `from`
      INNER JOIN outline_links links ON `from`.id = links.id_from
      AND links.id_from = `from`.id
      INNER JOIN outlines `to` ON links.id_to = `to`.id
      AND `to`.deleted = false
    UNION
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
      `to`.deleted
    FROM
      outline_links links
      INNER JOIN temp_linked_outlines `from` ON `from`.id = links.id_from
      AND `from`.type != "quote"
      INNER JOIN outlines `to` ON links.id_to = `to`.id
      AND `to`.deleted = false
  ),
  linked_outlines AS (
    SELECT
      *
    FROM
      temp_linked_outlines
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
      INNER JOIN linked_outlines links ON parent.id = links.parent_id
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
  o.completed,
  o.collapsed,
  o.deleted,
  json_group_array(
    json_object('id', links.id_to, 'type', links.type)
  ) FILTER (
    WHERE
      links.id_to IS NOT NULL
  ) AS linklist
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
  ) AS linklist
FROM
  linked_outlines o
  LEFT JOIN outline_links links ON links.id_from = o.id
GROUP BY
  (id);
