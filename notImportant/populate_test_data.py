#!/usr/bin/env python3
"""
Script to populate the database with test search data for analytics testing
"""

import os
import sys
from datetime import datetime, timedelta
import uuid
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add the project root to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.db_operations import DatabaseOperations
from scraper.searxng_scraper import SearchResult

def create_test_data():
    """Create test search queries and results"""
    try:
        db = DatabaseOperations()
        
        # Test connection
        if not db.test_connection():
            print("❌ Database connection failed")
            return False
        
        print("✅ Database connection successful")
        
        # Get active instances
        instances = db.get_active_instances()
        if not instances:
            print("❌ No active instances found")
            return False
        
        instance_id = instances[0]['id']
        print(f"✅ Using instance: {instances[0]['name']}")
        
        # Create test queries with different timestamps
        test_queries = [
            "python programming filetype:pdf",
            "machine learning tutorial",
            "javascript guide filetype:doc",
            "data science books",
            "web development resources"
        ]
        
        created_queries = []
        
        for i, query_text in enumerate(test_queries):
            # Create query with different timestamps (spread over last 7 days)
            query_id = db.create_search_query(query_text, instance_id)
            if query_id:
                created_queries.append(query_id)
                print(f"✅ Created query: {query_text} (ID: {query_id})")
                
                # Update query status to completed
                db.update_search_query(query_id, "completed", total_results=10 + i * 5)
                
                # Create test results for this query
                test_results = []
                for j in range(3 + i):  # Different number of results per query
                    result = SearchResult(
                        title=f"Test Result {j+1} for {query_text[:20]}",
                        url=f"https://example{j}.com/document{j}.pdf",
                        description=f"This is test content for result {j+1}",
                        domain=f"example{j % 3}.com",
                        engines=["google", "bing"],
                        is_file=j % 2 == 0,  # Alternate between file and non-file
                        file_type="pdf" if j % 2 == 0 else None,
                        fileSize=f"{(j+1) * 100}KB" if j % 2 == 0 else None,
                        position=j+1,
                        page_number=1
                    )
                    test_results.append(result)
                
                # Store results
                if db.store_search_results(query_id, test_results):
                    print(f"  ✅ Stored {len(test_results)} results")
                else:
                    print(f"  ❌ Failed to store results")
            else:
                print(f"❌ Failed to create query: {query_text}")
        
        print(f"\n✅ Created {len(created_queries)} test queries with results")
        
        # Test analytics
        print("\n=== Testing Analytics ===")
        analytics = db.get_search_analytics(30)
        if analytics:
            print(f"Total queries: {analytics.get('total_queries', 0)}")
            print(f"Successful queries: {analytics.get('successful_queries', 0)}")
            print(f"Total results: {analytics.get('total_results', 0)}")
            print(f"File results: {analytics.get('file_results', 0)}")
            print(f"Success rate: {analytics.get('success_rate', 0)}%")
        else:
            print("❌ Failed to get analytics")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creating test data: {e}")
        return False

if __name__ == "__main__":
    print("Creating test data for analytics...")
    success = create_test_data()
    if success:
        print("\n🎉 Test data created successfully!")
        print("You can now check the analytics dashboard.")
    else:
        print("\n💥 Failed to create test data.")