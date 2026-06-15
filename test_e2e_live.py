import os
from dotenv import load_dotenv
load_dotenv()
from src.orchestrator import Orchestrator

import asyncio

async def main():
    print("=== LIVE E2E TEST: PHASES 1-4 ===")
    # Delete existing ledger to avoid idempotency skips if we run multiple times
    if os.path.exists("run_ledger.db"):
        os.remove("run_ledger.db")
    
    # Run the orchestrator with target week
    # dry_run=False -> actually hits the real MCP if config says so
    # send_email=False -> creates a draft instead of actually sending
    orc = Orchestrator(product="indmoney", dry_run=False, send_email=False, target_week="2026-W22")
    
    print("\n[PHASE 1] Checking sources & normalizer...")
    print(f"Sources configured: {[s.name for s in orc.sources]}")
    
    record = await orc.run()
    
    print("\n=== E2E RUN RESULTS ===")
    print(f"Status: {record.status}")
    print(f"Doc Deep Link: {record.doc_deep_link}")
    print(f"Email Draft ID: {record.email_draft_id}")
    
    if record.status == "ok":
        print("✅ SUCCESS! Pipeline completed beautifully.")
    else:
        print("❌ FAILED! Pipeline partial or failed.")

if __name__ == "__main__":
    asyncio.run(main())
