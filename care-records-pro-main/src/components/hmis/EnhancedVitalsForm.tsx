import { useEffect, useMemo, useState } from "react";
import { Patient, Vitals } from "@/types/hmis";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";

interface Props {
  patients: Patient[];
  vitals: Vitals[];
  setVitals: (v: Vitals[]) => void;
}

const initialVitalForm: Omit<Vitals, 'id'> = {
  usn: "",
  bloodPressure: "",
  pulse: 0,
  temperature: 0,
  weight: 0,
  height: 0,
  recordedAt: new Date().toISOString(),
  notes: "",
};

interface VitalRanges {
  systolic: { normal: [number, number]; high: number; low: number };
  diastolic: { normal: [number, number]; high: number; low: number };
  pulse: { normal: [number, number]; high: number; low: number };
  temperature: { normal: [number, number]; high: number; low: number };
  bmi: { 
    underweight: number;
    normal: [number, number];
    overweight: number;
    obese: number;
  };
}

const vitalRanges: VitalRanges = {
  systolic: { normal: [90, 120], high: 140, low: 90 },
  diastolic: { normal: [60, 80], high: 90, low: 60 },
  pulse: { normal: [60, 100], high: 100, low: 60 },
  temperature: { normal: [36.1, 37.2], high: 38, low: 36 },
  bmi: {
    underweight: 18.5,
    normal: [18.5, 24.9],
    overweight: 25,
    obese: 30
  }
};

