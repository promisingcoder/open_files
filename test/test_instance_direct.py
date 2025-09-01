import asyncio
import sys
sys.path.append('.')
from scraper.searxng_scraper import SearxngScraper, SearchQuery, SearxngInstanceConfig
import logging

# Enable debug logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

async def test_instance_direct():
    scraper = SearxngScraper()
    await scraper.start_session()
    
    # Test ooglester directly
    url = "https://ooglester.com/"
    query = "python tutorial"
    
    try:
        print(f"Testing {url} with query '{query}'...")
        # Create instance config and search query
        instance_config = SearxngInstanceConfig(
            name="ooglester",
            url=url,
            is_active=True,
            timeout=30,
            rate_limit_delay=1.0
        )
        
        search_query = SearchQuery(
            query=query,
            language="en",
            safesearch=1,
            pageno=1
        )
        
        results = []
        async for result in scraper.search_instance(instance_config, search_query, max_pages=1):
            results.append(result)
        print(f"Results found: {len(results)}")
        
        if results:
            for i, result in enumerate(results[:3]):
                print(f"Result {i+1}:")
                print(f"  Title: {result.get('title', 'N/A')}")
                print(f"  URL: {result.get('url', 'N/A')}")
                print(f"  Description: {result.get('description', 'N/A')[:100]}...")
                print()
        else:
            print("No results found")
            
    except Exception as e:
        print(f"Error testing {url}: {str(e)}")
        import traceback
        traceback.print_exc()
    
    await scraper.close_session()

if __name__ == "__main__":
    asyncio.run(test_instance_direct())