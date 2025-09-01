from database.db_operations import DatabaseOperations

db = DatabaseOperations()
instances = db.get_active_instances()

print('Active SearXNG instances:')
for inst in instances:
    print(f'- {inst["name"]}: {inst["url"]}')

print(f'\nTotal active instances: {len(instances)}')