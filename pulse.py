import argparse
import asyncio
import os
import sqlite3
from typing import Optional
from dotenv import load_dotenv

from src.orchestrator import Orchestrator

# Load environment variables
load_dotenv()

async def run_pipeline(product: str, week: Optional[str], send_email: bool, dry_run: bool):
    print(f"=== PULSE RUN: {product.upper()} ===")
    
    orc = Orchestrator(
        product=product,
        target_week=week,
        send_email=send_email,
        dry_run=dry_run
    )
    
    record = await orc.run()
    
    print("\n=== E2E RUN RESULTS ===")
    print(f"Status: {record.status}")
    print(f"Doc Deep Link: {record.doc_deep_link}")
    print(f"Email Message ID: {record.email_message_id}")
    print(f"Email Draft ID: {record.email_draft_id}")
    
    if record.status == "ok":
        print("✅ SUCCESS! Pipeline completed beautifully.")
    elif record.status == "partial":
        print("⚠️ WARNING! Pipeline completed with partial source coverage.")
    else:
        print("❌ FAILED! Pipeline failed.")

def list_history(product: str):
    print(f"=== PULSE HISTORY: {product.upper()} ===")
    db_path = "run_ledger.db"
    
    if not os.path.exists(db_path):
        print("No run history found. Run ledger does not exist yet.")
        return
        
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute(
        "SELECT iso_week, started_at, status, doc_deep_link, email_message_id, email_draft_id "
        "FROM runs WHERE product = ? ORDER BY iso_week DESC",
        (product,)
    )
    rows = cursor.fetchall()
    
    if not rows:
        print(f"No run history found for product: {product}")
        return
        
    # Print a basic table
    print(f"{'WEEK':<10} | {'STATUS':<8} | {'STARTED AT':<20} | {'DOC LINK'}")
    print("-" * 80)
    for row in rows:
        link = row['doc_deep_link'] or "N/A"
        print(f"{row['iso_week']:<10} | {row['status']:<8} | {row['started_at'][:19]:<20} | {link}")

def main():
    parser = argparse.ArgumentParser(description="Weekly Review Pulse CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)
    
    # Run command
    run_parser = subparsers.add_parser("run", help="Run the pulse pipeline for a product")
    run_parser.add_argument("--product", required=True, help="Product ID (e.g. indmoney)")
    run_parser.add_argument("--week", help="ISO week to backfill (e.g. 2026-W22)")
    run_parser.add_argument("--send-email", action="store_true", help="Explicitly send email instead of just drafting")
    run_parser.add_argument("--dry-run", action="store_true", help="Do not write to MCP. Just render.")
    
    # History command
    history_parser = subparsers.add_parser("history", help="View past runs for a product")
    history_parser.add_argument("--product", required=True, help="Product ID (e.g. indmoney)")
    
    args = parser.parse_args()
    
    if args.command == "run":
        asyncio.run(run_pipeline(args.product, args.week, args.send_email, args.dry_run))
    elif args.command == "history":
        list_history(args.product)

if __name__ == "__main__":
    main()
