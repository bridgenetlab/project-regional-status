"""FastAPI application entry point."""

import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import excel
from services import session as session_service


# Startup/shutdown lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan context manager for startup/shutdown tasks."""
    # Startup
    cleanup_task = asyncio.create_task(
        session_service.cleanup_loop(ttl_seconds=3600, check_interval_seconds=300)
    )
    print("Session cleanup task started")

    yield

    # Shutdown
    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        pass
    print("Session cleanup task stopped")


# Create FastAPI app
app = FastAPI(
    title='Project Tracking API',
    description='Backend API for IP Phone branch installation tracking',
    version='1.0.0',
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],  # Allow all origins (safe for internal use, adjust as needed)
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# Include routers
app.include_router(excel.router)


# Root endpoint
@app.get('/')
async def root():
    """API root endpoint."""
    return {
        'name': 'Project Tracking API',
        'version': '1.0.0',
        'docs': '/docs',
    }


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(
        'main:app',
        host='0.0.0.0',
        port=8000,
        reload=True,
    )
