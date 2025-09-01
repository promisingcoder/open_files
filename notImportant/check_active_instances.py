from database.db_operations import DatabaseOperations

db = DatabaseOperations()
instances = db.get_active_instances()
print('Active instances:')
for i in instances:
    print(f'- {i["name"]}: {i["url"]}')