use combine::parser::char::{char, spaces, string};
use combine::stream::Stream;
use combine::{Parser, attempt, between, choice, many, many1, parser, satisfy, sep_by};

use super::OrderBy;

#[derive(Debug, PartialEq, Clone)]
pub enum Query {
    Phrase(String),
    QuotedPhrase(String),
    Group(Vec<Query>),
    Subquery(String),
    Operator(String),
    Paren(String),
}

// Forward declare the query parser
parser! {
    fn query[Input]()(Input) -> Query
    where [Input: Stream<Token = char>]
    {
        query_()
    }
}

// Basic phrase parser (a word), does not allow parentheses or quotes within it
fn phrase<Input>() -> impl Parser<Input, Output = Query>
where
    Input: Stream<Token = char>,
{
    let regular_char = satisfy(|c: char| !c.is_whitespace() && c != '"' && c != '(' && c != ')');
    many1(regular_char).map(|chars: String| Query::Phrase(chars))
}

// Permissive phrase parser for fallback: allows parentheses but not quotes or whitespace
fn permissive_phrase<Input>() -> impl Parser<Input, Output = Query>
where
    Input: Stream<Token = char>,
{
    let permissive_char = satisfy(|c: char| !c.is_whitespace() && c != '"');
    many1(permissive_char).map(|chars: String| Query::Phrase(chars))
}

// Parse a quoted string with support for doubled quotes as escape
fn quoted_string<Input>() -> impl Parser<Input, Output = String>
where
    Input: Stream<Token = char>,
{
    let regular_char = satisfy(|c: char| c != '"');
    let escaped_quote = string("\"\"").map(|_| '"');
    let content = many(choice((attempt(escaped_quote), regular_char)));
    between(char('"'), char('"'), content)
}

// Parser for quoted phrases
fn quoted_phrase<Input>() -> impl Parser<Input, Output = Query>
where
    Input: Stream<Token = char>,
{
    quoted_string().map(Query::QuotedPhrase)
}

// Parse a group of queries inside parentheses
fn group<Input>() -> impl Parser<Input, Output = Query>
where
    Input: Stream<Token = char>,
{
    let skip_spaces = || spaces().silent();
    between(
        char('(').skip(skip_spaces()),
        char(')'),
        sep_by(query(), spaces()),
    )
    .map(Query::Group)
}

// Main query parser for a single query item
fn query_<Input>() -> impl Parser<Input, Output = Query>
where
    Input: Stream<Token = char>,
{
    let skip_spaces = || spaces().silent();
    choice((attempt(quoted_phrase()), attempt(group()), phrase())).skip(skip_spaces())
}

pub fn parse_query(input: &str) -> eyre::Result<Query> {
    if input.trim().is_empty() {
        eyre::bail!("input is empty");
    }

    let grouped_input = format!("({})", input);

    // 1. Try to parse using the defined strict grammar
    match query().parse(grouped_input.as_str()) {
        Ok((result, remaining_input)) if remaining_input.trim().is_empty() => {
            Ok(result) // Success with full grammar
        }
        _ => {
            // Full grammar failed or left unconsumed input.
            // 2. Try parsing the entire input as a single permissive phrase.
            match permissive_phrase().parse(input) {
                Ok((result, remaining_input_permissive))
                    if remaining_input_permissive.trim().is_empty() =>
                {
                    Ok(result) // Permissive phrase parse succeeded for the whole input
                }
                _ => {
                    // Permissive phrase also failed or left unconsumed input.
                    // 3. Fallback to splitting by spaces into a group.
                    let phrases = input
                        .split_whitespace() // Splits by whitespace and filters out empty strings
                        .map(|s| Query::Phrase(s.to_string()))
                        .collect::<Vec<Query>>();

                    // If input was not empty/whitespace-only, split_whitespace guarantees non-empty parts,
                    // so `phrases` will not be empty.
                    Ok(Query::Group(phrases))
                }
            }
        }
    }
}

const OPERATORS: [&str; 3] = ["AND", "OR", "NOT"];

