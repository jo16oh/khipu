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
  INNER JOIN fts ON o.rowid = fts.rowid
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
ORDER BY
  fts.rank
LIMIT
  5;
