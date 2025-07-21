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
      `from`.*
    FROM
      tree `to`
      INNER JOIN outline_links links ON links.id_to = `to`.id
      INNER JOIN outlines `from` ON links.id_from = `from`.id
    WHERE
      `from`.derived_deleted = false
    UNION ALL
    SELECT
      parent.*
    FROM
      outlines parent
      INNER JOIN headings child ON parent.id = child.parent_id
  )
SELECT
  o.id,
  o.parent_id,
  o.findex,
  o.attrs,
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
      root_id,
      link_count
    FROM
      (
        SELECT
          root_id,
          count(root_id) AS link_count,
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
  ) AS root_ids ON o.id = root_ids.root_id
GROUP BY
  o.id
ORDER BY
  root_ids.link_count DESC,
  o.updated_at DESC
LIMIT
  10
OFFSET
  ?;
