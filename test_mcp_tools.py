import asyncio
import mcp.client.sse
from mcp import ClientSession

async def main():
    sse_url = "https://web-production-cdc1c.up.railway.app/sse"
    async with mcp.client.sse.sse_client(sse_url) as (read_stream, write_stream):
        async with ClientSession(read_stream, write_stream) as session:
            await session.initialize()
            result = await session.list_tools()
            for t in result.tools:
                print(t.name)

asyncio.run(main())
