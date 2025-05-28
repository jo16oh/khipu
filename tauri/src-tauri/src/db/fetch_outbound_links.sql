WITH RECURSIVE
  tree AS (
    SELECT
      o.*
    FROM
      outlines o
    WHERE
      id = ?
    UNION ALL
    SELECT
      child.*
    FROM
      outlines child
      INNER JOIN tree ON tree.id = child.parent_id
  ),
  headings AS (
    SELECT
      `to`.*
    FROM
      tree `from`
      INNER JOIN outline_links links ON links.id_from = `from`.id
      INNER JOIN outlines `to` ON links.id_to = `to`.id
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
  o.type,
  o.doc,
  o.created_at,
  o.updated_at,
  o.completed,
  o.collapsed,
  json_group_array(
    json_object('id', links.id_to, 'type', links.type)
  ) FILTER (
    WHERE
      links.id_to IS NOT NULL
  ) AS linklist
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
  LEFT JOIN outline_links links ON links.id_from = o.id
GROUP BY
  o.id
ORDER BY
  root_ids.link_count DESC,
  o.updated_at DESC
LIMIT
  10
OFFSET
  ?;
