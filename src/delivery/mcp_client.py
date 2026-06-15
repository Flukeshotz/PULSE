import os
from typing import Dict, Any, List
from src.delivery.mocks import MockDocsMCP, MockGmailMCP
import mcp.client.sse
from mcp import ClientSession

class RealDocsMCP:
    def __init__(self, session: ClientSession):
        self.session = session

    async def find_or_create_doc(self, product: str, title: str) -> Dict[str, str]:
        result = await self.session.call_tool("find_or_create_doc_tool", arguments={"title": title})
        # The result is typically an CallToolResult which contains content. 
        # But FastMCP wraps it. Let's see...
        # A tool returns a CallToolResult. 
        import json
        text_content = result.content[0].text
        data = json.loads(text_content) if isinstance(text_content, str) else text_content
        return {"document_id": data["document_id"]}

    async def section_exists(self, document_id: str, anchor: str) -> Dict[str, Any]:
        return {"exists": False, "heading_id": None}

    async def append_section(self, document_id: str, anchor: str, heading: str, blocks: List[Dict[str, str]]) -> Dict[str, str]:
        payload_blocks = [{"type": "heading_1", "text": heading}] + blocks
        result = await self.session.call_tool("append_to_doc_blocks_tool", arguments={
            "doc_id": document_id,
            "blocks": payload_blocks
        })
        return {"heading_id": anchor, "deep_link": f"https://docs.google.com/document/d/{document_id}/edit"}

class RealGmailMCP:
    def __init__(self, session: ClientSession):
        self.session = session

    async def send_message(self, recipients: List[str], subject: str, html: str, text: str) -> Dict[str, str]:
        return await self.create_draft(recipients, subject, html, text)

    async def create_draft(self, recipients: List[str], subject: str, html: str, text: str) -> Dict[str, str]:
        result = await self.session.call_tool("create_email_draft_tool", arguments={
            "to": ",".join(recipients),
            "subject": subject,
            "body": html,
            "is_html": True
        })
        import json
        text_content = result.content[0].text
        data = json.loads(text_content) if isinstance(text_content, str) else text_content
        return {"draft_id": data.get("result", {}).get("id", "draft_created")}

class MCPClientManager:
    def __init__(self, delivery_target: str = "mock", server_url: str = None):
        self.delivery_target = delivery_target
        self.server_url = server_url.rstrip('/') if server_url else None
        
        if self.delivery_target == "mock":
            self.docs = MockDocsMCP()
            self.gmail = MockGmailMCP()
        elif self.delivery_target == "real":
            if not server_url:
                raise ValueError("server_url is required for real delivery target")
            self.docs = None
            self.gmail = None
        else:
            raise ValueError(f"Unknown delivery target: {delivery_target}")

    async def connect(self):
        if self.delivery_target == "mock":
            return
            
        # For real delivery, we set up the SSE connection and initialize the session
        from contextlib import AsyncExitStack
        self.exit_stack = AsyncExitStack()
        
        sse_url = f"{self.server_url}/sse"
        
        sse_transport = await self.exit_stack.enter_async_context(
            mcp.client.sse.sse_client(sse_url)
        )
        read_stream, write_stream = sse_transport
        self.session = await self.exit_stack.enter_async_context(
            ClientSession(read_stream, write_stream)
        )
        await self.session.initialize()
        
        self.docs = RealDocsMCP(self.session)
        self.gmail = RealGmailMCP(self.session)

    async def close(self):
        if self.delivery_target == "real":
            await self.exit_stack.aclose()
