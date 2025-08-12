from __future__ import annotations
import csv
import io
import os
import sqlite3
from datetime import datetime, date
from typing import Any, Dict, List, Optional, Tuple

from flask import Flask, redirect, render_template, request, Response, url_for, jsonify

APP_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(APP_DIR, "hmis.db")

app = Flask(__name__)

# --- Database helpers ---

def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db() -> None:
    conn = get_db()
    cur = conn.cursor()
    # Create tables if not existing (idempotent)
    cur.executescript(
        """
        CREATE TABLE IF NOT EXISTS patients (
            usn TEXT PRIMARY KEY,
            full_name TEXT NOT NULL,
            age INTEGER NOT NULL,
            gender TEXT NOT NULL,
            contact TEXT NOT NULL,
            address TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS vitals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usn TEXT NOT NULL,
            weight REAL NOT NULL,
            height REAL NOT NULL,
            bmi REAL GENERATED ALWAYS AS (weight / ((height/100.0) * (height/100.0))) STORED,
            blood_pressure_systolic INTEGER NOT NULL,
            blood_pressure_diastolic INTEGER NOT NULL,
            heart_rate INTEGER NOT NULL,
            temperature REAL NOT NULL,
            respiratory_rate INTEGER NULL,
            oxygen_saturation INTEGER NULL,
            notes TEXT NULL,
            recorded_at TEXT NOT NULL,
            recorded_by TEXT NOT NULL DEFAULT 'System User',
            FOREIGN KEY (usn) REFERENCES patients(usn) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS prescriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usn TEXT NOT NULL,
            notes TEXT NOT NULL,
            prescribed_at TEXT NOT NULL,
            FOREIGN KEY (usn) REFERENCES patients(usn) ON DELETE CASCADE
        );

        -- New: encounters (visits)
        CREATE TABLE IF NOT EXISTS encounters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usn TEXT NOT NULL,
            encounter_dt TEXT NOT NULL,
            encounter_type TEXT NOT NULL DEFAULT 'OPD',
            clinician TEXT NULL,
            reason TEXT NULL,
            notes TEXT NULL,
            FOREIGN KEY (usn) REFERENCES patients(usn) ON DELETE CASCADE
        );

        -- New: problems (conditions)
        CREATE TABLE IF NOT EXISTS problems (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usn TEXT NOT NULL,
            code TEXT NULL,
            description TEXT NOT NULL,
            onset_date TEXT NULL,
            status TEXT NOT NULL DEFAULT 'Active',
            recorded_at TEXT NOT NULL,
            FOREIGN KEY (usn) REFERENCES patients(usn) ON DELETE CASCADE
        );

        -- New: allergies
        CREATE TABLE IF NOT EXISTS allergies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usn TEXT NOT NULL,
            substance TEXT NOT NULL,
            reaction TEXT NULL,
            severity TEXT NULL,
            recorded_at TEXT NOT NULL,
            FOREIGN KEY (usn) REFERENCES patients(usn) ON DELETE CASCADE
        );

        -- New: medications master
        CREATE TABLE IF NOT EXISTS medications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            generic_name TEXT NULL,
            form TEXT NULL,
            strength TEXT NULL,
            is_active INTEGER NOT NULL DEFAULT 1,
            UNIQUE(name, strength, form)
        );

        -- New: itemized prescription lines
        CREATE TABLE IF NOT EXISTS prescription_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prescription_id INTEGER NOT NULL,
            medication_id INTEGER NOT NULL,
            dose TEXT NULL,
            route TEXT NULL,
            frequency TEXT NULL,
            duration_days INTEGER NULL,
            instructions TEXT NULL,
            FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE,
            FOREIGN KEY (medication_id) REFERENCES medications(id)
        );

        -- New: lab tests and orders
        CREATE TABLE IF NOT EXISTS lab_tests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            specimen TEXT NULL,
            unit TEXT NULL,
            ref_range TEXT NULL,
            is_active INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS lab_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usn TEXT NOT NULL,
            encounter_id INTEGER NULL,
            ordered_at TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Ordered',
            notes TEXT NULL,
            FOREIGN KEY (usn) REFERENCES patients(usn) ON DELETE CASCADE,
            FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS lab_order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lab_order_id INTEGER NOT NULL,
            lab_test_id INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'Ordered',
            result_value TEXT NULL,
            result_notes TEXT NULL,
            result_at TEXT NULL,
            FOREIGN KEY (lab_order_id) REFERENCES lab_orders(id) ON DELETE CASCADE,
            FOREIGN KEY (lab_test_id) REFERENCES lab_tests(id)
        );

        -- New: appointments (calendar)
        CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usn TEXT NOT NULL,
            starts_at TEXT NOT NULL,
            ends_at TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Scheduled',
            title TEXT NULL,
            clinician TEXT NULL,
            notes TEXT NULL,
            FOREIGN KEY (usn) REFERENCES patients(usn) ON DELETE CASCADE
        );

        -- New: inventory (basic)
        CREATE TABLE IF NOT EXISTS inventory_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            medication_id INTEGER NULL,
            sku TEXT UNIQUE,
            name TEXT NOT NULL,
            unit TEXT NULL,
            is_active INTEGER NOT NULL DEFAULT 1,
            FOREIGN KEY (medication_id) REFERENCES medications(id)
        );

        CREATE TABLE IF NOT EXISTS inventory_stock (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_id INTEGER NOT NULL,
            quantity_on_hand INTEGER NOT NULL DEFAULT 0,
            reorder_level INTEGER NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(item_id),
            FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS inventory_movements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_id INTEGER NOT NULL,
            movement_dt TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            reason TEXT NULL,
            ref_type TEXT NULL,
            ref_id INTEGER NULL,
            FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
        );

        -- New: audit logs
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            occurred_at TEXT NOT NULL,
            entity TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            action TEXT NOT NULL,
            details TEXT NULL
        );
        """
    )

    # Seed some lab tests if empty
    if cur.execute("SELECT COUNT(1) FROM lab_tests").fetchone()[0] == 0:
        cur.executemany(
            "INSERT INTO lab_tests(code, name, specimen, unit, ref_range) VALUES(?,?,?,?,?)",
            [
                ("CBC", "Complete Blood Count", "Blood", NULL, NULL),
                ("GLU", "Blood Glucose (Fasting)", "Blood", "mg/dL", "70-100"),
                ("LFT", "Liver Function Test", "Blood", NULL, NULL),
            ],
        )

    conn.commit()
    conn.close()


