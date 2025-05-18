use eyre::eyre;
use serde::{Deserialize, Serialize};
use sqlx::{Database, Decode, Encode, Sqlite, sqlite::SqliteValueRef};
use std::any::type_name;
use tauri::{Manager, Runtime, State};
use tokio::sync::RwLock;
use uuid::Uuid;

pub fn uuidv7bs58() -> String {
    let bytes = Uuid::now_v7().to_bytes_le();
    bs58::encode(&bytes).into_string()
}

pub async fn set_rw_state<R: Runtime, T>(manager: &impl Manager<R>, value: T) -> eyre::Result<()>
where
    T: 'static + Sync + Send,
{
    match manager.try_state::<RwLock<T>>() {
        Some(ref mut state) => {
            let mut state = state.write().await;
            *state = value;
        }
        None => {
            manager.manage(RwLock::new(value));
        }
    };
    Ok(())
}

pub fn get_rw_state<R: Runtime, T>(manager: &impl Manager<R>) -> eyre::Result<State<'_, RwLock<T>>>
where
    T: 'static + Sync + Send,
{
    manager
        .try_state::<RwLock<T>>()
        .ok_or_else(|| eyre!(format!("failed to get state {}", type_name::<RwLock<T>>())))
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
