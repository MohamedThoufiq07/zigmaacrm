import asyncio
import json
import time
import urllib.request
from sqlalchemy import text
from app.core.database import engine, AsyncSessionLocal

async def run_audit():
    report = {}

    # 1. Database Schema
    async with engine.connect() as conn:
        q = text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='contacts' ORDER BY ordinal_position;")
        res = await conn.execute(q)
        cols = {row[0]: row[1] for row in res.fetchall()}
        report['schema'] = cols

    # 2. Count existing records
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT count(*) FROM contacts;"))
        cnt = res.scalar()
        report['contacts_count'] = cnt

    print(json.dumps(report, indent=2))

if __name__ == '__main__':
    asyncio.run(run_audit())
