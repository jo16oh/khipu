SELECT
  o.rowid AS "rowid!",
  o.id,
  o.doc
FROM
  outline_links links
  INNER JOIN outlines o ON links.id_from = o.id
WHERE
  links.id_to = ?;
