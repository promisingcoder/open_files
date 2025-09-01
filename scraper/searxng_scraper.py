import asyncio
import aiohttp
import time
import re
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse, quote_plus
from typing import List, Dict, Optional, Tuple, AsyncGenerator
import logging
from dataclasses import dataclass, asdict, field
from datetime import datetime
import json

try:
    from config.settings import get_config, SearxngInstanceConfig
except ImportError:
    # Fallback for testing without config module
    @dataclass
    class SearxngInstanceConfig:
        name: str = "default"
        url: str = "https://search.bus-hit.me"
        is_active: bool = True
        timeout: int = 30
        rate_limit_delay: float = 1.0
        custom_headers: Dict[str, str] = field(default_factory=dict)
    
    def get_config():
        return type('Config', (), {
            'scraper': type('Scraper', (), {
                'max_pages': 3,
                'concurrent_requests': 5,
                'timeout': 30,
                'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })()
        })()

logger = logging.getLogger(__name__)

@dataclass
class SearchResult:
    """Data class for search results"""
    title: str
    url: str
    description: str
    domain: str
    engines: List[str]
    cached_url: Optional[str] = None
    position: int = 0
    page_number: int = 1
    is_file: bool = False
    file_type: Optional[str] = None
    is_google_doc: bool = False
    is_google_drive: bool = False
    score: float = 0.0
    category: str = 'general'
    engine: str = ''
    thumbnail: Optional[str] = None
    publishedDate: Optional[str] = None
    fileSize: Optional[str] = None
    
    def __post_init__(self):
        # Detect Google Docs/Drive
        if self.url:
            self.is_google_doc = 'docs.google.com' in self.url
            self.is_google_drive = 'drive.google.com' in self.url or 'docs.google.com' in self.url
            
        # Extract file type if not already set
        if not self.file_type and self.url:
            self.is_file, self.file_type = self._identify_file_type()
            
    def _identify_file_type(self) -> Tuple[bool, Optional[str]]:
        """Identify if this is a file and what type"""
        file_extensions = {
            'pdf': 'PDF', 'doc': 'DOC', 'docx': 'DOCX',
            'xls': 'XLS', 'xlsx': 'XLSX', 'ppt': 'PPT', 'pptx': 'PPTX',
            'txt': 'TXT', 'rtf': 'RTF', 'csv': 'CSV',
            'odt': 'ODT', 'ods': 'ODS', 'odp': 'ODP',
            'zip': 'ZIP', 'rar': 'RAR', '7z': '7Z'
        }
        
        url_lower = self.url.lower()
        title_lower = self.title.lower()
        
        for ext, file_type in file_extensions.items():
            if f'.{ext}' in url_lower or f'.{ext}' in title_lower:
                return True, file_type
                
        # Special cases for Google services
        if self.is_google_doc:
            if '/document/' in self.url:
                return True, 'Google Doc'
            elif '/spreadsheets/' in self.url:
                return True, 'Google Sheets'
            elif '/presentation/' in self.url:
                return True, 'Google Slides'
            elif '/forms/' in self.url:
                return True, 'Google Forms'
                
        if self.is_google_drive:
            return True, 'Google Drive'
            
        return False, None

@dataclass
class SearchQuery:
    """Represents a search query with parameters"""
    query: str
    language: str = 'en'
    safesearch: int = 1
    time_range: Optional[str] = None
    categories: Optional[List[str]] = None
    engines: Optional[List[str]] = None
    format: str = 'html'
    pageno: int = 1
    
    def to_params(self) -> Dict[str, str]:
        """Convert to URL parameters"""
        params = {
            'q': self.query,
            'language': self.language,
            'safesearch': str(self.safesearch),
            'pageno': str(self.pageno)
        }
        
        if self.time_range:
            params['time_range'] = self.time_range
        else:
            params['time_range'] = ''
            
        # Add category_general for general searches
        params['category_general'] = '1'
        
        # Add theme parameter
        params['theme'] = 'simple'
            
        if self.categories:
            params['categories'] = ','.join(self.categories)
            
        if self.engines:
            params['engines'] = ','.join(self.engines)
            
        return params
    
    def to_form_data(self) -> Dict[str, str]:
        """Convert to form data for POST requests"""
        form_data = {
            'q': self.query,
            'category_general': '1',
            'pageno': str(self.pageno),
            'language': self.language,
            'time_range': self.time_range or '',
            'safesearch': str(self.safesearch),
            'theme': 'simple'
        }
        return form_data

class SearxngScraper:
    """Async scraper for Searxng instances"""
    
    def __init__(self):
        self.config = get_config()
        self.session: Optional[aiohttp.ClientSession] = None
        self.stats = {
            'total_queries': 0,
            'successful_queries': 0,
            'failed_queries': 0,
            'total_results': 0,
            'instance_stats': {},
            'last_reset': datetime.now()
        }
        
    async def __aenter__(self):
        await self.start_session()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close_session()
        
    async def start_session(self) -> None:
        """Start the HTTP session"""
        if self.session is None or self.session.closed:
            timeout = aiohttp.ClientTimeout(total=self.config.scraper.timeout)
            connector = aiohttp.TCPConnector(
                limit=self.config.scraper.concurrent_requests * 2,
                limit_per_host=self.config.scraper.concurrent_requests
            )
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Cache-Control': 'max-age=0',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'sec-ch-ua': '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
                'sec-ch-ua-mobile': '?1',
                'sec-ch-ua-platform': '"Android"',
                'sec-fetch-dest': 'document',
                'sec-fetch-mode': 'navigate',
                'sec-fetch-site': 'same-origin',
                'sec-fetch-user': '?1',
                'priority': 'u=0, i'
            }
            
            self.session = aiohttp.ClientSession(
                timeout=timeout,
                connector=connector,
                headers=headers
            )
        
        # File extensions to identify files
        self.file_extensions = {
            'pdf': 'pdf',
            'doc': 'document', 'docx': 'document', 'odt': 'document',
            'xls': 'spreadsheet', 'xlsx': 'spreadsheet', 'ods': 'spreadsheet',
            'ppt': 'presentation', 'pptx': 'presentation', 'odp': 'presentation',
            'txt': 'text', 'rtf': 'text',
            'zip': 'archive', 'rar': 'archive', '7z': 'archive',
            'mp3': 'audio', 'wav': 'audio', 'flac': 'audio',
            'mp4': 'video', 'avi': 'video', 'mkv': 'video',
            'jpg': 'image', 'jpeg': 'image', 'png': 'image', 'gif': 'image'
        }
        
        # Patterns to identify Google Drive and Docs links
        self.google_patterns = [
            r'docs\.google\.com',
            r'drive\.google\.com',
            r'sheets\.google\.com',
            r'slides\.google\.com',
            r'forms\.google\.com'
        ]
    
    async def close_session(self) -> None:
        """Close the HTTP session"""
        if self.session and not self.session.closed:
            await self.session.close()
    
    async def _get_initial_page(self, instance_url: str) -> Optional[str]:
        """Get the initial page to extract CSRF tokens if needed"""
        try:
            await self.start_session()
            async with self.session.get(instance_url) as response:
                if response.status == 200:
                    return await response.text()
                else:
                    logger.error(f"HTTP {response.status} from {instance_url}")
                    return None
        except Exception as e:
            logger.error(f"Failed to get initial page from {instance_url}: {e}")
            return None
    
    def _extract_csrf_token(self, html: str) -> Optional[str]:
        """Extract CSRF token if present in the HTML"""
        soup = BeautifulSoup(html, 'html.parser')
        csrf_input = soup.find('input', {'name': 'csrf_token'})
        if csrf_input:
            return csrf_input.get('value')
        return None
    
    async def test_instance(self, instance: SearxngInstanceConfig) -> Tuple[bool, Optional[str], Optional[Dict]]:
        """Test if a Searxng instance is working"""
        try:
            await self.start_session()
            
            # Test with a simple query
            test_query = SearchQuery(query='test', pageno=1)
            url = urljoin(instance.url, '/search')
            
            headers = instance.custom_headers.copy() if instance.custom_headers else {}
            
            async with self.session.get(
                url,
                params=test_query.to_params(),
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=instance.timeout)
            ) as response:
                if response.status == 200:
                    html = await response.text()
                    # Check if we got valid search results
                    if 'id="results"' in html or 'class="result"' in html:
                        return True, None, {'status': 'working'}
                    else:
                        return False, "No search results container found", None
                else:
                    return False, f"HTTP {response.status}", None
                    
        except asyncio.TimeoutError:
            return False, "Timeout", None
        except Exception as e:
            return False, str(e), None
    
    def _identify_file_type(self, url: str, title: str) -> Tuple[bool, Optional[str]]:
        """Identify if the result is a file and its type"""
        # Check URL for file extensions
        url_lower = url.lower()
        for ext, file_type in self.file_extensions.items():
            if f'.{ext}' in url_lower:
                return True, file_type
        
        # Check for Google Drive/Docs patterns
        for pattern in self.google_patterns:
            if re.search(pattern, url_lower):
                if 'docs.google.com' in url_lower:
                    return True, 'google_doc'
                elif 'sheets.google.com' in url_lower:
                    return True, 'google_sheet'
                elif 'slides.google.com' in url_lower:
                    return True, 'google_slides'
                elif 'drive.google.com' in url_lower:
                    return True, 'google_drive'
                elif 'forms.google.com' in url_lower:
                    return True, 'google_form'
        
        # Check title for file indicators
        title_lower = title.lower()
        if any(word in title_lower for word in ['[pdf]', '[doc]', '[xls]', 'filetype:', 'download']):
            return True, 'unknown'
        
        return False, None
    
    async def search_instance(
        self,
        instance: SearxngInstanceConfig,
        query: SearchQuery,
        max_pages: Optional[int] = None
    ) -> AsyncGenerator[SearchResult, None]:
        """Search a single Searxng instance using GET for first page, POST for subsequent pages"""
        if not instance.is_active:
            logger.warning(f"Instance {instance.name} is not active")
            return
            
        await self.start_session()
        
        max_pages = max_pages or self.config.scraper.max_pages
        instance_key = f"{instance.name}_{instance.url}"
        
        if instance_key not in self.stats['instance_stats']:
            self.stats['instance_stats'][instance_key] = {
                'queries': 0,
                'results': 0,
                'errors': 0,
                'avg_response_time': 0.0
            }
            
        page = 1
        while page <= max_pages:
            try:
                query.pageno = page
                start_time = time.time()
                
                url = urljoin(instance.url, '/search')
                
                logger.debug(f"Searching {instance.name} - Page {page} - Query: {query.query}")
                
                if page == 1:
                    # First page: GET request with URL parameters
                    headers = {
                        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                        'accept-language': 'en-US,en;q=0.9,ar;q=0.8',
                        'cache-control': 'max-age=0',
                        'priority': 'u=0, i',
                        'sec-ch-ua': '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
                        'sec-ch-ua-mobile': '?1',
                        'sec-ch-ua-platform': '"Android"',
                        'sec-fetch-dest': 'document',
                        'sec-fetch-mode': 'navigate',
                        'sec-fetch-site': 'same-origin',
                        'sec-fetch-user': '?1',
                        'upgrade-insecure-requests': '1',
                        'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36'
                    }
                    
                    async with self.session.get(
                        url,
                        params=query.to_params(),
                        headers=headers,
                        timeout=aiohttp.ClientTimeout(total=instance.timeout)
                    ) as response:
                        response_time = time.time() - start_time
                        
                        if response.status != 200:
                            logger.error(f"HTTP {response.status} from {instance.name}")
                            self.stats['instance_stats'][instance_key]['errors'] += 1
                            break
                            
                        html = await response.text()
                else:
                    # Subsequent pages: POST request with multipart form data
                    headers = {
                        'Accept': '*/*',
                        'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
                        'Connection': 'keep-alive',
                        'Origin': instance.url,
                        'Sec-Fetch-Dest': 'empty',
                        'Sec-Fetch-Mode': 'cors',
                        'Sec-Fetch-Site': 'same-origin',
                        'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
                        'sec-ch-ua': '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
                        'sec-ch-ua-mobile': '?1',
                        'sec-ch-ua-platform': '"Android"'
                    }
                    
                    # Create multipart form data
                    form_data = aiohttp.FormData()
                    form_fields = query.to_form_data()
                    
                    for field_name, field_value in form_fields.items():
                        form_data.add_field(field_name, field_value)
                    
                    async with self.session.post(
                        url,
                        data=form_data,
                        headers=headers,
                        timeout=aiohttp.ClientTimeout(total=instance.timeout)
                    ) as response:
                        response_time = time.time() - start_time
                        
                        if response.status != 200:
                            logger.error(f"HTTP {response.status} from {instance.name}")
                            self.stats['instance_stats'][instance_key]['errors'] += 1
                            break
                            
                        html = await response.text()
                
                # Update stats
                self.stats['instance_stats'][instance_key]['queries'] += 1
                current_avg = self.stats['instance_stats'][instance_key]['avg_response_time']
                queries_count = self.stats['instance_stats'][instance_key]['queries']
                self.stats['instance_stats'][instance_key]['avg_response_time'] = (
                    (current_avg * (queries_count - 1) + response_time) / queries_count
                )
                
                # Parse results
                results = self._parse_results(html, page)
                if not results:
                    logger.debug(f"No results on page {page} from {instance.name} - stopping pagination")
                    break
                    
                for result in results:
                    yield result
                    self.stats['total_results'] += 1
                    self.stats['instance_stats'][instance_key]['results'] += 1
                    
                logger.debug(f"Got {len(results)} results from {instance.name} page {page}")
                
                # Continue to next page
                page += 1
                
                # Rate limiting
                if page <= max_pages:
                    await asyncio.sleep(instance.rate_limit_delay)
                    
            except asyncio.TimeoutError:
                logger.error(f"Timeout searching {instance.name} page {page}")
                self.stats['instance_stats'][instance_key]['errors'] += 1
                break
            except Exception as e:
                logger.error(f"Error searching {instance.name} page {page}: {e}")
                self.stats['instance_stats'][instance_key]['errors'] += 1
                break
    
    def _parse_results(self, html: str, page_number: int) -> List[SearchResult]:
        """Parse search results from HTML based on example_html_of_result.txt"""
        soup = BeautifulSoup(html, 'html.parser')
        results = []
        
        # Find all result articles based on the example HTML structure
        result_articles = soup.find_all('article', class_='result')
        
        for position, article in enumerate(result_articles, 1):
            try:
                # Extract title and URL from h3 > a
                title_link = article.find('h3')
                if not title_link:
                    continue
                
                link_element = title_link.find('a')
                if not link_element:
                    continue
                
                title = link_element.get_text(strip=True)
                url = link_element.get('href', '')
                
                # Skip if no title or URL
                if not title or not url:
                    continue
                
                # Extract description from p tag
                description_element = article.find('p')
                description = description_element.get_text(strip=True) if description_element else ''
                
                # Extract domain from URL
                try:
                    parsed_url = urlparse(url)
                    domain = parsed_url.netloc
                except:
                    domain = ''
                
                # Extract engines information
                engines = []
                engines_element = article.find('div', class_='engines')
                if engines_element:
                    engine_spans = engines_element.find_all('span')
                    engines = [span.get_text(strip=True) for span in engine_spans]
                
                # Check for cached URL
                cached_url = None
                cached_link = article.find('a', string=re.compile(r'cached', re.I))
                if cached_link:
                    cached_url = cached_link.get('href')
                
                # Identify if this is a file
                is_file, file_type = self._identify_file_type(url, title)
                
                result = SearchResult(
                    title=title,
                    url=url,
                    description=description,
                    domain=domain,
                    engines=engines,
                    cached_url=cached_url,
                    position=position,
                    page_number=page_number,
                    is_file=is_file,
                    file_type=file_type
                )
                
                results.append(result)
                
            except Exception as e:
                logger.warning(f"Failed to parse result: {e}")
                continue
        
        logger.info(f"Parsed {len(results)} results from page {page_number}")
        return results
    
    async def search_multiple_instances(
        self,
        instances: List[SearxngInstanceConfig],
        query: SearchQuery,
        max_pages: Optional[int] = None
    ) -> AsyncGenerator[SearchResult, None]:
        """Search multiple Searxng instances concurrently"""
        active_instances = [inst for inst in instances if inst.is_active]
        
        if not active_instances:
            logger.warning("No active instances available for search")
            return
            
        logger.info(f"Starting search across {len(active_instances)} instances for query: {query.query}")
        
        # Create semaphore to limit concurrent requests
        semaphore = asyncio.Semaphore(self.config.scraper.concurrent_requests)
        
        async def search_with_semaphore(instance: SearxngInstanceConfig):
            async with semaphore:
                async for result in self.search_instance(instance, query, max_pages):
                    yield result
        
        # Start all searches concurrently
        tasks = [search_with_semaphore(instance) for instance in active_instances]
        
        # Collect results as they come in
        async for task in asyncio.as_completed(tasks):
            async for result in await task:
                yield result
                
        self.stats['total_queries'] += 1
        logger.info(f"Completed search for query: {query.query}")

    async def get_search_suggestions(self, query: str, instance: SearxngInstanceConfig) -> List[str]:
        """Get search suggestions from a Searxng instance"""
        try:
            await self.start_session()
            
            url = urljoin(instance.url, '/autocompleter')
            params = {'q': query}
            
            async with self.session.get(
                url,
                params=params,
                timeout=aiohttp.ClientTimeout(total=5)
            ) as response:
                if response.status == 200:
                    suggestions = await response.json()
                    return [s for s in suggestions if isinstance(s, str)]
                else:
                    return []
                    
        except Exception as e:
            logger.error(f"Failed to get suggestions from {instance.name}: {e}")
            return []
    
    def get_stats(self) -> Dict:
        """Get scraper statistics"""
        return self.stats.copy()
    
    def reset_stats(self) -> None:
        """Reset scraper statistics"""
        self.stats = {
            'total_queries': 0,
            'successful_queries': 0,
            'failed_queries': 0,
            'total_results': 0,
            'instance_stats': {},
            'last_reset': datetime.now()
        }

