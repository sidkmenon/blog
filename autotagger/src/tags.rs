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
const PROMPT_TEMPLATE: &str = r#"Given the following blog post, generate 3-5 semantic tags that capture the themes of the article for clustering purposes. Note that you should attempt to _generalize_ the content of the article to try to match it to other similar articles.

## Article to analyze:

<article>
Title: {title}
Description: {description}

Content:
{content}
</article>

## Requirements:

- Generate 5 tags maximum
- Use lowercase with hyphens (e.g., "machine-learning")
- Use generic tags ("economics") to specific ones ("rent-control")

Output only the tags, one per line, nothing else.

## Example

### Example Input:

<article>
Title: Risking Ridicule
Description: learnings from a war against perfectionism

Content:
# Risking Ridicule

Like most of us, I've felt fear and anxiety when approaching something difficult or unknown, whether speaking in front of large crowds or taking on unfamiliar physical challenges. For most of this time, I've treated these feelings with a tried and tested tonic: a 'man up' and a stiff pat on the back.

Cutting edge stuff, I know.

In 2025 I started a company for the first time, however, and I found myself a little bit lost. I know that we will succeed, but nevertheless, persistent, nagging thoughts sit in my mind:

> Are we growing fast enough? What more could I be doing? I'm sure I'm messing lots of things up...

In many ways I think these thoughts are healthy; I use them as fuel and motivation. But when we do scary things and take risks, we risk feedback, criticism, and maybe even ridicule. And our critics may be completely correct.

Braving ridicule is hard! I've been searching for a framework to handle these feelings, so I've been diving into Buddhist and Hindu philosophy. During this exploration, I saw a quote like:

> If you're scared of doing something, do it ironically.

Irony normally connotes cynicism, which is not what I'd expect from spiritual teachings. Buddhism, however, has the notion of [*upāya*](https://en.wikipedia.org/wiki/Upaya), which encourages a practitioner to pursue the noble path through means appropriate to their circumstances, even if the reasoning isn't "perfect"; in other words, the notion that *something is better than nothing*.

When we strive to replace fear with an ironic inner state, we are detaching ourselves from the outcome of our actions (at a minimum), which is a net-positive in the Buddhist lens.[^1] We can achieve this detachment by acting in one of two ways:

- Case 1: Replacing fear with cynicism to protect our egos. Although this sort of attitude is negative, we could do the big, scary thing as per the _upāya_ teaching anyway and discover new boundaries about what we're capable of (eliminating fear for next time!)[^2]
- Case 2: Reframing the fear we feel with whimsical detachment, much like an ironic joke. In this case, our inner world is already positive, and we are acting with joy. This mental state embodies several key lessons from Hindu & Buddhist philosophy on how to pursue the good life.[^3]

I think this provides an interesting framing for an ultimate mental state to progress towards when feeling fear. But it doesn't quite address how to _transition_ to this mental state when one is nervous or anxious!

## Mindset

 In Buddhism, when confronting a negative feeling (fear, anger, etc.), our goal is to accept fear or anxiety as an _anticipatory_ feeling of a future which may or may not come to pass. It's a conditioned, bodily reaction to a fundamentally stochastic world. We should strive to process feelings of fear and anxiety with mindfulness and warmth.

I adapted the Buddhist concept of [_samatha-vipassana_](https://en.wikipedia.org/wiki/Samatha-vipassan%C4%81) to this situation to construct a runbook of sorts:

1. The first step is to bring _samatha_, or tranquility, to the mind, so we can assess a situation with a clear head:
  - First, gently assess and focus on the touchpoints with the physical world: our feet on the ground, our back in a chair. These feelings are usually neutral and calming.
  - Then, positive thoughts about our better nature can guide our mind to a more neutral place (_"may I be compassionate, may I be at peace with what is"_[^4]).
2. The next step is to build _vipassana_, or insight over the situation. We can assess the feelings we felt before.
  - Here, we can cultivate a joyful, whimsical outlook to the task at hand.
  - If that doesn't work, as we've established above, even a cynical, ironic view can work: _"do it ironically!"_

I'm going to give this runbook a spin in 2026 - let me know your thoughts or feedback!

---
# Footnotes:
[^1]: Attachment disrupts ["the sense of embodied freedom"](https://plato.stanford.edu/entries/japanese-zen/) that Zen provides.
[^2]: Thanks to Ketan Agrawal for this lovely idea.
[^3]: See [Stanford Encyclopedia of Philosophy](https://plato.stanford.edu/entries/concept-emotion-india/) and [Quotations from Swami Vivekananda](https://www.vifindia.org/print/4794)
[^4]: See [verse on Fear & Terror](https://www.dhammatalks.org/suttas/MN/MN4.html) from the Buddha's teachings.

---
</article>

### Example Output:

philosophy
buddhism
happiness
"#;

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
        let base_url =
            std::env::var("OLLAMA_URL").unwrap_or_else(|_| DEFAULT_OLLAMA_URL.to_string());

        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(300))
            .build()
            .expect("Failed to build HTTP client");

        Self {
            client,
            base_url,
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
