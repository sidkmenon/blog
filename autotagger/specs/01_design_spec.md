# Design Spec: Autotagger CLI

## Executive Summary

The Autotagger CLI is a Rust-based tool that automatically generates semantic tags for blog posts written in `.svx` (Svelte with Markdown) format. It analyzes article content using a local LLM (via Ollama) and inserts relevant tags into the frontmatter YAML metadata, streamlining the content organization process for the blog.

## Problem Statement

Currently, blog posts require manual tagging to organize content semantically. This process is time-consuming and repetitive.

The autotagger solves this by automating tag generation while maintaining quality through LLM-powered semantic analysis.

## Goals

### Primary Goals
1. **Automatic Tag Generation**: Generate up to 5 semantically relevant tags for blog posts based on their content
2. **Opt-in/Opt-out Mechanism**: Allow individual posts to disable autotagging via frontmatter flag
3. **Git Integration**: Function as a pre-push hook to ensure all posts are tagged before publishing
4. **Non-destructive**: Preserve existing frontmatter structure and only modify the `tags` field

### Secondary Goals
1. **Reliable**: Fail gracefully with clear error messages
2. **Testable**: Core logic separated into library functions with comprehensive test coverage
3. **Fast Execution**: Complete tagging within reasonable time (<10s per file) for smooth git workflow. if this is not possible we can figure out workarounds - don't hold this as a constraint for now until we've measured.

## Non-Goals

1. **Batch Processing**: Initial version processes one file at a time (though this may evolve)
2. **Tag Validation**: No validation against existing tag corpus (future enhancement)
3. **Interactive Mode**: No user prompts during execution (designed for automation)
4. **Multiple File Formats**: Only supports `.svx` files with YAML frontmatter

## User Stories

### Story 1: Automatic Tagging on Push
**As a** blog author
**I want** my posts to be automatically tagged when I push to git
**So that** I don't have to manually categorize my content

**Acceptance Criteria:**
- Pre-push hook invokes autotagger on modified `.svx` files
- Tags are inserted into frontmatter before push completes
- If tagging fails, push is aborted with clear error message

### Story 2: Opt-out of Autotagging
**As a** blog author
**I want** to disable autotagging for specific posts
**So that** I can manually curate tags when needed

**Acceptance Criteria:**
- Setting `autotagging: false` in frontmatter skips that file
- CLI logs that file was skipped
- Default behavior (no flag or `autotagging: true`) enables tagging

### Story 3: Standalone Usage
**As a** blog author
**I want** to run autotagger on a specific file manually
**So that** I can preview tags before committing

**Acceptance Criteria:**
- CLI accepts file path as argument
- Generates tags and displays them
- Can optionally write back to file with `--write` flag

## Technical Architecture

### High-Level Flow

```
User pushes to git
    ↓
Pre-push hook triggers
    ↓
Identifies modified .svx files
    ↓
For each file:
    CLI invoked with file path
        ↓
    Parse frontmatter YAML
        ↓
    Check autotagging flag
        ↓
    Extract article content
        ↓
    Call Ollama API for tag generation
        ↓
    Parse and validate tags
        ↓
    Update frontmatter with tags
        ↓
    Write back to file
```

### Components

#### 1. CLI Layer (Orchestration)
- Parse command-line arguments + marshal to library functions.
- Pass file path to 'svx' parser library function (see 2.)
- Handle errors and exit codes

#### 2. 'svx' Parser library function
- Parse a raw 'svx' file into:
- typed keys from YAML frontmatter from `.svx` file ('title', 'description', 'autotagging' keys -- n.b. is the 'autotagging' key is true by default).
- string / text body of the rest of the article (which is markdown + svelte components). Clean the markdown appropriately for LLM input.
- this should be tested throughly (e.g. missing 'autotagging key', throw an error if missing frontmatter completely, etc.).
- include original filepath for later use.
- e.g. for this impl, i'd expect a library function to take in a raw path and return an 'Article' type for later use (where 'Article' is defined below).

#### 4. Tag Generator
- Interface with Ollama CLI
- Format prompt for tag generation
- Parse LLM response into tag list
- Validate tag count (<5) and format

#### 5. Frontmatter Writer
- Merge generated tags into frontmatter structure
- Preserve original formatting where possible
- Write updated content back to file
- Do not respect existing tags - replace them wholesale.

### Data Models

Be particularly careful about the package structure around types - I hate awkward import structures here / cycles. I would recommend an 'api/' package that all subpackages could import from, but up to you on what's most idiomatic in rust.

```rust
// Simplified - actual implementation may differ

struct Frontmatter {
    title: String,
    description: String,
    date: Option<NaiveDate>,
    autotagging: bool, // default: true
    // ... other fields preserved as raw YAML
}

struct Article {
    frontmatter: Frontmatter,
    content: String,
    filePath: PathBuf,
}

struct GeneratedTags {
    tags: Vec<String>, // max 5
}
```

