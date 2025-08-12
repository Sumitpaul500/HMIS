import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Patient, Prescription, Vitals } from "@/types/hmis";
import Dashboard from "@/components/hmis/Dashboard";
import EnhancedPatientForm from "@/components/hmis/EnhancedPatientForm";
import EnhancedPatientSearch from "@/components/hmis/EnhancedPatientSearch";
import EnhancedVitalsForm from "@/components/hmis/EnhancedVitalsForm";
import EnhancedPrescriptionForm from "@/components/hmis/EnhancedPrescriptionForm";
import SearchAndExport from "@/components/hmis/SearchAndExport";
import { loadFromStorage, saveToStorage } from "@/utils/storage";

const Index = () => {
  const [patients, setPatients] = useState<Patient[]>(() => loadFromStorage("patients", [] as Patient[]));
  const [vitals, setVitals] = useState<Vitals[]>(() => loadFromStorage("vitals", [] as Vitals[]));
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(() => loadFromStorage("prescriptions", [] as Prescription[]));
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');

  // Check API connection status
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch('http://localhost:5000/health');
        setConnectionStatus(response.ok ? 'connected' : 'disconnected');
      } catch {
        setConnectionStatus('disconnected');
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Cascade delete: remove patient + linked records
  const onDeletePatient = (usn: string) => {
    setPatients(prev => prev.filter(p => p.usn !== usn));
    setVitals(prev => prev.filter(v => v.usn !== usn));
    setPrescriptions(prev => prev.filter(r => r.usn !== usn));
    
    if (selectedPatient?.usn === usn) {
      setSelectedPatient(null);
    }
  };

  // Save to localStorage whenever data changes
  useEffect(() => {
    saveToStorage("patients", patients);
  }, [patients]);
  
  useEffect(() => {
    saveToStorage("vitals", vitals);
  }, [vitals]);
  
  useEffect(() => {
    saveToStorage("prescriptions", prescriptions);
  }, [prescriptions]);

  useEffect(() => {
    document.title = "Hospital Management Information System (HMIS)";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Advanced HMIS for patient data, vitals, prescriptions with real-time sync and CSV export.");
  }, []);

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    // Auto-switch to appropriate tab based on context
    if (activeTab === "dashboard" || activeTab === "search") {
      setActiveTab("patient");
    }
  };

  const handlePatientEdit = (patient: Patient) => {
    setSelectedPatient(patient);
    setActiveTab("patient");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Header */}
      <header className="py-8 px-4 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                Hospital Management Information System
              </h1>
              <p className="mt-2 text-muted-foreground">
                Advanced patient care management with real-time data synchronization
              </p>
            </div>
            
            {/* Connection Status */}
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                connectionStatus === 'connected' ? 'bg-green-100 text-green-800' :
                connectionStatus === 'disconnected' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500' :
                  connectionStatus === 'disconnected' ? 'bg-red-500' :
                  'bg-yellow-500'
                }`} />
                {connectionStatus === 'connected' ? 'Online' : 
                 connectionStatus === 'disconnected' ? 'Offline' : 'Checking...'}
              </div>
              
              {selectedPatient && (
                <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-accent rounded-full text-sm">
                  <span>Selected:</span>
                  <span className="font-medium">{selectedPatient.fullName}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto max-w-7xl px-4 py-6">
        {connectionStatus === 'disconnected' && (
          <Alert className="mb-6">
            <AlertDescription>
              <strong>Offline Mode:</strong> Working with local data. Changes will sync when connection is restored.
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 md:grid-cols-6 mb-6">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="search">Search</TabsTrigger>
            <TabsTrigger value="patient">Patients</TabsTrigger>
            <TabsTrigger value="vitals">Vitals</TabsTrigger>
            <TabsTrigger value="prescription">Prescriptions</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>

          {/* Enhanced Dashboard */}
          <TabsContent value="dashboard">
            <Dashboard
              patients={patients}
              vitals={vitals}
              prescriptions={prescriptions}
              onPatientSelect={handlePatientSelect}
            />
          </TabsContent>

          {/* Enhanced Search Tab */}
          <TabsContent value="search">
            <EnhancedPatientSearch
              patients={patients}
              onPatientSelect={handlePatientSelect}
              onPatientEdit={handlePatientEdit}
              selectedPatient={selectedPatient}
            />
          </TabsContent>

          {/* Enhanced Patient Management */}
          <TabsContent value="patient">
            <EnhancedPatientForm
              patients={patients}
              setPatients={setPatients}
              onDeletePatient={onDeletePatient}
              selectedPatient={selectedPatient}
              onPatientChange={setSelectedPatient}
            />
          </TabsContent>

          {/* Enhanced Vitals Management */}
          <TabsContent value="vitals">
            <EnhancedVitalsForm
              patients={patients}
              vitals={vitals}
              setVitals={setVitals}
            />
          </TabsContent>

          {/* Enhanced Prescription Management */}
          <TabsContent value="prescription">
            <EnhancedPrescriptionForm
              patients={patients}
              prescriptions={prescriptions}
              setPrescriptions={setPrescriptions}
            />
          </TabsContent>

          {/* Export and Search */}
          <TabsContent value="export">
            <SearchAndExport 
              patients={patients} 
              vitals={vitals} 
              prescriptions={prescriptions} 
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
