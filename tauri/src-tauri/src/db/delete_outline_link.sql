DELETE FROM outline_links
WHERE
  id_from = ?
  AND id_to = ?;
