SELECT
  o.id,
  o.doc,
  o.deleted
FROM
  outlines o
  INNER JOIN json_each(json(?)) AS input ON input.value = o.id;
