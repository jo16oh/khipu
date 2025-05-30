SELECT
  asset_hash AS hash,
  filename,
  extension
FROM
  outline_asset_rel
WHERE
  outline_id = ?;
