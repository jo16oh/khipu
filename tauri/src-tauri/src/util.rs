use chrono::{Datelike, Local, TimeZone, Utc};
use uuid::Uuid;

pub fn uuidv7bs58() -> String {
    let bytes = Uuid::now_v7().to_bytes_le();
    bs58::encode(&bytes).into_string()
}

pub fn day_start(unix_ts_millis: i64) -> i64 {
    let seconds = unix_ts_millis / 1000;

    let dt_utc = Utc
        .timestamp_opt(seconds, 0)
        .single()
        .expect("Invalid timestamp");

    let dt_local = dt_utc.with_timezone(&Local);

    Local
        .with_ymd_and_hms(dt_local.year(), dt_local.month(), dt_local.day(), 0, 0, 0)
        .single()
        .expect("Invalid date")
        .to_utc()
        .timestamp_millis()
}
