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
  outlines o
  INNER JOIN fts ON o.rowid = fts.rowid
  LEFT JOIN outline_links links ON links.id_from = o.id
WHERE
  o.type = 'heading'
  AND fts MATCH (
    SELECT
      coalesce(
        group_concat('"' || replace(term, '"', '""') || '"', ' OR '),
        ""
      )
    FROM
      fts_vocab
    WHERE
      $cond
  )
GROUP BY
  o.id
ORDER BY
  fts.rank
LIMIT
  5;
