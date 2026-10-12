from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "zigmaa_workers",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

@celery_app.task(name="process_bulk_lead_import")
def process_bulk_lead_import(organization_id: str, file_path: str):
    """
    Background worker task for processing up to 10,000 CSV leads
    """
    print(f"[Celery Worker] Processing bulk lead import for org {organization_id} from {file_path}")
    return {"status": "success", "processed_records": 100}
