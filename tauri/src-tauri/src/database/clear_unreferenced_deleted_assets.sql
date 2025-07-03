DELETE FROM assets
WHERE
  hash NOT IN (
    SELECT
      hash
    FROM
      assets
      INNER JOIN outline_asset_rel ON hash = asset_hash
  );
