#!/usr/bin/env python3
"""
Script to add new SearXNG instances from the provided list
"""

import sys
sys.path.append('.')
from database.db_operations import DatabaseOperations

def add_new_instances():
    """Add new SearXNG instances to the database"""
    
    # List of new instances from the user's input
    new_instances = [
        ('searx_tuxcloud', 'https://searx.tuxcloud.net/'),
        ('searx_foss_family', 'https://searx.foss.family/'),
        ('find_xenorio', 'https://find.xenorio.xyz/'),
        ('search_ipsys', 'https://search.ipsys.bf/'),
        ('searxng_shreven', 'https://searxng.shreven.org/'),
        ('search_einfachzocken', 'https://search.einfachzocken.eu/'),
        ('search_internetsucks', 'https://search.internetsucks.net/'),
        ('search_2b9t', 'https://search.2b9t.xyz/'),
        ('searx_namejeff', 'https://searx.namejeff.xyz/'),
        ('searx_sev_monster', 'https://searx.sev.monster/'),
        ('search_indst', 'https://search.indst.eu/'),
        ('searx_ro', 'https://searx.ro/'),
        ('searxng_website', 'https://searxng.website/'),
        ('searx_party', 'https://searx.party/'),
        ('searx_zhenyapav', 'https://searx.zhenyapav.com/'),
        ('fairsuch_net', 'https://fairsuch.net/'),
        ('searx_perennialte', 'https://searx.perennialte.ch/'),
        ('searx_juancord', 'https://searx.juancord.xyz/'),
        ('paulgo_io', 'https://paulgo.io/'),
        ('search_url4irl', 'https://search.url4irl.com/'),
        ('search_nerdvpn', 'https://search.nerdvpn.de/'),
        ('searx_mxchange', 'https://searx.mxchange.org/'),
        ('sx_catgirl_cloud', 'https://sx.catgirl.cloud/'),
        ('etsi_me', 'https://etsi.me/'),
        ('search_hbubli', 'https://search.hbubli.cc/'),
        ('search_im_in_space', 'https://search.im-in.space/'),
        ('kantan_cat', 'https://kantan.cat/'),
        ('darmarit_searx', 'https://darmarit.org/searx/'),
        ('searxng_biz', 'https://searxng.biz/'),
        ('searx_mbuf', 'https://searx.mbuf.net/'),
        ('seek_fyi', 'https://seek.fyi/')
    ]
    
    db = DatabaseOperations()
    
    print(f"Adding {len(new_instances)} new instances...")
    
    success_count = 0
    error_count = 0
    
    for name, url in new_instances:
        try:
            result = db.add_instance(name, url, True)
            if result:
                print(f"✓ Added: {name} - {url}")
                success_count += 1
            else:
                print(f"✗ Failed to add: {name} - {url}")
                error_count += 1
        except Exception as e:
            print(f"✗ Error adding {name}: {str(e)}")
            error_count += 1
    
    print(f"\nSummary:")
    print(f"Successfully added: {success_count}")
    print(f"Errors: {error_count}")
    print(f"Total instances processed: {len(new_instances)}")

if __name__ == "__main__":
    add_new_instances()