@app.before_request
def ensure_db() -> None:
    # Auto-create DB and tables
    if not os.path.exists(DB_PATH):
        init_db()
    else:
        # Ensure new tables exist on older DBs
        init_db()


# --- Routes ---

@app.get("/")
def index() -> str:
    q = (request.args.get("q") or "").strip()
    conn = get_db()

    patients: List[sqlite3.Row] = conn.execute(
        "SELECT * FROM patients ORDER BY full_name COLLATE NOCASE"
    ).fetchall()

    match_patient: Optional[sqlite3.Row] = None
    patient_vitals: List[sqlite3.Row] = []
    patient_rx: List[sqlite3.Row] = []

    if q:
        match_patient = conn.execute(
            "SELECT * FROM patients WHERE usn = ? OR contact = ?",
            (q, q),
        ).fetchone()
        if match_patient:
            patient_vitals = conn.execute(
                "SELECT * FROM vitals WHERE usn = ? ORDER BY recorded_at DESC",
                (match_patient["usn"],),
            ).fetchall()
            patient_rx = conn.execute(
                "SELECT * FROM prescriptions WHERE usn = ? ORDER BY prescribed_at DESC",
                (match_patient["usn"],),
            ).fetchall()

    return render_template(
        "index.html",
        patients=patients,
        q=q,
        match_patient=match_patient,
        patient_vitals=patient_vitals,
        patient_rx=patient_rx,
        message=request.args.get("m"),
        error=request.args.get("e"),
    )


# Patient create/update/delete
@app.post("/patient/create")
def patient_create() -> Response:
    data = {k: (request.form.get(k) or "").strip() for k in [
        "usn", "full_name", "age", "gender", "contact", "address"
    ]}
    if not all(data.values()):
        return redirect(url_for("index", e="All patient fields are required"))

    try:
        age = int(data["age"]) if data["age"] else 0
    except ValueError:
        return redirect(url_for("index", e="Age must be a number"))

    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO patients(usn, full_name, age, gender, contact, address) VALUES(?,?,?,?,?,?)",
            (data["usn"], data["full_name"], age, data["gender"], data["contact"], data["address"]),
        )
        conn.commit()
    except sqlite3.IntegrityError:
        return redirect(url_for("index", e="USN must be unique"))
    finally:
        conn.close()

    return redirect(url_for("index", m="Patient created"))


