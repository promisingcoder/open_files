#!/usr/bin/env python3
"""
Test script for the updated SearXNG scraper with curl-like requests
"""

import asyncio
import sys
import os

# Add the project directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from scraper.searxng_scraper import SearxngScraper, SearchQuery, SearxngInstanceConfig
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def test_scraper():
    """Test the scraper with the new request patterns"""
    
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
        query="s",  # Using 's' as in the curl example
        language="en",
        safesearch=1,
        time_range=""
    )
    
    logger.info(f"Testing scraper with query: '{search_query.query}'")
    logger.info(f"Instance: {test_instance.name} ({test_instance.url})")
    
    async with SearxngScraper() as scraper:
        try:
            result_count = 0
            page_count = 0
            current_page = 0
            
            async for result in scraper.search_instance(test_instance, search_query, max_pages=5):
                if result.page_number != current_page:
                    current_page = result.page_number
                    page_count += 1
                    logger.info(f"\n--- Page {current_page} Results ---")
                
                result_count += 1
                logger.info(f"Result {result_count}: {result.title[:50]}... - {result.url}")
                
                # Limit output for testing
                if result_count >= 20:
                    logger.info("Stopping after 20 results for testing...")
                    break
            
            logger.info(f"\n=== Test Summary ===")
            logger.info(f"Total results found: {result_count}")
            logger.info(f"Pages scraped: {page_count}")
            
            # Print stats
            stats = scraper.get_stats()
            logger.info(f"Scraper stats: {stats}")
            
        except Exception as e:
            logger.error(f"Error during scraping: {e}")
            raise

if __name__ == "__main__":
    asyncio.run(test_scraper())