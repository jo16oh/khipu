use std::collections::HashSet;

use derive_more::derive::{Deref, DerefMut};
use serde::{Deserialize, Serialize};
use sqlx::{Database, Decode, Encode, Sqlite, prelude::FromRow, sqlite::SqliteValueRef};
use strum::{Display, EnumString};

#[derive(FromRow, Serialize, Deserialize, specta::Type, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Outline {
    pub id: String,
    pub parent_id: Option<String>,
    pub findex: String,
    pub r#type: OutlineType,
    pub doc: String,
    pub linklist: LinkList,
    pub created_at: i64,
    pub updated_at: i64,
    pub completed: SqliteBool,
    pub collapsed: SqliteBool,
    pub deleted: SqliteBool,
}

#[derive(Serialize, Deserialize, specta::Type, Display, EnumString, Clone, Debug)]
#[serde(rename_all = "camelCase")]
#[strum(serialize_all = "lowercase")]
pub enum OutlineType {
    Heading,
    Bullet,
    Paragraph,
}

impl sqlx::Type<Sqlite> for OutlineType {
    fn type_info() -> <Sqlite as Database>::TypeInfo {
        <&str as sqlx::Type<Sqlite>>::type_info()
    }
}

impl<'r> Decode<'r, Sqlite> for OutlineType {
    fn decode(
        value: SqliteValueRef<'r>,
    ) -> Result<Self, Box<dyn std::error::Error + 'static + Send + Sync>> {
        let str = <&str as Decode<Sqlite>>::decode(value)?;
        OutlineType::try_from(str).map_err(|e| e.into())
    }
}

impl<'r> Encode<'r, Sqlite> for OutlineType {
    fn encode_by_ref(
        &self,
        buf: &mut <Sqlite as Database>::ArgumentBuffer<'r>,
    ) -> Result<sqlx::encode::IsNull, sqlx::error::BoxDynError> {
        let string: String = self.to_string();
        <String as Encode<Sqlite>>::encode(string, buf)
    }
}

#[derive(Serialize, Deserialize, specta::Type, Deref, DerefMut, Default, Clone, Debug)]
#[serde(rename_all = "camelCase")]
#[serde(transparent)]
pub struct LinkList(HashSet<Link>);

#[derive(Serialize, Deserialize, specta::Type, PartialEq, Eq, Hash, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Link {
    pub id: String,
    pub r#type: LinkType,
}

#[derive(Serialize, Deserialize, specta::Type, Display, PartialEq, Eq, Hash, Clone, Debug)]
#[serde(rename_all = "camelCase")]
#[strum(serialize_all = "lowercase")]
pub enum LinkType {
    Tag,
    Link,
    Quote,
}

impl sqlx::Type<Sqlite> for LinkList {
    fn type_info() -> <Sqlite as Database>::TypeInfo {
        <&str as sqlx::Type<Sqlite>>::type_info()
    }
}

impl<'r> Decode<'r, Sqlite> for LinkList {
    fn decode(
        value: SqliteValueRef<'r>,
    ) -> Result<Self, Box<dyn std::error::Error + 'static + Send + Sync>> {
        let json = <&str as Decode<Sqlite>>::decode(value)?;
        let set: HashSet<Link> = serde_json::from_str::<Vec<Link>>(json)?
            .into_iter()
            .collect();
        Ok(LinkList(set))
    }
}

#[derive(Serialize, Deserialize, specta::Type, PartialEq, Eq, Clone, Debug)]
#[serde(transparent)]
pub struct SqliteBool(pub bool);

impl sqlx::Type<Sqlite> for SqliteBool {
    fn type_info() -> <Sqlite as Database>::TypeInfo {
        <&i64 as sqlx::Type<Sqlite>>::type_info()
    }
}

impl<'r> Decode<'r, Sqlite> for SqliteBool {
    fn decode(
        value: SqliteValueRef<'r>,
    ) -> Result<Self, Box<dyn std::error::Error + 'static + Send + Sync>> {
        let value = <i64 as Decode<Sqlite>>::decode(value)?;
        Ok(Self(value != 0))
    }
}

impl<'r> Encode<'r, Sqlite> for SqliteBool {
    fn encode_by_ref(
        &self,
        buf: &mut <Sqlite as Database>::ArgumentBuffer<'r>,
    ) -> Result<sqlx::encode::IsNull, sqlx::error::BoxDynError> {
        <i64 as Encode<Sqlite>>::encode(if self.0 { 1 } else { 0 }, buf)
    }
}

impl From<i64> for SqliteBool {
    fn from(value: i64) -> Self {
        Self(value != 0)
    }
}

#[cfg(test)]
use chrono::Utc;

#[cfg(test)]
use crate::util::uuidv7bs58;

#[cfg(test)]
impl Outline {
    pub fn new() -> Self {
        let now = Utc::now().timestamp_millis();

        Outline {
            id: uuidv7bs58(),
            parent_id: None,
            findex: String::new(),
            r#type: OutlineType::Bullet,
            doc: SAMPLE_DOC.to_string(),
            linklist: LinkList::default(),
            created_at: now,
            updated_at: now,
            completed: SqliteBool(false),
            collapsed: SqliteBool(false),
            deleted: SqliteBool(false),
        }
    }

    pub fn new_child(&self) -> Self {
        let now = Utc::now().timestamp_millis();

        Outline {
            id: uuidv7bs58(),
            parent_id: Some(self.id.clone()),
            findex: String::new(),
            r#type: OutlineType::Bullet,
            doc: SAMPLE_DOC.to_string(),
            linklist: LinkList::default(),
            created_at: now,
            updated_at: now,
            completed: SqliteBool(false),
            collapsed: SqliteBool(false),
            deleted: SqliteBool(false),
        }
    }

    pub fn create_tree(width: u8, depth: u8) -> Vec<Outline> {
        let mut buf: Vec<Outline> = Vec::new();

        let root = Outline::new();
        buf.push(root.clone());

        fn create_tree_impl(
            buf: &mut Vec<Outline>,
            parents: Vec<Outline>,
            width: u8,
            max_depth: u8,
            current_depth: u8,
        ) {
            if current_depth < max_depth {
                let children: Vec<Outline> = parents
                    .iter()
                    .flat_map(|parent| (0..width).map(|_| parent.new_child()))
                    .collect();

                for c in children.iter() {
                    buf.push(c.clone())
                }

                create_tree_impl(buf, children, width, max_depth, current_depth + 1);
            }
        }

        create_tree_impl(&mut buf, vec![root], width, depth, 1);

        buf
    }
}

#[cfg(test)]
pub const SAMPLE_DOC: &str = r#"
    {
        "type": "doc",
        "content": [
          {
            "type": "paragraph",
            "content": [
              {
                "type": "text",
                "text": "Example "
              }
            ]
          },
          {
            "type": "paragraph"
          },
          {
            "type": "paragraph",
            "content": [
              {
                "type": "text",
                "text": "Content"
              },
              {
                "type": "other"
              }
            ]
          }
        ]
    }
"#;
