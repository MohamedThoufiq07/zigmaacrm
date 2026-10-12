from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from typing import List, Optional

from app.core.database import get_db
from app.models.lead_pipeline import Lead
from app.models.organization_user import Organization
from app.schemas.lead_schema import LeadCreate, LeadOut, BulkUploadResponse
from app.services.lead_service import LeadService
from app.services.csv_parser_service import CSVParserService

router = APIRouter()

@router.get("/leads", response_model=List[LeadOut])
async def get_leads(
    org_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    query = select(Lead).order_by(Lead.id.desc())

    if org_id:
        query = query.where(Lead.organization_id == org_id)
    if search:
        term = f"%{search}%"
        query = query.where(or_(Lead.full_name.ilike(term), Lead.phone.ilike(term), Lead.email.ilike(term), Lead.company_name.ilike(term)))
    if status:
        query = query.where(Lead.status == status)
    if source:
        query = query.where(Lead.source == source)

    result = await db.execute(query)
    return result.scalars().all()

@router.post("/leads", response_model=LeadOut)
async def create_lead(
    lead_in: LeadCreate,
    org_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    # Resolve org_id
    if not org_id:
        res = await db.execute(select(Organization))
        org = res.scalars().first()
        org_id = org.id if org else "default_org"

    try:
        lead = await LeadService.create_lead(db, org_id, lead_in)
        return lead
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/leads/bulk-upload", response_model=BulkUploadResponse)
async def bulk_upload(
    file: UploadFile = File(...),
    org_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    if not org_id:
        res = await db.execute(select(Organization))
        org = res.scalars().first()
        org_id = org.id if org else "default_org"

    contents = await file.read()
    rows = CSVParserService.parse_csv_bytes(contents)

    success_count = 0
    duplicate_count = 0
    total_processed = len(rows)

    for idx, row in enumerate(rows):
        full_name = row.get("full_name") or row.get("Name") or f"Lead {idx+1}"
        phone = row.get("phone") or row.get("Phone") or ""
        email = row.get("email") or row.get("Email")
        source = row.get("source") or row.get("Source") or "CSV_IMPORT"
        company_name = row.get("company_name") or row.get("Company") or ""

        if not phone:
            continue

        existing = await db.execute(
            select(Lead).where(Lead.organization_id == org_id, Lead.phone == phone)
        )
        if existing.scalar_one_or_none():
            duplicate_count += 1
            continue

        lead = Lead(
            organization_id=org_id,
            full_name=full_name,
            phone=phone,
            email=email,
            company_name=company_name,
            source=source,
            status="NEW"
        )
        db.add(lead)
        success_count += 1

    await db.commit()
    return BulkUploadResponse(
        success_count=success_count,
        duplicate_count=duplicate_count,
        total_processed=total_processed,
        message=f"Bulk ingestion finished. Processed {total_processed} rows: {success_count} inserted, {duplicate_count} duplicates skipped."
    )
