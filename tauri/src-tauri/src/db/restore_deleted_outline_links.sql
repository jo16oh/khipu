INSERT INTO
  outline_links
SELECT
  *
FROM
  deleted_outline_links
WHERE
  id_from IN (
    SELECT
      value
    FROM
      json_each(json(?))
  );
