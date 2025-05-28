WITH RECURSIVE
  matches AS (
    SELECT
      o.*
    FROM
      outlines o
      INNER JOIN fts ON o.rowid = fts.rowid
    WHERE
      fts MATCH $q
    UNION ALL
    SELECT
      parent.*
    FROM
      outlines parent
      INNER JOIN matches ON parent.id = matches.parent_id
    ORDER BY
      $ord DESC
  ),
  timestamps_of_tree AS (
    SELECT
      root_id,
      max($ord) AS timestamp
    FROM
      matches
    GROUP BY
      (root_id)
    LIMIT
      25
    OFFSET
      ?1
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
  json_group_array(
    json_object('id', links.id_to, 'type', links.type)
  ) FILTER (
    WHERE
      links.id_to IS NOT NULL
  ) AS linklist
FROM
  matches o
  LEFT JOIN outline_links links ON links.id_from = o.id
  INNER JOIN timestamps_of_tree ON timestamps_of_tree.root_id = o.root_id
GROUP BY
  (id)
ORDER BY
  timestamps_of_tree.timestamp DESC;
