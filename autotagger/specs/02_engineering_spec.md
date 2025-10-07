# Engineering Spec: Autotagger CLI

## Overview

This document provides detailed engineering specifications for implementing the Autotagger CLI in Rust. It translates the design spec into concrete technical decisions, module structures, and implementation details.

## Technology Stack

### Core Dependencies

The versions below are completely notional. Use the latest stable of these libraries.

```toml
[dependencies]
# CLI framework
clap = { version = "4.5", features = ["derive"] }

# YAML parsing and serialization
serde = { version = "1.0", features = ["derive"] }
serde_yaml = "0.9"

# Error handling
anyhow = "1.0"
thiserror = "1.0"

# HTTP client for Ollama API
reqwest = { version = "0.11", features = ["json", "blocking"] }

# Date/time handling
chrono = { version = "0.4", features = ["serde"] }

# Regex for content parsing
regex = "1.10"

[dev-dependencies]
# Testing utilities
tempfile = "3.10"
```

### External Dependencies
- **Ollama**: Local LLM runtime (must be running at `http://localhost:11434`)
- **Git**: For pre-push hook integration

## Project Structure

```
autotagger/
├── Cargo.toml
├── src/
│   ├── main.rs       # CLI entry point + orchestration
│   ├── lib.rs        # Library root + error types
│   ├── article.rs    # Article, Frontmatter types + parsing/writing logic
│   └── tags.rs       # Tag generation + LlmBackend trait + Ollama implementation
└── specs/            # Design and engineering specs
```

## Module Design

### 1. Library Root (`src/lib.rs`)

Central error types and module declarations.

```rust
pub mod article;
pub mod tags;

use thiserror::Error;

#[derive(Error, Debug)]
pub enum AutotaggerError {
    #[error("File not found: {0}")]
    FileNotFound(String),

    #[error("Invalid SVX format: {0}")]
    InvalidFormat(String),

    #[error("Ollama error: {0}")]
    OllamaError(String),

    #[error("Failed to parse tags: {0}")]
    TagParsingError(String),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("YAML error: {0}")]
    YamlError(#[from] serde_yaml::Error),

    #[error("HTTP error: {0}")]
    HttpError(#[from] reqwest::Error),
}

pub type Result<T> = std::result::Result<T, AutotaggerError>;
```

### 2. Article Module (`src/article.rs`)

Domain types, parsing, and writing logic for SVX files.

```rust
use crate::{AutotaggerError, Result};
use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use regex::Regex;
use std::fs;

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
    pub content: String,  // Body content (everything after frontmatter)
    pub file_path: PathBuf,
}

/// Parse an SVX file into an Article
pub fn parse_svx_file(file_path: &std::path::Path) -> Result<Article> {
    // Check file exists and has .svx extension
    if !file_path.exists() {
        return Err(AutotaggerError::FileNotFound(
            file_path.display().to_string()
        ));
    }

    if file_path.extension().and_then(|s| s.to_str()) != Some("svx") {
        return Err(AutotaggerError::InvalidFormat(
            "File must have .svx extension".to_string()
        ));
    }

    // Read file contents
    let content = fs::read_to_string(file_path)?;

    // Extract frontmatter and body
    let (frontmatter_str, body) = extract_frontmatter(&content)?;

    // Parse frontmatter YAML
    let frontmatter: Frontmatter = serde_yaml::from_str(&frontmatter_str)
        .map_err(|e| AutotaggerError::InvalidFormat(
            format!("Invalid frontmatter YAML: {}", e)
        ))?;

    Ok(Article {
        frontmatter,
        content: body,
        file_path: file_path.to_path_buf(),
    })
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
            "Missing or malformed frontmatter delimiters (---)".to_string()
        )),
    }
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
mod write_tests {
    use super::*;
    use tempfile::NamedTempFile;
    use std::io::Write;

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
        assert!(updated.contains("tags:"));
        assert!(updated.contains("- rust"));
        assert!(updated.contains("- test"));

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
```

### 3. Tags Module (`src/tags.rs`)

Tag generation, parsing, validation, LLM backend trait, and Ollama implementation.

