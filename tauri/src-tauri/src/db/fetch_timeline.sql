WITH RECURSIVE
  tree AS (
    SELECT
      *
    FROM
      outlines
    WHERE
      CASE
        WHEN ?2 = 'created_at' THEN created_at BETWEEN ?1 AND ?1  + (60 * 60 * 24 * 1000)
        WHEN ?2 = 'updated_at' THEN updated_at BETWEEN ?1 AND ?1  + (60 * 60 * 24 * 1000)
        ELSE false
      END
    UNION ALL
    SELECT
      parent.*
    FROM
      outlines parent
      INNER JOIN tree child ON parent.parent_id = child.id
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
  o.collapsed
FROM
  tree o
WHERE
  NOT EXISTS (
    SELECT
      1
    FROM
      tree
    WHERE
      o.path LIKE tree.path || ',%'
      AND tree.collapsed = true
  )
GROUP BY
  o.id;
