SELECT
  CASE
    WHEN ?3 = 'created_at' THEN CASE
      WHEN ?1 = 'before' THEN (
        SELECT
          coalesce(max(created_at), 0)
        FROM
          outlines
        WHERE
          created_at < ?2
      )
      WHEN ?1 = 'after' THEN (
        SELECT
          coalesce(min(created_at), 0)
        FROM
          outlines
        WHERE
          ?2 < created_at
      )
    END
    WHEN ?3 = 'updated_at' THEN (
      CASE
        WHEN ?1 = 'before' THEN (
          SELECT
            coalesce(max(updated_at), 0)
          FROM
            outlines
          WHERE
            updated_at < ?2
        )
        WHEN ?1 = 'after' THEN (
          SELECT
            coalesce(min(updated_at), 0)
          FROM
            outlines
          WHERE
            ?2 < updated_at
        )
      END
    )
  END AS 'latest!: i64';
