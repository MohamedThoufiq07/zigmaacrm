import asyncio
import json
from sqlalchemy import text
from app.core.database import engine

async def check():
    async with engine.connect() as conn:
        q = text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='activities' ORDER BY ordinal_position;")
        res = await conn.execute(q)
        cols = {row[0]: row[1] for row in res.fetchall()}
        print("Activities schema:", json.dumps(cols, indent=2))

        # Check foreign keys on activities
        fk_q = text("""
            SELECT
                kcu.column_name, 
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name 
            FROM information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='activities';
        """)
        fk_res = await conn.execute(fk_q)
        print("Activities FKs:", [dict(r._mapping) for r in fk_res.fetchall()])

if __name__ == '__main__':
    asyncio.run(check())
