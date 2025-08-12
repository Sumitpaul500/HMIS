# Python HMIS (Flask + SQLite)

This folder contains a fully functional Python implementation of the HMIS requested.

Requirements:
- Python 3.9+
- pip install -r requirements.txt (Flask only)

Quick start:
```
cd python_hmis
python -m venv .venv && source .venv/bin/activate  # on Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
python app.py
```

Then open http://127.0.0.1:5000

Features implemented:
- Auto-create SQLite database with tables: patients, vitals, prescriptions
- Patient Entry (unique USN), Edit patient, Delete patient with cascade delete
- Vitals Entry (linked by USN) with recorded timestamp
- Prescription Management (linked by USN) with timestamp and printable view
- Search panel (USN or phone) on Vitals & Prescription
- Export all data as CSV
- Simple clean UI with tabs

Notes:
- Database file: hmis.db (created on first run)
- Foreign keys are enforced (PRAGMA foreign_keys=ON)
