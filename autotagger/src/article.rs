use crate::{AutotaggerError, Result};
use chrono::NaiveDate;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

/// Represents the frontmatter metadata of an SVX file
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Frontmatter {
    pub title: String,
    pub description: String,
    #[serde(default)]
    pub date: Option<NaiveDate>,
    #[serde(default = "default_autotagging")]
    pub autotagging: bool,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(flatten)]
    pub extra: serde_yaml::Value, // Preserves unknown fields
}

fn default_autotagging() -> bool {
    true
}

/// Represents a parsed SVX article
#[derive(Debug, Clone)]
pub struct Article {
    pub frontmatter: Frontmatter,
    pub content: String, // Body content (everything after frontmatter)
    pub file_path: PathBuf,
}

/// Parse an SVX file into an Article
pub fn parse_svx_file(file_path: &std::path::Path) -> Result<Article> {
    // Check file exists and has .svx extension
    if !file_path.exists() {
        return Err(AutotaggerError::FileNotFound(
            file_path.display().to_string(),
        ));
    }

    if file_path.extension().and_then(|s| s.to_str()) != Some("svx") {
        return Err(AutotaggerError::InvalidFormat(
            "File must have .svx extension".to_string(),
        ));
    }

    // Read file contents
    let content = fs::read_to_string(file_path)?;

    // Extract frontmatter and body
    let (frontmatter_str, body) = extract_frontmatter(&content)?;

    match serde_yaml::from_str(&frontmatter_str) {
        Err(e) => Err(AutotaggerError::InvalidFormat(format!(
            "Invalid frontmatter YAML: {}",
            e
        ))),
        Ok(frontmatter) => Ok(Article {
            frontmatter,
            content: body,
            file_path: file_path.to_path_buf(),
        }),
    }
}

/// Extract frontmatter and body from SVX content
fn extract_frontmatter(content: &str) -> Result<(String, String)> {
    let re = Regex::new(r"(?s)^---\s*\n(.*?)\n---\s*\n(.*)$").unwrap();

    match re.captures(content) {
        Some(caps) => {
            let frontmatter = caps.get(1).unwrap().as_str().to_string();
            let body = caps.get(2).unwrap().as_str().to_string();
            Ok((frontmatter, body))
        }
        None => Err(AutotaggerError::InvalidFormat(
            "Missing or malformed frontmatter delimiters (---)".to_string(),
        )),
    }
}

/// Write tags to the article's file
/// If tags is empty, this function does nothing and returns Ok
pub fn write_tags(article: &Article, tags: &[String]) -> Result<()> {
    // Skip writing if there are no tags
    if tags.is_empty() {
        return Ok(());
    }

    // Create updated frontmatter with new tags
    let mut updated_frontmatter = article.frontmatter.clone();
    updated_frontmatter.tags = tags.to_vec();

    // Serialize frontmatter to YAML
    let yaml = serde_yaml::to_string(&updated_frontmatter)?;

    // Reconstruct file: frontmatter + body content
    let updated_content = format!("---\n{}---\n{}", yaml, article.content);

    // Write back to file
    fs::write(&article.file_path, updated_content)?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_frontmatter_valid() {
        let content = r#"---
title: "Test"
description: "Test desc"
---

# Content here"#;

        let (fm, body) = extract_frontmatter(content).unwrap();
        assert!(fm.contains("title"));
        assert!(body.contains("# Content"));
    }

    #[test]
    fn test_extract_frontmatter_missing() {
        let content = "# No frontmatter here";
        assert!(extract_frontmatter(content).is_err());
    }
}

#[cfg(test)]
mod write_tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[test]
    fn test_write_tags() -> Result<()> {
        let mut temp_file = NamedTempFile::new()?;
        let content = r#"---
title: "Test"
description: "Test desc"
---

# Content"#;
        temp_file.write_all(content.as_bytes())?;

        let article = Article {
            frontmatter: Frontmatter {
                title: "Test".to_string(),
                description: "Test desc".to_string(),
                date: None,
                autotagging: true,
                tags: vec![],
                extra: serde_yaml::Value::Null,
            },
            content: "\n# Content".to_string(),
            file_path: temp_file.path().to_path_buf(),
        };

        let tags = vec!["rust".to_string(), "test".to_string()];
        write_tags(&article, &tags)?;

        let updated = fs::read_to_string(temp_file.path())?;
        assert!(updated.contains("tags:\n- rust\n- test"));
        Ok(())
    }

    #[test]
    fn test_write_tags_empty_skips_write() -> Result<()> {
        let mut temp_file = NamedTempFile::new()?;
        let content = r#"---
title: "Test"
description: "Test desc"
---

# Content"#;
        temp_file.write_all(content.as_bytes())?;

        let article = Article {
            frontmatter: Frontmatter {
                title: "Test".to_string(),
                description: "Test desc".to_string(),
                date: None,
                autotagging: true,
                tags: vec![],
                extra: serde_yaml::Value::Null,
            },
            content: "\n# Content".to_string(),
            file_path: temp_file.path().to_path_buf(),
        };

        write_tags(&article, &[])?;

        let updated = fs::read_to_string(temp_file.path())?;
        assert_eq!(updated, content);

        Ok(())
    }
}
