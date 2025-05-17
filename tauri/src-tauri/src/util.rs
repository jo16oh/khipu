use uuid::Uuid;

pub fn uuidv7bs58() -> String {
    let bytes = Uuid::now_v7().to_bytes_le();
    bs58::encode(&bytes).into_string()
}