@app.post("/patient/update")
def patient_update() -> Response:
    usn = (request.form.get("usn") or "").strip()
    full_name = (request.form.get("full_name") or "").strip()
    contact = (request.form.get("contact") or "").strip()
    address = (request.form.get("address") or "").strip()
    gender = (request.form.get("gender") or "").strip()
    age_raw = (request.form.get("age") or "").strip()

    if not (usn and full_name and contact and address and gender and age_raw):
        return redirect(url_for("index", e="All fields required for update"))

    try:
        age = int(age_raw)
    except ValueError:
        return redirect(url_for("index", e="Age must be a number"))

    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "UPDATE patients SET full_name=?, age=?, gender=?, contact=?, address=? WHERE usn=?",
        (full_name, age, gender, contact, address, usn),
    )
    conn.commit()
    conn.close()
    return redirect(url_for("index", m="Patient updated", q=usn))


@app.post("/patient/delete/<usn>")
def patient_delete(usn: str) -> Response:
    conn = get_db()
    conn.execute("DELETE FROM patients WHERE usn=?", (usn,))
    conn.commit()
    conn.close()
    return redirect(url_for("index", m="Patient deleted"))


# Vitals
@app.post("/vitals/create")
def vitals_create() -> Response:
    usn = (request.form.get("usn") or "").strip()
    weight = (request.form.get("weight") or "0").strip()
    height = (request.form.get("height") or "0").strip()
    bp_systolic = (request.form.get("blood_pressure_systolic") or "0").strip()
    bp_diastolic = (request.form.get("blood_pressure_diastolic") or "0").strip()
    heart_rate = (request.form.get("heart_rate") or "0").strip()
    temperature = (request.form.get("temperature") or "0").strip()
    respiratory_rate = (request.form.get("respiratory_rate") or "").strip()
    oxygen_saturation = (request.form.get("oxygen_saturation") or "").strip()
    notes = (request.form.get("notes") or "").strip()

    if not (usn and weight and height and bp_systolic and bp_diastolic and heart_rate and temperature):
        return redirect(url_for("index", e="Required vitals fields missing", q=usn))

    try:
        weight_f = float(weight)
        height_f = float(height)
        bp_sys_i = int(bp_systolic)
        bp_dia_i = int(bp_diastolic)
        hr_i = int(heart_rate)
        temp_f = float(temperature)
        resp_rate_i = int(respiratory_rate) if respiratory_rate else None
        o2_sat_i = int(oxygen_saturation) if oxygen_saturation else None
    except ValueError:
        return redirect(url_for("index", e="Vitals must be numeric", q=usn))

    conn = get_db()
    # Ensure patient exists
    p = conn.execute("SELECT 1 FROM patients WHERE usn=?", (usn,)).fetchone()
    if not p:
        conn.close()
        return redirect(url_for("index", e="Patient not found", q=usn))

    conn.execute(
        """INSERT INTO vitals(usn, weight, height, blood_pressure_systolic, blood_pressure_diastolic, 
           heart_rate, temperature, respiratory_rate, oxygen_saturation, notes, recorded_at) 
           VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
        (usn, weight_f, height_f, bp_sys_i, bp_dia_i, hr_i, temp_f, resp_rate_i, o2_sat_i, notes, datetime.utcnow().isoformat()),
    )
    conn.commit()
    conn.close()
    return redirect(url_for("index", m="Vitals saved", q=usn))


# API endpoints for frontend integration
@app.route("/api/patients", methods=["GET", "POST"])
def api_patients():
    if request.method == "GET":
        conn = get_db()
        patients = conn.execute("SELECT * FROM patients ORDER BY full_name").fetchall()
        conn.close()
        return jsonify([dict(row) for row in patients])
    
    elif request.method == "POST":
        data = request.get_json()
        usn = data.get("usn", "").strip()
        full_name = data.get("fullName", "").strip()
        age = data.get("age")
        gender = data.get("gender", "").strip()
        contact = data.get("phone", "").strip()
        address = data.get("address", "").strip()
        email = data.get("email", "").strip()

        if not all([usn, full_name, age, gender]):
            return jsonify({"error": "Required fields missing"}), 400

        try:
            age = int(age)
        except (ValueError, TypeError):
            return jsonify({"error": "Age must be a number"}), 400

        conn = get_db()
        try:
            conn.execute(
                "INSERT INTO patients(usn, full_name, age, gender, contact, address) VALUES(?,?,?,?,?,?)",
                (usn, full_name, age, gender, contact or "", address or ""),
            )
            conn.commit()
            return jsonify({"message": "Patient created successfully"}), 201
        except sqlite3.IntegrityError:
            return jsonify({"error": "USN already exists"}), 409
        finally:
            conn.close()


@app.route("/api/vitals", methods=["GET", "POST"])
def api_vitals():
    if request.method == "GET":
        usn = request.args.get("usn")
        conn = get_db()
        if usn:
            vitals = conn.execute(
                "SELECT * FROM vitals WHERE usn=? ORDER BY recorded_at DESC", 
                (usn,)
            ).fetchall()
        else:
            vitals = conn.execute("SELECT * FROM vitals ORDER BY recorded_at DESC").fetchall()
        conn.close()
        return jsonify([dict(row) for row in vitals])
    
    elif request.method == "POST":
        data = request.get_json()
        usn = data.get("usn", "").strip()
        
        required_fields = ["weight", "height", "bloodPressureSystolic", "bloodPressureDiastolic", "heartRate", "temperature"]
        if not usn or not all(data.get(field) for field in required_fields):
            return jsonify({"error": "Required vitals fields missing"}), 400

        try:
            weight = float(data["weight"])
            height = float(data["height"])
            bp_sys = int(data["bloodPressureSystolic"])
            bp_dia = int(data["bloodPressureDiastolic"])
            heart_rate = int(data["heartRate"])
            temperature = float(data["temperature"])
            resp_rate = int(data["respiratoryRate"]) if data.get("respiratoryRate") else None
            o2_sat = int(data["oxygenSaturation"]) if data.get("oxygenSaturation") else None
            notes = data.get("notes", "").strip()
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid numeric values"}), 400

        conn = get_db()
        # Check if patient exists
        patient = conn.execute("SELECT 1 FROM patients WHERE usn=?", (usn,)).fetchone()
        if not patient:
            conn.close()
            return jsonify({"error": "Patient not found"}), 404

        try:
            conn.execute(
                """INSERT INTO vitals(usn, weight, height, blood_pressure_systolic, blood_pressure_diastolic, 
                   heart_rate, temperature, respiratory_rate, oxygen_saturation, notes, recorded_at) 
                   VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
                (usn, weight, height, bp_sys, bp_dia, heart_rate, temperature, resp_rate, o2_sat, notes, datetime.utcnow().isoformat()),
            )
            conn.commit()
            return jsonify({"message": "Vitals recorded successfully"}), 201
        finally:
            conn.close()


