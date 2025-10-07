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

    #[error("Tag validation failed: {0}")]
    TagValidationError(String),
}

pub type Result<T> = std::result::Result<T, AutotaggerError>;
