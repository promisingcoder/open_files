#!/usr/bin/env python3
"""
Script to check what search results are stored in the database
"""

import sys
import os
from datetime import datetime

# Add the project root to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.db_operations import DatabaseOperations

def main():
    try:
        print("Connecting to database...")
        db = DatabaseOperations()
        
        # Test connection
        if not db.test_connection():
            print("❌ Database connection failed")
            return
        
        print("✅ Database connection successful\n")
        
        # Get recent queries
        print("=== RECENT SEARCH QUERIES ===")
        recent_queries = db.get_recent_queries(10)
        if recent_queries:
            for i, query in enumerate(recent_queries, 1):
                print(f"{i}. Query: '{query.get('query_text', 'N/A')}'")
                print(f"   Status: {query.get('status', 'N/A')}")
                print(f"   Results: {query.get('total_results', 0)}")
                print(f"   Created: {query.get('created_at', 'N/A')}")
                print(f"   Instance: {query.get('searxng_instances', {}).get('name', 'N/A')}")
                print()
        else:
            print("No recent queries found.\n")
        
        # Get search statistics
        print("=== SEARCH STATISTICS ===")
        stats = db.get_search_statistics()
        if stats:
            for stat in stats:
                print(f"Instance: {stat.get('instance_name', 'N/A')}")
                print(f"  Total queries: {stat.get('total_queries', 0)}")
                print(f"  Completed: {stat.get('completed_queries', 0)}")
                print(f"  Failed: {stat.get('failed_queries', 0)}")
                print(f"  Total results: {stat.get('total_results', 0)}")
                print(f"  File results: {stat.get('file_results', 0)}")
                print()
        else:
            print("No statistics found.\n")
        
        # Get some sample search results
        print("=== SAMPLE SEARCH RESULTS ===")
        sample_results = db.search_results(limit=5)
        if sample_results:
            for i, result in enumerate(sample_results, 1):
                print(f"{i}. Title: {result.get('title', 'N/A')[:80]}...")
                print(f"   URL: {result.get('url', 'N/A')}")
                print(f"   Domain: {result.get('domain', 'N/A')}")
                print(f"   Engines: {result.get('engines', [])}")
                print(f"   Created: {result.get('created_at', 'N/A')}")
                print()
        else:
            print("No search results found.\n")
        
        # Get file types summary
        print("=== FILE TYPES SUMMARY ===")
        file_types = db.get_file_types_summary()
        if file_types:
            for ft in file_types:
                print(f"  {ft.get('file_type', 'N/A')}: {ft.get('count', 0)} files")
        else:
            print("No file types found.\n")
        
        # Get top domains
        print("=== TOP DOMAINS ===")
        top_domains = db.get_top_domains(10)
        if top_domains:
            for domain in top_domains:
                print(f"  {domain.get('domain', 'N/A')}: {domain.get('count', 0)} results")
        else:
            print("No domains found.\n")
        
        # Get analytics
        print("=== SEARCH ANALYTICS (Last 30 days) ===")
        analytics = db.get_search_analytics(30)
        if analytics:
            print(f"Total queries: {analytics.get('total_queries', 0)}")
            print(f"Successful queries: {analytics.get('successful_queries', 0)}")
            print(f"Failed queries: {analytics.get('failed_queries', 0)}")
            print(f"Success rate: {analytics.get('success_rate', 0):.1f}%")
            print(f"Total results: {analytics.get('total_results', 0)}")
            print(f"File results: {analytics.get('file_results', 0)}")
            print(f"File percentage: {analytics.get('file_percentage', 0):.1f}%")
        else:
            print("No analytics data found.\n")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        print("Make sure your .env file has the correct SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")

if __name__ == "__main__":
    main()