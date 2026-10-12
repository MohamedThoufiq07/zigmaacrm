from pydantic import BaseModel
from typing import List, Optional

class StageOut(BaseModel):
    id: str
    pipeline_id: str
    title: str
    stage_order: int
    probability: int
    color_code: str

    class Config:
        from_attributes = True

class PipelineOut(BaseModel):
    id: str
    organization_id: str
    name: str
    is_default: bool
    stages: List[StageOut] = []

    class Config:
        from_attributes = True
