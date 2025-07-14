use std::collections::HashMap;

use itertools::Itertools;
use serde::Deserialize;
use sqlx::SqliteExecutor;

use crate::database::query;

#[derive(Deserialize, Debug)]
struct Document {
    #[serde(default)]
    r#type: String,
    #[serde(default)]
    content: Vec<Document>,
    #[serde(default)]
    text: Option<String>,
    #[serde(default)]
    attrs: Option<serde_json::Value>,
}

enum ExtractionResult {
    Text(String),
    Link(String),
}

impl ExtractionResult {
    fn into_string(self) -> String {
        match self {
            Self::Text(str) => str,
            Self::Link(str) => str,
        }
    }
}

pub async fn extract_text_from_doc<'a>(
    conn: impl SqliteExecutor<'a>,
    doc: &str,
) -> eyre::Result<String> {
    let document: Document = serde_json::from_str(doc)?;

    let extracted_items = extract_document_items(&document);
    let text = resolve_and_concatenate_text(conn, extracted_items).await?;

    Ok(text)
}

fn extract_document_items(document: &Document) -> Vec<ExtractionResult> {
    let mut result = Vec::new();
    extract_text_recursive(document, &mut result);
    result
}

fn extract_text_recursive(document: &Document, result: &mut Vec<ExtractionResult>) {
    if let Some(text) = &document.text {
        result.push(ExtractionResult::Text(text.to_string()));
    }

    if document.r#type == "internal-link" {
        if let Some(link_id) = extract_link_id(&document.attrs) {
            result.push(ExtractionResult::Link(link_id));
        }
    }

    for item in &document.content {
        extract_text_recursive(item, result);
    }
}

fn extract_link_id(attrs: &Option<serde_json::Value>) -> Option<String> {
    attrs.as_ref()?.get("id")?.as_str().map(|s| s.to_string())
}

async fn resolve_and_concatenate_text<'a>(
    conn: impl SqliteExecutor<'a>,
    extracted_items: Vec<ExtractionResult>,
) -> eyre::Result<String> {
    let link_ids = collect_link_ids(&extracted_items);

    let linked_docs: HashMap<String, String> = query::docs(conn, &link_ids)
        .await?
        .into_iter()
        .filter_map(|e| match e.deleted.0 {
            false => Some((e.id, e.doc)),
            true => None,
        })
        .collect();

    let mut text = String::new();
    for item in extracted_items {
        match item {
            ExtractionResult::Text(t) => text.push_str(&t),
            ExtractionResult::Link(link_id) => {
                if let Some(linked_text) =
                    extract_text_from_linked_document(&linked_docs, &link_id)?
                {
                    text.push_str(&linked_text);
                } else {
                    // if the linked document is not found,
                    // push whitespace to separate the text around the link
                    text.push(' ');
                }
            }
        }
    }

    Ok(text)
}

fn collect_link_ids(items: &[ExtractionResult]) -> Vec<&str> {
    items
        .iter()
        .filter_map(|item| match item {
            ExtractionResult::Link(id) => Some(id.as_str()),
            _ => None,
        })
        .collect_vec()
}

fn extract_text_from_linked_document(
    linked_docs: &HashMap<String, String>,
    link_id: &str,
) -> eyre::Result<Option<String>> {
    if let Some(doc) = linked_docs.get(link_id) {
        let doc: Document = serde_json::from_str(doc)?;
        let extracted_items = extract_document_items(&doc);
        let text = extracted_items
            .into_iter()
            .map(|item| item.into_string())
            .join("");
        Ok(Some(text))
    } else {
        Ok(None)
    }
}

#[cfg(test)]
pub mod test {
    use crate::{database::test::open_connection_in_memory, model::Outline};

    use super::extract_text_from_doc;

    #[tokio::test]
    async fn test_extract_text_from_doc() {
        let o = Outline::new();
        let pool = open_connection_in_memory().await;
        let result = extract_text_from_doc(&pool, &o.doc).await.unwrap();
        assert_eq!(result, "Example Content".to_string());
    }
}
