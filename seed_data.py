import os
import sys
import asyncio

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend"))
from backend.seed_data import run_seed

if __name__ == "__main__":
    asyncio.run(run_seed())
