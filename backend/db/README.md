# actiarc DB files

This folder contains the SQL schema and seed files used by the Actiarc frontend/backend during development.

Files
- `actiarc_schema.sql` - Full Postgres schema for frontend data (tables: users, students, student_details, hod_upload_temp, events, registrations, notifications, student_activities, documents, departments).
- `seed_actiarc.sql` - Idempotent seed script to create sample departments, users, students, an event, and a registration.

How to apply (PowerShell / psql)

1) Ensure Postgres is running and a database `campus_activity` exists. If not, create it:

```powershell
psql -h localhost -U postgres -c "CREATE DATABASE campus_activity;"
```

2) Apply schema:

```powershell
psql -h localhost -U postgres -d campus_activity -f "c:\Users\avani manoria\OneDrive\Desktop\clubverse\db\actiarc_schema.sql"
```

3) Apply seed data:

```powershell
psql -h localhost -U postgres -d campus_activity -f "c:\Users\avani manoria\OneDrive\Desktop\clubverse\db\seed_actiarc.sql"
```

If psql prompts for a password, enter your Postgres password.

Notes
- These scripts are meant for local development only. Do not run them against production databases.
