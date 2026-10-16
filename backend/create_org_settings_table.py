import asyncio, sys, os
sys.path.insert(0, os.path.abspath("e:/Desktop/New folder/zigmaacrm/backend"))
from app.core.database import engine
from sqlalchemy import text

async def create_table():
    async with engine.begin() as conn:
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS organization_settings (
                id VARCHAR(36) PRIMARY KEY,
                organization_id VARCHAR(36),
                company_name VARCHAR(255) DEFAULT 'Arsath Thoufiq''s Workspace',
                logo_url TEXT,
                email VARCHAR(255) DEFAULT 'thoufiqarsath84@gmail.com',
                phone VARCHAR(50) DEFAULT '+91 98765 43210',
                address TEXT DEFAULT 'Chennai Tech Park, Guindy, Chennai, Tamil Nadu 600032',
                gstin VARCHAR(50) DEFAULT '33AAECZ9920K1ZX',
                website VARCHAR(255) DEFAULT 'https://zigmaa.com',
                signatory_name VARCHAR(255) DEFAULT 'Arsath Thoufiq',
                signatory_designation VARCHAR(255) DEFAULT 'Authorized Signatory',
                bank_name VARCHAR(255) DEFAULT 'HDFC Bank Ltd',
                account_number VARCHAR(100) DEFAULT '50200084729104',
                ifsc_code VARCHAR(50) DEFAULT 'HDFC0001244',
                upi_id VARCHAR(100) DEFAULT 'zigmaa@hdfcbank',
                default_terms TEXT DEFAULT 'Payment terms: 50% advance, balance upon project milestone delivery. Bank Transfer / UPI accepted.',
                created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """))
        print("Table organization_settings verified/created successfully.")

if __name__ == "__main__":
    asyncio.run(create_table())
