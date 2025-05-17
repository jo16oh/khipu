use eyre::eyre;
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
