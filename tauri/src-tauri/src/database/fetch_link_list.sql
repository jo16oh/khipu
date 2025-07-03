SELECT
  links.id_to AS 'id',
  links.type AS 'type'
FROM
  outlines o
  INNER JOIN outline_links links ON links.id_from = o.id
WHERE
  o.id = ?;
