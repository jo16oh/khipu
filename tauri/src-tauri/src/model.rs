use std::collections::HashSet;

use derive_more::derive::Deref;
use serde::{Deserialize, Serialize};
use sqlx::{Database, Decode, Sqlite, prelude::FromRow, sqlite::SqliteValueRef};

use crate::util::SqliteBool;

#[derive(FromRow, Serialize, Deserialize, specta::Type, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Outline {
    pub id: String,
    pub parent_id: Option<String>,
    pub findex: String,
    pub doc: String,
    pub links: Links,
    pub created_at: i64,
    pub updated_at: i64,
    pub hidden: SqliteBool,
    pub collapsed: SqliteBool,
    pub deleted: SqliteBool,
}

#[derive(Serialize, Deserialize, specta::Type, Deref, Default, Clone, Debug)]
#[serde(rename_all = "camelCase")]
#[serde(transparent)]
pub struct Links(HashSet<Link>);

#[derive(Serialize, Deserialize, specta::Type, PartialEq, Eq, Hash, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Link {
    id: String,
    r#type: LinkType,
}

#[derive(Serialize, Deserialize, specta::Type, PartialEq, Eq, Hash, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub enum LinkType {
    Tag,
    Link,
    Quote,
}

impl sqlx::Type<Sqlite> for Links {
    fn type_info() -> <Sqlite as Database>::TypeInfo {
        <&str as sqlx::Type<Sqlite>>::type_info()
    }
}

impl<'r> Decode<'r, Sqlite> for Links {
    fn decode(
        value: SqliteValueRef<'r>,
    ) -> Result<Self, Box<dyn std::error::Error + 'static + Send + Sync>> {
        let json = <&str as Decode<Sqlite>>::decode(value)?;
        let set: HashSet<Link> = serde_json::from_str::<Vec<Link>>(json)?
            .into_iter()
            .collect();
        Ok(Links(set))
    }
}

#[cfg(test)]
use chrono::Local;

#[cfg(test)]
use crate::util::uuidv7bs58;

#[cfg(test)]
impl Outline {
    pub fn new() -> Self {
        Outline {
            id: uuidv7bs58(),
            parent_id: None,
            findex: String::new(),
            doc: String::new(),
            links: Links::default(),
            created_at: Local::now().timestamp_millis(),
            updated_at: Local::now().timestamp_millis(),
            hidden: SqliteBool(false),
            collapsed: SqliteBool(false),
            deleted: SqliteBool(false),
        }
    }

    pub fn new_child(&self) -> Self {
        Outline {
            id: uuidv7bs58(),
            parent_id: Some(self.id.clone()),
            findex: String::new(),
            doc: String::new(),
            links: Links::default(),
            created_at: Local::now().timestamp_millis(),
            updated_at: Local::now().timestamp_millis(),
            hidden: SqliteBool(false),
            collapsed: SqliteBool(false),
            deleted: SqliteBool(false),
        }
    }
}
