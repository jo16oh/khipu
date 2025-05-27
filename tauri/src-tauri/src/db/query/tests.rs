use super::*;
use crate::{
    db::test::open_connection_in_memory,
    model::{Link, LinkType, OutlineType, SqliteBool},
};
use chrono::Duration;
use serde::{Deserialize, Serialize};

#[tokio::test]
async fn test_timeline() {
    let pool = open_connection_in_memory().await;
    let mut tx = pool.begin().await.unwrap();

    let mut tree = Outline::create_tree(2, 3);
    tree[1].updated_at = (Utc::now() - Duration::days(1)).timestamp_millis();
    tree[2].collapsed = SqliteBool(true);

    for o in tree {
        upsert_outline(&mut tx, &o).await.unwrap();
    }

    tx.commit().await.unwrap();

    let (r, _) = timeline(
        &pool,
        TimelinePosition::Before((Utc::now() + Duration::days(2)).timestamp_millis()),
        OrderBy::UpdatedAt,
    )
    .await
    .unwrap();

    assert_eq!(r.len(), 5);
}

#[tokio::test]
async fn test_search() {
    let pool = open_connection_in_memory().await;
    let mut tx = pool.begin().await.unwrap();

    let mut o = Outline::new();
    o.doc = r#"{ "text": "終わりで草" }"#.to_string();
    upsert_outline(&mut tx, &o).await.unwrap();

    tx.commit().await.unwrap();

    let query = r#"(終わり AND 草) OR "(unbaranced parentheses))""#;
    let (r, _) = search(&pool, query, OrderBy::CreatedAt, 0).await.unwrap();

    assert_eq!(r.len(), 1);
}

#[tokio::test]
async fn test_outbound_links() {
    let pool = open_connection_in_memory().await;
    let mut tx = pool.begin().await.unwrap();

    let mut o1 = Outline::new();
    o1.r#type = OutlineType::Heading;
    let mut o2 = Outline::new();
    o2.r#type = OutlineType::Heading;
    let mut o3 = Outline::new();
    o3.r#type = OutlineType::Heading;
    o3.parent_id = Some(o1.id.clone());
    upsert_outline(&mut tx, &o1).await.unwrap();
    upsert_outline(&mut tx, &o2).await.unwrap();
    upsert_outline(&mut tx, &o3).await.unwrap();

    let mut t1 = Outline::create_tree(2, 3);
    t1[0].r#type = OutlineType::Heading;
    t1[1].linklist.insert(Link {
        id: o1.id.clone(),
        r#type: LinkType::Link,
    });
    t1[2].linklist.insert(Link {
        id: o2.id.clone(),
        r#type: LinkType::Link,
    });
    t1[3].linklist.insert(Link {
        id: o3.id.clone(),
        r#type: LinkType::Link,
    });

    for o in t1.iter() {
        upsert_outline(&mut tx, o).await.unwrap();
    }

    tx.commit().await.unwrap();

    let (r, _) = outbound_links(&pool, &t1[0].id).await.unwrap();

    // forwardlinks in the same tree should be grouped together
    assert_eq!(r.len(), 2);
    // results should be ordered by the order of appearance in the tree
    assert_eq!(r[0].id, o1.id);
    assert_eq!(r[1].id, o2.id);
}

#[tokio::test]
async fn test_fetch_inbound_links() {
    let pool = open_connection_in_memory().await;
    let mut tx = pool.begin().await.unwrap();

    let o = Outline::new();
    upsert_outline(&mut tx, &o).await.unwrap();

    let mut t1 = Outline::create_tree(1, 4);
    t1[0].r#type = OutlineType::Heading;
    t1[1].linklist.insert(Link {
        id: o.id.clone(),
        r#type: LinkType::Link,
    });
    t1[2].r#type = OutlineType::Heading;
    t1[3].linklist.insert(Link {
        id: o.id.clone(),
        r#type: LinkType::Link,
    });

    for o in t1.iter() {
        upsert_outline(&mut tx, o).await.unwrap();
    }

    let mut t2 = Outline::create_tree(1, 4);
    t2[0].r#type = OutlineType::Heading;
    t2[3].linklist.insert(Link {
        id: o.id.clone(),
        r#type: LinkType::Link,
    });

    for o in t2.iter() {
        upsert_outline(&mut tx, o).await.unwrap();
    }

    tx.commit().await.unwrap();

    let (r, _) = inbound_links(&pool, &o.id).await.unwrap();

    // backlinks in the same tree should be grouped together
    assert_eq!(r.len(), 2);
    // results should be ordered by the number of same links contained in the tree
    assert_eq!(r[0].id, t1[0].id);
    assert_eq!(r[1].id, t2[0].id);
}

