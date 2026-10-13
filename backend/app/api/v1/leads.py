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

@router.get("/leads/{lead_id}", response_model=LeadOut)
async def get_lead(lead_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead

@router.patch("/leads/{lead_id}", response_model=LeadOut)
async def update_lead(lead_id: str, patch_data: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Map fields
    if "name" in patch_data and "full_name" not in patch_data:
        patch_data["full_name"] = patch_data["name"]
    if "ad_source" in patch_data and "source" not in patch_data:
        patch_data["source"] = patch_data["ad_source"]
    if "stage" in patch_data and "status" not in patch_data:
        patch_data["status"] = patch_data["stage"]

    allowed_fields = ["full_name", "email", "phone", "company_name", "source", "status", "notes", "custom_fields", "tags", "assigned_user_id"]
    for key, val in patch_data.items():
        if key in allowed_fields and val is not None:
            setattr(lead, key, val)

    await db.commit()
    await db.refresh(lead)
    return lead

@router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    await db.delete(lead)
    await db.commit()
    return {"message": "Lead deleted successfully", "success": True}

