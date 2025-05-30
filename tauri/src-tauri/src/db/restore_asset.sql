INSERT OR IGNORE INTO
  assets (hash, data)
SELECT
  *
FROM
  deleted_assets
WHERE
  hash = ?;