#[tokio::test]
async fn test_outline_tree() {
    let pool = open_connection_in_memory().await;
    let mut tx = pool.begin().await.unwrap();

    let o1 = Outline::new();
    let o2 = o1.new_child();
    let o3 = o2.new_child();

    upsert_outline(&mut tx, &o1).await.unwrap();
    upsert_outline(&mut tx, &o2).await.unwrap();
    upsert_outline(&mut tx, &o3).await.unwrap();

    let r = tree(&mut *tx, &o2.id).await.unwrap();

    assert_eq!(r.len(), 3);
}

#[tokio::test]
async fn test_upsert_outline() {
    let pool = open_connection_in_memory().await;
    let mut tx = pool.begin().await.unwrap();

    let mut o1 = Outline::new();
    o1.doc = r#"{ "text": "test1" }"#.to_string();
    let o2 = Outline::new();
    let o3 = Outline::new();
    upsert_outline(&mut tx, &o1).await.unwrap();
    upsert_outline(&mut tx, &o2).await.unwrap();
    upsert_outline(&mut tx, &o3).await.unwrap();

    o1.doc = r#"{ "text": "test2" }"#.to_string();
    upsert_outline(&mut tx, &o1).await.unwrap();

    // Is old index removed?
    {
        let r = sqlx::query_scalar!(
            r#"
                    SELECT id 
                    FROM outlines o 
                    INNER JOIN fts ON o.rowid = fts.rowid 
                    WHERE fts MATCH 'test1';
                "#
        )
        .fetch_all(&mut *tx)
        .await
        .unwrap();

        assert_eq!(r.len(), 0);
    }

    // Is new document indexed?
    {
        let r = sqlx::query_scalar!(
            r#"
                    SELECT id 
                    FROM outlines o 
                    INNER JOIN fts ON o.rowid = fts.rowid 
                    WHERE fts MATCH 'test2';
                "#
        )
        .fetch_all(&mut *tx)
        .await
        .unwrap();

        assert_eq!(r.len(), 1);
    }

    let mut links = LinkList::default();
    links.insert(Link {
        id: o2.id.clone(),
        r#type: LinkType::Link,
    });
    links.insert(Link {
        id: o3.id,
        r#type: LinkType::Link,
    });

    o1.linklist = links.clone();
    upsert_outline(&mut tx, &o1).await.unwrap();

    // Is new links registared?
    {
        let r = tree(&mut *tx, &o1.id).await.unwrap();
        assert_eq!(r[0].linklist.len(), 2);
    }

    links.remove(&Link {
        id: o2.id,
        r#type: LinkType::Link,
    });

    o1.linklist = links.clone();
    upsert_outline(&mut tx, &o1).await.unwrap();

    // Is old link removed?
    {
        let r = tree(&mut *tx, &o1.id).await.unwrap();
        assert_eq!(r[0].linklist.len(), 1);
    }
}

#[tokio::test]
async fn test_path_construction() {
    #[derive(Serialize, Deserialize)]
    struct QueryResult {
        id: String,
        path: String,
    }

    fn single_quoted(str: &str) -> String {
        format!("'{}'", str)
    }

    let pool = open_connection_in_memory().await;
    let mut tx = pool.begin().await.unwrap();

    let o1 = Outline::new();
    let o2 = o1.new_child();
    let o3 = o2.new_child();

    upsert_outline(&mut tx, &o1).await.unwrap();
    upsert_outline(&mut tx, &o2).await.unwrap();
    upsert_outline(&mut tx, &o3).await.unwrap();

    // initial path construction
    {
        let results = sqlx::query_as!(
            QueryResult,
            "SELECT id, path FROM outlines ORDER BY path ASC;"
        )
        .fetch_all(&mut *tx)
        .await
        .unwrap();

        assert_eq!(results.len(), 3);
        assert_eq!(results[0].id, o1.id);
        assert_eq!(results[0].path, single_quoted(&o1.id));
        assert_eq!(results[1].id, o2.id);
        assert_eq!(
            results[1].path,
            single_quoted(&o1.id) + "," + &single_quoted(&o2.id)
        );
        assert_eq!(results[2].id, o3.id);
        assert_eq!(
            results[2].path,
            single_quoted(&o1.id) + "," + &single_quoted(&o2.id) + "," + &single_quoted(&o3.id)
        );
    }

    // update parent_id to null
    {
        sqlx::query!(
            "UPDATE outlines SET parent_id = ? WHERE id = ?;",
            Option::<String>::None,
            o2.id
        )
        .execute(&mut *tx)
        .await
        .unwrap();

        let r = sqlx::query_scalar!("SELECT path FROM outlines WHERE id = ?;", o2.id)
            .fetch_one(&mut *tx)
            .await
            .unwrap();

        assert_eq!(r, single_quoted(&o2.id));
    }

    // update parent_id to o4.id
    {
        let o4 = Outline::new();
        upsert_outline(&mut tx, &o4).await.unwrap();

        sqlx::query!(
            "UPDATE outlines SET parent_id = ? WHERE id = ?;",
            o4.id,
            o2.id
        )
        .execute(&mut *tx)
        .await
        .unwrap();

        let id_o4_quoted = single_quoted(&o4.id);
        let results = sqlx::query_as!(
            QueryResult,
            "SELECT id, path FROM outlines WHERE path LIKE ? || '%' ORDER BY path ASC;",
            id_o4_quoted
        )
        .fetch_all(&mut *tx)
        .await
        .unwrap();

        assert_eq!(results.len(), 3);
        assert_eq!(results[0].id, o4.id);
        assert_eq!(results[0].path, single_quoted(&o4.id));
        assert_eq!(results[1].id, o2.id);
        assert_eq!(
            results[1].path,
            single_quoted(&o4.id) + "," + &single_quoted(&o2.id)
        );
        assert_eq!(results[2].id, o3.id);
        assert_eq!(
            results[2].path,
            single_quoted(&o4.id) + "," + &single_quoted(&o2.id) + "," + &single_quoted(&o3.id)
        );
    }
}

