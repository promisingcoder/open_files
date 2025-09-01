#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.db_operations import DatabaseOperations
import requests
from urllib.parse import urljoin

# List of all 69 SearXNG instances
searxng_instances = [
    'https://searx.stream/',
    'https://search.inetol.net/',
    'https://search.rhscz.eu/',
    'https://searx.rhscz.eu/',
    'https://search.hbubli.cc/',
    'https://northboot.xyz/',
    'https://seek.fyi/',
    'https://priv.au/',
    'https://searx.tiekoetter.com/',
    'https://search.im-in.space/',
    'https://search.buddyverse.net/',
    'https://metacat.online/',
    'https://search.2b9t.xyz/',
    'https://search.system51.co.uk/',
    'https://search.rowie.at/',
    'https://search.mdosch.de/',
    'https://find.xenorio.xyz/',
    'https://search.ipv6s.net/',
    'https://ooglester.com/',
    'https://search.080609.xyz/',
    'https://searx.dresden.network/',
    'https://searxng.f24o.zip/',
    'https://search.ononoki.org/',
    'https://opnxng.com/',
    'https://searxng.site/',
    'https://www.gruble.de/',
    'https://s.mble.dk/',
    'https://searx.tuxcloud.net/',
    'https://search.ashisgreat.xyz/',
    'https://searx.oloke.xyz/',
    'https://search.leptons.xyz/',
    'https://kantan.cat/',
    'https://search.charliewhiskey.net/',
    'https://baresearch.org/',
    'https://searx.foobar.vip/',
    'https://searxng.deliberate.world/',
    'https://search.oh64.moe/',
    'https://search.internetsucks.net/',
    'https://search.einfachzocken.eu/',
    'https://searxng.shreven.org/',
    'https://search.ipsys.bf/',
    'https://searx.namejeff.xyz/',
    'https://searx.sev.monster/',
    'https://search.indst.eu/',
    'https://searx.ro/',
    'https://searxng.website/',
    'https://searx.party/',
    'https://searx.zhenyapav.com/',
    'https://darmarit.org/searx/',
    'https://fairsuch.net/',
    'https://searxng.hweeren.com/',
    'https://search.privacyredirect.com/',
    'https://searx.perennialte.ch/',
    'https://search.sapti.me/',
    'https://searx.juancord.xyz/',
    'https://paulgo.io/',
    'https://search.url4irl.com/',
    'https://search.nerdvpn.de/',
    'https://searx.mxchange.org/',
    'https://search.catboy.house/',
    'https://searx.foss.family/',
    'https://etsi.me/',
    'https://sx.catgirl.cloud/',
    'https://copp.gg/',
    'https://searx.ox2.fr/',
    'https://search.canine.tools/',
    'https://searx.mbuf.net/',
    'https://searx.ankha.ac/',
    'https://searxng.biz/'
]

def test_instance(url):
    """Test if a SearXNG instance is working"""
    try:
        # Test the search endpoint
        search_url = urljoin(url, '/search')
        params = {
            'q': 'test',
            'format': 'json',
            'categories': 'general'
        }
        
        response = requests.get(search_url, params=params, timeout=10)
        
        if response.status_code == 200:
            try:
                data = response.json()
                if 'results' in data:
                    return True, f"Working - {len(data.get('results', []))} results"
                else:
                    return False, "No results field in response"
            except:
                return False, "Invalid JSON response"
        else:
            return False, f"HTTP {response.status_code}"
            
    except requests.exceptions.Timeout:
        return False, "Timeout"
    except requests.exceptions.ConnectionError:
        return False, "Connection error"
    except Exception as e:
        return False, f"Error: {str(e)}"

def main():
    db = DatabaseOperations()
    
    print("Adding all 69 SearXNG instances to the database...")
    print("=" * 60)
    
    # First, deactivate all existing instances
    print("Deactivating existing instances...")
    existing_instances = db.get_active_instances()
    for instance in existing_instances:
        db.update_instance(instance['id'], is_active=False)
    print(f"Deactivated {len(existing_instances)} existing instances.\n")
    
    working_count = 0
    failed_count = 0
    
    for i, url in enumerate(searxng_instances, 1):
        print(f"[{i:2d}/69] Testing {url}...")
        
        # Test the instance
        is_working, status = test_instance(url)
        
        if is_working:
            # Extract name from URL
            name = url.replace('https://', '').replace('http://', '').rstrip('/')
            
            # Add to database
            try:
                instance_id = db.add_instance(name, url, is_active=True)
                print(f"         ✅ Added to database (ID: {instance_id}) - {status}")
                working_count += 1
            except Exception as e:
                print(f"         ❌ Failed to add to database: {e}")
                failed_count += 1
        else:
            print(f"         ❌ Not working - {status}")
            failed_count += 1
    
    print("\n" + "=" * 60)
    print(f"Summary:")
    print(f"✅ Working instances added: {working_count}")
    print(f"❌ Failed instances: {failed_count}")
    print(f"📊 Total tested: {len(searxng_instances)}")
    
    # List active instances
    print("\nCurrently active instances:")
    active_instances = db.get_active_instances()
    for instance in active_instances:
        print(f"  - {instance['name']} ({instance['url']})")
    
    print(f"\nTotal active instances: {len(active_instances)}")

if __name__ == "__main__":
    main()