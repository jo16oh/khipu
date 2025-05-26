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
      INNER JOIN outlines parent ON parent.id = o.parent_id
    WHERE
      o.id = ?1
      AND parent.deleted = false
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
      AND parent.deleted = false
  ),
  tree AS (
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
      o.deleted
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
      child.deleted
    FROM
      outlines child
      INNER JOIN tree ON tree.id = child.parent_id
      AND (
        tree.collapsed = false
        OR tree.id = ?1
      )
      AND child.deleted = false
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
  o.*,
  json_group_array(
    json_object('id', links.id_to, 'type', links.type)
  ) FILTER (
    WHERE
      links.id_to IS NOT NULL
  ) AS linklist
FROM
  path o
  LEFT JOIN outline_links links ON links.id_from = o.id
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
  tree o
  LEFT JOIN outline_links links ON links.id_from = o.id
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
