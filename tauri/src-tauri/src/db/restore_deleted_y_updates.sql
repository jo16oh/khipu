INSERT INTO
  y_updates
SELECT
  *
FROM
  deleted_y_updates
WHERE
  outline_id IN (
    SELECT
      value
    FROM
      json_each(json(?))
  );
