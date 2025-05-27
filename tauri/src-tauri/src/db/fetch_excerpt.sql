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
  outlines headings
  INNER JOIN outlines o ON headings.id = ?
  AND o.path LIKE headings.path || ',%'
  LEFT JOIN outline_links links ON links.id_from = o.id
WHERE
  NOT EXISTS (
    SELECT
      1
    FROM
      outlines ancestors
      JOIN json_each(
        json(
          '[' || substr(o.path, length(headings.path) + 2) || ']'
        )
      ) path_ids ON ancestors.id = path_ids.value
    WHERE
      ancestors.collapsed = true
    LIMIT
      1
  )
GROUP BY
  o.id
LIMIT
  5;
