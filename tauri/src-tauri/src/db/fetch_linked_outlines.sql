WITH RECURSIVE
  temp_linked_outlines AS (
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
      outlines `from`
      INNER JOIN outline_links links ON `from`.id IN ($ids)
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
      `to`.hidden,
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
      parent.hidden,
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
  ) AS links
FROM
  linked_outlines o
  LEFT JOIN outline_links links ON links.id_from = o.id
GROUP BY
  (id);
