import requests
import json
from database.db_operations import DatabaseOperations

def test_searxng_instance(url):
    """Test if a SearXNG instance is working"""
    try:
        # Test the search endpoint
        search_url = f"{url.rstrip('/')}/search"
        params = {
            'q': 'test',
            'format': 'json'
        }
        
        response = requests.get(search_url, params=params, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if 'results' in data:
                print(f"✓ {url} - Working (found {len(data['results'])} results)")
                return True
            else:
                print(f"✗ {url} - Invalid response format")
                return False
        else:
            print(f"✗ {url} - HTTP {response.status_code}")
            return False
            
    except Exception as e:
        print(f"✗ {url} - Error: {e}")
        return False

# Test current instances
db = DatabaseOperations()
instances = db.get_active_instances()

print("Testing current instances:")
working_instances = []
for inst in instances:
    if test_searxng_instance(inst['url']):
        working_instances.append(inst)

print(f"\nWorking instances: {len(working_instances)} out of {len(instances)}")

# Test the instance we found earlier
print("\nTesting new instance:")
test_url = "https://search.inetol.net"
if test_searxng_instance(test_url):
    print(f"Adding {test_url} to database...")
    db.add_instance("search.inetol.net", test_url, True)
    print("Added successfully!")