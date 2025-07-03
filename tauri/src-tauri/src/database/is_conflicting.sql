SELECT
  1
FROM
  outlines target
  INNER JOIN outlines siblings ON siblings.parent_id IS NOT DISTINCT
FROM
  target.parent_id
  AND siblings.id != ?1
  INNER JOIN fts ON siblings.rowid = fts.rowid
WHERE
  fts MATCH ?2
LIMIT
  1;
