#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from scraper.searxng_scraper import SearxngScraper

async def test_html_parser():
    """Test the HTML parser with sample HTML"""
    
    # Read the sample HTML
    with open('example_html_of_result.txt', 'r', encoding='utf-8') as f:
        sample_html = f.read()
    
    # Create scraper instance and start session
    scraper = SearxngScraper()
    await scraper.start_session()
    
    # Test the parser
    results = scraper._parse_results(sample_html, 1)
    
    # Close session
    await scraper.close_session()
    
    print(f"Parsed {len(results)} results:")
    for i, result in enumerate(results, 1):
        print(f"\nResult {i}:")
        print(f"  Title: {result.title}")
        print(f"  URL: {result.url}")
        print(f"  Description: {result.description}")
        print(f"  Domain: {result.domain}")
        print(f"  Is File: {result.is_file}")
        print(f"  File Type: {result.file_type}")
        print(f"  Engines: {result.engines}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_html_parser())