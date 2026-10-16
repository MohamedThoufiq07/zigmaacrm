import asyncio
from sqlalchemy import text
from app.core.database import engine

async def alter():
    async with engine.begin() as conn:
        # Check if contact_id exists
        res = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='activities' AND column_name='contact_id';"))
        if not res.scalar():
            await conn.execute(text("ALTER TABLE activities ADD COLUMN contact_id VARCHAR(36) REFERENCES contacts(id) ON DELETE CASCADE;"))
            print("Added contact_id column to activities table")
        else:
            print("contact_id column already present")

        # Drop strict activities_lead_id_fkey so activities can link to contacts or leads seamlessly
        await conn.execute(text("ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_lead_id_fkey;"))
        print("Dropped activities_lead_id_fkey constraint to support unified contact activities")

if __name__ == '__main__':
    asyncio.run(alter())
