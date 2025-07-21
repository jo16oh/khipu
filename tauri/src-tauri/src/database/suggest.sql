SELECT
  o.id,
  o.parent_id,
  o.findex,
  o.attrs,
  o.doc,
  o.created_at,
  o.updated_at,
  o.completed,
  o.collapsed,
  o.deleted
FROM
  outlines o
  INNER JOIN fts ON o.rowid = fts.rowid
WHERE
  json_extract(o.attrs, '$.type') = 'heading'
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
  AND o.derived_deleted = false
ORDER BY
  fts.rank
LIMIT
  5;