```rust
use crate::article::Article;
use crate::{AutotaggerError, Result};
use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};
use regex::Regex;

/// Maximum number of tags to generate
const MAX_TAGS: usize = 5;

/// Trait for LLM backend implementations
pub trait LlmBackend {
    fn generate(&self, prompt: &str) -> Result<String>;
}

/// Prompt template used for all LLM backends
const PROMPT_TEMPLATE: &str = r#"You are a content tagging assistant. Given the following blog post, generate up to 5 semantic tags that capture the main topics and themes.

Title: {title}
Description: {description}

Content:
{content}

Requirements:
- Generate 3-5 tags maximum
- Use lowercase with hyphens (e.g., "machine-learning")
- Focus on specific concepts, technologies, or themes
- Generic tags are fine, since this will be used for clustering / post classification purposes.

Output only the tags, one per line, nothing else."#;

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
        return Err(AutotaggerError::TagParsingError(
            format!("No valid tags found in LLM response: {}", response)
        ));
    }

    Ok(tags)
}

/// Generate tags for an article using the provided LLM backend
pub fn generate_tags<B: LlmBackend>(backend: &B, article: &Article) -> Result<Vec<String>> {
    let prompt = build_prompt(article);
    let response = backend.generate(&prompt)?;
    parse_tags(&response)
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

impl LlmBackend for OllamaBackend {
    fn generate(&self, prompt: &str) -> Result<String> {
        let request = OllamaRequest {
            model: self.model.clone(),
            prompt: prompt.to_string(),
            stream: false,
        };

        let response = self
            .client
            .post(format!("{}/api/generate", self.base_url))
            .json(&request)
            .send()
            .map_err(|e| AutotaggerError::OllamaError(
                format!("Failed to connect to Ollama: {}. Is Ollama running?", e)
            ))?;

        if !response.status().is_success() {
            return Err(AutotaggerError::OllamaError(
                format!("Ollama returned error: {}", response.status())
            ));
        }

        let ollama_response: OllamaResponse = response.json()?;
        Ok(ollama_response.response)
    }
}
```

### 4. Main Entry Point (`src/main.rs`)

CLI argument parsing and orchestration logic.

```rust
use autotagger::article;
use autotagger::tags::{self, OllamaBackend};
use autotagger::{AutotaggerError, Result};
use clap::Parser;
use std::path::PathBuf;
use std::process;

#[derive(Parser, Debug)]
#[command(name = "autotagger")]
#[command(about = "Automatically generate semantic tags for SVX blog posts")]
struct Args {
    /// Path to the SVX file
    file_path: PathBuf,

    /// Generate tags but don't write to file (print to stdout)
    #[arg(long)]
    dry_run: bool,

    /// Ollama model to use
    #[arg(long, default_value = "gemma2")]
    model: String,
}

fn run() -> Result<()> {
    let args = Args::parse();

    // Parse SVX file
    let article = article::parse_svx_file(&args.file_path)?;

    // Check if autotagging is disabled
    if !article.frontmatter.autotagging {
        println!("Skipping (autotagging disabled): {}", args.file_path.display());
        return Ok(());
    }

    // Create LLM backend
    let backend = OllamaBackend::new(args.model);

    // Generate tags
    let generated_tags = tags::generate_tags(&backend, &article)?;

    // Output or write
    if args.dry_run {
        println!("Generated tags for: {}", args.file_path.display());
        for tag in &generated_tags {
            println!("  - {}", tag);
        }
    } else {
        article::write_tags(&article, &generated_tags)?;
        println!("Tagged: {} ({} tags)", args.file_path.display(), generated_tags.len());
    }

    Ok(())
}

fn main() {
    if let Err(e) = run() {
        eprintln!("Error: {}", e);
        process::exit(1);
    }
}
```

## Testing Strategy

### Unit Tests

All tests are co-located with their implementation in `#[cfg(test)]` modules.

1. **Article module** (`src/article.rs`)
   - Valid frontmatter parsing
   - Missing frontmatter error
   - Invalid YAML error
   - Missing autotagging field (should default to true)
   - Extraction of frontmatter and body content
   - Tag writing to file
   - Empty tags skip write
   - Preservation of other frontmatter fields (via `#[serde(flatten)] extra`)
   - Correct file reconstruction with frontmatter + body

2. **Tags module** (`src/tags.rs`)
   - Tag parsing from LLM response
   - Invalid tag filtering (uppercase, spaces, special chars)
   - Max tag limit enforcement
   - Empty response handling
   - Prompt building

## Error Handling

### Exit Codes (Reference)

While clear error messages are prioritized, these exit codes provide programmatic handling:

- `0`: Success (including when autotagging is disabled)
- `1`: General error (file not found, invalid format, etc.)

### Error Messages

All errors should:
1. Print to stderr
2. Include context (file path, what operation failed)
3. Provide actionable guidance