fn escape_and_quote_phrase(phrase: &str) -> String {
    format!(r#""{}""#, phrase.replace('"', r#""""#))
}

impl Query {
    fn map<F>(&self, f: &F) -> Self
    where
        F: Fn(&Self) -> Self,
    {
        let transformed = f(self);
        match transformed {
            Query::Group(sub_queries) => {
                let mapped_queries = sub_queries.iter().map(|q| q.map(f)).collect();
                Query::Group(mapped_queries)
            }
            other => other,
        }
    }

    fn flatten(self) -> Vec<Self> {
        let mut buf: Vec<Self> = vec![];

        fn flatten_impl(buf: &mut Vec<Query>, query: Query) {
            match query {
                Query::Group(inner) => {
                    buf.push(Query::Paren("(".to_string()));

                    for q in inner.into_iter() {
                        flatten_impl(buf, q);
                    }

                    buf.push(Query::Paren(")".to_string()));
                }
                other => {
                    buf.push(other);
                }
            };
        }

        flatten_impl(&mut buf, self);

        buf
    }

    pub fn into_sql(self, order_by: &OrderBy) -> String {
        let flatten_query_items = self
            .flatten()
            .into_iter()
            .map(|query| {
                match query {
                    Query::Phrase(phrase) => {
                        if OPERATORS.iter().any(|&op| op == phrase) {
                            Query::Operator(phrase)
                        } else if phrase.chars().count() <= 2 {
                            let escaped_phrase_for_like = phrase.replace('\'', "''");
                            let subquery = format!(
                                r#"(SELECT coalesce(group_concat('"' || replace(term, '"', '""') || '"', ' OR '), '�') FROM fts_vocab WHERE term LIKE '{}%')"#,
                                escaped_phrase_for_like
                            );
                            Query::Subquery(subquery)
                        } else {
                            Query::QuotedPhrase(phrase)
                        }
                    }
                    other => other,
                }
            })
            .collect::<Vec<_>>();

        let mut final_sql_parts = Vec::<String>::new();
        let mut current_term_accum = Vec::<String>::new();

        for query_item in flatten_query_items {
            match query_item {
                Query::Subquery(str) => {
                    if !current_term_accum.is_empty() {
                        let terms_joined = current_term_accum.join(" ").replace('\'', "''");
                        final_sql_parts.push(format!("'{}'", terms_joined));
                        current_term_accum.clear();
                    }
                    final_sql_parts.push(str);
                }
                Query::Phrase(str) | Query::QuotedPhrase(str) => {
                    current_term_accum.push(escape_and_quote_phrase(&str));
                }
                Query::Paren(str) | Query::Operator(str) => {
                    current_term_accum.push(str);
                }
                Query::Group(_) => {}
            }
        }

        if !current_term_accum.is_empty() {
            let terms_joined = current_term_accum.join(" ");
            final_sql_parts.push(format!("'{}'", terms_joined.replace("'", "''")));
        }

        let fts_match_expr = if final_sql_parts.is_empty() {
            panic!("invalid empty query")
        } else {
            let mut result = final_sql_parts[0].clone();

            for part in final_sql_parts.iter().skip(1) {
                result.push_str(" || ' ' || ");
                result.push_str(part);
            }

            result
        };

        include_str!("search.sql")
            .replace("$q", &fts_match_expr)
            .replace("$ord", &order_by.to_string())
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use crate::db::test::open_connection_in_memory;
    use chrono::Utc;

    #[tokio::test]
    async fn test_query_to_sql() {
        let pool = open_connection_in_memory().await;
        let now = Utc::now().timestamp_millis();

        let input = r#"(草)"#;
        let sql = parse_query(input).unwrap();
        let r = sqlx::query(&sql.into_sql(&OrderBy::CreatedAt))
            .bind(now)
            .bind("created_at")
            .fetch_all(&pool)
            .await;
        assert!(r.is_ok());

        let input = r#"("#;
        let sql = parse_query(input).unwrap();
        let r = sqlx::query(&sql.into_sql(&OrderBy::CreatedAt))
            .bind(now)
            .bind("created_at")
            .fetch_all(&pool)
            .await;
        assert!(r.is_ok());

        let input = r#")"#;
        let sql = parse_query(input).unwrap();
        let r = sqlx::query(&sql.into_sql(&OrderBy::CreatedAt))
            .bind(now)
            .bind("created_at")
            .fetch_all(&pool)
            .await;
        assert!(r.is_ok());

        let input = r#"""#;
        let sql = parse_query(input).unwrap();
        let r = sqlx::query(&sql.into_sql(&OrderBy::CreatedAt))
            .bind(now)
            .bind("created_at")
            .fetch_all(&pool)
            .await;
        assert!(r.is_ok());

        let input = r#""""#;
        let sql = parse_query(input).unwrap();
        let r = sqlx::query(&sql.into_sql(&OrderBy::CreatedAt))
            .bind(now)
            .bind("created_at")
            .fetch_all(&pool)
            .await;
        assert!(r.is_ok());

        let input = r#"""""#;
        let sql = parse_query(input).unwrap();
        let r = sqlx::query(&sql.into_sql(&OrderBy::CreatedAt))
            .bind(now)
            .bind("created_at")
            .fetch_all(&pool)
            .await;
        assert!(r.is_ok());
    }

    #[test]
    fn test_phrase_query() {
        assert_eq!(
            parse_query("hello").unwrap(),
            Query::Group(vec![Query::Phrase("hello".to_string())])
        );
    }

    #[test]
    fn test_parentheses_query() {
        assert_eq!(
            parse_query("(hello)").unwrap(),
            Query::Group(vec![Query::Group(vec![Query::Phrase("hello".to_string())])])
        );
    }

    #[test]
    fn test_space_separated_phrases() {
        let result = parse_query("hello world rust").unwrap();
        let expected = Query::Group(vec![
            Query::Phrase("hello".to_string()),
            Query::Phrase("world".to_string()),
            Query::Phrase("rust".to_string()),
        ]);
        assert_eq!(result, expected);
    }

    #[test]
    fn test_nested_parentheses() {
        assert_eq!(
            parse_query("(hello (world rust))").unwrap(),
            Query::Group(vec![Query::Group(vec![
                Query::Phrase("hello".to_string()),
                Query::Group(vec![
                    Query::Phrase("world".to_string()),
                    Query::Phrase("rust".to_string()),
                ]),
            ])])
        );
    }

    #[test]
    fn test_quoted_string() {
        let result = quoted_string().parse(r#""hello world""#);
        assert_eq!(result, Ok(("hello world".to_string(), "")));
    }

    #[test]
    fn test_quoted_string_with_escaped_quotes() {
        let input = "\"hello \"\"world\"\"\"";
        let result = quoted_string().parse(input);
        assert_eq!(result, Ok(("hello \"world\"".to_string(), "")));
    }

    #[test]
    fn test_quoted_phrase_with_parentheses() {
        assert_eq!(
            parse_query(r#""hello (world)""#).unwrap(),
            Query::Group(vec![Query::QuotedPhrase("hello (world)".to_string())])
        );
    }

    #[test]
    fn test_complex_query_with_quoted_phrases() {
        assert_eq!(
            parse_query(r#"(hello "world (is) great" (rust "is ""awesome"""))"#).unwrap(),
            Query::Group(vec!(Query::Group(vec![
                Query::Phrase("hello".to_string()),
                Query::QuotedPhrase("world (is) great".to_string()),
                Query::Group(vec![
                    Query::Phrase("rust".to_string()),
                    Query::QuotedPhrase("is \"awesome\"".to_string()),
                ]),
            ])))
        );
    }

    #[test]
    fn test_mixed_query_with_raw_strings() {
        assert_eq!(
            parse_query(r#"("simple term" "term (with) parens" cats)"#).unwrap(),
            Query::Group(vec![Query::Group(vec![
                Query::QuotedPhrase("simple term".to_string()),
                Query::QuotedPhrase("term (with) parens".to_string()),
                Query::Phrase("cats".to_string()),
            ])])
        );
    }

    #[test]
    fn test_quoted_phrase_with_special_chars() {
        assert_eq!(
            parse_query(r#""term with @ * & ? / \ symbols""#).unwrap(),
            Query::Group(vec![Query::QuotedPhrase(
                "term with @ * & ? / \\ symbols".to_string()
            )])
        );
    }

    #[test]
    fn test_multiple_escaped_quotes() {
        assert_eq!(
            parse_query(r#""this has ""multiple"" ""quoted"" parts""#).unwrap(),
            Query::Group(vec![Query::QuotedPhrase(
                "this has \"multiple\" \"quoted\" parts".to_string()
            )])
        );
    }

    #[test]
    fn test_malformed_parentheses() {
        // Test unbalanced opening parenthesis
        let result = parse_query("(abc").unwrap();
        assert_eq!(result, Query::Phrase("(abc".to_string()));

        // Test unbalanced closing parenthesis
        let result = parse_query("abc)").unwrap();
        assert_eq!(result, Query::Phrase("abc)".to_string()));

        // Test multiple unbalanced parentheses - this now uses the split_whitespace fallback
        let result = parse_query("(a (b c) (d").unwrap();
        assert_eq!(
            result,
            Query::Group(vec![
                Query::Phrase("(a".to_string()),
                Query::Phrase("(b".to_string()),
                Query::Phrase("c)".to_string()),
                Query::Phrase("(d".to_string()),
            ])
        );

        // Test mixed balanced and unbalanced parentheses - ensure this one is also handled by new logic
        let result = parse_query("(a (b c))").unwrap(); // This one is correctly structured
        assert_eq!(
            result,
            Query::Group(vec![Query::Group(vec![
                Query::Phrase("a".to_string()),
                Query::Group(vec![
                    Query::Phrase("b".to_string()),
                    Query::Phrase("c".to_string()),
                ]),
            ])])
        );
    }

    #[test]
    fn test_empty_query() {
        let input = "  ";
        let sql = parse_query(input);
        assert!(sql.is_err());

        let input = "";
        let sql = parse_query(input);
        assert!(sql.is_err());

        let input = "　";
        let sql = parse_query(input);
        assert!(sql.is_err());
    }

    #[test]
    fn test_other_special_characters() {
        let result = parse_query("a@b+c").unwrap();
        assert_eq!(
            result,
            Query::Group(vec![Query::Phrase("a@b+c".to_string())])
        );

        let result = parse_query("a@b+(c)").unwrap();
        assert_eq!(
            result,
            Query::Group(vec![
                Query::Phrase("a@b+".to_string()),
                Query::Group(vec![Query::Phrase("c".to_string())])
            ])
        );

        let result = parse_query("(a@b+c)").unwrap();
        assert_eq!(
            result,
            Query::Group(vec![Query::Group(vec![Query::Phrase("a@b+c".to_string())])])
        );
    }
}
