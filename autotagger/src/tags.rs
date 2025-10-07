use crate::article::Article;
use crate::{AutotaggerError, Result};
use regex::Regex;
use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};

/// Maximum number of tags to generate
const MAX_TAGS: usize = 5;

/// Trait for LLM backend implementations
pub trait LlmGenerator {
    fn generate(&self, prompt: &str) -> Result<String>;
}

/// Prompt template used for all LLM backends
const PROMPT_TEMPLATE: &str = r#"You are a content tagging assistant. Given the following blog post, generate up to 5 semantic tags that capture the main topics and themes.

Title: {title}
Description: {description}

Content:
{content}

Requirements:
- Generate 5 tags maximum
- Use lowercase with hyphens (e.g., "machine-learning")
- Generic tags are fine, since this will be used for clustering / post classification purposes.

Output only the tags, one per line, nothing else."#;

pub fn validate(article: &Article) -> Result<()> {
    if !article.frontmatter.autotagging {
        return Ok(());
    }

    match article.frontmatter.tags.len() {
        0 => Err(AutotaggerError::TagValidationError(
            "No tags found".to_string(),
        )),
        n if n > MAX_TAGS => Err(AutotaggerError::TagValidationError(format!(
            "Too many tags: {}",
            n
        ))),
        _ => Ok(()),
    }
}

/// Build the prompt for tag generation
pub fn build_prompt(article: &Article) -> String {
    PROMPT_TEMPLATE
        .replace("{title}", &article.frontmatter.title)
        .replace("{description}", &article.frontmatter.description)
        .replace("{content}", &article.content)
}

/// Parse and validate tags from LLM response
pub fn parse_tags(response: &str) -> Result<Vec<String>> {
    let tag_regex = Regex::new(r"^[a-z][a-z0-9-]{1,29}$").unwrap();

    let tags: Vec<String> = response
        .lines()
        .map(|line| line.trim().to_lowercase())
        .filter(|line| !line.is_empty())
        .filter(|line| tag_regex.is_match(line))
        .take(MAX_TAGS)
        .collect();

    if tags.is_empty() {
        return Err(AutotaggerError::TagParsingError(format!(
            "No valid tags found in LLM response: {}",
            response
        )));
    }

    Ok(tags)
}

/// Generate tags for an article using the provided LLM backend
pub fn generate_tags<B: LlmGenerator>(backend: &B, article: &Article) -> Result<Vec<String>> {
    let prompt = build_prompt(article);
    let response = backend.generate(&prompt)?;
    parse_tags(&response)
}

// Ollama backend implementation
const DEFAULT_OLLAMA_URL: &str = "http://localhost:11434";

#[derive(Serialize)]
struct OllamaRequest {
    model: String,
    prompt: String,
    stream: bool,
}

#[derive(Deserialize)]
struct OllamaResponse {
    response: String,
}

pub struct OllamaBackend {
    client: Client,
    base_url: String,
    model: String,
}

impl OllamaBackend {
    pub fn new(model: String) -> Self {
        Self {
            client: Client::new(),
            base_url: DEFAULT_OLLAMA_URL.to_string(),
            model,
        }
    }
}

impl LlmGenerator for OllamaBackend {
    fn generate(&self, prompt: &str) -> Result<String> {
        let request = OllamaRequest {
            model: self.model.clone(),
            prompt: prompt.to_string(),
            stream: false,
        };

        let res = self
            .client
            .post(format!("{}/api/generate", self.base_url))
            .json(&request)
            .send();

        match res {
            Ok(response) => {
                if !response.status().is_success() {
                    return Err(AutotaggerError::OllamaError(format!(
                        "Ollama returned error: {}",
                        response.status()
                    )));
                }
                let ollama_response: OllamaResponse = response.json()?;
                Ok(ollama_response.response)
            }
            Err(e) => Err(AutotaggerError::OllamaError(format!(
                "Failed to connect to Ollama: {}. Is Ollama running?",
                e
            ))),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_tags_valid() {
        let response = "rust\nmachine-learning\nllm\ncli-tools";
        let tags = parse_tags(response).unwrap();
        assert_eq!(tags.len(), 4);
        assert!(tags.contains(&"rust".to_string()));
    }

    #[test]
    fn test_parse_tags_filters_invalid() {
        let response = "rust\nInvalid Tag\nmachine-learning\n123invalid";
        let tags = parse_tags(response).unwrap();
        assert_eq!(tags.len(), 2);
        assert!(tags.contains(&"rust".to_string()));
        assert!(tags.contains(&"machine-learning".to_string()));
    }

    #[test]
    fn test_parse_tags_respects_max() {
        let response = "tag1\ntag2\ntag3\ntag4\ntag5\ntag6\ntag7";
        let tags = parse_tags(response).unwrap();
        assert_eq!(tags.len(), MAX_TAGS);
    }
}
