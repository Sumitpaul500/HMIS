import { useEffect, useMemo, useState } from "react";
import { Patient, Prescription, PrescriptionItem, Medication } from "@/types/hmis";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";

interface Props {
  patients: Patient[];
  prescriptions: Prescription[];
  setPrescriptions: (p: Prescription[]) => void;
}

const initialPrescription: Omit<Prescription, 'id'> = {
  usn: "",
  notes: "",
  prescribedAt: new Date().toISOString(),
  clinician: "",
  status: "Active",
};

const initialMedicationItem: Omit<PrescriptionItem, 'id' | 'prescriptionId'> = {
  medicationId: 0,
  medicationName: "",
  dose: "",
  route: "Oral",
  frequency: "",
  durationDays: 7,
  instructions: "",
};

// Common medications database
const commonMedications: Medication[] = [
  { id: 1, name: "Paracetamol", genericName: "Acetaminophen", form: "Tablet", strength: "500mg" },
  { id: 2, name: "Ibuprofen", genericName: "Ibuprofen", form: "Tablet", strength: "400mg" },
  { id: 3, name: "Amoxicillin", genericName: "Amoxicillin", form: "Capsule", strength: "500mg" },
  { id: 4, name: "Metformin", genericName: "Metformin HCl", form: "Tablet", strength: "500mg" },
  { id: 5, name: "Amlodipine", genericName: "Amlodipine Besylate", form: "Tablet", strength: "5mg" },
  { id: 6, name: "Atorvastatin", genericName: "Atorvastatin Calcium", form: "Tablet", strength: "20mg" },
  { id: 7, name: "Omeprazole", genericName: "Omeprazole", form: "Capsule", strength: "20mg" },
  { id: 8, name: "Aspirin", genericName: "Acetylsalicylic Acid", form: "Tablet", strength: "75mg" },
  { id: 9, name: "Cetirizine", genericName: "Cetirizine HCl", form: "Tablet", strength: "10mg" },
  { id: 10, name: "Salbutamol", genericName: "Salbutamol Sulfate", form: "Inhaler", strength: "100mcg" },
];

const routes = ["Oral", "Injection", "Topical", "Inhalation", "Sublingual", "Rectal"];
const frequencies = ["Once daily", "Twice daily", "Thrice daily", "Four times daily", "As needed", "Before meals", "After meals"];

