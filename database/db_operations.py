import os
import asyncio
from typing import List, Dict, Optional, Any
from datetime import datetime
import logging
from supabase import create_client
from supabase.client import Client
from dataclasses import asdict
import uuid
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Import our SearchResult dataclass
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from scraper.searxng_scraper import SearchResult

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DatabaseOperations:
    """Handle all database operations for the searxng scraper"""
    
    def __init__(self, supabase_url: str = None, supabase_key: str = None):
        # Get credentials from environment variables if not provided
        self.supabase_url = supabase_url or os.getenv('SUPABASE_URL')
        self.supabase_key = supabase_key or os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        if not self.supabase_url or not self.supabase_key:
            raise ValueError("Supabase URL and key must be provided either as parameters or environment variables")
        
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
    
    def get_active_instances(self) -> List[Dict[str, Any]]:
        """Get all active searxng instances"""
        try:
            response = self.supabase.table('searxng_instances').select('*').eq('is_active', True).execute()
            return response.data
        except Exception as e:
            logger.error(f"Failed to get active instances: {e}")
            return []
    
    def add_instance(self, name: str, url: str, is_active: bool = True) -> Optional[Dict[str, Any]]:
        """Add a new searxng instance"""
        try:
            data = {
                'name': name,
                'url': url,
                'is_active': is_active
            }
            response = self.supabase.table('searxng_instances').insert(data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Failed to add instance: {e}")
            return None
    
    def update_instance(self, instance_id: str, **kwargs) -> Optional[Dict[str, Any]]:
        """Update an existing searxng instance"""
        try:
            response = self.supabase.table('searxng_instances').update(kwargs).eq('id', instance_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Failed to update instance: {e}")
            return None
    
    def delete_instance(self, instance_id: str) -> bool:
        """Delete a searxng instance"""
        try:
            self.supabase.table('searxng_instances').delete().eq('id', instance_id).execute()
            return True
        except Exception as e:
            logger.error(f"Failed to delete instance: {e}")
            return False
    
    def create_search_query(self, query_text: str, instance_id: str) -> Optional[str]:
        """Create a new search query record and return its ID"""
        try:
            data = {
                'query_text': query_text,
                'instance_id': instance_id,
                'status': 'pending'
            }
            response = self.supabase.table('search_queries').insert(data).execute()
            return response.data[0]['id'] if response.data else None
        except Exception as e:
            logger.error(f"Failed to create search query: {e}")
            return None
    
    def update_search_query(self, query_id: str, status: str, total_results: int = 0, 
                          error_message: str = None) -> bool:
        """Update search query status and results count"""
        try:
            data = {
                'status': status,
                'total_results': total_results
            }
            
            if status == 'completed':
                data['completed_at'] = datetime.utcnow().isoformat()
            
            if error_message:
                data['error_message'] = error_message
            
            self.supabase.table('search_queries').update(data).eq('id', query_id).execute()
            return True
        except Exception as e:
            logger.error(f"Failed to update search query: {e}")
            return False
    
    def store_search_results(self, query_id: str, results: List[SearchResult]) -> bool:
        """Store search results in the database"""
        try:
            # Convert SearchResult objects to dictionaries
            data_to_insert = []
            for result in results:
                result_dict = {
                    'query_id': query_id,
                    'title': result.title,
                    'url': result.url,
                    'description': result.description,
                    'domain': result.domain,
                    'engines': result.engines,
                    'cached_url': result.cached_url,
                    'position': result.position,
                    'page_number': result.page_number,
                    'is_file': result.is_file,
                    'file_type': result.file_type
                }
                data_to_insert.append(result_dict)
            
            # Insert in batches to avoid hitting limits
            batch_size = 100
            for i in range(0, len(data_to_insert), batch_size):
                batch = data_to_insert[i:i + batch_size]
                self.supabase.table('search_results').insert(batch).execute()
            
            logger.info(f"Stored {len(results)} search results for query {query_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to store search results: {e}")
            return False
    
    def search_results(self, search_term: str = None, domain: str = None, 
                      file_type: str = None, is_file: bool = None,
                      date_from: str = None, date_to: str = None,
                      limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        """Search and filter stored results with PGronga full-text search and date filtering"""
        try:
            # Apply full-text search if search_term is provided
            if search_term:
                try:
                    logger.info(f"Calling search_results_fulltext RPC with search_term: {search_term}")
                    # Use PGroonga full-text search function
                    response = self.supabase.rpc('search_results_fulltext', {
                        'search_term': search_term
                    }).execute()
                    
                    logger.info(f"RPC response: {response}")
                    logger.info(f"RPC response data: {response.data}")
                    
                    # Apply additional filters to the full-text search results
                    results = response.data
                except Exception as rpc_error:
                    logger.error(f"Error calling search_results_fulltext RPC: {rpc_error}")
                    # Fallback to regular query if RPC fails
                    query = self.supabase.table('search_results').select('*')
                    if search_term:
                        # Simple text search as fallback
                        query = query.or_(f'title.ilike.%{search_term}%,description.ilike.%{search_term}%,url.ilike.%{search_term}%')
                    response = query.execute()
                    results = response.data
                if domain:
                    results = [r for r in results if r.get('domain') == domain]
                if file_type:
                    results = [r for r in results if r.get('file_type') and r.get('file_type').lower() == file_type.lower()]
                if is_file is not None:
                    results = [r for r in results if r.get('is_file') == is_file]
                
                # Apply date filtering
                if date_from or date_to:
                    from datetime import datetime
                    filtered_results = []
                    for result in results:
                        result_date = result.get('created_at')
                        if result_date:
                            try:
                                if isinstance(result_date, str):
                                    result_datetime = datetime.fromisoformat(result_date.replace('Z', '+00:00'))
                                else:
                                    result_datetime = result_date
                                
                                if date_from:
                                    from_date = datetime.fromisoformat(date_from)
                                    if result_datetime < from_date:
                                        continue
                                
                                if date_to:
                                    to_date = datetime.fromisoformat(date_to)
                                    if result_datetime > to_date:
                                        continue
                                
                                filtered_results.append(result)
                            except (ValueError, TypeError):
                                continue
                    results = filtered_results
                
                # Apply pagination
                return results[offset:offset + limit]
            else:
                # Regular query without full-text search
                query = self.supabase.table('search_results').select('*')
                
                # Apply filters
                if domain:
                    query = query.eq('domain', domain)
                
                if file_type:
                    # Use ilike for case-insensitive comparison
                    query = query.ilike('file_type', file_type)
                
                if is_file is not None:
                    query = query.eq('is_file', is_file)
                
                # Apply date filtering at database level for better performance
                if date_from:
                    query = query.gte('created_at', date_from)
                
                if date_to:
                    query = query.lte('created_at', date_to)
                
                response = query.order('created_at', desc=True).limit(limit).offset(offset).execute()
                return response.data
            
        except Exception as e:
            logger.error(f"Failed to search results: {e}")
            return []
    
    def get_search_statistics(self) -> List[Dict[str, Any]]:
        """Get search statistics by instance"""
        try:
            response = self.supabase.table('search_statistics').select('*').execute()
            return response.data
        except Exception as e:
            logger.error(f"Failed to get search statistics: {e}")
            return []
    
    def get_recent_queries(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Get recent search queries with their results count"""
        try:
            # Get recent queries with instance info
            response = self.supabase.table('search_queries').select(
                '*, searxng_instances(name, url)'
            ).order('created_at', desc=True).limit(limit).execute()
            
            queries = response.data
            
            # For each query, get the actual count of results
            for query in queries:
                try:
                    count_response = self.supabase.table('search_results').select(
                        'id', count='exact'
                    ).eq('query_id', query['id']).execute()
                    
                    # Update the total_results with actual count
                    query['total_results'] = count_response.count if count_response.count is not None else 0
                except Exception as count_error:
                    logger.warning(f"Failed to get result count for query {query['id']}: {count_error}")
                    # Keep the original total_results value if count fails
                    pass
            
            return queries
        except Exception as e:
            logger.error(f"Failed to get recent queries: {e}")
            return []
    
    def get_file_types_summary(self) -> List[Dict[str, Any]]:
        """Get summary of file types found"""
        try:
            # Use RPC function for aggregation since Supabase client doesn't support GROUP BY
            response = self.supabase.rpc('get_file_types_summary').execute()
            return response.data if response.data else []
        except Exception as e:
            logger.error(f"Failed to get file types summary: {e}")
            # Fallback: get all file results and count manually
            try:
                response = self.supabase.table('search_results').select(
                    'file_type'
                ).eq('is_file', True).execute()
                
                # Count file types manually
                file_type_counts = {}
                for result in response.data:
                    file_type = result.get('file_type', 'unknown')
                    file_type_counts[file_type] = file_type_counts.get(file_type, 0) + 1
                
                # Convert to expected format
                return [{'file_type': ft, 'count': count} for ft, count in file_type_counts.items()]
            except Exception as fallback_e:
                logger.error(f"Fallback file types summary also failed: {fallback_e}")
                return []
    
    def get_top_domains(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Get top domains by result count"""
        try:
            # Use RPC function for aggregation since Supabase client doesn't support GROUP BY
            response = self.supabase.rpc('get_top_domains', {'domain_limit': limit}).execute()
            return response.data if response.data else []
        except Exception as e:
            logger.error(f"Failed to get top domains: {e}")
            # Fallback: get all domains and count manually
            try:
                response = self.supabase.table('search_results').select(
                    'domain'
                ).execute()
                
                # Count domains manually
                domain_counts = {}
                for result in response.data:
                    domain = result.get('domain', 'unknown')
                    domain_counts[domain] = domain_counts.get(domain, 0) + 1
                
                # Convert to expected format and sort by count
                domain_list = [{'domain': domain, 'count': count} for domain, count in domain_counts.items()]
                domain_list.sort(key=lambda x: x['count'], reverse=True)
                
                return domain_list[:limit]
            except Exception as fallback_e:
                logger.error(f"Fallback top domains also failed: {fallback_e}")
                return []
    
    def advanced_search(self, search_term: str, search_type: str = 'all', 
                       domain: str = None, file_type: str = None, 
                       is_file: bool = None, limit: int = 50, 
                       offset: int = 0) -> List[Dict[str, Any]]:
        """Advanced full-text search with different search types"""
        try:
            # Prepare search term based on search type
            if search_type == 'exact':
                # Exact phrase search
                formatted_term = f'"{search_term}"'
            elif search_type == 'any':
                # Any word search (OR)
                words = search_term.split()
                formatted_term = ' OR '.join(words)
            elif search_type == 'all':
                # All words search (AND)
                words = search_term.split()
                formatted_term = ' AND '.join(words)
            elif search_type == 'wildcard':
                # Wildcard search
                formatted_term = f'{search_term}*'
            else:
                # Default to regular search
                formatted_term = search_term
            
            # Use PGroonga full-text search function
            response = self.supabase.rpc('search_results_fulltext', {
                'search_term': formatted_term
            }).execute()
            
            # Apply additional filters
            results = response.data
            if domain:
                results = [r for r in results if r.get('domain') == domain]
            if file_type:
                results = [r for r in results if r.get('file_type') and r.get('file_type').lower() == file_type.lower()]
            if is_file is not None:
                results = [r for r in results if r.get('is_file') == is_file]
            
            # Apply pagination
            return results[offset:offset + limit]
            
        except Exception as e:
            logger.error(f"Failed to perform advanced search: {e}")
            return []
    
    def search_suggestions(self, partial_term: str, limit: int = 10) -> List[str]:
        """Get search suggestions based on partial term"""
        try:
            # Search for similar terms in titles and descriptions
            response = self.supabase.table('search_results').select(
                'title, description'
            ).ilike('title', f'%{partial_term}%').limit(limit * 2).execute()
            
            suggestions = set()
            for result in response.data:
                title = result.get('title', '')
                description = result.get('description', '')
                
                # Extract words that contain the partial term
                for text in [title, description]:
                    if text:
                        words = text.lower().split()
                        for word in words:
                            if partial_term.lower() in word and len(word) > len(partial_term):
                                suggestions.add(word)
                                if len(suggestions) >= limit:
                                    break
                    if len(suggestions) >= limit:
                        break
                if len(suggestions) >= limit:
                    break
            
            return list(suggestions)[:limit]
            
        except Exception as e:
            logger.error(f"Failed to get search suggestions: {e}")
            return []
    
    def get_search_analytics(self, days: int = 30) -> Dict[str, Any]:
        """Get search analytics for the specified number of days"""
        try:
            from datetime import timedelta
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            # Get query statistics
            query_stats = self.supabase.table('search_queries').select(
                'status, created_at'
            ).gte('created_at', cutoff_date.isoformat()).execute()
            
            # Get result statistics
            result_stats = self.supabase.table('search_results').select(
                'is_file, file_type, domain, created_at'
            ).gte('created_at', cutoff_date.isoformat()).execute()
            
            # Process statistics
            total_queries = len(query_stats.data)
            successful_queries = len([q for q in query_stats.data if q['status'] == 'completed'])
            failed_queries = len([q for q in query_stats.data if q['status'] == 'failed'])
            
            total_results = len(result_stats.data)
            file_results = len([r for r in result_stats.data if r['is_file']])
            
            # File type distribution
            file_types = {}
            for result in result_stats.data:
                if result['is_file'] and result['file_type']:
                    file_types[result['file_type']] = file_types.get(result['file_type'], 0) + 1
            
            # Domain distribution
            domains = {}
            for result in result_stats.data:
                if result['domain']:
                    domains[result['domain']] = domains.get(result['domain'], 0) + 1
            
            return {
                'period_days': days,
                'total_queries': total_queries,
                'successful_queries': successful_queries,
                'failed_queries': failed_queries,
                'success_rate': (successful_queries / total_queries * 100) if total_queries > 0 else 0,
                'total_results': total_results,
                'file_results': file_results,
                'file_percentage': (file_results / total_results * 100) if total_results > 0 else 0,
                'top_file_types': sorted(file_types.items(), key=lambda x: x[1], reverse=True)[:10],
                'top_domains': sorted(domains.items(), key=lambda x: x[1], reverse=True)[:10]
            }
            
        except Exception as e:
            logger.error(f"Failed to get search analytics: {e}")
            return {}
    
    def get_daily_search_activity(self, days: int = 30) -> List[Dict[str, Any]]:
        """Get daily search activity data for time series charts"""
        try:
            from datetime import timedelta, date
            from collections import defaultdict
            
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            # Get query statistics grouped by date
            query_stats = self.supabase.table('search_queries').select(
                'id, created_at, total_results'
            ).gte('created_at', cutoff_date.isoformat()).execute()
            
            # Group data by date
            daily_data = defaultdict(lambda: {'searches': 0, 'results': 0})
            
            for query in query_stats.data:
                query_date = datetime.fromisoformat(query['created_at'].replace('Z', '+00:00')).date()
                date_str = query_date.strftime('%Y-%m-%d')
                daily_data[date_str]['searches'] += 1
                
                # Get actual result count from search_results table
                try:
                    count_response = self.supabase.table('search_results').select(
                        'id', count='exact'
                    ).eq('query_id', query['id']).execute()
                    actual_results = count_response.count if count_response.count is not None else 0
                    daily_data[date_str]['results'] += actual_results
                except Exception as count_error:
                    # Fallback to stored total_results if count fails
                    daily_data[date_str]['results'] += query.get('total_results', 0) or 0
            
            # Create time series data for the last N days
            time_series = []
            for i in range(days):
                current_date = (datetime.utcnow() - timedelta(days=days-1-i)).date()
                date_str = current_date.strftime('%Y-%m-%d')
                
                time_series.append({
                    'date': date_str,
                    'searches': daily_data[date_str]['searches'],
                    'results': daily_data[date_str]['results']
                })
            
            return time_series
            
        except Exception as e:
            logger.error(f"Failed to get daily search activity: {e}")
            return []
    
    def delete_old_results(self, days_old: int = 30) -> bool:
        """Delete search results older than specified days"""
        try:
            from datetime import timedelta
            # Calculate the cutoff date
            cutoff_date = datetime.utcnow() - timedelta(days=days_old)
            
            # Delete old search results
            self.supabase.table('search_results').delete().lt(
                'created_at', cutoff_date.isoformat()
            ).execute()
            
            # Delete old search queries that have no results
            self.supabase.table('search_queries').delete().lt(
                'created_at', cutoff_date.isoformat()
            ).execute()
            
            logger.info(f"Deleted search results older than {days_old} days")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete old results: {e}")
            return False
    
    def test_connection(self) -> bool:
        """Test database connection"""
        try:
            response = self.supabase.table('searxng_instances').select('count', count='exact').execute()
            logger.info("Database connection successful")
            return True
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            return False

# Example usage and testing
if __name__ == "__main__":
    # Test database operations
    try:
        db = DatabaseOperations()
        
        # Test connection
        if db.test_connection():
            print("✓ Database connection successful")
            
            # Get active instances
            instances = db.get_active_instances()
            print(f"✓ Found {len(instances)} active instances")
            
            # Get recent queries
            queries = db.get_recent_queries(5)
            print(f"✓ Found {len(queries)} recent queries")
            
            # Get statistics
            stats = db.get_search_statistics()
            print(f"✓ Retrieved statistics for {len(stats)} instances")
            
        else:
            print("✗ Database connection failed")
            
    except Exception as e:
        print(f"✗ Error testing database operations: {e}")
        print("Make sure to set SUPABASE_URL and SUPABASE_ANON_KEY environment variables")