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
  outlines headings
  INNER JOIN outlines o ON o.path LIKE headings.path || ',%'
  LEFT JOIN outline_links links ON links.id_from = o.id
WHERE
  headings.id = ?
  AND NOT EXISTS (
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
  AND o.derived_deleted = false
LIMIT
  5;
