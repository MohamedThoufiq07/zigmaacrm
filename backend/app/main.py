from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1 import auth, organizations, leads, pipelines, deals, activities, webhooks, automations, invoices, contacts, custom_fields, copilot

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Router includes
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Auth"])
app.include_router(auth.router, prefix=settings.API_V1_STR, tags=["Auth-Direct"])
app.include_router(organizations.router, prefix=settings.API_V1_STR, tags=["Organizations"])

app.include_router(leads.router, prefix=settings.API_V1_STR, tags=["Leads"])
app.include_router(contacts.router, prefix=settings.API_V1_STR, tags=["Contacts"])
app.include_router(pipelines.router, prefix=settings.API_V1_STR, tags=["Pipelines"])
app.include_router(deals.router, prefix=settings.API_V1_STR, tags=["Deals"])
app.include_router(custom_fields.router, prefix=settings.API_V1_STR, tags=["Custom Fields"])
app.include_router(activities.router, prefix=settings.API_V1_STR, tags=["Activities"])
app.include_router(webhooks.router, prefix=f"{settings.API_V1_STR}/webhooks", tags=["Webhooks"])
app.include_router(webhooks.router, prefix=settings.API_V1_STR, tags=["Webhooks-Direct"])
app.include_router(automations.router, prefix=settings.API_V1_STR, tags=["Automations"])
app.include_router(invoices.router, prefix=settings.API_V1_STR, tags=["Invoices"])
app.include_router(copilot.router, prefix=settings.API_V1_STR, tags=["AI Copilot"])

@app.on_event("startup")
async def on_startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@app.get("/")
async def root():
    return {
        "app": "Zigmaa CRM Production API",
        "version": settings.VERSION,
        "docs": "/docs"
    }
