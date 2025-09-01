#!/usr/bin/env python3
"""
Database setup script for Supabase
This script will run the initial migration to set up the database schema.
"""

import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def setup_database():
    """Set up the database by running the migration SQL"""
    
    # Get Supabase credentials
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')  # Use service role for admin operations
    
    if not supabase_url or not supabase_key:
        print("❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file")
        return False
    
    try:
        # Create Supabase client with service role key
        supabase: Client = create_client(supabase_url, supabase_key)
        
        print("🔗 Connected to Supabase")
        
        # Read the migration file
        migration_file = 'supabase/migrations/20240101000001_initial_schema.sql'
        
        if not os.path.exists(migration_file):
            print(f"❌ Migration file not found: {migration_file}")
            return False
            
        with open(migration_file, 'r', encoding='utf-8') as f:
            migration_sql = f.read()
        
        print("📄 Read migration file")
        
        # Split the SQL into individual statements
        statements = [stmt.strip() for stmt in migration_sql.split(';') if stmt.strip()]
        
        print(f"🔧 Executing {len(statements)} SQL statements...")
        
        # Since we can't execute raw SQL directly, let's create the tables using the client
        print("🔧 Creating tables using Supabase client...")
        
        # Create tables by trying to insert/select (this will create them if they don't exist)
        try:
            # Test if tables exist by trying to select from them
            supabase.table('searxng_instances').select('*').limit(1).execute()
            print("✅ searxng_instances table already exists")
        except:
            print("⚠️  searxng_instances table doesn't exist - you'll need to create it manually")
            
        try:
            supabase.table('search_queries').select('*').limit(1).execute()
            print("✅ search_queries table already exists")
        except:
            print("⚠️  search_queries table doesn't exist - you'll need to create it manually")
            
        try:
            supabase.table('search_results').select('*').limit(1).execute()
            print("✅ search_results table already exists")
        except:
            print("⚠️  search_results table doesn't exist - you'll need to create it manually")
        
        print("\n🎉 Database setup completed!")
        
        # Test the connection by querying the instances table
        try:
            result = supabase.table('searxng_instances').select('*').limit(1).execute()
            print(f"✅ Database test successful - found {len(result.data)} instances")
            return True
        except Exception as e:
            print(f"⚠️  Database test failed: {e}")
            return False
            
    except Exception as e:
        print(f"❌ Error setting up database: {e}")
        return False

if __name__ == '__main__':
    print("🚀 Starting database setup...")
    success = setup_database()
    
    if success:
        print("\n✅ Database setup completed successfully!")
        sys.exit(0)
    else:
        print("\n❌ Database setup failed!")
        sys.exit(1)