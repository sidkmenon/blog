use autotagger::Result;
use autotagger::article;
use autotagger::tags::{self, OllamaBackend};
use clap::{Parser, Subcommand};
use std::path::{Path, PathBuf};
use std::process;

#[derive(Parser, Debug)]
#[command(name = "autotagger")]
#[command(about = "Automatically generate semantic tags for SVX blog posts")]
struct Args {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand, Debug)]
enum Command {
    Generate {
        file_path: PathBuf,
        /// Generate tags but don't write to file (print to stdout)
        #[arg(long)]
        dry_run: bool,

        /// Ollama model to use
        #[arg(long, default_value = "qwen3:8b")]
        model: String,
    },
    Verify {
        file_path: PathBuf,
    },
}

fn handle_generate(file_path: &Path, dry_run: bool, model: String) -> Result<()> {
    // Parse SVX file
    let article = article::parse_svx_file(file_path)?;

    // Check if autotagging is disabled
    if !article.frontmatter.autotagging {
        println!("Skipping (autotagging disabled): {}", file_path.display());
        return Ok(());
    }

    // Create LLM backend
    let backend = OllamaBackend::new(model);

    // Generate tags
    let generated_tags = tags::generate_tags(&backend, &article)?;

    // Output or write
    if dry_run {
        println!("Generated tags for: {}", file_path.display());
        for tag in &generated_tags {
            println!("  - {}", tag);
        }
    } else {
        article::write_tags(&article, &generated_tags)?;
        println!(
            "Tagged: {} ({} tags)",
            file_path.display(),
            generated_tags.len()
        );
    }

    Ok(())
}

fn handle_verify(file_path: &Path) -> Result<()> {
    // Parse SVX file
    let article = article::parse_svx_file(file_path)?;

    tags::validate(&article)
}

fn run() -> Result<()> {
    let args = Args::parse();

    match args.command {
        Command::Generate {
            file_path,
            dry_run,
            model,
        } => handle_generate(&file_path, dry_run, model),
        Command::Verify { file_path } => handle_verify(&file_path),
    }
}

fn main() {
    if let Err(e) = run() {
        eprintln!("Error: {}", e);
        process::exit(1);
    }
}
