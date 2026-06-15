import os
import sqlite3
import json
from unittest.mock import patch
from dotenv import load_dotenv
load_dotenv()
from src.orchestrator import Orchestrator

def test_idempotent_delivery():
    # Remove existing db and outbox to start fresh
    if os.path.exists("run_ledger.db"):
        os.remove("run_ledger.db")
    if os.path.exists("outbox/mock_doc.json"):
        os.remove("outbox/mock_doc.json")
    
    # Mock the sources so we don't hit the real APIs and take 90 seconds
    with patch("src.ingestion.app_store.AppStoreSource.fetch", return_value=[]), \
         patch("src.ingestion.play_store.PlayStoreSource.fetch", return_value=[]), \
         patch("src.ingestion.reddit.RedditSource.fetch", return_value=[]):
        
        # Run 1: Should create a new document section and a new draft
        orch1 = Orchestrator("indmoney", dry_run=False, send_email=False)
        from src.delivery.mcp_client import MCPClientManager
        orch1.mcp = MCPClientManager(delivery_target="mock")
        record1 = orch1.run()
    
    assert record1.status == "ok"
    assert record1.doc_heading_id is not None
    assert record1.email_draft_id is not None
    
    # Keep track of IDs
    first_heading_id = record1.doc_heading_id
    first_draft_id = record1.email_draft_id
    
    # Verify mock doc has 1 section
    with open("outbox/mock_doc.json", "r") as f:
        doc_data = json.load(f)
    assert len(doc_data) == 1
    
    # Run 2: Should detect the successful run and return immediately
    orch2 = Orchestrator("indmoney", dry_run=False, send_email=False)
    from src.delivery.mcp_client import MCPClientManager
    orch2.mcp = MCPClientManager(delivery_target="mock")
    record2 = orch2.run()
    
    assert record2.status == "ok"
    assert record2.doc_heading_id == first_heading_id
    assert record2.email_draft_id == first_draft_id
    
    # Verify mock doc still has exactly 1 section
    with open("outbox/mock_doc.json", "r") as f:
        doc_data2 = json.load(f)
    assert len(doc_data2) == 1
    
    print("Idempotency test passed!")

def test_dirty_delivery():
    # Remove existing db and outbox to start fresh
    if os.path.exists("run_ledger.db"):
        os.remove("run_ledger.db")
    if os.path.exists("outbox/mock_doc.json"):
        os.remove("outbox/mock_doc.json")
        
    with patch("src.ingestion.app_store.AppStoreSource.fetch", return_value=[]), \
         patch("src.ingestion.play_store.PlayStoreSource.fetch", return_value=[]), \
         patch("src.ingestion.reddit.RedditSource.fetch", return_value=[]):
        
        orch1 = Orchestrator("indmoney", dry_run=False, send_email=False)
        from src.delivery.mcp_client import MCPClientManager
        orch1.mcp = MCPClientManager(delivery_target="mock")
        
        # Mock create_draft to simulate a crash before email
        with patch.object(orch1.mcp.gmail, "create_draft", side_effect=Exception("Crash!")):
            record1 = orch1.run()
            
        assert record1.status == "partial"
        assert record1.doc_heading_id is not None
        assert record1.email_draft_id is None
        
        first_heading_id = record1.doc_heading_id
        
        # Run 2: Should detect the partial run, skip doc append, and send email
        orch2 = Orchestrator("indmoney", dry_run=False, send_email=False)
        from src.delivery.mcp_client import MCPClientManager
        orch2.mcp = MCPClientManager(delivery_target="mock")
        record2 = orch2.run()
        
        assert record2.status == "ok"
        assert record2.doc_heading_id == first_heading_id
        assert record2.email_draft_id is not None
        
        # Verify exactly 1 doc section exists (no duplicate appends)
        with open("outbox/mock_doc.json", "r") as f:
            doc_data = json.load(f)
        assert len(doc_data) == 1
        
        print("Dirty delivery test passed!")
