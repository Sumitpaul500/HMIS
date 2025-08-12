import { useEffect, useMemo, useState } from "react";
import { Patient } from "@/types/hmis";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";

interface Props {
  patients: Patient[];
  setPatients: (p: Patient[]) => void;
  onDeletePatient: (usn: string) => void;
  selectedPatient?: Patient | null;
  onPatientChange?: (patient: Patient | null) => void;
}

interface ValidationResult {
  isValid: boolean;
  errors: { field: string; message: string }[];
  warnings: { field: string; message: string }[];
}

const initialFormState: Patient = {
  usn: "",
  fullName: "",
  age: 0,
  gender: "Male",
  contact: "",
  address: "",
};

export default function EnhancedPatientForm({ 
  patients, 
  setPatients, 
  onDeletePatient,
  selectedPatient,
  onPatientChange
}: Props) {
  const [form, setForm] = useState<Patient>(initialFormState);
  const [editingUSN, setEditingUSN] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    isValid: true,
    errors: [],
    warnings: []
  });
  const [showValidation, setShowValidation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const exists = useMemo(() => 
    patients.some(p => p.usn === form.usn.trim() && p.usn !== editingUSN), 
    [patients, form.usn, editingUSN]
  );

  // Real-time validation
  const validateForm = useMemo((): ValidationResult => {
    const errors: { field: string; message: string }[] = [];
    const warnings: { field: string; message: string }[] = [];

    // Required field validation
    if (!form.usn.trim()) {
      errors.push({ field: 'usn', message: 'USN is required' });
    } else if (!/^[A-Za-z0-9]+$/.test(form.usn.trim())) {
      errors.push({ field: 'usn', message: 'USN should contain only letters and numbers' });
    } else if (exists) {
      errors.push({ field: 'usn', message: 'USN already exists' });
    }

    if (!form.fullName.trim()) {
      errors.push({ field: 'fullName', message: 'Full name is required' });
    } else if (form.fullName.trim().length < 2) {
      errors.push({ field: 'fullName', message: 'Name should be at least 2 characters' });
    } else if (!/^[a-zA-Z\s.]+$/.test(form.fullName.trim())) {
      warnings.push({ field: 'fullName', message: 'Name contains unusual characters' });
    }

    if (!form.age || form.age <= 0) {
      errors.push({ field: 'age', message: 'Age must be a positive number' });
    } else if (form.age > 150) {
      warnings.push({ field: 'age', message: 'Age seems unusually high' });
    } else if (form.age < 1) {
      warnings.push({ field: 'age', message: 'Age seems unusually low' });
    }

    if (!form.contact.trim()) {
      errors.push({ field: 'contact', message: 'Contact number is required' });
    } else if (!/^\+?[\d\s\-\(\)]{10,15}$/.test(form.contact.trim())) {
      warnings.push({ field: 'contact', message: 'Contact number format may be invalid' });
    }

    if (!form.address.trim()) {
      errors.push({ field: 'address', message: 'Address is required' });
    } else if (form.address.trim().length < 5) {
      warnings.push({ field: 'address', message: 'Address seems too short' });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }, [form, exists]);

  useEffect(() => {
    setValidationResult(validateForm);
  }, [validateForm]);

  // Auto-select patient when clicked from search
  useEffect(() => {
    if (selectedPatient && selectedPatient.usn !== editingUSN) {
      setForm({ ...selectedPatient });
      setEditingUSN(selectedPatient.usn);
      onPatientChange?.(selectedPatient);
    }
  }, [selectedPatient, editingUSN, onPatientChange]);

  function handleChange<K extends keyof Patient>(key: K, value: Patient[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
    setShowValidation(true);
  }

  function reset() {
    setForm(initialFormState);
    setEditingUSN(null);
    setShowValidation(false);
    setValidationResult({ isValid: true, errors: [], warnings: [] });
    onPatientChange?.(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setShowValidation(true);
    
    if (!validationResult.isValid) {
      toast({ 
        title: "Validation Error", 
        description: validationResult.errors[0]?.message || "Please check the form",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const usn = form.usn.trim();

      if (editingUSN) {
        // Update existing
        const updatedPatients = patients.map(p => 
          p.usn === editingUSN ? { ...form, usn: editingUSN } : p
        );
        setPatients(updatedPatients);
        toast({ 
          title: "Patient updated", 
          description: `${form.fullName} has been successfully updated.`
        });
      } else {
        // Create new
        const newPatient = { ...form, usn };
        setPatients([newPatient, ...patients]);
        toast({ 
          title: "Patient saved", 
          description: `${form.fullName} has been successfully added.`
        });
      }
      
      reset();
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to save patient. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function editPatient(usn: string) {
    const p = patients.find(x => x.usn === usn);
    if (!p) return;
    setForm({ ...p });
    setEditingUSN(usn);
    setShowValidation(false);
    onPatientChange?.(p);
  }

  async function deletePatient(usn: string) {
    if (!confirm(`Are you sure you want to delete patient ${usn}? This will also remove all associated records.`)) {
      return;
    }

    try {
      onDeletePatient(usn);
      toast({ 
        title: "Patient deleted", 
        description: `${usn} and all linked records have been removed.`
      });
      if (editingUSN === usn) reset();
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to delete patient. Please try again.",
        variant: "destructive"
      });
    }
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getFieldError = (field: string) => {
    return validationResult.errors.find(e => e.field === field);
  };

  const getFieldWarning = (field: string) => {
    return validationResult.warnings.find(w => w.field === field);
  };

  const completionPercentage = useMemo(() => {
    const fields = ['usn', 'fullName', 'age', 'contact', 'address'];
    const completed = fields.filter(field => {
      const value = form[field as keyof Patient];
      return value && value.toString().trim() !== '' && value !== 0;
    }).length;
    return Math.round((completed / fields.length) * 100);
  }, [form]);

  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return patients;
    const query = searchQuery.toLowerCase();
    return patients.filter(patient => 
      patient.fullName.toLowerCase().includes(query) ||
      patient.usn.toLowerCase().includes(query) ||
      patient.contact.includes(query)
    );
  }, [patients, searchQuery]);

  return (
    <div className="space-y-6">
      <Card className="card-elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {editingUSN ? 'Edit Patient' : 'Add New Patient'}
              </CardTitle>
              <CardDescription>
                {editingUSN 
                  ? `Editing patient record for ${editingUSN}`
                  : 'Add a new patient to the system. USN must be unique.'
                }
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Form Completion</div>
              <div className="flex items-center gap-2">
                <Progress value={completionPercentage} className="w-20" />
                <span className="text-sm font-medium">{completionPercentage}%</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Real-time validation summary */}
            {showValidation && (validationResult.errors.length > 0 || validationResult.warnings.length > 0) && (
              <div className="space-y-2">
                {validationResult.errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      <strong>Please fix these errors:</strong>
                      <ul className="mt-1 ml-4 list-disc">
                        {validationResult.errors.map((error, idx) => (
                          <li key={idx}>{error.message}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
                {validationResult.warnings.length > 0 && (
                  <Alert>
                    <AlertDescription>
                      <strong>Warnings:</strong>
                      <ul className="mt-1 ml-4 list-disc">
                        {validationResult.warnings.map((warning, idx) => (
                          <li key={idx}>{warning.message}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            <div className="grid gap-6">
              {/* Basic Information */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="usn">University Seat Number (USN) *</Label>
                  <Input 
                    id="usn" 
                    value={form.usn} 
                    onChange={e => handleChange("usn", e.target.value.toUpperCase())} 
                    placeholder="e.g., 1AB20CS001"
                    disabled={!!editingUSN || isSubmitting}
                    className={getFieldError('usn') ? 'border-destructive' : ''}
                  />
                  {getFieldError('usn') && (
                    <p className="text-sm text-destructive">{getFieldError('usn')?.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input 
                    id="fullName" 
                    value={form.fullName} 
                    onChange={e => handleChange("fullName", e.target.value)} 
                    placeholder="Enter full name"
                    disabled={isSubmitting}
                    className={getFieldError('fullName') ? 'border-destructive' : ''}
                  />
                  {getFieldError('fullName') && (
                    <p className="text-sm text-destructive">{getFieldError('fullName')?.message}</p>
                  )}
                  {getFieldWarning('fullName') && (
                    <p className="text-sm text-yellow-600">{getFieldWarning('fullName')?.message}</p>
                  )}
                </div>
              </div>

              {/* Demographics */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">Age *</Label>
                  <Input 
                    id="age" 
                    type="number" 
                    min={0} 
                    max={150}
                    value={form.age || ''} 
                    onChange={e => handleChange("age", Number(e.target.value))} 
                    placeholder="Age"
                    disabled={isSubmitting}
                    className={getFieldError('age') ? 'border-destructive' : ''}
                  />
                  {getFieldError('age') && (
                    <p className="text-sm text-destructive">{getFieldError('age')?.message}</p>
                  )}
                  {getFieldWarning('age') && (
                    <p className="text-sm text-yellow-600">{getFieldWarning('age')?.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Gender *</Label>
                  <Select 
                    value={form.gender} 
                    onValueChange={value => handleChange("gender", value as Patient["gender"])}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact">Contact Number *</Label>
                  <Input 
                    id="contact" 
                    inputMode="tel" 
                    value={form.contact} 
                    onChange={e => handleChange("contact", e.target.value)} 
                    placeholder="Phone number"
                    disabled={isSubmitting}
                    className={getFieldError('contact') ? 'border-destructive' : ''}
                  />
                  {getFieldError('contact') && (
                    <p className="text-sm text-destructive">{getFieldError('contact')?.message}</p>
                  )}
                  {getFieldWarning('contact') && (
                    <p className="text-sm text-yellow-600">{getFieldWarning('contact')?.message}</p>
                  )}
                </div>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address">Address *</Label>
                <Textarea 
                  id="address" 
                  value={form.address} 
                  onChange={e => handleChange("address", e.target.value)} 
                  placeholder="Enter complete address"
                  disabled={isSubmitting}
                  className={`min-h-[80px] ${getFieldError('address') ? 'border-destructive' : ''}`}
                />
                {getFieldError('address') && (
                  <p className="text-sm text-destructive">{getFieldError('address')?.message}</p>
                )}
                {getFieldWarning('address') && (
                  <p className="text-sm text-yellow-600">{getFieldWarning('address')?.message}</p>
                )}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 pt-4">
              <Button 
                type="submit" 
                disabled={!validationResult.isValid || isSubmitting}
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </div>
                ) : (
                  editingUSN ? "Update Patient" : "Save Patient"
                )}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={reset}
                disabled={isSubmitting}
              >
                {editingUSN ? "Cancel Edit" : "Reset Form"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Patient List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Patient Records ({patients.length})</CardTitle>
              <CardDescription>Manage existing patient records</CardDescription>
            </div>
            <div className="w-64">
              <Input
                placeholder="Search patients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredPatients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? 'No patients found matching your search' : 'No patients added yet'}
              </div>
            ) : (
              filteredPatients.map((patient) => (
                <div 
                  key={patient.usn} 
                  className={`flex items-center justify-between gap-4 p-3 border rounded-lg transition-colors hover:bg-accent ${
                    editingUSN === patient.usn ? 'bg-accent border-primary' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="text-sm">
                        {getInitials(patient.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium truncate">{patient.fullName}</h4>
                        <Badge variant="outline" className="text-xs">
                          {patient.gender}
                        </Badge>
                        {editingUSN === patient.usn && (
                          <Badge variant="default" className="text-xs">
                            Editing
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        USN: {patient.usn} • Age: {patient.age} • {patient.contact}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {patient.address}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => editPatient(patient.usn)}
                      disabled={isSubmitting}
                    >
                      {editingUSN === patient.usn ? 'Editing' : 'Edit'}
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => deletePatient(patient.usn)}
                      disabled={isSubmitting}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
