export type Patient = {
  usn: string;
  fullName: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  contact: string;
  address: string;
  id?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type Vitals = {
  id?: number;
  usn: string;
  bloodPressure: string;
  pulse: number;
  temperature: number;
  weight: number;
  height: number;
  recordedAt: string; // ISO
  bmi?: number;
  notes?: string;
};

export type Prescription = {
  id?: number;
  usn: string;
  notes: string;
  prescribedAt: string; // ISO
  clinician?: string;
  status?: "Active" | "Completed" | "Cancelled";
};

export type PrescriptionItem = {
  id?: number;
  prescriptionId: number;
  medicationId: number;
  medicationName?: string;
  dose: string;
  route: string;
  frequency: string;
  durationDays?: number;
  instructions?: string;
};

export type Appointment = {
  id?: number;
  usn: string;
  startsAt: string; // ISO
  endsAt: string; // ISO
  title?: string;
  clinician?: string;
  notes?: string;
  status?: "Scheduled" | "Confirmed" | "Cancelled" | "Completed" | "No Show";
  type?: "OPD" | "Emergency" | "Follow-up" | "Consultation";
};

export type Encounter = {
  id?: number;
  usn: string;
  encounterDt: string; // ISO
  encounterType: "OPD" | "Emergency" | "IPD" | "Follow-up";
  clinician?: string;
  reason?: string;
  notes?: string;
  status?: "Active" | "Completed";
};

export type Problem = {
  id?: number;
  usn: string;
  code?: string;
  description: string;
  onsetDate?: string;
  status: "Active" | "Resolved" | "Chronic";
  recordedAt: string;
};

export type Allergy = {
  id?: number;
  usn: string;
  substance: string;
  reaction?: string;
  severity?: "Mild" | "Moderate" | "Severe";
  recordedAt: string;
};

export type Medication = {
  id?: number;
  name: string;
  genericName?: string;
  form?: string;
  strength?: string;
  manufacturer?: string;
};

export type LabTest = {
  id?: number;
  name: string;
  code?: string;
  category?: string;
  normalRange?: string;
  unit?: string;
};

export type LabOrder = {
  id?: number;
  usn: string;
  testId: number;
  testName?: string;
  orderedAt: string;
  orderedBy?: string;
  status?: "Ordered" | "Collected" | "Processing" | "Completed" | "Cancelled";
  priority?: "Routine" | "Urgent" | "STAT";
  notes?: string;
};

export type LabResult = {
  id?: number;
  labOrderId: number;
  result?: string;
  resultedAt?: string;
  resultedBy?: string;
  notes?: string;
};

export type AuditLog = {
  id?: number;
  tableName: string;
  operation: "INSERT" | "UPDATE" | "DELETE";
  recordId: string;
  oldValues?: string;
  newValues?: string;
  userId?: string;
  timestamp: string;
};

// Search and filtering types
export type PatientSearchResult = Patient & {
  lastVisit?: string;
  activeProblems?: number;
  recentVitals?: Vitals;
};

export type SearchFilters = {
  query?: string;
  gender?: "Male" | "Female" | "Other";
  ageRange?: [number, number];
  hasActiveProblems?: boolean;
  visitDateRange?: [string, string];
};

// Form validation types
export type ValidationError = {
  field: string;
  message: string;
};

export type FormState<T> = {
  data: T;
  errors: ValidationError[];
  isSubmitting: boolean;
  isDirty: boolean;
};
