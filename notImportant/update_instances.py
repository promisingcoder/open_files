from database.db_operations import DatabaseOperations
import requests

def test_searxng_instance(url):
    """Test if a SearXNG instance is working"""
    try:
        # Test the search endpoint
        search_url = f"{url.rstrip('/')}/search"
        params = {
            'q': 'python',
            'format': 'json'
        }
        
        response = requests.get(search_url, params=params, timeout=15)
        
        if response.status_code == 200:
            try:
                data = response.json()
                if 'results' in data and len(data['results']) > 0:
                    print(f"✓ {url} - Working (found {len(data['results'])} results)")
                    return True
                else:
                    print(f"✗ {url} - No results found")
                    return False
            except:
                print(f"✗ {url} - Invalid JSON response")
                return False
        else:
            print(f"✗ {url} - HTTP {response.status_code}")
            return False
            
    except Exception as e:
        print(f"✗ {url} - Error: {str(e)[:100]}")
        return False

# Known working SearXNG instances
test_instances = [
    ("searx.work", "https://searx.work"),
    ("searx.fmac.xyz", "https://searx.fmac.xyz"),
    ("search.bus-hit.me", "https://search.bus-hit.me"),
    ("searx.prvcy.eu", "https://searx.prvcy.eu"),
    ("search.mdosch.de", "https://search.mdosch.de"),
    ("searx.be", "https://searx.be"),
    ("searx.info", "https://searx.info"),
    ("searx.ninja", "https://searx.ninja")
]

db = DatabaseOperations()

# First, deactivate all current instances
print("Deactivating current instances...")
current_instances = db.get_active_instances()
for inst in current_instances:
    db.update_instance(inst['id'], is_active=False)
    print(f"Deactivated: {inst['name']}")

print("\nTesting new instances:")
working_count = 0

for name, url in test_instances:
    if test_searxng_instance(url):
        # Add to database
        result = db.add_instance(name, url, True)
        if result:
            print(f"Added {name} to database")
            working_count += 1
        else:
            print(f"Failed to add {name} to database")

print(f"\nSuccessfully added {working_count} working instances")

# Test the API again
print("\nTesting API with new instances...")
import time
time.sleep(2)  # Give database time to update

try:
    import requests
    response = requests.post(
        "http://localhost:8000/api/search",
        json={"query": "python programming", "max_pages": 1},
        timeout=30
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"API Response: {data['status']} - {data['message']}")
        if 'results' in data and data['results']:
            print(f"Found {len(data['results'])} results!")
        else:
            print("No results returned")
    else:
        print(f"API Error: HTTP {response.status_code}")
        
except Exception as e:
    print(f"API Test Error: {e}")