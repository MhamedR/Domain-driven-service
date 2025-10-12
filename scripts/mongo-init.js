// MongoDB initialization script
db = db.getSiblingDB('admin');

// Create databases
db = db.getSiblingDB('calendar_db');
db.createUser({
  user: 'calendar_user',
  pwd: 'calendar_password',
  roles: [{ role: 'readWrite', db: 'calendar_db' }]
});

db = db.getSiblingDB('objectives_db');
db.createUser({
  user: 'objectives_user',
  pwd: 'objectives_password',
  roles: [{ role: 'readWrite', db: 'objectives_db' }]
});

db = db.getSiblingDB('tech_updates_db');
db.createUser({
  user: 'tech_updates_user',
  pwd: 'tech_updates_password',
  roles: [{ role: 'readWrite', db: 'tech_updates_db' }]
});

print('MongoDB initialization completed');
