from pydantic import BaseModel, EmailStr
from typing import Optional

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class GoogleLoginSchema(BaseModel):
    email: EmailStr
    name: Optional[str] = "Google User"
    picture: Optional[str] = None
    token: Optional[str] = None

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    organization_name: Optional[str] = "Zigmaa Global"
    role: Optional[str] = "ADMIN"

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"

class UserOut(BaseModel):
    id: str
    organization_id: str
    email: str
    full_name: str
    role: str
    is_active: bool

    class Config:
        from_attributes = True

class OrganizationOut(BaseModel):
    id: str
    name: str
    slug: str
    plan: str

    class Config:
        from_attributes = True
