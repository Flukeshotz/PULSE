import os
import json
import uuid
from typing import Dict, Any, Optional, List

class MockDocsMCP:
    def __init__(self, out_dir: str = "outbox"):
        self.out_dir = out_dir
        os.makedirs(self.out_dir, exist_ok=True)
        self.doc_file = os.path.join(self.out_dir, "mock_doc.json")

    async def find_or_create_doc(self, product: str, title: str) -> Dict[str, str]:
        # Return a fake doc_id
        doc_id = f"mock_doc_{product}"
        return {"document_id": doc_id}

    async def section_exists(self, document_id: str, anchor: str) -> Dict[str, Any]:
        # Simple mock: if it's in the json, it exists
        if not os.path.exists(self.doc_file):
            return {"exists": False}
        with open(self.doc_file, "r") as f:
            try:
                data = json.load(f)
            except json.JSONDecodeError:
                data = {}
        
        if anchor in data:
            return {"exists": True, "heading_id": data[anchor]["heading_id"]}
        return {"exists": False}

    async def append_section(self, document_id: str, anchor: str, heading: str, blocks: List[Dict[str, Any]]) -> Dict[str, str]:
        if os.path.exists(self.doc_file):
            with open(self.doc_file, "r") as f:
                try:
                    data = json.load(f)
                except json.JSONDecodeError:
                    data = {}
        else:
            data = {}
            
        heading_id = f"heading_{uuid.uuid4().hex[:8]}"
        deep_link = f"https://docs.google.com/document/d/{document_id}/edit#{heading_id}"
        
        data[anchor] = {
            "heading_id": heading_id,
            "deep_link": deep_link,
            "heading": heading,
            "blocks": blocks
        }
        
        with open(self.doc_file, "w") as f:
            json.dump(data, f, indent=2)
            
        return {"heading_id": heading_id, "deep_link": deep_link}

class MockGmailMCP:
    def __init__(self, out_dir: str = "outbox"):
        self.out_dir = out_dir
        os.makedirs(self.out_dir, exist_ok=True)

    async def create_draft(self, to: list[str], subject: str, html: str, text: str) -> Dict[str, str]:
        draft_id = f"mock_draft_{uuid.uuid4().hex[:8]}"
        file_path = os.path.join(self.out_dir, f"{draft_id}.html")
        with open(file_path, "w") as f:
            f.write(f"Subject: {subject}\nTo: {to}\n\n{html}")
        return {"draft_id": draft_id}

    async def send_message(self, to: list[str], subject: str, html: str, text: str) -> Dict[str, str]:
        # Synthesize a mock sent message
        msg_id = f"mock_sent_{uuid.uuid4().hex[:8]}"
        file_path = os.path.join(self.out_dir, f"{msg_id}.html")
        with open(file_path, "w") as f:
            f.write(f"Subject: {subject}\nTo: {to}\n\n{html}")
        return {"message_id": msg_id}