@app.route("/api/export/patients")
def api_export_patients():
    conn = get_db()
    patients = conn.execute("SELECT * FROM patients ORDER BY full_name").fetchall()
    conn.close()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow(["USN", "Full Name", "Age", "Gender", "Contact", "Address"])
    
    # Write data
    for patient in patients:
        writer.writerow([patient["usn"], patient["full_name"], patient["age"], 
                        patient["gender"], patient["contact"], patient["address"]])
    
    response = Response(output.getvalue(), mimetype="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=patients.csv"
    return response


@app.route("/api/export/vitals")
def api_export_vitals():
    conn = get_db()
    vitals = conn.execute("""
        SELECT v.*, p.full_name 
        FROM vitals v 
        JOIN patients p ON v.usn = p.usn 
        ORDER BY v.recorded_at DESC
    """).fetchall()
    conn.close()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow(["USN", "Patient Name", "Weight (kg)", "Height (cm)", "BMI", 
                    "Systolic BP", "Diastolic BP", "Heart Rate", "Temperature", 
                    "Respiratory Rate", "Oxygen Saturation", "Notes", "Recorded At"])
    
    # Write data
    for vital in vitals:
        writer.writerow([
            vital["usn"], vital["full_name"], vital["weight"], vital["height"],
            vital["bmi"], vital["blood_pressure_systolic"], vital["blood_pressure_diastolic"],
            vital["heart_rate"], vital["temperature"], vital["respiratory_rate"],
            vital["oxygen_saturation"], vital["notes"], vital["recorded_at"]
        ])
    
    response = Response(output.getvalue(), mimetype="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=vitals.csv"
    return response


@app.route("/api/export/complete")
def api_export_complete():
    conn = get_db()
    
    # Get comprehensive patient data
    patients_data = conn.execute("""
        SELECT 
            p.*,
            v.weight as latest_weight,
            v.height as latest_height,
            v.bmi as latest_bmi,
            v.blood_pressure_systolic || '/' || v.blood_pressure_diastolic as latest_bp,
            v.heart_rate as latest_hr,
            v.temperature as latest_temp,
            (SELECT COUNT(*) FROM vitals WHERE usn = p.usn) as total_vitals,
            (SELECT COUNT(*) FROM prescriptions WHERE usn = p.usn) as total_prescriptions
        FROM patients p
        LEFT JOIN vitals v ON p.usn = v.usn AND v.id = (
            SELECT id FROM vitals WHERE usn = p.usn ORDER BY recorded_at DESC LIMIT 1
        )
        ORDER BY p.full_name
    """).fetchall()
    conn.close()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        "USN", "Full Name", "Age", "Gender", "Contact", "Address",
        "Latest Weight", "Latest Height", "Latest BMI", "Latest BP",
        "Latest Heart Rate", "Latest Temperature", "Total Vitals Records", "Total Prescriptions"
    ])
    
    # Write data
    for row in patients_data:
        writer.writerow([
            row["usn"], row["full_name"], row["age"], row["gender"],
            row["contact"], row["address"], row["latest_weight"], row["latest_height"],
            row["latest_bmi"], row["latest_bp"], row["latest_hr"], row["latest_temp"],
            row["total_vitals"], row["total_prescriptions"]
        ])
    
    response = Response(output.getvalue(), mimetype="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=complete_patient_data.csv"
    return response


@app.route("/api/prescriptions", methods=["GET", "POST"])
def api_prescriptions():
    if request.method == "GET":
        usn = request.args.get("usn")
        conn = get_db()
        if usn:
            prescriptions = conn.execute(
                "SELECT * FROM prescriptions WHERE usn=? ORDER BY prescribed_at DESC", 
                (usn,)
            ).fetchall()
        else:
            prescriptions = conn.execute("SELECT * FROM prescriptions ORDER BY prescribed_at DESC").fetchall()
        conn.close()
        return jsonify([dict(row) for row in prescriptions])
    
    elif request.method == "POST":
        data = request.get_json()
        usn = data.get("usn", "").strip()
        diagnosis = data.get("diagnosis", "").strip()
        medications = data.get("medications", [])
        notes = data.get("notes", "").strip()
        follow_up_date = data.get("followUpDate", "").strip()

        if not usn or not diagnosis:
            return jsonify({"error": "USN and diagnosis are required"}), 400

        conn = get_db()
        # Check if patient exists
        patient = conn.execute("SELECT * FROM patients WHERE usn=?", (usn,)).fetchone()
        if not patient:
            conn.close()
            return jsonify({"error": "Patient not found"}), 404

        try:
            # Create comprehensive prescription notes
            prescription_notes = f"Diagnosis: {diagnosis}\n\n"
            if medications:
                prescription_notes += "Medications:\n"
                for i, med in enumerate(medications, 1):
                    if med.get('name') and med.get('dosage') and med.get('frequency'):
                        prescription_notes += f"{i}. {med['name']} - {med['dosage']}, {med['frequency']}"
                        if med.get('duration'):
                            prescription_notes += f", for {med['duration']}"
                        if med.get('instructions'):
                            prescription_notes += f" ({med['instructions']})"
                        prescription_notes += "\n"
            
            if notes:
                prescription_notes += f"\nAdditional Notes: {notes}"
            
            if follow_up_date:
                prescription_notes += f"\nFollow-up Date: {follow_up_date}"

            conn.execute(
                "INSERT INTO prescriptions(usn, notes, prescribed_at) VALUES(?,?,?)",
                (usn, prescription_notes, datetime.utcnow().isoformat()),
            )
            conn.commit()
            return jsonify({"message": "Prescription created successfully"}), 201
        finally:
            conn.close()


@app.route("/api/export/prescriptions")
def api_export_prescriptions():
    conn = get_db()
    prescriptions = conn.execute("""
        SELECT p.*, pa.full_name 
        FROM prescriptions p 
        JOIN patients pa ON p.usn = pa.usn 
        ORDER BY p.prescribed_at DESC
    """).fetchall()
    conn.close()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow(["USN", "Patient Name", "Prescription Notes", "Prescribed At"])
    
    # Write data
    for prescription in prescriptions:
        writer.writerow([
            prescription["usn"], prescription["full_name"], 
            prescription["notes"], prescription["prescribed_at"]
        ])
    
    response = Response(output.getvalue(), mimetype="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=prescriptions.csv"
    return response


@app.route("/api/health")
def api_health():
    return jsonify({"status": "ok", "timestamp": datetime.utcnow().isoformat()})


# Original vitals creation for backward compatibility (keeping old endpoint)
@app.post("/vitals/create/legacy")
def vitals_create_legacy() -> Response:
    usn = (request.form.get("usn") or "").strip()
    bp = (request.form.get("blood_pressure") or "").strip()
    pulse = (request.form.get("pulse") or "0").strip()
    temp = (request.form.get("temperature") or "0").strip()
    weight = (request.form.get("weight") or "0").strip()
    height = (request.form.get("height") or "0").strip()

    if not (usn and bp and pulse and temp and weight and height):
        return redirect(url_for("index", e="All vitals are required", q=usn))

    try:
        pulse_i = int(pulse)
        temp_f = float(temp)
        weight_f = float(weight)
        height_f = float(height)
    except ValueError:
        return redirect(url_for("index", e="Vitals must be numeric", q=usn))

    conn = get_db()
    # Ensure patient exists
    p = conn.execute("SELECT 1 FROM patients WHERE usn=?", (usn,)).fetchone()
    if not p:
        conn.close()
        return redirect(url_for("index", e="Patient not found", q=usn))

    conn.execute(
        "INSERT INTO vitals(usn, blood_pressure, pulse, temperature, weight, height, recorded_at) VALUES(?,?,?,?,?,?,?)",
        (usn, bp, pulse_i, temp_f, weight_f, height_f, datetime.utcnow().isoformat()),
    )
    conn.commit()
    conn.close()
    return redirect(url_for("index", m="Vitals saved", q=usn))


# Prescription (free-text notes retained)
@app.post("/prescription/create")
def prescription_create() -> Response:
    usn = (request.form.get("usn") or "").strip()
    notes = (request.form.get("notes") or "").strip()
    if not (usn and notes):
        return redirect(url_for("index", e="USN and notes required", q=usn))

    conn = get_db()
    p = conn.execute("SELECT 1 FROM patients WHERE usn=?", (usn,)).fetchone()
    if not p:
        conn.close()
        return redirect(url_for("index", e="Patient not found", q=usn))

    cur = conn.cursor()
    cur.execute(
        "INSERT INTO prescriptions(usn, notes, prescribed_at) VALUES(?,?,?)",
        (usn, notes, datetime.utcnow().isoformat()),
    )
    rx_id = cur.lastrowid
    conn.commit()
    conn.close()
    return redirect(url_for("index", m="Prescription saved", q=usn))


# New: add itemized medications to a prescription
@app.post("/prescription/item/create")
def prescription_item_create() -> Response:
    prescription_id = (request.form.get("prescription_id") or "").strip()
    med_name = (request.form.get("med_name") or "").strip()
    dose = (request.form.get("dose") or "").strip()
    route = (request.form.get("route") or "").strip()
    frequency = (request.form.get("frequency") or "").strip()
    duration_days = (request.form.get("duration_days") or "").strip()
    instructions = (request.form.get("instructions") or "").strip()

    if not (prescription_id and med_name):
        return redirect(url_for("index", e="Prescription and medication required"))

    conn = get_db()
    cur = conn.cursor()
    # Upsert medication by name
    med = cur.execute("SELECT id FROM medications WHERE name=?", (med_name,)).fetchone()
    if med:
        med_id = med["id"]
    else:
        cur.execute("INSERT INTO medications(name) VALUES(?)", (med_name,))
        med_id = cur.lastrowid

    try:
        dur_i = int(duration_days) if duration_days else None
    except ValueError:
        dur_i = None

    cur.execute(
        """
        INSERT INTO prescription_items(prescription_id, medication_id, dose, route, frequency, duration_days, instructions)
        VALUES (?,?,?,?,?,?,?)
        """,
        (int(prescription_id), med_id, dose, route, frequency, dur_i, instructions or None),
    )
    conn.commit()
    conn.close()
    return redirect(url_for("index", m="Medication added to prescription"))


@app.get("/prescription/print/<int:pid>")
def prescription_print(pid: int) -> str:
    conn = get_db()
    rx = conn.execute("SELECT * FROM prescriptions WHERE id=?", (pid,)).fetchone()
    if not rx:
        conn.close()
        return "Not Found", 404
    patient = conn.execute("SELECT * FROM patients WHERE usn=?", (rx["usn"],)).fetchone()
    items = conn.execute(
        """
        SELECT pi.*, m.name AS medication_name
        FROM prescription_items pi
        JOIN medications m ON m.id = pi.medication_id
        WHERE pi.prescription_id = ?
        ORDER BY pi.id
        """,
        (pid,),
    ).fetchall()
    conn.close()
    return render_template("print_rx.html", rx=rx, patient=patient, items=items)


# New: Appointments CRUD (basic)
@app.get("/api/appointments")
def api_appointments_list() -> Response:
    usn = (request.args.get("usn") or "").strip()
    conn = get_db()
    if usn:
        rows = conn.execute(
            "SELECT * FROM appointments WHERE usn = ? ORDER BY starts_at DESC",
            (usn,),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM appointments ORDER BY starts_at DESC LIMIT 200"
        ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.post("/api/appointments")
def api_appointments_create() -> Response:
    data = request.get_json(silent=True) or {}
    usn = (data.get("usn") or "").strip()
    starts_at = (data.get("starts_at") or "").strip()
    ends_at = (data.get("ends_at") or "").strip()
    title = (data.get("title") or "").strip() or None
    clinician = (data.get("clinician") or "").strip() or None
    notes = (data.get("notes") or "").strip() or None

    if not (usn and starts_at and ends_at):
        return jsonify({"error": "usn, starts_at, ends_at required"}), 400

    conn = get_db()
    p = conn.execute("SELECT 1 FROM patients WHERE usn=?", (usn,)).fetchone()
    if not p:
        conn.close()
        return jsonify({"error": "Patient not found"}), 404

    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO appointments(usn, starts_at, ends_at, status, title, clinician, notes)
        VALUES (?,?,?,?,?,?,?)
        """,
        (usn, starts_at, ends_at, "Scheduled", title, clinician, notes),
    )
    appt_id = cur.lastrowid
    conn.commit()
    conn.close()
    return jsonify({"id": appt_id}), 201


@app.post("/api/appointments/<int:aid>/update")
def api_appointments_update(aid: int) -> Response:
    data = request.get_json(silent=True) or {}
    status = (data.get("status") or "").strip() or None
    title = (data.get("title") or "").strip() or None
    clinician = (data.get("clinician") or "").strip() or None
    notes = (data.get("notes") or "").strip() or None
    starts_at = (data.get("starts_at") or "").strip() or None
    ends_at = (data.get("ends_at") or "").strip() or None

    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        UPDATE appointments
        SET status = COALESCE(?, status),
            title = COALESCE(?, title),
            clinician = COALESCE(?, clinician),
            notes = COALESCE(?, notes),
            starts_at = COALESCE(?, starts_at),
            ends_at = COALESCE(?, ends_at)
        WHERE id = ?
        """,
        (status, title, clinician, notes, starts_at, ends_at, aid),
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.post("/api/appointments/<int:aid>/delete")
def api_appointments_delete(aid: int) -> Response:
    conn = get_db()
    conn.execute("DELETE FROM appointments WHERE id=?", (aid,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


# New: Labs basic APIs
@app.get("/api/lab-tests")
def api_lab_tests() -> Response:
    conn = get_db()
    rows = conn.execute("SELECT * FROM lab_tests WHERE is_active = 1 ORDER BY name").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.post("/api/lab-orders")
def api_create_lab_order() -> Response:
    data = request.get_json(silent=True) or {}
    usn = (data.get("usn") or "").strip()
    test_code = (data.get("test_code") or "").strip()
    notes = (data.get("notes") or "").strip() or None

    if not (usn and test_code):
        return jsonify({"error": "usn and test_code required"}), 400

    conn = get_db()
    p = conn.execute("SELECT 1 FROM patients WHERE usn=?", (usn,)).fetchone()
    if not p:
        conn.close()
        return jsonify({"error": "Patient not found"}), 404

    test = conn.execute("SELECT id FROM lab_tests WHERE code=? AND is_active=1", (test_code,)).fetchone()
    if not test:
        conn.close()
        return jsonify({"error": "Lab test not found"}), 404

    cur = conn.cursor()
    cur.execute(
        "INSERT INTO lab_orders(usn, ordered_at, status, notes) VALUES(?,?,?,?)",
        (usn, datetime.utcnow().isoformat(), "Ordered", notes),
    )
    order_id = cur.lastrowid
    cur.execute(
        "INSERT INTO lab_order_items(lab_order_id, lab_test_id) VALUES(?,?)",
        (order_id, test["id"]),
    )
    conn.commit()
    conn.close()
    return jsonify({"id": order_id}), 201


@app.get("/api/lab-orders")
def api_list_lab_orders() -> Response:
    usn = (request.args.get("usn") or "").strip()
    conn = get_db()
    if usn:
        rows = conn.execute(
            """
            SELECT lo.*, loi.id AS item_id, lt.code, lt.name, loi.status, loi.result_value, loi.result_at
            FROM lab_orders lo
            JOIN lab_order_items loi ON loi.lab_order_id = lo.id
            JOIN lab_tests lt ON lt.id = loi.lab_test_id
            WHERE lo.usn = ?
            ORDER BY lo.ordered_at DESC
            """,
            (usn,),
        ).fetchall()
    else:
        rows = conn.execute(
            """
            SELECT lo.*, loi.id AS item_id, lt.code, lt.name, loi.status, loi.result_value, loi.result_at
            FROM lab_orders lo
            JOIN lab_order_items loi ON loi.lab_order_id = lo.id
            JOIN lab_tests lt ON lt.id = loi.lab_test_id
            ORDER BY lo.ordered_at DESC
            LIMIT 200
            """
        ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.post("/api/lab-results/<int:item_id>")
def api_set_lab_result(item_id: int) -> Response:
    data = request.get_json(silent=True) or {}
    value = (data.get("result_value") or "").strip()
    notes = (data.get("result_notes") or "").strip() or None

    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        UPDATE lab_order_items
        SET result_value = ?, result_notes = ?, result_at = ?, status = 'Completed'
        WHERE id = ?
        """,
        (value, notes, datetime.utcnow().isoformat(), item_id),
    )
    # If all items completed, mark order completed
    cur.execute(
        """
        UPDATE lab_orders
           SET status = CASE WHEN NOT EXISTS (
                SELECT 1 FROM lab_order_items WHERE lab_order_id = lab_orders.id AND status <> 'Completed'
           ) THEN 'Completed' ELSE status END
        WHERE id = (SELECT lab_order_id FROM lab_order_items WHERE id = ?)
        """,
        (item_id,),
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


# Dashboard metrics
@app.get("/api/metrics")
def api_metrics() -> Response:
    today = date.today().isoformat()
    conn = get_db()
    patients_count = conn.execute("SELECT COUNT(1) FROM patients").fetchone()[0]
    appts_today = conn.execute(
        "SELECT COUNT(1) FROM appointments WHERE substr(starts_at,1,10) = ?",
        (today,),
    ).fetchone()[0]
    labs_pending = conn.execute(
        "SELECT COUNT(1) FROM lab_order_items WHERE status <> 'Completed'"
    ).fetchone()[0]
    vitals_today = conn.execute(
        "SELECT COUNT(1) FROM vitals WHERE substr(recorded_at,1,10) = ?",
        (today,),
    ).fetchone()[0]
    conn.close()
    return jsonify({
        "patients": patients_count,
        "appointments_today": appts_today,
        "labs_pending": labs_pending,
        "vitals_today": vitals_today,
    })


# Export CSV (fix latest vitals selection)
@app.get("/export.csv")
def export_csv() -> Response:
    conn = get_db()
    patients = conn.execute("SELECT * FROM patients").fetchall()
    vitals_map: Dict[str, sqlite3.Row] = {}
    for v in conn.execute(
        """
        SELECT v.* FROM vitals v
        JOIN (
            SELECT usn, MAX(recorded_at) AS latest
            FROM vitals
            GROUP BY usn
        ) m ON m.usn = v.usn AND m.latest = v.recorded_at
        """
    ).fetchall():
        vitals_map[v["usn"]] = v

    rx = conn.execute("SELECT * FROM prescriptions").fetchall()
    conn.close()

    header = [
        "USN","Full Name","Age","Gender","Contact","Address",
        "BP","Pulse","Temp","Weight","Height","Vitals Time",
        "Prescription","Prescribed At"
    ]
    rows: List[List[str]] = []

    for p in patients:
        p_usn = p["usn"]
        v = vitals_map.get(p_usn)
        related = [r for r in rx if r["usn"] == p_usn]
        if not related:
            rows.append([
                p_usn, p["full_name"], str(p["age"]), p["gender"], p["contact"], p["address"],
                v["blood_pressure"] if v else "", str(v["pulse"]) if v else "", str(v["temperature"]) if v else "",
                str(v["weight"]) if v else "", str(v["height"]) if v else "", v["recorded_at"] if v else "",
                "", ""
            ])
        else:
            for r in related:
                rows.append([
                    p_usn, p["full_name"], str(p["age"]), p["gender"], p["contact"], p["address"],
                    v["blood_pressure"] if v else "", str(v["pulse"]) if v else "", str(v["temperature"]) if v else "",
                    str(v["weight"]) if v else "", str(v["height"]) if v else "", v["recorded_at"] if v else "",
                    r["notes"].replace("\n", " "), r["prescribed_at"]
                ])

    buf = io.StringIO()
    cw = csv.writer(buf)
    cw.writerow(header)
    cw.writerows(rows)
    data = buf.getvalue()
    return Response(
        data,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename=hmis-export.csv"},
    )


if __name__ == "__main__":
    init_db()
    app.run(debug=True)
