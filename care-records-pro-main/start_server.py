#!/usr/bin/env python3
"""
HMIS Flask Server Launcher
Run this script to start the HMIS backend server
"""

import os
import sys
import subprocess
from pathlib import Path

def main():
    # Get the directory containing this script
    script_dir = Path(__file__).parent
    app_dir = script_dir / "python_hmis"
    
    if not app_dir.exists():
        print("❌ Error: python_hmis directory not found!")
        print(f"   Looking for: {app_dir}")
        return 1
    
    app_file = app_dir / "app.py"
    if not app_file.exists():
        print("❌ Error: app.py not found!")
        print(f"   Looking for: {app_file}")
        return 1
    
    print("🏥 Starting HMIS Flask Server...")
    print(f"📁 Working directory: {app_dir}")
    print("🌐 Server will be available at: http://localhost:5000")
    print("📊 HMIS Frontend: Open hmis-standalone.html in your browser")
    print("⏹️  Press Ctrl+C to stop the server")
    print("-" * 60)
    
    try:
        # Change to the app directory and run Flask
        os.chdir(app_dir)
        
        # Set Flask environment variables
        env = os.environ.copy()
        env['FLASK_APP'] = 'app.py'
        env['FLASK_ENV'] = 'development'
        env['FLASK_DEBUG'] = '1'
        
        # Run Flask
        subprocess.run([
            sys.executable, '-m', 'flask', 'run', 
            '--host=0.0.0.0', '--port=5000'
        ], env=env)
        
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
        return 0
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
