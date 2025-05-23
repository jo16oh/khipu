WITH RECURSIVE
  matches_in_range AS (
    SELECT
      o.*
    FROM
      outlines o
      INNER JOIN fts ON o.rowid = fts.rowid
    WHERE
      fts MATCH $q
      AND CASE
        WHEN ?2 = 'created_at' THEN created_at BETWEEN ?1 AND ?1  + (60 * 60 * 24 * 1000)
        WHEN ?2 = 'updated_at' THEN updated_at BETWEEN ?1 AND ?1  + (60 * 60 * 24 * 1000)
        ELSE false
      END
      AND deleted = false
  ),
  root_ids AS (
    SELECT DISTINCT
      CASE
        WHEN parent_id IS NULL THEN id
        ELSE substr(path, 1, instr(path, "/") - 1)
      END AS 'id'
    FROM
      matches_in_range
    WHERE
      path NOT IN ($ex)
  ),
  matches AS (
    SELECT
      o.id,
      o.parent_id,
      o.findex,
      o.type,
      o.doc,
      o.created_at,
      o.updated_at,
      o.hidden,
      o.collapsed,
      o.deleted
    FROM
      outlines o
      INNER JOIN fts ON o.rowid = fts.rowid
    WHERE
      fts MATCH $q
      AND EXISTS (
        SELECT
          1
        FROM
          root_ids
        WHERE
          o.path LIKE root_ids.id || "%"
      )
      AND o.deleted = false
    UNION ALL
    SELECT
      parent.id,
      parent.parent_id,
      parent.findex,
      parent.type,
      parent.doc,
      parent.created_at,
      parent.updated_at,
      parent.hidden,
      parent.collapsed,
      parent.deleted
    FROM
      outlines parent
      INNER JOIN matches ON parent.id = matches.parent_id
    WHERE
      parent.deleted = false
  ),
  links AS (
    SELECT
      `to`.id,
      `to`.parent_id,
      `to`.findex,
      `to`.type,
      `to`.doc,
      `to`.created_at,
      `to`.updated_at,
      `to`.hidden,
      `to`.collapsed,
      `to`.deleted
    FROM
      matches `from`
      INNER JOIN outline_links links ON links.id_from = `from`.id
      INNER JOIN outlines `to` ON links.id_to = `to`.id
      AND `to`.deleted = false
    UNION ALL
    SELECT
      parent.id,
      parent.parent_id,
      parent.findex,
      parent.type,
      parent.doc,
      parent.created_at,
      parent.updated_at,
      parent.hidden,
      parent.collapsed,
      parent.deleted
    FROM
      outlines parent
      INNER JOIN links ON parent.id = links.parent_id
      AND parent.deleted = false
      INNER JOIN outline_links l ON l.id_from = parent.id
      AND l.type = "tag"
  )
SELECT
  o.*,
  json_group_array(
    json_object('id', links.id_to, 'type', links.type)
  ) FILTER (
    WHERE
      links.id_to IS NOT NULL
  ) AS links
FROM
  matches o
  LEFT JOIN outline_links links ON links.id_from = o.id
GROUP BY
  (id)
UNION
SELECT
  o.*,
  json_group_array(
    json_object('id', links.id_to, 'type', links.type)
  ) FILTER (
    WHERE
      links.id_to IS NOT NULL
  ) AS links
FROM
  links o
  LEFT JOIN outline_links links ON links.id_from = o.id
GROUP BY
  (id);
