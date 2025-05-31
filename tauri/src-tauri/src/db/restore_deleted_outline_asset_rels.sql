INSERT INTO
  outline_asset_rel
SELECT
  *
FROM
  deleted_outline_asset_rel
WHERE
  outline_id IN (
    SELECT
      value
    FROM
      json_each(json(?))
  );
