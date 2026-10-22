import asyncio
import logging
from sqlalchemy import text
from app.core.database import engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("db_optimization")

INDEXES_TO_ENSURE = [
    # Contact indexes
    ("contacts", "ix_contacts_phone", "CREATE INDEX IF NOT EXISTS ix_contacts_phone ON contacts (phone)"),
    ("contacts", "ix_contacts_created_at", "CREATE INDEX IF NOT EXISTS ix_contacts_created_at ON contacts (created_at DESC)"),
    ("contacts", "ix_contacts_source", "CREATE INDEX IF NOT EXISTS ix_contacts_source ON contacts (source)"),
    ("contacts", "ix_contacts_org_id", "CREATE INDEX IF NOT EXISTS ix_contacts_org_id ON contacts (organization_id)"),
    ("contacts", "ix_contacts_email", "CREATE INDEX IF NOT EXISTS ix_contacts_email ON contacts (email)"),
    ("contacts", "ix_contacts_status", "CREATE INDEX IF NOT EXISTS ix_contacts_status ON contacts (status)"),

    # WhatsApp Message indexes
    ("whatsapp_messages", "ix_wa_phone_number", "CREATE INDEX IF NOT EXISTS ix_wa_phone_number ON whatsapp_messages (phone_number)"),
    ("whatsapp_messages", "ix_wa_created_at", "CREATE INDEX IF NOT EXISTS ix_wa_created_at ON whatsapp_messages (created_at DESC)"),
    ("whatsapp_messages", "ix_wa_contact_id", "CREATE INDEX IF NOT EXISTS ix_wa_contact_id ON whatsapp_messages (contact_id)"),
    ("whatsapp_messages", "ix_wa_direction", "CREATE INDEX IF NOT EXISTS ix_wa_direction ON whatsapp_messages (direction)"),
    ("whatsapp_messages", "ix_wa_status", "CREATE INDEX IF NOT EXISTS ix_wa_status ON whatsapp_messages (status)"),

    # Leads indexes
    ("leads", "ix_leads_phone", "CREATE INDEX IF NOT EXISTS ix_leads_phone ON leads (phone)"),
    ("leads", "ix_leads_email", "CREATE INDEX IF NOT EXISTS ix_leads_email ON leads (email)"),
    ("leads", "ix_leads_created_at", "CREATE INDEX IF NOT EXISTS ix_leads_created_at ON leads (created_at DESC)"),
    ("leads", "ix_leads_status", "CREATE INDEX IF NOT EXISTS ix_leads_status ON leads (status)"),
]

async def optimize_indexes():
    logger.info("Connecting to PostgreSQL to check & apply performance indexes...")
    async with engine.begin() as conn:
        # Check if timestamp column exists on whatsapp_messages, if not add it or ensure index
        try:
            res = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'whatsapp_messages' AND column_name = 'timestamp'"))
            has_timestamp = res.scalar()
            if not has_timestamp:
                logger.info("Adding 'timestamp' column to whatsapp_messages...")
                await conn.execute(text("ALTER TABLE whatsapp_messages ADD COLUMN timestamp TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()"))
                await conn.execute(text("UPDATE whatsapp_messages SET timestamp = created_at WHERE timestamp IS NULL"))
            
            await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_wa_timestamp ON whatsapp_messages (timestamp DESC)"))
            logger.info("Index on whatsapp_messages(timestamp) verified.")
        except Exception as e:
            logger.warning(f"Note on timestamp column check: {e}")

        # Execute all index creations
        for table, index_name, sql in INDEXES_TO_ENSURE:
            logger.info(f"Applying index: {index_name} on {table}")
            await conn.execute(text(sql))

    # Verify all created indexes
    async with engine.connect() as conn:
        res = await conn.execute(text("""
            SELECT tablename, indexname 
            FROM pg_indexes 
            WHERE tablename IN ('contacts', 'whatsapp_messages', 'leads')
            ORDER BY tablename, indexname
        """))
        rows = res.fetchall()
        logger.info("Current verified indexes:")
        for r in rows:
            logger.info(f" - {r[0]}.{r[1]}")

if __name__ == "__main__":
    asyncio.run(optimize_indexes())
