import typer
import asyncio
from typing import Optional
from dotenv import load_dotenv
load_dotenv()
from src.orchestrator import Orchestrator

app = typer.Typer(help="Weekly Product Review Pulse CLI")

@app.command("run")
def run_command(
    product: str = typer.Option(..., "--product", help="The product key from config (e.g. indmoney)"),
    week: Optional[str] = typer.Option(None, "--week", help="ISO week for backfill (e.g. 2026-W21)"),
    dry_run: bool = typer.Option(False, "--dry-run", help="Run pipeline but do not deliver or write ledger"),
    send_email: bool = typer.Option(False, "--send", help="Explicitly send email (overrides draft-only default)")
):
    """
    Run the Review Pulse pipeline for a product.
    """
    orchestrator = Orchestrator(
        product=product,
        dry_run=dry_run,
        send_email=send_email,
        target_week=week
    )
    
    asyncio.run(orchestrator.run())

if __name__ == "__main__":
    app()
