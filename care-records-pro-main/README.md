# 🏥 Enhanced Hospital Management Information System (HMIS)

A comprehensive medical management system with patient records, vitals tracking, and data export capabilities.

## 🚀 Quick Start

### Option 1: Standalone Mode (No Installation Required)
1. **Open the HTML file directly:**
   - Double-click `hmis-standalone.html`
   - Or right-click → "Open with" → Your browser
   - Works immediately with local storage

### Option 2: Full Database Integration
1. **Install Python** (if not already installed):
   - Download from: https://python.org/downloads/
   - Make sure to add Python to PATH during installation

2. **Start the Database Server:**
   - **Windows:** Double-click `start_server.bat`
   - **Mac/Linux:** Run `python start_server.py`
   - Server will start at: http://localhost:5000

3. **Open the Frontend:**
   - Open `hmis-standalone.html` in your browser
   - You'll see "Database Connected" when the backend is running

## 📋 Features

### 👤 Patient Management
- ✅ Add new patients with full demographics
- ✅ Edit existing patient information
- ✅ Search and filter patients
- ✅ Real-time form validation
- ✅ USN uniqueness checking

### 💓 Vitals Recording
- ✅ Comprehensive vital signs:
  - Weight & Height with BMI calculation
  - Blood Pressure with health categorization
  - Heart Rate, Temperature
  - Respiratory Rate, Oxygen Saturation
- ✅ Real-time health indicators
- ✅ Clinical notes and observations
- ✅ Vitals history tracking per patient

### 📊 Dashboard Analytics
- ✅ Patient demographics and statistics
- ✅ Health metrics overview
- ✅ Recent activity tracking
- ✅ Gender distribution analysis

### 📥 Data Export (CSV)
- ✅ **Patients Export:** Demographics and contact info
- ✅ **Vitals Export:** All recorded vital signs
- ✅ **Complete Data Export:** Comprehensive patient report
- ✅ **Database Integration:** Direct export from SQLite when connected

### 🔄 Data Synchronization
- ✅ **Offline Mode:** Works without internet using localStorage
- ✅ **Online Mode:** Syncs with SQLite database
- ✅ **Automatic Fallback:** Seamless switching between modes
- ✅ **Real-time Status:** Connection indicator

## 🗄️ Database Schema

When using the Flask backend, data is stored in SQLite with these tables:

```sql
-- Patient information
patients (usn, full_name, age, gender, contact, address)

-- Enhanced vitals with calculated BMI
vitals (
    id, usn, weight, height, 
    bmi (auto-calculated),
    blood_pressure_systolic, blood_pressure_diastolic,
    heart_rate, temperature, respiratory_rate, 
    oxygen_saturation, notes, recorded_at, recorded_by
)

-- Prescriptions and other medical records
prescriptions (id, usn, notes, prescribed_at)
```

## 🌐 API Endpoints

The Flask backend provides RESTful APIs:

### Patient Management
- `GET /api/patients` - List all patients
- `POST /api/patients` - Create new patient

### Vitals Management  
- `GET /api/vitals` - List vitals (optionally filtered by USN)
- `POST /api/vitals` - Record new vitals

### Data Export
- `GET /api/export/patients` - Export patients CSV
- `GET /api/export/vitals` - Export vitals CSV  
- `GET /api/export/complete` - Export comprehensive data CSV

### System Health
- `GET /api/health` - Check server status

## 💡 Usage Tips

### Recording Patient Vitals
1. Go to **"Vitals"** tab
2. Select a patient from the dropdown
3. Enter vital signs (required: weight, height, BP, heart rate, temperature)
4. View real-time BMI calculation and BP categorization
5. Add clinical notes if needed
6. Submit to save

### Exporting Data
1. Go to **"Export Data"** tab
2. Choose your export type:
   - **Individual exports:** Patients, Vitals, or Prescriptions
   - **Complete Data:** All patient info with latest vitals
3. Click export button to download CSV
4. Files are automatically saved to your Downloads folder

### Health Indicators
- **BMI Categories:** Underweight (<18.5), Normal (18.5-24.9), Overweight (25-29.9), Obese (≥30)
- **Blood Pressure:** Normal (<120/80), Elevated (120-129/<80), Stage 1 (130-139/80-89), Stage 2 (≥140/≥90)
- **Color Coding:** Green (normal), Yellow (caution), Orange (elevated), Red (high risk)

## 🔧 Technical Details

### Frontend Technology
- **React 18** with Hooks for state management
- **Tailwind CSS** for responsive styling
- **Vanilla JavaScript** with modern ES6+ features
- **LocalStorage** for offline data persistence

### Backend Technology
- **Python Flask** web framework
- **SQLite** database with foreign key constraints
- **RESTful APIs** with JSON responses
- **CSV export** functionality

### Data Flow
1. **Online Mode:** Frontend → Flask API → SQLite Database
2. **Offline Mode:** Frontend → LocalStorage
3. **Export Mode:** Database → CSV OR LocalStorage → CSV

## 🛠️ Troubleshooting

### "Database not connected" message
- Make sure Python is installed
- Run `start_server.bat` (Windows) or `python start_server.py`
- Check that port 5000 is not in use by other applications

### CSV export not working
- Make sure your browser allows downloads
- Check your Downloads folder
- Try a different browser if issues persist

### Data not saving
- In offline mode: Data saves to browser localStorage
- In online mode: Check that Flask server is running
- Clear browser cache if experiencing issues

## 📁 File Structure

```
care-records-pro-main/
├── hmis-standalone.html          # Main frontend application
├── start_server.py              # Python server launcher
├── start_server.bat             # Windows server launcher
├── python_hmis/
│   ├── app.py                   # Flask backend application
│   ├── hmis.db                  # SQLite database (auto-created)
│   └── requirements.txt         # Python dependencies
└── README.md                    # This file
```

## 🎯 Next Steps

1. **Start with standalone mode** to familiarize yourself with the interface
2. **Set up the database** for persistent storage and advanced features
3. **Add patients** and record their vitals
4. **Export data** for reporting and analysis
5. **Customize** the system for your specific medical workflow needs

---

**🏥 Your Enhanced HMIS is ready for professional medical practice!**

For support or customization requests, refer to the code comments or documentation within the source files.
