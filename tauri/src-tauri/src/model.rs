use base64::{Engine, prelude::BASE64_STANDARD};
use derive_more::derive::Deref;
use serde::{Deserialize, Deserializer, Serialize, Serializer, de::Visitor};
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
    pub created_at: i64,
    pub updated_at: i64,
    pub completed: SqliteBool,
    pub collapsed: SqliteBool,
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

#[derive(Serialize, Deserialize, specta::Type, PartialEq, Eq, Hash, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Link {
    pub id: String,
    pub r#type: LinkType,
}

#[derive(
    Serialize, Deserialize, specta::Type, Display, EnumString, PartialEq, Eq, Hash, Clone, Debug,
)]
#[serde(rename_all = "camelCase")]
#[strum(serialize_all = "lowercase")]
pub enum LinkType {
    Tag,
    Link,
    Quote,
}

impl sqlx::Type<Sqlite> for LinkType {
    fn type_info() -> <Sqlite as Database>::TypeInfo {
        <&str as sqlx::Type<Sqlite>>::type_info()
    }
}

impl<'r> Decode<'r, Sqlite> for LinkType {
    fn decode(
        value: SqliteValueRef<'r>,
    ) -> Result<Self, Box<dyn std::error::Error + 'static + Send + Sync>> {
        let str = <&str as Decode<Sqlite>>::decode(value)?;
        LinkType::try_from(str).map_err(|e| e.into())
    }
}

impl<'r> Encode<'r, Sqlite> for LinkType {
    fn encode_by_ref(
        &self,
        buf: &mut <Sqlite as Database>::ArgumentBuffer<'r>,
    ) -> Result<sqlx::encode::IsNull, sqlx::error::BoxDynError> {
        let string: String = self.to_string();
        <String as Encode<Sqlite>>::encode(string, buf)
    }
}

#[derive(Serialize, Deserialize, specta::Type, PartialEq, Eq, Hash, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Asset {
    pub hash: String,
    pub filename: String,
    pub extension: String,
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

#[derive(Debug, Clone, Deref, FromRow, specta::Type)]
pub struct Base64Bytes(#[specta(type = String)] Vec<u8>);

impl AsRef<[u8]> for Base64Bytes {
    fn as_ref(&self) -> &[u8] {
        self.0.as_ref()
    }
}

impl From<Vec<u8>> for Base64Bytes {
    fn from(value: Vec<u8>) -> Self {
        Base64Bytes(value)
    }
}

impl From<Base64Bytes> for Vec<u8> {
    fn from(value: Base64Bytes) -> Self {
        value.0
    }
}

impl Serialize for Base64Bytes {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&BASE64_STANDARD.encode(&self.0))
    }
}

impl<'de> Deserialize<'de> for Base64Bytes {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct Base64BytesVisitor;

        impl Visitor<'_> for Base64BytesVisitor {
            type Value = Base64Bytes;

            fn expecting(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
                formatter.write_str("a base64 encoded string")
            }

            fn visit_str<E>(self, value: &str) -> Result<Base64Bytes, E>
            where
                E: serde::de::Error,
            {
                let decoded = BASE64_STANDARD.decode(value).map_err(|e| {
                    E::custom(format!("failed to decode from base64 string: {}", e))
                })?;
                Ok(Base64Bytes(decoded))
            }
        }

        deserializer.deserialize_str(Base64BytesVisitor)
    }
}

impl sqlx::Type<Sqlite> for Base64Bytes {
    fn type_info() -> <Sqlite as Database>::TypeInfo {
        <Vec<u8> as sqlx::Type<Sqlite>>::type_info()
    }
}

impl<'r> Encode<'r, Sqlite> for Base64Bytes {
    fn encode(
        self,
        buf: &mut <Sqlite as Database>::ArgumentBuffer<'r>,
    ) -> Result<sqlx::encode::IsNull, sqlx::error::BoxDynError> {
        <Vec<u8> as Encode<Sqlite>>::encode(self.0, buf)
    }

    fn encode_by_ref(
        &self,
        buf: &mut <Sqlite as Database>::ArgumentBuffer<'r>,
    ) -> Result<sqlx::encode::IsNull, sqlx::error::BoxDynError> {
        <Vec<u8> as Encode<Sqlite>>::encode(self.0.clone(), buf)
    }
}

#[cfg(test)]
impl Outline {
    pub fn new() -> Self {
        let now = chrono::Utc::now().timestamp_millis();

        Outline {
            id: crate::util::uuidv7bs58(),
            parent_id: None,
            findex: "a0".to_string(),
            r#type: OutlineType::Bullet,
            doc: SAMPLE_DOC.to_string(),
            created_at: now,
            updated_at: now,
            completed: SqliteBool(false),
            collapsed: SqliteBool(false),
        }
    }

    pub fn new_child(&self) -> Self {
        let now = chrono::Utc::now().timestamp_millis();

        Outline {
            id: crate::util::uuidv7bs58(),
            parent_id: Some(self.id.clone()),
            findex: "a0".to_string(),
            r#type: OutlineType::Bullet,
            doc: SAMPLE_DOC.to_string(),
            created_at: now,
            updated_at: now,
            completed: SqliteBool(false),
            collapsed: SqliteBool(false),
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
