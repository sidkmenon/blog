# Personal Blog


## Agent context
- Do not ask me when running non-mutating commands; e.g. `npm run check` etc. I repeat, **this is important**, do not ask me ever to run commands like `rg`, `sed`, `find`, or variants like that. if it does not mutate anything, I don't want to be asked to approve it. Just tell me what you're doing.
- Look for docs under 'agent_docs/\*' to help manage the relevant context.

## CSS rules
3. *IMPORTANT* for all edits to CSS styling, always consider other display sizes (mobile, etc.). If you need more details on specific display sizes to consider, please ask.

## CLI project

Within the project, I'd like all '*.svx' files to be tagged appropriately with metadata tags as follows:

```yaml
```yaml
title: "my blog post"
description: "a post about me"
# <begin desired tags>
tags:
  - personal info 
  - some_other_semantically_relevant_thing
# <end desired tags>
```

These tags will be automatically inserted via a pre-push hook which will invoke a CLI script in rust. The CLI will:

1. Take in a file path to an '.svx' file with frontmatter YAML metadata.
2. If the frontmatter metadata does not contain the special key `autotagging: false` (true by default), proceed to:
3. Read in the article contents
4. Generate <5 markdown tags which capture the semantics of the article content. This will happen via a call to the 'olama' CLI (can eventually replace this with a docker image for reproducability).

### Developing the CLI

We'll iterate on this together, as follows (all artifacts for the CLI should be nested under the 'autotagger' directory, and the generated specs under 'autotagger/specs').

1. You will produce a through design spec which captures the end-to-end goals and acceptance criteria for the CLI. Include this under 'autotagger/specs/01_design_spec.md' so I can also trace the development of the project. I will edit the spec to provide feedback / we'll iterate on it together. 
2. You will take the design spec and produce a detailed engineering spec (at 'autotagger/specs/02_engineering_spec.md'). I will provide feedback on that. Make sure to include the software projects that you will use - I will grab context for those and place the docs at 'autotagger/agent_docs/*' for you for use during the coding phase.
3. We will code in an incremental fashion, starting from the "top-down" to sketch out overall project structure. We will stop frequently for me to code review and check in on composition and structure. I feel strongly that we shouldn't "over-engineer this", but a few guiding principles (challenge these if they are not idiomatic in rust, i know these are idiomatic design patterns in other languages)
  a. CLIs should have a narrow orchestration layer to marshal user inputs, and then should pass to library functions to do the heavy lifting.
  b. library functions MUST be well tested.
  c. prefer composition over inheritance.
  d. parse inputs once at the orchestration layer and pass to domain types -- the rest of the system should deal in the clean domain types.
4. Feel free to save memory files in the same 'autotagger/specs' directory.
