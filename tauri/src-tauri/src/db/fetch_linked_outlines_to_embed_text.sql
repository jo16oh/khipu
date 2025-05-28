WITH RECURSIVE
  linked_outlines AS (
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
      json_each(json(?)) AS `from`
      INNER JOIN outline_links links ON links.id_from = `from`.value
      INNER JOIN outlines `to` ON links.id_to = `to`.id
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
      AND links.type = "tag"
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
  linked_outlines o
  LEFT JOIN outline_links links ON links.id_from = o.id
GROUP BY
  (id);
