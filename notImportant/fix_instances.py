from database.db_operations import DatabaseOperations

# Add some reliable instances that should work
reliable_instances = [
    ("searx.org", "https://searx.org"),
    ("searx.space", "https://searx.space"),
    ("searx.me", "https://searx.me")
]

db = DatabaseOperations()

print("Adding reliable instances...")
for name, url in reliable_instances:
    result = db.add_instance(name, url, True)
    if result:
        print(f"✓ Added {name}: {url}")
    else:
        print(f"✗ Failed to add {name}")

print("\nCurrent active instances:")
instances = db.get_active_instances()
for inst in instances:
    print(f"- {inst['name']}: {inst['url']}")

print(f"\nTotal active instances: {len(instances)}")