export default function EnhancedPrescriptionForm({ patients, prescriptions, setPrescriptions }: Props) {
  const [form, setForm] = useState<Omit<Prescription, 'id'>>(initialPrescription);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Medication items for current prescription
  const [medicationItems, setMedicationItems] = useState<Array<Omit<PrescriptionItem, 'id' | 'prescriptionId'>>>([]);
  const [currentMedication, setCurrentMedication] = useState<Omit<PrescriptionItem, 'id' | 'prescriptionId'>>(initialMedicationItem);
  const [medicationSearch, setMedicationSearch] = useState("");

  // Validation
  const validation = useMemo(() => {
    const errors: string[] = [];
    
    if (!form.usn) errors.push('Please select a patient');
    if (!form.notes.trim()) errors.push('Prescription notes are required');
    if (!form.clinician.trim()) errors.push('Clinician name is required');
    if (medicationItems.length === 0) errors.push('At least one medication must be added');
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }, [form, medicationItems]);

  // Filter medications
  const filteredMedications = useMemo(() => {
    if (!medicationSearch.trim()) return commonMedications;
    const query = medicationSearch.toLowerCase();
    return commonMedications.filter(med => 
      med.name.toLowerCase().includes(query) ||
      (med.genericName && med.genericName.toLowerCase().includes(query))
    );
  }, [medicationSearch]);

  // Filter patients
  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return patients;
    const query = searchQuery.toLowerCase();
    return patients.filter(patient => 
      patient.fullName.toLowerCase().includes(query) ||
      patient.usn.toLowerCase().includes(query)
    );
  }, [patients, searchQuery]);

  // Patient's prescription history
  const patientPrescriptions = useMemo(() => {
    return prescriptions
      .filter(p => selectedPatient && p.usn === selectedPatient.usn)
      .sort((a, b) => new Date(b.prescribedAt).getTime() - new Date(a.prescribedAt).getTime());
  }, [prescriptions, selectedPatient]);

  function handleChange<K extends keyof Omit<Prescription, 'id'>>(key: K, value: any) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function selectPatient(patient: Patient) {
    setSelectedPatient(patient);
    setForm(prev => ({ ...prev, usn: patient.usn }));
  }

  function selectMedication(medication: Medication) {
    setCurrentMedication(prev => ({
      ...prev,
      medicationId: medication.id!,
      medicationName: medication.name,
    }));
    setMedicationSearch("");
  }

  function addMedication() {
    if (!currentMedication.medicationName || !currentMedication.dose || !currentMedication.frequency) {
      toast({
        title: "Incomplete Medication",
        description: "Please fill in medication name, dose, and frequency",
        variant: "destructive"
      });
      return;
    }

    setMedicationItems(prev => [...prev, { ...currentMedication }]);
    setCurrentMedication(initialMedicationItem);
    toast({
      title: "Medication Added",
      description: `${currentMedication.medicationName} has been added to the prescription`
    });
  }

  function removeMedication(index: number) {
    setMedicationItems(prev => prev.filter((_, i) => i !== index));
  }

  function reset() {
    setForm(initialPrescription);
    setSelectedPatient(null);
    setEditingId(null);
    setMedicationItems([]);
    setCurrentMedication(initialMedicationItem);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!validation.isValid) {
      toast({
        title: "Validation Error",
        description: validation.errors[0],
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const prescriptionData: Prescription = {
        ...form,
        id: editingId || Date.now(),
        prescribedAt: editingId ? form.prescribedAt : new Date().toISOString()
      };

      // Add medication items to localStorage (in a real app, this would be stored relationally)
      const prescriptionWithMeds = {
        ...prescriptionData,
        medications: medicationItems
      };

      if (editingId) {
        // Update existing
        const updated = prescriptions.map(p => p.id === editingId ? prescriptionData : p);
        setPrescriptions(updated);
        toast({
          title: "Prescription updated",
          description: `Prescription for ${selectedPatient?.fullName} has been updated.`
        });
      } else {
        // Create new
        setPrescriptions([prescriptionData, ...prescriptions]);
        
        // Save medication items separately (for demo purposes)
        const existingMeds = JSON.parse(localStorage.getItem('prescriptionMedications') || '[]');
        const newMedEntry = {
          prescriptionId: prescriptionData.id,
          medications: medicationItems
        };
        localStorage.setItem('prescriptionMedications', JSON.stringify([newMedEntry, ...existingMeds]));
        
        toast({
          title: "Prescription created",
          description: `Prescription for ${selectedPatient?.fullName} has been created with ${medicationItems.length} medications.`
        });
      }
      
      reset();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save prescription. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function editPrescription(prescription: Prescription) {
    const patient = patients.find(p => p.usn === prescription.usn);
    if (!patient) return;
    
    setSelectedPatient(patient);
    setForm(prescription);
    setEditingId(prescription.id || null);
    
    // Load medication items for this prescription
    const existingMeds = JSON.parse(localStorage.getItem('prescriptionMedications') || '[]');
    const prescriptionMeds = existingMeds.find((entry: any) => entry.prescriptionId === prescription.id);
    if (prescriptionMeds) {
      setMedicationItems(prescriptionMeds.medications || []);
    }
  }

  function deletePrescription(id: number) {
    if (!confirm('Are you sure you want to delete this prescription?')) return;
    
    setPrescriptions(prescriptions.filter(p => p.id !== id));
    
    // Remove medication items
    const existingMeds = JSON.parse(localStorage.getItem('prescriptionMedications') || '[]');
    const filteredMeds = existingMeds.filter((entry: any) => entry.prescriptionId !== id);
    localStorage.setItem('prescriptionMedications', JSON.stringify(filteredMeds));
    
    toast({
      title: "Prescription deleted",
      description: "Prescription has been removed."
    });
    
    if (editingId === id) reset();
  }

  function duplicatePrescription(prescription: Prescription) {
    const patient = patients.find(p => p.usn === prescription.usn);
    if (!patient) return;
    
    setSelectedPatient(patient);
    setForm({
      ...prescription,
      prescribedAt: new Date().toISOString(),
      notes: `[Copy] ${prescription.notes}`
    });
    setEditingId(null);
    
    // Load medication items
    const existingMeds = JSON.parse(localStorage.getItem('prescriptionMedications') || '[]');
    const prescriptionMeds = existingMeds.find((entry: any) => entry.prescriptionId === prescription.id);
    if (prescriptionMeds) {
      setMedicationItems(prescriptionMeds.medications || []);
    }
    
    toast({
      title: "Prescription copied",
      description: "Prescription has been duplicated for editing"
    });
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {editingId ? 'Edit Prescription' : 'Create New Prescription'}
          </CardTitle>
          <CardDescription>
            Create detailed prescriptions with medication management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Patient Selection */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Search and Select Patient</Label>
                <Input
                  placeholder="Search patients by name or USN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {searchQuery && (
                <div className="max-h-48 overflow-y-auto border rounded-md">
                  {filteredPatients.map(patient => (
                    <div
                      key={patient.usn}
                      className={`p-3 cursor-pointer hover:bg-accent border-b last:border-b-0 ${
                        selectedPatient?.usn === patient.usn ? 'bg-accent' : ''
                      }`}
                      onClick={() => selectPatient(patient)}
                    >
                      <div className="font-medium">{patient.fullName}</div>
                      <div className="text-sm text-muted-foreground">
                        USN: {patient.usn} • Age: {patient.age} • {patient.gender}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedPatient && (
                <div className="p-3 bg-accent rounded-md">
                  <div className="font-medium">Selected Patient: {selectedPatient.fullName}</div>
                  <div className="text-sm text-muted-foreground">
                    USN: {selectedPatient.usn} • Age: {selectedPatient.age} • {selectedPatient.gender}
                  </div>
                </div>
              )}
            </div>

            {selectedPatient && (
              <>
                {/* Prescription Details */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="clinician">Clinician/Doctor Name *</Label>
                    <Input
                      id="clinician"
                      value={form.clinician}
                      onChange={e => handleChange("clinician", e.target.value)}
                      placeholder="Dr. John Smith"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={form.status} onValueChange={value => handleChange("status", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Medication Management */}
                <Card>
                  <CardHeader>
                    <CardTitle>Add Medications</CardTitle>
                    <CardDescription>Search and add medications to this prescription</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Medication Search */}
                    <div className="space-y-2">
                      <Label>Search Medications</Label>
                      <Input
                        placeholder="Search medications..."
                        value={medicationSearch}
                        onChange={(e) => setMedicationSearch(e.target.value)}
                      />
                    </div>

                    {medicationSearch && (
                      <div className="max-h-32 overflow-y-auto border rounded-md">
                        {filteredMedications.map(medication => (
                          <div
                            key={medication.id}
                            className="p-2 cursor-pointer hover:bg-accent border-b last:border-b-0"
                            onClick={() => selectMedication(medication)}
                          >
                            <div className="font-medium">{medication.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {medication.genericName} • {medication.form} • {medication.strength}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Current Medication Form */}
                    <div className="p-4 border rounded-lg space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Medication Name *</Label>
                          <Input
                            value={currentMedication.medicationName}
                            onChange={e => setCurrentMedication(prev => ({ ...prev, medicationName: e.target.value }))}
                            placeholder="Enter medication name"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Dose *</Label>
                          <Input
                            value={currentMedication.dose}
                            onChange={e => setCurrentMedication(prev => ({ ...prev, dose: e.target.value }))}
                            placeholder="e.g., 500mg, 5ml"
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                          <Label>Route</Label>
                          <Select 
                            value={currentMedication.route} 
                            onValueChange={value => setCurrentMedication(prev => ({ ...prev, route: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {routes.map(route => (
                                <SelectItem key={route} value={route}>{route}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Frequency *</Label>
                          <Select 
                            value={currentMedication.frequency} 
                            onValueChange={value => setCurrentMedication(prev => ({ ...prev, frequency: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                            <SelectContent>
                              {frequencies.map(freq => (
                                <SelectItem key={freq} value={freq}>{freq}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Duration (days)</Label>
                          <Input
                            type="number"
                            min={1}
                            max={365}
                            value={currentMedication.durationDays || ''}
                            onChange={e => setCurrentMedication(prev => ({ ...prev, durationDays: Number(e.target.value) }))}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Special Instructions</Label>
                        <Textarea
                          value={currentMedication.instructions}
                          onChange={e => setCurrentMedication(prev => ({ ...prev, instructions: e.target.value }))}
                          placeholder="e.g., Take with food, Avoid alcohol..."
                          className="min-h-[60px]"
                        />
                      </div>

                      <Button type="button" onClick={addMedication}>
                        Add Medication
                      </Button>
                    </div>

                    {/* Added Medications List */}
                    {medicationItems.length > 0 && (
                      <div className="space-y-2">
                        <Label>Added Medications ({medicationItems.length})</Label>
                        <div className="space-y-2">
                          {medicationItems.map((item, index) => (
                            <div key={index} className="p-3 border rounded-lg">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="font-medium">{item.medicationName}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {item.dose} • {item.route} • {item.frequency}
                                    {item.durationDays && ` • ${item.durationDays} days`}
                                  </div>
                                  {item.instructions && (
                                    <div className="text-sm text-muted-foreground mt-1">
                                      Instructions: {item.instructions}
                                    </div>
                                  )}
                                </div>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => removeMedication(index)}
                                >
                                  Remove
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Prescription Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Prescription Notes *</Label>
                  <Textarea
                    id="notes"
                    value={form.notes}
                    onChange={e => handleChange("notes", e.target.value)}
                    placeholder="Enter prescription notes, diagnosis, and additional instructions..."
                    disabled={isSubmitting}
                    className="min-h-[120px]"
                  />
                </div>

                {/* Form Actions */}
                <div className="flex gap-3">
                  <Button 
                    type="submit" 
                    disabled={!validation.isValid || isSubmitting}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </div>
                    ) : (
                      editingId ? "Update Prescription" : "Create Prescription"
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={reset}
                    disabled={isSubmitting}
                  >
                    {editingId ? "Cancel Edit" : "Reset"}
                  </Button>
                </div>

                {/* Validation Errors */}
                {!validation.isValid && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      <ul className="list-disc ml-4">
                        {validation.errors.map((error, idx) => (
                          <li key={idx}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Patient's Prescription History */}
      {selectedPatient && patientPrescriptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Prescription History for {selectedPatient.fullName}</CardTitle>
            <CardDescription>Previous prescriptions and medications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {patientPrescriptions.map((prescription) => (
                <div key={prescription.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={prescription.status === 'Active' ? 'default' : 'secondary'}>
                          {prescription.status || 'Active'}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          by {prescription.clinician}
                        </span>
                      </div>
                      <div className="text-sm mb-2">{prescription.notes}</div>
                      <div className="text-xs text-muted-foreground">
                        Prescribed: {new Date(prescription.prescribedAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => duplicatePrescription(prescription)}
                        disabled={isSubmitting}
                      >
                        Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => editPrescription(prescription)}
                        disabled={isSubmitting}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deletePrescription(prescription.id!)}
                        disabled={isSubmitting}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
