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

pub fn extract_text_from_doc(doc: &str) -> eyre::Result<String> {
    use serde::Deserialize;

    #[derive(Deserialize, Debug)]
    struct Document {
        #[serde(default)]
        content: Vec<Document>,
        #[serde(default)]
        text: Option<String>,
    }

    let document: Document = serde_json::from_str(doc)?;

    fn extract_text(document: &Document, result: &mut String) {
        if let Some(ref text) = document.text {
            result.push_str(text);
        }

        for item in &document.content {
            extract_text(item, result);
        }
    }

    let mut result = String::new();
    extract_text(&document, &mut result);

    Ok(result)
}

#[cfg(test)]
pub mod test {
    use crate::model::Outline;

    use super::extract_text_from_doc;

    #[test]
    fn test_extract_text_from_doc() {
        let o = Outline::new();
        let result = extract_text_from_doc(&o.doc).unwrap();
        assert_eq!(result, "Example Content".to_string());
    }
}
