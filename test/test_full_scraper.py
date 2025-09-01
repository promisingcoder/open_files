#!/usr/bin/env python3
"""
Full test script for the updated SearXNG scraper - scrapes until no more results
"""

import asyncio
import sys
import os

# Add the project directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from scraper.searxng_scraper import SearxngScraper, SearchQuery, SearxngInstanceConfig
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def test_full_scraper():
    """Test the scraper until no more results are found"""
    
    # Create a test instance (using priv.au from the curl examples)
    test_instance = SearxngInstanceConfig(
        name="priv_au",
        url="https://priv.au",
        is_active=True,
        timeout=30,
        rate_limit_delay=1.0
    )
    
    # Create a search query
    search_query = SearchQuery(
        query="python programming",  # More specific query to get more results
        language="en",
        safesearch=1,
        time_range=""
    )
    
    logger.info(f"Testing full scraper with query: '{search_query.query}'")
    logger.info(f"Instance: {test_instance.name} ({test_instance.url})")
    logger.info("Scraping until no more results are found...")
    
    async with SearxngScraper() as scraper:
        try:
            result_count = 0
            page_count = 0
            current_page = 0
            results_per_page = {}
            
            async for result in scraper.search_instance(test_instance, search_query, max_pages=20):
                if result.page_number != current_page:
                    if current_page > 0:
                        logger.info(f"Page {current_page}: {results_per_page.get(current_page, 0)} results")
                    
                    current_page = result.page_number
                    page_count += 1
                    results_per_page[current_page] = 0
                    logger.info(f"\n--- Starting Page {current_page} ---")
                
                result_count += 1
                results_per_page[current_page] += 1
                
                # Log every 10th result to avoid spam
                if result_count % 10 == 0:
                    logger.info(f"Result {result_count}: {result.title[:60]}...")
            
            # Log final page results
            if current_page > 0:
                logger.info(f"Page {current_page}: {results_per_page.get(current_page, 0)} results")
            
            logger.info(f"\n=== Full Scraping Summary ===")
            logger.info(f"Total results found: {result_count}")
            logger.info(f"Total pages scraped: {page_count}")
            
            # Show results per page
            for page_num in sorted(results_per_page.keys()):
                logger.info(f"  Page {page_num}: {results_per_page[page_num]} results")
            
            # Print stats
            stats = scraper.get_stats()
            logger.info(f"\nScraper performance stats:")
            logger.info(f"  Average response time: {stats['instance_stats'][f'{test_instance.name}_{test_instance.url}']['avg_response_time']:.2f}s")
            logger.info(f"  Total queries: {stats['instance_stats'][f'{test_instance.name}_{test_instance.url}']['queries']}")
            logger.info(f"  Errors: {stats['instance_stats'][f'{test_instance.name}_{test_instance.url}']['errors']}")
            
        except Exception as e:
            logger.error(f"Error during scraping: {e}")
            raise

if __name__ == "__main__":
    asyncio.run(test_full_scraper())