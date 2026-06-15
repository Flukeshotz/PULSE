from src.orchestrator import Orchestrator
from src.render.builder import ReportBuilder
from src.models import PulseReport
from datetime import datetime
import os
import asyncio
from dotenv import load_dotenv
load_dotenv()

async def test():
    orc = Orchestrator("indmoney")
    print("Connecting to MCP...")
    
    # Fake report to build blocks
    report = PulseReport(
        product="indmoney",
        iso_week="2026-W99",
        period_label="Last 10 weeks",
        generated_at=datetime.now(),
        sources_covered=["test_source"],
        themes=[],
        counts={"reviews": 100, "dropped_quotes": 0},
        short_review_counts={"positive": 50, "neutral": 20, "negative": 30}
    )
    blocks = ReportBuilder.build_doc_blocks(report)
    
    await orc.mcp.connect()
    
    # 1. Find or create
    doc_meta = await orc.mcp.docs.find_or_create_doc("indmoney", "indmoney Pulse Reports")
    doc_id = doc_meta["document_id"]
    print(f"Found/Created Doc ID: {doc_id}")
    
    # 2. Append section
    anchor = "indmoney-2026-W99"
    append_meta = await orc.mcp.docs.append_section(doc_id, anchor, "indmoney Pulse: 2026-W99", blocks)
    print(f"Appended Section: {append_meta['deep_link']}")
    
    # 3. Create Draft
    html = ReportBuilder.build_email_html(report, append_meta['deep_link'])
    draft_meta = await orc.mcp.gmail.create_draft(["test@example.com"], "indmoney Pulse Review: 2026-W99", html, "Test text")
    print(f"Created Email Draft ID: {draft_meta['draft_id']}")
    
    await orc.mcp.close()
    print("SUCCESS!")

if __name__ == "__main__":
    asyncio.run(test())