export default function EnhancedVitalsForm({ patients, vitals, setVitals }: Props) {
  const [form, setForm] = useState<Omit<Vitals, 'id'>>(initialVitalForm);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Calculate BMI
  const calculatedBMI = useMemo(() => {
    if (form.weight > 0 && form.height > 0) {
      return Number((form.weight / Math.pow(form.height / 100, 2)).toFixed(1));
    }
    return 0;
  }, [form.weight, form.height]);

  // Parse blood pressure
  const bloodPressure = useMemo(() => {
    const match = form.bloodPressure.match(/(\d+)\/(\d+)/);
    if (match) {
      return {
        systolic: parseInt(match[1]),
        diastolic: parseInt(match[2])
      };
    }
    return null;
  }, [form.bloodPressure]);

  // Validation and health indicators
  const healthIndicators = useMemo(() => {
    const indicators: Array<{
      label: string;
      value: string;
      status: 'normal' | 'warning' | 'danger' | 'info';
      recommendation?: string;
    }> = [];

    // BMI Analysis
    if (calculatedBMI > 0) {
      let bmiStatus: 'normal' | 'warning' | 'danger' = 'normal';
      let bmiLabel = 'Normal';
      let bmiRecommendation = '';

      if (calculatedBMI < vitalRanges.bmi.underweight) {
        bmiStatus = 'warning';
        bmiLabel = 'Underweight';
        bmiRecommendation = 'Consider nutritional consultation';
      } else if (calculatedBMI >= vitalRanges.bmi.obese) {
        bmiStatus = 'danger';
        bmiLabel = 'Obese';
        bmiRecommendation = 'Weight management program recommended';
      } else if (calculatedBMI >= vitalRanges.bmi.overweight) {
        bmiStatus = 'warning';
        bmiLabel = 'Overweight';
        bmiRecommendation = 'Consider lifestyle modifications';
      }

      indicators.push({
        label: 'BMI',
        value: `${calculatedBMI} (${bmiLabel})`,
        status: bmiStatus,
        recommendation: bmiRecommendation
      });
    }

    // Blood Pressure Analysis
    if (bloodPressure) {
      const { systolic, diastolic } = bloodPressure;
      let bpStatus: 'normal' | 'warning' | 'danger' = 'normal';
      let bpLabel = 'Normal';
      let bpRecommendation = '';

      if (systolic >= 180 || diastolic >= 120) {
        bpStatus = 'danger';
        bpLabel = 'Hypertensive Crisis';
        bpRecommendation = 'Immediate medical attention required';
      } else if (systolic >= 140 || diastolic >= 90) {
        bpStatus = 'danger';
        bpLabel = 'High Blood Pressure';
        bpRecommendation = 'Monitor closely, consider medication';
      } else if (systolic >= 130 || diastolic >= 80) {
        bpStatus = 'warning';
        bpLabel = 'Elevated';
        bpRecommendation = 'Lifestyle modifications recommended';
      } else if (systolic < 90 || diastolic < 60) {
        bpStatus = 'warning';
        bpLabel = 'Low Blood Pressure';
        bpRecommendation = 'Monitor for symptoms';
      }

      indicators.push({
        label: 'Blood Pressure',
        value: `${form.bloodPressure} (${bpLabel})`,
        status: bpStatus,
        recommendation: bpRecommendation
      });
    }

    // Pulse Analysis
    if (form.pulse > 0) {
      let pulseStatus: 'normal' | 'warning' | 'danger' = 'normal';
      let pulseLabel = 'Normal';
      let pulseRecommendation = '';

      if (form.pulse > 120) {
        pulseStatus = 'danger';
        pulseLabel = 'Tachycardia';
        pulseRecommendation = 'Investigate underlying cause';
      } else if (form.pulse > 100) {
        pulseStatus = 'warning';
        pulseLabel = 'Elevated';
        pulseRecommendation = 'Monitor activity level and stress';
      } else if (form.pulse < 50) {
        pulseStatus = 'warning';
        pulseLabel = 'Bradycardia';
        pulseRecommendation = 'Check for athletic conditioning or medication effects';
      } else if (form.pulse < 60) {
        pulseStatus = 'info';
        pulseLabel = 'Low Normal';
      }

      indicators.push({
        label: 'Pulse',
        value: `${form.pulse} bpm (${pulseLabel})`,
        status: pulseStatus,
        recommendation: pulseRecommendation
      });
    }

    // Temperature Analysis
    if (form.temperature > 0) {
      let tempStatus: 'normal' | 'warning' | 'danger' = 'normal';
      let tempLabel = 'Normal';
      let tempRecommendation = '';

      if (form.temperature >= 39) {
        tempStatus = 'danger';
        tempLabel = 'High Fever';
        tempRecommendation = 'Consider immediate treatment';
      } else if (form.temperature >= 38) {
        tempStatus = 'warning';
        tempLabel = 'Fever';
        tempRecommendation = 'Monitor and consider antipyretics';
      } else if (form.temperature < 36) {
        tempStatus = 'warning';
        tempLabel = 'Hypothermia';
        tempRecommendation = 'Check for underlying causes';
      }

      indicators.push({
        label: 'Temperature',
        value: `${form.temperature}°C (${tempLabel})`,
        status: tempStatus,
        recommendation: tempRecommendation
      });
    }

    return indicators;
  }, [calculatedBMI, bloodPressure, form.pulse, form.temperature]);

  // Form validation
  const validation = useMemo(() => {
    const errors: string[] = [];
    
    if (!form.usn) errors.push('Please select a patient');
    if (!form.bloodPressure.match(/^\d+\/\d+$/)) errors.push('Blood pressure must be in format "120/80"');
    if (form.pulse <= 0 || form.pulse > 300) errors.push('Pulse must be between 1-300 bpm');
    if (form.temperature <= 0 || form.temperature > 50) errors.push('Temperature must be between 1-50°C');
    if (form.weight <= 0 || form.weight > 1000) errors.push('Weight must be between 1-1000 kg');
    if (form.height <= 0 || form.height > 300) errors.push('Height must be between 1-300 cm');

    return {
      isValid: errors.length === 0,
      errors
    };
  }, [form]);

  function handleChange<K extends keyof Omit<Vitals, 'id'>>(key: K, value: any) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function selectPatient(patient: Patient) {
    setSelectedPatient(patient);
    setForm(prev => ({ ...prev, usn: patient.usn }));
  }

  function reset() {
    setForm({
      ...initialVitalForm,
      recordedAt: new Date().toISOString()
    });
    setSelectedPatient(null);
    setEditingId(null);
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
      const vitalData: Vitals = {
        ...form,
        id: editingId || Date.now(),
        bmi: calculatedBMI || undefined,
        recordedAt: editingId ? form.recordedAt : new Date().toISOString()
      };

      if (editingId) {
        // Update existing
        const updated = vitals.map(v => v.id === editingId ? vitalData : v);
        setVitals(updated);
        toast({
          title: "Vitals updated",
          description: `Vital signs for ${selectedPatient?.fullName} have been updated.`
        });
      } else {
        // Create new
        setVitals([vitalData, ...vitals]);
        toast({
          title: "Vitals recorded",
          description: `Vital signs for ${selectedPatient?.fullName} have been recorded.`
        });
      }
      
      reset();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save vitals. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function editVitals(vital: Vitals) {
    const patient = patients.find(p => p.usn === vital.usn);
    if (!patient) return;
    
    setSelectedPatient(patient);
    setForm(vital);
    setEditingId(vital.id || null);
  }

  function deleteVitals(id: number) {
    if (!confirm('Are you sure you want to delete this vital signs record?')) return;
    
    setVitals(vitals.filter(v => v.id !== id));
    toast({
      title: "Vitals deleted",
      description: "Vital signs record has been removed."
    });
    
    if (editingId === id) reset();
  }

  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return patients;
    const query = searchQuery.toLowerCase();
    return patients.filter(patient => 
      patient.fullName.toLowerCase().includes(query) ||
      patient.usn.toLowerCase().includes(query)
    );
  }, [patients, searchQuery]);

  const patientVitals = useMemo(() => {
    return vitals.filter(v => selectedPatient && v.usn === selectedPatient.usn)
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
  }, [vitals, selectedPatient]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {editingId ? 'Edit Vitals' : 'Record Vital Signs'}
          </CardTitle>
          <CardDescription>
            Record vital signs including blood pressure, pulse, temperature, weight, and height
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
                {/* Vital Signs Form */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="bloodPressure">Blood Pressure *</Label>
                    <Input
                      id="bloodPressure"
                      placeholder="120/80"
                      value={form.bloodPressure}
                      onChange={e => handleChange("bloodPressure", e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pulse">Pulse (bpm) *</Label>
                    <Input
                      id="pulse"
                      type="number"
                      min={1}
                      max={300}
                      value={form.pulse || ''}
                      onChange={e => handleChange("pulse", Number(e.target.value))}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="temperature">Temperature (°C) *</Label>
                    <Input
                      id="temperature"
                      type="number"
                      step="0.1"
                      min={30}
                      max={50}
                      value={form.temperature || ''}
                      onChange={e => handleChange("temperature", Number(e.target.value))}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="weight">Weight (kg) *</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      min={1}
                      max={1000}
                      value={form.weight || ''}
                      onChange={e => handleChange("weight", Number(e.target.value))}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="height">Height (cm) *</Label>
                    <Input
                      id="height"
                      type="number"
                      min={50}
                      max={300}
                      value={form.height || ''}
                      onChange={e => handleChange("height", Number(e.target.value))}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>BMI (Calculated)</Label>
                    <div className="h-10 px-3 py-2 border rounded-md bg-muted">
                      {calculatedBMI || 'N/A'}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional observations or notes..."
                    value={form.notes || ''}
                    onChange={e => handleChange("notes", e.target.value)}
                    disabled={isSubmitting}
                    className="min-h-[80px]"
                  />
                </div>

                {/* Health Indicators */}
                {healthIndicators.length > 0 && (
                  <div className="space-y-3">
                    <Label>Health Indicators</Label>
                    <div className="space-y-2">
                      {healthIndicators.map((indicator, index) => (
                        <Alert 
                          key={index}
                          variant={indicator.status === 'danger' ? 'destructive' : 'default'}
                          className={
                            indicator.status === 'warning' ? 'border-yellow-500' : 
                            indicator.status === 'info' ? 'border-blue-500' : ''
                          }
                        >
                          <AlertDescription>
                            <div className="flex items-center justify-between">
                              <div>
                                <strong>{indicator.label}:</strong> {indicator.value}
                              </div>
                              <Badge 
                                variant={
                                  indicator.status === 'danger' ? 'destructive' :
                                  indicator.status === 'warning' ? 'secondary' :
                                  'outline'
                                }
                              >
                                {indicator.status}
                              </Badge>
                            </div>
                            {indicator.recommendation && (
                              <div className="mt-1 text-sm opacity-80">
                                Recommendation: {indicator.recommendation}
                              </div>
                            )}
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </div>
                )}

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
                      editingId ? "Update Vitals" : "Save Vitals"
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

      {/* Patient's Vitals History */}
      {selectedPatient && patientVitals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Vitals History for {selectedPatient.fullName}</CardTitle>
            <CardDescription>Previous vital signs records</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {patientVitals.map((vital) => (
                <div key={vital.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                      <div>
                        <div className="text-sm text-muted-foreground">Blood Pressure</div>
                        <div className="font-medium">{vital.bloodPressure}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Pulse</div>
                        <div className="font-medium">{vital.pulse} bpm</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Temperature</div>
                        <div className="font-medium">{vital.temperature}°C</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">BMI</div>
                        <div className="font-medium">{vital.bmi || 'N/A'}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => editVitals(vital)}
                        disabled={isSubmitting}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteVitals(vital.id!)}
                        disabled={isSubmitting}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Recorded: {new Date(vital.recordedAt).toLocaleString()}
                    {vital.notes && (
                      <div className="mt-1">Notes: {vital.notes}</div>
                    )}
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