# Example usage and testing
if __name__ == "__main__":
    import asyncio
    from config.settings import ConfigManager
    
    async def test_scraper():
        # Load configuration
        config_manager = ConfigManager()
        config = config_manager.get_config()
        
        # Create scraper
        scraper = SearxngScraper()
        
        try:
            # Test queries from the examples
            test_queries = [
                SearchQuery(query="site:docs.google.com filetype:pdf", language="en"),
                SearchQuery(query="site:drive.google.com", language="en"), 
                SearchQuery(query='intitle:"index of" parent directory', language="en"),
                SearchQuery(query="open directory listing", language="en")
            ]
            
            # Get active instances
            instances = config_manager.get_active_instances()
            if not instances:
                print("No active instances configured. Please add some instances first.")
                return
            
            for query in test_queries:
                print(f"\n=== Testing query: {query.query} ===")
                
                results = []
                async for result in scraper.search_multiple_instances(instances, query, max_pages=2):
                    results.append(result)
                    if len(results) >= 10:  # Limit for testing
                        break
                
                print(f"Found {len(results)} results:")
                for i, result in enumerate(results[:5], 1):  # Show first 5 results
                    print(f"{i}. {result.title}")
                    print(f"   URL: {result.url}")
                    print(f"   Domain: {result.domain}")
                    print(f"   File: {result.is_file} ({result.file_type})")
                    print(f"   Google Doc: {result.is_google_doc}")
                    print(f"   Google Drive: {result.is_google_drive}")
                    print()
                    
            # Print stats
            print("\n=== Scraper Statistics ===")
            stats = scraper.get_stats()
            print(f"Total queries: {stats['total_queries']}")
            print(f"Total results: {stats['total_results']}")
            
            for instance_key, instance_stats in stats['instance_stats'].items():
                print(f"\nInstance: {instance_key}")
                print(f"  Queries: {instance_stats['queries']}")
                print(f"  Results: {instance_stats['results']}")
                print(f"  Errors: {instance_stats['errors']}")
                print(f"  Avg Response Time: {instance_stats['avg_response_time']:.2f}s")
                
        finally:
            await scraper.close_session()
    
    # Run the test
    asyncio.run(test_scraper())