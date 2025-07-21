WITH RECURSIVE
  linked_outlines AS (
    SELECT
      `to`.id,
      `to`.parent_id,
      `to`.findex,
      `to`.attrs,
      `to`.doc,
      `to`.created_at,
      `to`.updated_at,
      `to`.completed,
      `to`.collapsed,
      `to`.deleted
    FROM
      json_each(json(?)) AS `from`
      INNER JOIN outline_links links ON links.id_from = `from`.value
      INNER JOIN outlines `to` ON links.id_to = `to`.id
    WHERE
      `to`.derived_deleted = false
    UNION ALL
    SELECT
      parent.id,
      parent.parent_id,
      parent.findex,
      parent.attrs,
      parent.doc,
      parent.created_at,
      parent.updated_at,
      parent.completed,
      parent.collapsed,
      parent.deleted
    FROM
      outlines parent
      INNER JOIN linked_outlines ON parent.id = linked_outlines.parent_id
      INNER JOIN outline_links link ON link.id_from = parent.id
      AND link.type = "tag"
  )
SELECT
  o.*
FROM
  linked_outlines o;
