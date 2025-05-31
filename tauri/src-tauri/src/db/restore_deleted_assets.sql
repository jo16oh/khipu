INSERT INTO
  assets
SELECT
  da.*
FROM
  deleted_assets da
  INNER JOIN deleted_outline_asset_rel rel ON da.hash = rel.asset_hash
WHERE
  rel.outline_id IN (
    SELECT
      value
    FROM
      json_each(json(?))
  );
