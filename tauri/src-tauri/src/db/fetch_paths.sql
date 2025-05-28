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
      INNER JOIN json_each(json(?)) AS ids ON ids.value = o.id
      INNER JOIN outlines parent ON parent.id = o.parent_id
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
  o.id;