Examples:
```
Error: Ollama error: Failed to connect to Ollama: connection refused. Is Ollama running?
→ Run `ollama serve` to start Ollama

Error: Invalid SVX format: Missing or malformed frontmatter delimiters (---)
→ Ensure your file has YAML frontmatter enclosed in --- delimiters

Error: File not found: src/posts/missing.svx
→ Check the file path and try again
```

## Git Hook Integration

### Pre-push Hook

Create `.git/hooks/pre-push`:

```bash
#!/bin/bash
set -e

echo "Running autotagger on modified .svx files..."

# Get modified .svx files in current branch vs main
modified_files=$(git diff --name-only main...HEAD | grep '\.svx$' || true)

if [ -z "$modified_files" ]; then
  echo "No .svx files modified."
  exit 0
fi

for file in $modified_files; do
  if [ -f "$file" ]; then
    echo "Autotagging: $file"

    # Run autotagger
    ./target/release/autotagger "$file"
    exit_code=$?

    if [ $exit_code -ne 0 ]; then
      echo "Error: Failed to autotag $file (exit code: $exit_code)"
      exit 1
    fi

    # Stage the modified file (autotagger handles skipping if disabled)
    git add "$file"
  fi
done

echo "Autotagging complete!"
exit 0
```

Make executable:
```bash
chmod +x .git/hooks/pre-push
```

## Build and Installation

### Development Build

```bash
cd autotagger
cargo build
```

### Release Build

```bash
cargo build --release
```

### Installation

```bash
# Install locally
cargo install --path .

# Or copy binary to PATH
cp target/release/autotagger /usr/local/bin/
```

## Performance Considerations

### Target Performance
- **Goal**: <10s per file (currently aspirational)
- **Baseline**: Measure actual performance first

### Optimization Strategies (if needed)
1. **Caching**: Cache Ollama responses for identical content
2. **Parallel Processing**: Process multiple files concurrently (future enhancement)
3. **Model Selection**: Allow faster models for quicker tagging
4. **Prompt Optimization**: Reduce prompt size while maintaining quality

## Configuration (Future)

For v1, configuration is minimal (CLI args only). Future versions may support:

```yaml
# .autotagger.yaml
model: gemma2
max_tags: 5
ollama_url: http://localhost:11434
prompt_template: custom_prompt.txt
```

## Development Workflow

### Phase 1: Scaffolding (Top-Down)
1. Create Cargo project: `cargo new autotagger`
2. Add dependencies to `Cargo.toml`
3. Create module files: `article.rs`, `tags.rs`
4. Define error types in `lib.rs`
5. Define domain types (Article, Frontmatter) in `article.rs`
6. Define LlmBackend trait and OllamaBackend in `tags.rs`
7. Stub out main functions in each module
8. Wire up `lib.rs` and `main.rs`

### Phase 2: Core Implementation
1. Implement article parsing and writing with tests (`article.rs`)
2. Implement tag parsing/validation with tests (`tags.rs`)
3. Implement Ollama backend in `tags.rs`
4. Wire up CLI orchestration in `main.rs`

### Phase 3: Testing & Refinement
1. Manual end-to-end testing with real blog posts
2. Performance measurement (baseline)
3. Error message refinement
4. Edge case handling

### Phase 4: Git Integration (we will do this after determining the cli works correctly).
1. Create pre-push hook script
2. Test hook with actual git workflow
3. Documentation (README, usage examples)

## Open Questions & Decisions Needed

1. **Ollama Model**: Default to `gemma2` or another model?
   - Recommendation: Start with `gemma2`, make configurable via `--model`

2. **Tag Deduplication**: Should we deduplicate tags if LLM returns duplicates?
   - Recommendation: Yes, use `HashSet` during parsing

3. **Frontmatter Formatting**: Should we preserve original YAML formatting?
   - Recommendation: Best effort, but accept some formatting changes (serde_yaml limitation)

4. **Partial Failures**: If one file fails in pre-push hook, abort all or continue?
   - Recommendation: Abort on first failure (current spec behavior)

5. **Logging**: Add structured logging (tracing/log crate)?
   - Recommendation: Start with simple eprintln!, add structured logging in v2

## Success Criteria

Implementation is complete when:

1. ✅ All unit tests pass
2. ✅ CLI can process a real blog post end-to-end
4. ✅ Error messages are clear and actionable
5. ✅ Documentation is complete (README, usage examples)

## Next Steps

1. Review this spec and provide feedback
2. Gather agent docs for dependencies (serde_yaml, clap, reqwest)
3. Begin Phase 1 implementation (scaffolding)
3. Pre-push hook successfully tags modified files
