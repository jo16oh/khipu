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
      parent.collapsed
    FROM
      outlines o
      INNER JOIN outlines parent ON parent.id = o.parent_id
    WHERE
      o.id = ?1
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
      parent.collapsed
    FROM
      outlines parent
      INNER JOIN path ON parent.id = path.parent_id
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
      o.collapsed
    FROM
      outlines o
    WHERE
      id = ?1
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
      outlines child
      INNER JOIN tree ON tree.id = child.parent_id
      AND (
        tree.collapsed = false
        OR tree.id = ?1
      )
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
      `to`.collapsed
    FROM
      tree `from`
      INNER JOIN outline_links links ON `from`.id = links.id_from
      AND links.id_from = `from`.id
      INNER JOIN outlines `to` ON links.id_to = `to`.id
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
      `to`.collapsed
    FROM
      outline_links links
      INNER JOIN temp_linked_outlines `from` ON `from`.id = links.id_from
      AND `from`.type != "quote"
      INNER JOIN outlines `to` ON links.id_to = `to`.id
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
      parent.collapsed
    FROM
      outlines parent
      INNER JOIN linked_outlines links ON parent.id = links.parent_id
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
