from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from app.core.database import get_db
from app.models.invoice import Invoice
from app.models.organization_user import Organization
from pydantic import BaseModel

class InvoiceItemSchema(BaseModel):
    name: str
    qty: int
    unit_price: float
    total: float

class InvoiceCreateSchema(BaseModel):
    deal_id: Optional[str] = None
    patient_name: str
    phone: str
    items: List[InvoiceItemSchema]
    subtotal: float
    tax_amount: float = 0.0
    total_amount: float
    payment_status: str = "PAID"

router = APIRouter()

@router.get("/invoices")
async def get_invoices(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Invoice).order_by(Invoice.id.desc()))
    return result.scalars().all()

@router.post("/invoices")
async def create_invoice(inv_in: InvoiceCreateSchema, org_id: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    if not org_id:
        res = await db.execute(select(Organization))
        org = res.scalars().first()
        org_id = org.id if org else "default_org"

    count_res = await db.execute(select(func.count(Invoice.id)))
    count = count_res.scalar() or 0
    inv_no = f"ZIG-INV-2026-{(count + 1):03d}"

    inv = Invoice(
        organization_id=org_id,
        deal_id=inv_in.deal_id,
        invoice_number=inv_no,
        items=[item.model_dump() for item in inv_in.items],
        subtotal=inv_in.subtotal,
        tax_amount=inv_in.tax_amount,
        total_amount=inv_in.total_amount,
        payment_status=inv_in.payment_status
    )
    db.add(inv)
    await db.commit()
    await db.refresh(inv)
    return inv