## Tag Generation Strategy

### LLM Prompt Design
The prompt to Ollama should:
1. Provide the article title and description for context
2. Include the full article content
3. Request exactly 5 or fewer tags
4. Specify desired tag format (lowercase, hyphenated, semantic)
5. Encourage specificity over generic tags

Example prompt structure:
```
You are a content tagging assistant. Given the following blog post, generate up to 5 semantic tags that capture the main topics and themes.

Title: {title}
Description: {description}

Content:
{article_content}

Requirements:
- Generate 3-5 tags maximum
- Use lowercase with hyphens (e.g., "machine-learning")
- Focus on specific concepts, technologies, or themes
- Avoid generic tags like "programming" or "technology"

Output only the tags, one per line, nothing else.
```

### Tag Format
- Lowercase
- Hyphen-separated for multi-word tags
- 2-30 characters per tag
- Semantic and specific (not overly generic)

## CLI Interface

### Command Syntax
```bash
autotagger <file-path> [options]
```

### Arguments
- `<file-path>`: Path to `.svx` file (required)

### Options
- `--dry-run`: Generate tags but don't write to file (print to stdout)
- `--model <name>`: Ollama model to use (default: `gemma3` or configurable)
- `--max-tags <n>`: Maximum number of tags (default: 5)

### Exit Codes
- `0`: Success (tags generated and written)
- `1`: File not found or invalid path
- `2`: Invalid file format (not `.svx` or malformed frontmatter)
- `3`: Autotagging disabled for file
- `4`: Ollama unavailable or LLM error
- `5`: Tag parsing/validation error

### Example Usage
```bash
# Generate and write tags
autotagger src/routes/posts/my-post/+page.svx

# Preview tags without writing
autotagger src/routes/posts/my-post/+page.svx --dry-run

# Use specific model
autotagger src/routes/posts/my-post/+page.svx --model llama3
```

## Git Hook Integration

### Pre-push Hook Script
```bash
#!/bin/bash

# Get list of modified .svx files
modified_files=$(git diff --name-only HEAD origin/main | grep '\.svx$')

for file in $modified_files; do
  echo "Autotagging: $file"
  autotagger "$file"

  if [ $? -ne 0 ] && [ $? -ne 3 ]; then
    echo "Error: Failed to autotag $file"
    exit 1
  fi

  # Stage the modified file
  git add "$file"
done

exit 0
```

## Error Handling

### Graceful Degradation
I don't care about exit codes too much - the errors that the CLI returns should always just be clear (e.g. clear errors printed to stderr).

### User Feedback
- All errors should print to stderr
- Include actionable guidance (e.g., "Run `ollama serve` to start Ollama")
- Log file path for context

## Testing Strategy

### Unit Tests
1. **svx Parser**: Valid/invalid YAML, various frontmatter structures
3. **Tag Generator**: Mock Ollama responses, parsing logic
4. **Frontmatter Writer**: Preservation of formatting, tag insertion

### Test Data
- Sample `.svx` files with various frontmatter structures
- Mock Ollama responses (valid and invalid)
- Files with `autotagging: false`

## Future Enhancements (Out of Scope)

1. **Batch Mode**: Process multiple files in one invocation
2. **Tag Consistency**: Validate against existing tag corpus
3. **Docker Support**: Bundle Ollama for reproducibility
4. **Configuration File**: Project-level settings for model, prompt template, etc.
5. **Tag Suggestions**: Interactive mode to approve/reject tags
6. **Analytics**: Track tag usage across blog posts

## Success Metrics

1. **Accuracy**: Tags should be semantically relevant (subjective, validated through usage)
2. **Performance**: <10s per file on standard hardware
3. **Reliability**: <5% failure rate on well-formed `.svx` files
4. **Adoption**: Used for 100% of new blog posts (via hook)

## Dependencies

### External Tools
- **Ollama**: LLM runtime (required at execution time)
- **Git**: For pre-push hook integration

### Rust Crates (Preliminary)
- `clap`: CLI argument parsing
- `serde` + `serde_yaml`: YAML parsing
- `regex`: Content extraction and validation
- `anyhow`/`thiserror`: Error handling
- Standard library: File I/O, process spawning

---

## Appendix: Example File Transformation

### Before
```yaml
---
title: "My Blog Post"
description: "A post about Rust and LLMs"
date: 2025-10-06
---

# My Blog Post

This post explores how to build CLI tools in Rust that integrate with LLMs...
```

### After
```yaml
---
title: "My Blog Post"
description: "A post about Rust and LLMs"
date: 2025-10-06
tags:
  - rust
  - llm
  - cli-tools
  - ollama
---

# My Blog Post

This post explores how to build CLI tools in Rust that integrate with LLMs...
```