#[tokio::test]
async fn test_full_findex() {
    #[derive(Serialize, Deserialize)]
    struct QueryResult {
        id: String,
        full_findex: String,
    }

    let pool = open_connection_in_memory().await;
    let mut tx = pool.begin().await.unwrap();

    let mut o1 = Outline::new();
    let mut o2 = o1.new_child();
    let mut o3 = o2.new_child();
    o1.findex = "o1".to_string();
    o2.findex = "o2".to_string();
    o3.findex = "o3".to_string();

    upsert_outline(&mut tx, &o1).await.unwrap();
    upsert_outline(&mut tx, &o2).await.unwrap();
    upsert_outline(&mut tx, &o3).await.unwrap();

    // initial full_findex construction
    {
        let results = sqlx::query_as!(
            QueryResult,
            "SELECT id, full_findex FROM outlines ORDER BY path ASC;"
        )
        .fetch_all(&mut *tx)
        .await
        .unwrap();

        assert_eq!(results.len(), 3);
        assert_eq!(results[0].id, o1.id);
        assert_eq!(results[0].full_findex, o1.findex);
        assert_eq!(results[1].id, o2.id);
        assert_eq!(
            results[1].full_findex,
            String::new() + &o1.findex + "/" + &o2.findex
        );
        assert_eq!(results[2].id, o3.id);
        assert_eq!(
            results[2].full_findex,
            String::new() + &o1.findex + "/" + &o2.findex + "/" + &o3.findex
        );
    }

    // update parent_id to null
    {
        sqlx::query!(
            "UPDATE outlines SET parent_id = ? WHERE id = ?;",
            Option::<String>::None,
            o2.id
        )
        .execute(&mut *tx)
        .await
        .unwrap();

        let r = sqlx::query_scalar!("SELECT full_findex FROM outlines WHERE id = ?;", o2.id)
            .fetch_one(&mut *tx)
            .await
            .unwrap();

        assert_eq!(r, o2.findex);
    }

    // update parent_id to o4.id
    {
        let mut o4 = Outline::new();
        o4.findex = "o4".to_string();
        upsert_outline(&mut tx, &o4).await.unwrap();

        sqlx::query!(
            "UPDATE outlines SET parent_id = ? WHERE id = ?;",
            o4.id,
            o2.id
        )
        .execute(&mut *tx)
        .await
        .unwrap();

        #[derive(Serialize, Deserialize, Debug)]
        struct QR {
            id: String,
            full_findex: String,
            path: String,
        }

        let r = sqlx::query_as!(QR, "select id, full_findex, path from outlines;")
            .fetch_all(&mut *tx)
            .await
            .unwrap();
        dbg!(r);

        let id = "'".to_string() + &o4.id + "'";
        let results = sqlx::query_as!(
            QueryResult,
            "SELECT id, full_findex FROM outlines WHERE path LIKE ? || '%' ORDER BY path ASC;",
            id
        )
        .fetch_all(&mut *tx)
        .await
        .unwrap();

        assert_eq!(results.len(), 3);
        assert_eq!(results[0].id, o4.id);
        assert_eq!(results[0].full_findex, o4.findex.clone());
        assert_eq!(results[1].id, o2.id);
        assert_eq!(results[1].full_findex, o4.findex.clone() + "/" + &o2.findex);
        assert_eq!(results[2].id, o3.id);
        assert_eq!(
            results[2].full_findex,
            o4.findex + "/" + &o2.findex + "/" + &o3.findex
        );
    }
}
