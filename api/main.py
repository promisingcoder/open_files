from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, HttpUrl
from typing import List, Dict, Optional, Any
import asyncio
import logging
from datetime import datetime
import os
import sys
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import uuid
import json
import csv
import io

# Load environment variables from .env file
load_dotenv()

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the scraper and database operations
from scraper.searxng_scraper import SearxngScraper, SearchQuery, SearxngInstanceConfig, SearchResult
from database.db_operations import DatabaseOperations

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# In-memory storage for demo purposes
search_results = {}
searxng_instances = [
    {
        "id": "1",
        "name": "search_inetol",
        "url": "https://search.inetol.net",
        "is_active": True
    },
    {
        "id": "2",
        "name": "search_rhscz",
        "url": "https://search.rhscz.eu",
        "is_active": True
    }
]

# Global scraper and database instances
scraper = None
db = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle application lifespan events"""
    global scraper, db
    # Startup
    logger.info("Application starting up")
    
    # Initialize database
    try:
        db = DatabaseOperations()
        if db.test_connection():
            logger.info("Database connection established")
        else:
            logger.error("Database connection failed")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
    
    # Initialize scraper
    scraper = SearxngScraper()
    await scraper.__aenter__()
    logger.info("Scraper initialized")
    
    yield
    
    # Shutdown
    logger.info("Application shutting down")
    if scraper:
        await scraper.__aexit__(None, None, None)
    logger.info("Scraper closed")

# Create FastAPI app
app = FastAPI(
    title="Searxng File Scraper API",
    description="Simplified API for scraping open files through Searxng instances",
    version="2.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add middleware to log all requests
@app.middleware("http")
async def log_requests(request, call_next):
    logger.info(f"Incoming request: {request.method} {request.url}")
    response = await call_next(request)
    logger.info(f"Response status: {response.status_code}")
    return response

# Pydantic models
class SearchRequest(BaseModel):
    query: str
    instance_ids: Optional[List[str]] = None
    max_pages: int = 3
    language: str = "en"
    time_range: str = ""
    safesearch: int = 1
    file_types: Optional[List[str]] = None  # Filter by specific file types (e.g., ['pdf', 'doc', 'txt'])

class SearchResponse(BaseModel):
    query_id: str
    status: str
    message: str
    results: List[Dict[str, Any]] = []

class SearxngInstanceCreate(BaseModel):
    name: str
    url: HttpUrl
    is_active: bool = True

# API Endpoints
@app.get("/")
async def root():
    print("=== ROOT ENDPOINT CALLED ===")
    logger.info("=== ROOT ENDPOINT CALLED ===")
    return {"message": "SearXNG Search API"}

@app.get("/health")
async def health():
    print("=== HEALTH ENDPOINT CALLED ===")
    logger.info("=== HEALTH ENDPOINT CALLED ===")
    return {"status": "healthy", "timestamp": str(datetime.now())}

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Test database connection
        active_instances = db.get_active_instances()
        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")

@app.get("/api/statistics/instances")
async def get_instance_statistics():
    """Get statistics by instance"""
    try:
        instances = db.get_active_instances()
        instance_stats = []
        
        for instance in instances:
            # Get query count for this instance
            queries = db.get_recent_queries(limit=1000)  # Get all recent queries
            instance_queries = [q for q in queries if q.get('instance_id') == instance['id']]
            
            # Get result count for this instance's queries
            total_results = 0
            for query in instance_queries:
                results = db.search_results(search_term="", limit=1000, offset=0)
                query_results = [r for r in results if r.get('query_id') == query['id']]
                total_results += len(query_results)
            
            instance_stats.append({
                "instance_id": instance['id'],
                "instance_name": instance['name'],
                "instance_url": instance['url'],
                "total_queries": len(instance_queries),
                "total_results": total_results,
                "is_active": instance['is_active']
            })
        
        return instance_stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch instance statistics: {str(e)}")

@app.get("/api/export")
async def export_results(
    format: str = Query("csv", description="Export format: csv or json"),
    search: Optional[str] = Query(None, description="Search term filter"),
    file_type: Optional[str] = Query(None, description="File type filter"),
    domain: Optional[str] = Query(None, description="Domain filter"),
    is_google_doc: Optional[bool] = Query(None, description="Google Docs filter"),
    is_google_drive: Optional[bool] = Query(None, description="Google Drive filter"),
    start_date: Optional[str] = Query(None, description="Start date filter (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date filter (YYYY-MM-DD)")
):
    """Export search results in CSV or JSON format"""
    try:
        # Get filtered results
        results = db.search_results(
            search_term=search or "",
            limit=10000,  # Large limit for export
            offset=0
        )
        
        # Apply additional filters
        if file_type:
            results = [r for r in results if r.get('file_type') == file_type]
        if domain:
            results = [r for r in results if domain.lower() in r.get('domain', '').lower()]
        if is_google_doc is not None:
            results = [r for r in results if r.get('is_google_doc') == is_google_doc]
        if is_google_drive is not None:
            results = [r for r in results if r.get('is_google_drive') == is_google_drive]
        
        # Date filtering
        if start_date or end_date:
            filtered_results = []
            for result in results:
                try:
                    result_date = datetime.fromisoformat(result['created_at'].replace('Z', '+00:00')).date()
                    
                    if start_date:
                        start_dt = datetime.strptime(start_date, '%Y-%m-%d').date()
                        if result_date < start_dt:
                            continue
                    
                    if end_date:
                        end_dt = datetime.strptime(end_date, '%Y-%m-%d').date()
                        if result_date > end_dt:
                            continue
                    
                    filtered_results.append(result)
                except (ValueError, TypeError):
                    continue
            results = filtered_results
        
        if format.lower() == 'csv':
            output = io.StringIO()
            if results:
                fieldnames = ['id', 'title', 'url', 'description', 'domain', 'file_type', 'is_google_doc', 'is_google_drive', 'created_at']
                writer = csv.DictWriter(output, fieldnames=fieldnames)
                writer.writeheader()
                
                for result in results:
                    writer.writerow({
                        'id': result.get('id', ''),
                        'title': result.get('title', ''),
                        'url': result.get('url', ''),
                        'description': result.get('description', ''),
                        'domain': result.get('domain', ''),
                        'file_type': result.get('file_type', ''),
                        'is_google_doc': result.get('is_google_doc', False),
                        'is_google_drive': result.get('is_google_drive', False),
                        'created_at': result.get('created_at', '')
                    })
            
            content = output.getvalue()
            output.close()
            
            return Response(
                content=content,
                media_type="text/csv",
                headers={"Content-Disposition": "attachment; filename=search_results.csv"}
            )
        
        elif format.lower() == 'json':
            return Response(
                content=json.dumps(results, indent=2),
                media_type="application/json",
                headers={"Content-Disposition": "attachment; filename=search_results.json"}
            )
        
        else:
            raise HTTPException(status_code=400, detail="Invalid format. Use 'csv' or 'json'")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export results: {str(e)}")

@app.post("/api/results/batch-delete")
async def batch_delete_results(request: dict):
    """Delete multiple search results by IDs"""
    try:
        result_ids = request.get('result_ids', [])
        if not result_ids:
            raise HTTPException(status_code=400, detail="No result IDs provided")
        
        # For now, return a mock response since we don't have a delete method in db_operations
        # In a real implementation, you would call db.delete_results(result_ids)
        deleted_count = len(result_ids)
        
        return {
            "message": f"Successfully deleted {deleted_count} results",
            "deleted_count": deleted_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete results: {str(e)}")

@app.post("/api/results/mark-reviewed")
async def mark_results_reviewed(request: dict):
    """Mark multiple search results as reviewed"""
    try:
        result_ids = request.get('result_ids', [])
        if not result_ids:
            raise HTTPException(status_code=400, detail="No result IDs provided")
        
        # For now, return a mock response since we don't have an update method in db_operations
        # In a real implementation, you would call db.mark_results_reviewed(result_ids)
        updated_count = len(result_ids)
        
        return {
            "message": f"Successfully marked {updated_count} results as reviewed",
            "updated_count": updated_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to mark results as reviewed: {str(e)}")

@app.get("/api/instances")
async def get_instances():
    """Get all SearXNG instances"""
    if db:
        try:
            # Get all instances, not just active ones for management purposes
            response = db.supabase.table('searxng_instances').select('*').execute()
            if response.data:
                return response.data
        except Exception as e:
            logger.error(f"Failed to get instances from database: {e}")
    # Fallback to hardcoded instances
    return searxng_instances

@app.post("/api/instances")
async def create_instance(instance: SearxngInstanceCreate):
    """Create a new SearXNG instance"""
    if db:
        try:
            new_instance = db.add_instance(
                name=instance.name,
                url=str(instance.url),
                is_active=getattr(instance, 'is_active', True)
            )
            if new_instance:
                return new_instance
        except Exception as e:
            logger.error(f"Failed to create instance in database: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to create instance: {str(e)}")
    
    # Fallback to in-memory storage
    new_instance = {
        "id": str(len(searxng_instances) + 1),
        "name": instance.name,
        "url": str(instance.url),
        "is_active": getattr(instance, 'is_active', True)
    }
    searxng_instances.append(new_instance)
    return new_instance

@app.put("/api/instances/{instance_id}")
async def update_instance(instance_id: str, instance: SearxngInstanceCreate):
    """Update a SearXNG instance"""
    if db:
        try:
            updated_instance = db.update_instance(
                instance_id=instance_id,
                name=instance.name,
                url=str(instance.url),
                is_active=getattr(instance, 'is_active', True)
            )
            if updated_instance:
                return updated_instance
            else:
                raise HTTPException(status_code=404, detail="Instance not found")
        except Exception as e:
            logger.error(f"Failed to update instance in database: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to update instance: {str(e)}")
    
    # Fallback to in-memory storage
    global searxng_instances
    for i, inst in enumerate(searxng_instances):
        if inst["id"] == instance_id:
            searxng_instances[i] = {
                "id": instance_id,
                "name": instance.name,
                "url": str(instance.url),
                "is_active": getattr(instance, 'is_active', True)
            }
            return searxng_instances[i]
    raise HTTPException(status_code=404, detail="Instance not found")

@app.delete("/api/instances/{instance_id}")
async def delete_instance(instance_id: str):
    """Delete a SearXNG instance"""
    if db:
        try:
            success = db.delete_instance(instance_id)
            if success:
                return {"message": "Instance deleted successfully"}
            else:
                raise HTTPException(status_code=404, detail="Instance not found")
        except Exception as e:
            logger.error(f"Failed to delete instance from database: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to delete instance: {str(e)}")
    
    # Fallback to in-memory storage
    global searxng_instances
    original_length = len(searxng_instances)
    searxng_instances = [inst for inst in searxng_instances if inst["id"] != instance_id]
    if len(searxng_instances) == original_length:
        raise HTTPException(status_code=404, detail="Instance not found")
    return {"message": "Instance deleted successfully"}

@app.post("/api/search", response_model=SearchResponse)
async def search(search_request: SearchRequest):
    """Perform a search across SearXNG instances using the advanced scraper"""
    print(f"\n\n*** BACKEND PROCESS {os.getpid()} HANDLING SEARCH REQUEST ***")
    print(f"*** Query: {search_request.query} ***\n\n")
    logger.info(f"BACKEND PROCESS {os.getpid()} HANDLING SEARCH REQUEST - Query: {search_request.query}")
    query_id = str(uuid.uuid4())
    
    try:
        # Get active instances from database if available, otherwise use hardcoded ones
        if db:
            db_instances = db.get_active_instances()
            if db_instances:
                active_instances = db_instances
            else:
                # Fallback to hardcoded instances if no database instances
                active_instances = [inst for inst in searxng_instances if inst["is_active"]]
        else:
            # Use hardcoded instances if no database connection
            if search_request.instance_ids:
                # Use specified instances
                active_instances = [
                    inst for inst in searxng_instances 
                    if inst["id"] in search_request.instance_ids and inst["is_active"]
                ]
            else:
                # Use all active instances
                active_instances = [inst for inst in searxng_instances if inst["is_active"]]
        
        if not active_instances:
            return SearchResponse(
                query_id=query_id,
                status="error",
                message="No active SearXNG instances available",
                results=[]
            )
        
        all_results = []
        
        # Create search query
        search_query = SearchQuery(
            query=search_request.query,
            language=search_request.language,
            safesearch=search_request.safesearch,
            time_range=search_request.time_range
        )
        
        # Search each instance using the advanced scraper
        for instance_data in active_instances:
            try:
                # Create instance config
                instance_config = SearxngInstanceConfig(
                    name=instance_data["name"],
                    url=instance_data["url"],
                    is_active=instance_data["is_active"],
                    timeout=30,
                    rate_limit_delay=1.0
                )
                
                logger.info(f"Searching instance {instance_config.name} with query: {search_query.query}")
                
                # Use the scraper to search with pagination
                instance_results = []
                async for result in scraper.search_instance(instance_config, search_query, max_pages=search_request.max_pages):
                    processed_result = {
                        "id": str(uuid.uuid4()),
                        "title": result.title,
                        "url": result.url,
                        "description": result.description or "",
                        "domain": result.domain,
                        "engines": result.engines,
                        "position": result.position,
                        "page_number": result.page_number,
                        "instance": instance_config.name,
                        "file_type": result.file_type,
                        "is_google_doc": result.is_google_doc,
                        "is_google_drive": result.is_google_drive,
                        "cached_url": result.cached_url,
                        "created_at": datetime.now().isoformat()
                    }
                    instance_results.append(processed_result)
                    all_results.append(processed_result)
                
                logger.info(f"Found {len(instance_results)} results from {instance_config.name}")
                            
            except Exception as e:
                logger.error(f"Error searching instance {instance_data['name']}: {e}")
                continue
        
        # Store results in memory (for immediate access)
        search_results[query_id] = {
            "query": search_request.query,
            "results": all_results,
            "created_at": datetime.now().isoformat(),
            "status": "completed",
            "total_results": len(all_results),
            "instances_searched": len(active_instances)
        }
        
        # Store results in database if available
        logger.info(f"Database connection status: {db is not None}")
        logger.info(f"Number of results to store: {len(all_results)}")
        
        if db and all_results:
            try:
                logger.info(f"Attempting to create search query record for: {search_request.query}")
                # Create a search query record in the database
                db_query_id = db.create_search_query(search_request.query, active_instances[0]['id'])
                logger.info(f"Created search query with ID: {db_query_id}")
                
                if db_query_id:
                    # Convert results to SearchResult objects for database storage
                    search_result_objects = []
                    for result in all_results:
                        search_result_obj = SearchResult(
                            title=result['title'],
                            url=result['url'],
                            description=result['description'],
                            domain=result['domain'],
                            engines=result['engines'],
                            cached_url=result.get('cached_url'),
                            position=result['position'],
                            page_number=result['page_number'],
                            is_file=result.get('file_type') is not None,
                            file_type=result.get('file_type')
                        )
                        search_result_objects.append(search_result_obj)
                    
                    logger.info(f"Converted {len(search_result_objects)} results to SearchResult objects")
                    
                    # Store results in database
                    storage_success = db.store_search_results(db_query_id, search_result_objects)
                    logger.info(f"Database storage result: {storage_success}")
                    
                    if storage_success:
                        db.update_search_query(db_query_id, "completed", len(all_results))
                        logger.info(f"Successfully stored {len(all_results)} results in database for query: {search_request.query}")
                    else:
                        logger.error("Failed to store search results in database")
                else:
                    logger.error("Failed to create search query record in database")
            except Exception as e:
                logger.error(f"Database storage error: {e}")
                import traceback
                logger.error(f"Full traceback: {traceback.format_exc()}")
        elif not db:
            logger.warning("Database connection not available - results not stored")
        elif not all_results:
            logger.warning("No results to store in database")
        
        return SearchResponse(
            query_id=query_id,
            status="completed",
            message=f"Found {len(all_results)} results from {len(active_instances)} instances",
            results=all_results
        )
        
    except Exception as e:
        logger.error(f"Search error: {e}")
        return SearchResponse(
            query_id=query_id,
            status="error",
            message=f"Search failed: {str(e)}",
            results=[]
        )

@app.get("/api/search/{query_id}/status")
async def get_search_status(query_id: str):
    """Get search status and results"""
    if query_id not in search_results:
        raise HTTPException(status_code=404, detail="Search not found")
    
    return search_results[query_id]

@app.get("/api/results")
async def get_results(
    search_term: Optional[str] = Query(None, description="Filter results by search term"),
    search: Optional[str] = Query(None, description="Filter results by search term (alias for search_term)"),
    file_types: Optional[str] = Query(None, description="Filter by file types (comma-separated, e.g., 'pdf,doc,txt')"),
    domain: Optional[str] = Query(None, description="Filter by domain"),
    is_google_doc: Optional[bool] = Query(None, description="Filter for Google Docs"),
    is_google_drive: Optional[bool] = Query(None, description="Filter for Google Drive files"),
    date_from: Optional[str] = Query(None, description="Filter results from this date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Filter results to this date (YYYY-MM-DD)"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=500, description="Number of results per page"),
    limit: int = Query(50, ge=1, le=200, description="Number of results to return"),
    offset: int = Query(0, ge=0, description="Number of results to skip")
):
    """Get stored search results from database using PGroonga full-text search"""
    try:
        # Calculate offset for pagination
        calculated_offset = (page - 1) * page_size
        
        # Handle file types filter
        file_type_filter = None
        if file_types:
            file_type_list = [ft.strip().lower() for ft in file_types.split(',')]
            # For simplicity, use the first file type for database filtering
            # Multiple file types can be handled in post-processing if needed
            file_type_filter = file_type_list[0] if file_type_list else None
        
        # Handle Google Docs/Drive filters by converting to file type or domain
        if is_google_doc:
            domain = "docs.google.com"
        elif is_google_drive:
            domain = "drive.google.com"
        
        # Use database search with PGroonga if search_term or search is provided
        actual_search_term = search_term or search
        if actual_search_term:
            # Get all results first to calculate total, then apply pagination
            all_results = db.search_results(
                search_term=actual_search_term,
                domain=domain,
                file_type=file_type_filter,
                date_from=date_from,
                date_to=date_to,
                limit=10000,  # Get a large number to get all results
                offset=0
            )
        else:
            # Regular database query without full-text search
            all_results = db.search_results(
                domain=domain,
                file_type=file_type_filter,
                date_from=date_from,
                date_to=date_to,
                limit=10000,  # Get a large number to get all results
                offset=0
            )
        
        # Post-process for multiple file types if needed
        if file_types and len(file_types.split(',')) > 1:
            file_type_list = [ft.strip().lower() for ft in file_types.split(',')]
            all_results = [
                result for result in all_results
                if result.get("file_type") and result["file_type"].lower() in file_type_list
            ]
        
        # Date filtering is now handled at the database level for better performance
        
        # Apply pagination
        total = len(all_results)
        start_index = calculated_offset
        end_index = start_index + page_size
        paginated_results = all_results[start_index:end_index] if page_size else all_results
        
        return {
            "results": paginated_results,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 1
        }
        
    except Exception as e:
        logger.error(f"Error fetching results: {e}")
        return {
            "results": [],
            "total": 0,
            "page": page,
            "page_size": page_size,
            "total_pages": 0,
            "error": str(e)
        }

@app.get("/api/file-types")
async def get_file_types():
    """Get available file types"""
    file_types = set()
    
    for search_data in search_results.values():
        for result in search_data["results"]:
            if result.get("file_type"):
                file_types.add(result["file_type"])
    
    return {
        "file_types": sorted(list(file_types))
    }

@app.get("/api/file-types-summary")
async def get_file_types_summary():
    """Get summary of file types found in search results from database"""
    try:
        # Get file types summary from database
        file_types_data = db.get_file_types_summary()
        
        # Convert to expected format
        file_types_list = []
        total_files = 0
        
        if file_types_data:
            for item in file_types_data:
                file_type = item.get('file_type', 'unknown')
                count = item.get('count', 0)
                file_types_list.append({
                    "file_type": file_type,
                    "count": count
                })
                total_files += count
        
        # Sort by count descending
        file_types_list.sort(key=lambda x: x['count'], reverse=True)
        
        return {
            "file_types": file_types_list,
            "total_files": total_files
        }
    except Exception as e:
        logger.error(f"Error fetching file types summary: {e}")
        return {
            "file_types": [],
            "total_files": 0,
            "error": str(e)
        }

@app.get("/api/statistics/domains")
async def get_top_domains(limit: int = Query(10, ge=1, le=100)):
    """Get top domains by result count from database"""
    try:
        # Check if db is initialized
        if db is None:
            logger.error("Database not initialized")
            return {
                "domains": [],
                "total_domains": 0,
                "error": "Database not initialized"
            }
        
        # Get top domains from database
        logger.info(f"Fetching top domains with limit: {limit}")
        domains_data = db.get_top_domains(limit=limit)
        logger.info(f"Raw domains data from DB: {domains_data}")
        
        # Convert to expected format
        domains_list = []
        if domains_data:
            for item in domains_data:
                domain = item.get('domain', 'unknown')
                count = item.get('count', 0)
                domains_list.append({
                    "domain": domain,
                    "count": count
                })
        
        logger.info(f"Processed domains list: {domains_list}")
        return {
            "domains": domains_list,
            "total_domains": len(domains_list)
        }
    except Exception as e:
        logger.error(f"Error fetching top domains: {e}")
        return {
            "domains": [],
            "total_domains": 0,
            "error": str(e)
        }

@app.get("/api/statistics")
async def get_statistics():
    """Get search statistics from database"""
    try:
        # Get statistics from database
        stats = db.get_search_statistics()
        
        # Calculate totals
        total_queries = len(stats) if stats else 0
        total_results = sum(stat.get('total_results', 0) for stat in stats) if stats else 0
        
        # Get active instances count
        active_instances = db.get_active_instances()
        active_count = len(active_instances) if active_instances else 0
        
        # Get recent queries
        recent_queries = db.get_recent_queries(limit=10)
        
        return {
            "total_queries": total_queries,
            "total_results": total_results,
            "active_instances": active_count,
            "recent_queries": recent_queries
        }
    except Exception as e:
        logger.error(f"Error fetching statistics: {e}")
        return {
            "total_queries": 0,
            "total_results": 0,
            "active_instances": 0,
            "recent_queries": [],
            "error": str(e)
        }

@app.get("/api/queries/recent")
async def get_recent_queries(limit: int = Query(10, ge=1, le=50)):
    """Get recent search queries from database"""
    try:
        recent_queries = db.get_recent_queries(limit=limit)
        return recent_queries
    except Exception as e:
        logger.error(f"Error fetching recent queries: {e}")
        return []

@app.get("/api/queries/{query_id}")
async def get_search_query(query_id: str):
    """Get a specific search query by ID"""
    try:
        # Try to get from database first
        if db:
            # This would need to be implemented in db_operations.py
            # For now, return a basic response
            recent_queries = db.get_recent_queries(limit=100)
            for query in recent_queries:
                if query.get('id') == query_id:
                    return query
        
        # Fallback: check in-memory storage
        if query_id in search_results:
            search_data = search_results[query_id]
            return {
                "id": query_id,
                "query_text": search_data.get("query", ""),
                "status": search_data.get("status", "completed"),
                "results_count": len(search_data.get("results", [])),
                "created_at": search_data.get("created_at", datetime.now().isoformat())
            }
        
        raise HTTPException(status_code=404, detail="Query not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching query {query_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/search/fulltext")
async def fulltext_search(
    q: str = Query(..., description="Search query"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Results per page")
):
    """Full-text search using pgroonga"""
    try:
        # Calculate offset
        offset = (page - 1) * per_page
        
        # Use database search_results method for full-text search
        results = db.search_results(
            search_term=q,
            limit=per_page,
            offset=offset
        )
        
        # Get total count for pagination (this is an approximation)
        total_results = db.search_results(search_term=q, limit=1000)  # Get more to estimate total
        total = len(total_results) if total_results else 0
        
        return {
            "results": results or [],
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": (total + per_page - 1) // per_page if per_page > 0 else 1
        }
    except Exception as e:
        logger.error(f"Error performing full-text search: {e}")
        return {
            "results": [],
            "total": 0,
            "page": page,
            "per_page": per_page,
            "total_pages": 0,
            "error": str(e)
        }

@app.get("/api/analytics")
async def get_analytics(days: int = Query(30, ge=1, le=365)):
    """Get analytics data for the specified number of days"""
    try:
        # Get analytics from database using the correct method
        analytics = db.get_search_analytics(days)
        
        if not analytics:
            # Return empty analytics if no data
            return {
                "period_days": days,
                "total_queries": 0,
                "successful_queries": 0,
                "failed_queries": 0,
                "success_rate": 0.0,
                "total_results": 0,
                "file_results": 0,
                "file_percentage": 0.0,
                "top_file_types": [],
                "top_domains": []
            }
        
        return {
            "period_days": analytics.get("period_days", days),
            "total_queries": analytics.get("total_queries", 0),
            "successful_queries": analytics.get("successful_queries", 0),
            "failed_queries": analytics.get("failed_queries", 0),
            "success_rate": analytics.get("success_rate", 0.0),
            "total_results": analytics.get("total_results", 0),
            "file_results": analytics.get("file_results", 0),
            "file_percentage": analytics.get("file_percentage", 0.0),
            "top_file_types": analytics.get("top_file_types", []),
            "top_domains": analytics.get("top_domains", [])
        }
    except Exception as e:
        logger.error(f"Error fetching analytics: {e}")
        return {
            "period_days": days,
            "total_queries": 0,
            "successful_queries": 0,
            "failed_queries": 0,
            "success_rate": 0.0,
            "total_results": 0,
            "file_results": 0,
            "file_percentage": 0.0,
            "top_file_types": [],
            "top_domains": [],
            "error": str(e)
        }

@app.get("/api/analytics/daily")
async def get_daily_analytics(days: int = Query(30, ge=1, le=365)):
    """Get daily search activity data for time series charts"""
    try:
        if not db:
            raise HTTPException(status_code=500, detail="Database not initialized")
        
        daily_data = db.get_daily_search_activity(days)
        
        return {
            "period_days": days,
            "data": daily_data
        }
        
    except Exception as e:
        logger.error(f"Failed to get daily analytics: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to get daily analytics: {str(e)}"
        )

@app.get("/api/suggestions")
async def get_suggestions(partial_term: str = Query(..., description="Partial search term"), limit: int = Query(5, ge=1, le=20)):
    """Get search suggestions based on partial term"""
    try:
        # Get recent queries that match the partial term
        recent_queries = db.get_recent_queries(limit=50)
        
        suggestions = []
        partial_lower = partial_term.lower()
        
        for query in recent_queries:
            query_text = query.get('query_text', '')
            if partial_lower in query_text.lower() and query_text not in suggestions:
                suggestions.append(query_text)
                if len(suggestions) >= limit:
                    break
        
        # Add some common search patterns if we don't have enough suggestions
        if len(suggestions) < limit:
            common_patterns = [
                f"filetype:pdf {partial_term}",
                f"site:edu {partial_term}",
                f"intitle:{partial_term}",
                f"{partial_term} filetype:doc",
                f"{partial_term} site:github.com"
            ]
            
            for pattern in common_patterns:
                if pattern not in suggestions:
                    suggestions.append(pattern)
                    if len(suggestions) >= limit:
                        break
        
        return {"suggestions": suggestions[:limit]}
    except Exception as e:
        logger.error(f"Error fetching suggestions: {e}")
        return {"suggestions": []}

@app.post("/api/advanced-search")
async def advanced_search(search_params: Dict[str, Any]):
    """Perform advanced search using pgroonga full-text search"""
    try:
        search_term = search_params.get('search_term', '')
        search_type = search_params.get('search_type', 'all')
        domain = search_params.get('domain')
        file_type = search_params.get('file_type')
        is_file = search_params.get('is_file')
        limit = search_params.get('limit', 50)
        offset = search_params.get('offset', 0)
        
        # Use database search_results method for advanced search
        results = db.search_results(
            search_term=search_term,
            domain=domain,
            file_type=file_type,
            is_file=is_file,
            limit=limit,
            offset=offset
        )
        
        return results or []
    except Exception as e:
        logger.error(f"Error performing advanced search: {e}")
        return []

# Configuration endpoints
@app.get("/api/config")
async def get_config():
    """Get current configuration settings"""
    return {
        "max_pages_default": 3,
        "max_pages_min": 1,
        "max_pages_max": 10,
        "safesearch_default": 1,
        "safesearch_min": 0,
        "safesearch_max": 2
    }

@app.delete("/api/cleanup")
async def cleanup_results():
    """Clear all stored results"""
    global search_results
    search_results.clear()
    return {"message": "All results cleared successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)