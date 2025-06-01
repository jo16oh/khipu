WITH RECURSIVE
  tree AS (
    SELECT
      *
    FROM
      outlines
    WHERE
      id = ?
      AND derived_deleted = false
    UNION ALL
    SELECT
      child.*
    FROM
      outlines child
      INNER JOIN tree ON tree.id = child.parent_id
    WHERE
      child.derived_deleted = false
  ),
  headings AS (
    SELECT
      `to`.*,
      `from`.full_findex AS tree_full_findex
    FROM
      tree `from`
      INNER JOIN outline_links links ON links.id_from = `from`.id
      INNER JOIN outlines `to` ON links.id_to = `to`.id
    WHERE
      `from`.derived_deleted = false
    UNION ALL
    SELECT
      parent.*,
      child.tree_full_findex
    FROM
      outlines parent
      INNER JOIN headings child ON parent.id = child.parent_id
  )
SELECT
  o.id,
  o.parent_id,
  o.findex,
  o.type,
  o.doc,
  o.created_at,
  o.updated_at,
  o.completed,
  o.collapsed,
  o.deleted
FROM
  headings o
  INNER JOIN (
    SELECT
      id
    FROM
      (
        SELECT
          id,
          row_number() OVER (
            PARTITION BY
              root_id
            ORDER BY
              full_findex ASC,
              id ASC
          ) AS rn
        FROM
          headings
        GROUP BY
          root_id
      )
    WHERE
      rn = 1
  ) AS heading_ids ON o.id = heading_ids.id
GROUP BY
  o.id
ORDER BY
  min(o.tree_full_findex) ASC
LIMIT
  10
OFFSET
  ?;
