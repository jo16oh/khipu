WITH RECURSIVE
  path AS (
    SELECT
      parent.id,
      parent.parent_id,
      parent.findex,
      parent.type,
      parent.doc,
      parent.created_at,
      parent.updated_at,
      parent.completed,
      parent.collapsed,
      parent.deleted
    FROM
      outlines o
      INNER JOIN outlines parent ON parent.id = o.parent_id
    WHERE
      o.id = ?1
      AND o.derived_deleted = false
    UNION ALL
    SELECT
      parent.id,
      parent.parent_id,
      parent.findex,
      parent.type,
      parent.doc,
      parent.created_at,
      parent.updated_at,
      parent.completed,
      parent.collapsed,
      parent.deleted
    FROM
      outlines parent
      INNER JOIN path ON parent.id = path.parent_id
  ),
  tree AS (
    SELECT
      id,
      parent_id,
      findex,
      type,
      doc,
      created_at,
      updated_at,
      completed,
      collapsed,
      deleted
    FROM
      outlines
    WHERE
      id = ?1
      AND derived_deleted = false
    UNION ALL
    SELECT
      child.id,
      child.parent_id,
      child.findex,
      child.type,
      child.doc,
      child.created_at,
      child.updated_at,
      child.completed,
      child.collapsed,
      child.deleted
    FROM
      outlines child
      INNER JOIN tree ON tree.id = child.parent_id
      AND (
        tree.collapsed = false
        OR tree.id = ?1
      )
    WHERE
      child.derived_deleted = false
  ),
  linked_outlines AS (
    SELECT
      `to`.id,
      `to`.parent_id,
      `to`.findex,
      `to`.type,
      `to`.doc,
      `to`.created_at,
      `to`.updated_at,
      `to`.completed,
      `to`.collapsed,
      `to`.deleted
    FROM
      tree `from`
      INNER JOIN outline_links links ON links.id_from = `from`.id
      INNER JOIN outlines `to` ON links.id_to = `to`.id
    WHERE
      `to`.derived_deleted = false
    UNION ALL
    SELECT
      parent.id,
      parent.parent_id,
      parent.findex,
      parent.type,
      parent.doc,
      parent.created_at,
      parent.updated_at,
      parent.completed,
      parent.collapsed,
      parent.deleted
    FROM
      outlines parent
      INNER JOIN linked_outlines links ON parent.id = links.parent_id
      INNER JOIN outline_links l ON l.id_from = parent.id
      AND links.type = "tag"
  )
SELECT
  o.*
FROM
  path o
GROUP BY
  o.id
UNION ALL
SELECT
  o.*
FROM
  tree o
UNION ALL
SELECT
  o.*
FROM
  linked_outlines o;
