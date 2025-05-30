DELETE FROM outline_asset_rel
WHERE
  outline_id = ?
  AND asset_hash = ?
  AND filename = ?
  AND extension = ?;
