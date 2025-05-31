DELETE FROM deleted_assets
WHERE
  hash NOT IN (
    SELECT
      hash
    FROM
      deleted_assets
      INNER JOIN deleted_outline_asset_rel ON hash = asset_hash
  );
