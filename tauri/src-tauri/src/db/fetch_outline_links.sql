SELECT
  json_group_array(
    json_object('id', links.id_to, 'type', links.type)
  ) FILTER (
    WHERE
      links.id_to IS NOT NULL
  ) AS "links!"
FROM
  outlines o
  INNER JOIN outline_links links ON links.id_from = o.id
WHERE
  o.id = ?;
