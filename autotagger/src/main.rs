use autotagger::article;
use autotagger::tags::{self, OllamaBackend};
use autotagger::Result;
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
    #[arg(long, default_value = "gemma3:4b")]
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
