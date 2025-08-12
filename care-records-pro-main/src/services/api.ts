import { Patient, Prescription, Vitals, Appointment, LabOrder, Encounter } from "@/types/hmis";

const API_BASE_URL = 'http://localhost:5000';

// Generic API request helper with better error handling
async function apiRequest<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText || response.statusText}`);
    }

    // Handle empty responses
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Network error occurred');
  }
}

// Fallback to localStorage if API is not available
function getLocalStorageData<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setLocalStorageData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save to localStorage:', error);
  }
}

// API availability check
let apiAvailable = true;

const checkApiHealth = async (): Promise<boolean> => {
  try {
    await fetch(`${API_BASE_URL}/health`, { method: 'GET' });
    apiAvailable = true;
    return true;
  } catch {
    apiAvailable = false;
    return false;
  }
};

// Patient API with localStorage fallback
export const patientApi = {
  getAll: async (): Promise<Patient[]> => {
    if (!apiAvailable) {
      return getLocalStorageData('patients', []);
    }
    
    try {
      return await apiRequest<Patient[]>('/api/patients');
    } catch {
      return getLocalStorageData('patients', []);
    }
  },
  
  getByUsn: async (usn: string): Promise<Patient | null> => {
    if (!apiAvailable) {
      const patients = getLocalStorageData<Patient[]>('patients', []);
      return patients.find(p => p.usn === usn) || null;
    }
    
    try {
      return await apiRequest<Patient>(`/api/patients/${usn}`);
    } catch {
      const patients = getLocalStorageData<Patient[]>('patients', []);
      return patients.find(p => p.usn === usn) || null;
    }
  },
  
  create: async (patient: Omit<Patient, 'id'>): Promise<Patient> => {
    if (!apiAvailable) {
      const patients = getLocalStorageData<Patient[]>('patients', []);
      const newPatient = { ...patient, id: Date.now() };
      const updated = [newPatient, ...patients];
      setLocalStorageData('patients', updated);
      return newPatient;
    }
    
    try {
      const result = await apiRequest<Patient>('/api/patients', {
        method: 'POST',
        body: JSON.stringify(patient),
      });
      
      // Update localStorage as backup
      const patients = getLocalStorageData<Patient[]>('patients', []);
      setLocalStorageData('patients', [result, ...patients.filter(p => p.usn !== result.usn)]);
      
      return result;
    } catch (error) {
      // Fallback to localStorage
      const patients = getLocalStorageData<Patient[]>('patients', []);
      const newPatient = { ...patient, id: Date.now() };
      const updated = [newPatient, ...patients];
      setLocalStorageData('patients', updated);
      throw error;
    }
  },
  
  update: async (usn: string, patientData: Partial<Patient>): Promise<Patient> => {
    if (!apiAvailable) {
      const patients = getLocalStorageData<Patient[]>('patients', []);
      const index = patients.findIndex(p => p.usn === usn);
      if (index === -1) throw new Error('Patient not found');
      
      const updated = [...patients];
      updated[index] = { ...updated[index], ...patientData };
      setLocalStorageData('patients', updated);
      return updated[index];
    }
    
    try {
      const result = await apiRequest<Patient>(`/api/patients/${usn}`, {
        method: 'PUT',
        body: JSON.stringify(patientData),
      });
      
      // Update localStorage
      const patients = getLocalStorageData<Patient[]>('patients', []);
      const updated = patients.map(p => p.usn === usn ? result : p);
      setLocalStorageData('patients', updated);
      
      return result;
    } catch (error) {
      // Fallback to localStorage
      const patients = getLocalStorageData<Patient[]>('patients', []);
      const index = patients.findIndex(p => p.usn === usn);
      if (index === -1) throw new Error('Patient not found');
      
      const updated = [...patients];
      updated[index] = { ...updated[index], ...patientData };
      setLocalStorageData('patients', updated);
      throw error;
    }
  },
  
  delete: async (usn: string): Promise<void> => {
    if (!apiAvailable) {
      const patients = getLocalStorageData<Patient[]>('patients', []);
      const filtered = patients.filter(p => p.usn !== usn);
      setLocalStorageData('patients', filtered);
      
      // Also remove related data
      const vitals = getLocalStorageData<Vitals[]>('vitals', []);
      setLocalStorageData('vitals', vitals.filter(v => v.usn !== usn));
      
      const prescriptions = getLocalStorageData<Prescription[]>('prescriptions', []);
      setLocalStorageData('prescriptions', prescriptions.filter(p => p.usn !== usn));
      
      return;
    }
    
    try {
      await apiRequest<void>(`/api/patients/${usn}`, {
        method: 'DELETE',
      });
      
      // Update localStorage
      const patients = getLocalStorageData<Patient[]>('patients', []);
      setLocalStorageData('patients', patients.filter(p => p.usn !== usn));
    } catch (error) {
      // Fallback to localStorage
      const patients = getLocalStorageData<Patient[]>('patients', []);
      setLocalStorageData('patients', patients.filter(p => p.usn !== usn));
      throw error;
    }
  },

  search: async (query: string): Promise<Patient[]> => {
    const patients = await patientApi.getAll();
    const searchTerm = query.toLowerCase();
    
    return patients.filter(patient => 
      patient.fullName.toLowerCase().includes(searchTerm) ||
      patient.usn.toLowerCase().includes(searchTerm) ||
      patient.contact.includes(searchTerm)
    );
  },
};

// Vitals API with localStorage fallback
export const vitalsApi = {
  getByUsn: async (usn: string): Promise<Vitals[]> => {
    if (!apiAvailable) {
      const allVitals = getLocalStorageData<Vitals[]>('vitals', []);
      return allVitals.filter(v => v.usn === usn);
    }
    
    try {
      return await apiRequest<Vitals[]>(`/api/vitals/${usn}`);
    } catch {
      const allVitals = getLocalStorageData<Vitals[]>('vitals', []);
      return allVitals.filter(v => v.usn === usn);
    }
  },
  
  create: async (vitals: Omit<Vitals, 'id'>): Promise<Vitals> => {
    const newVitals = { 
      ...vitals, 
      id: Date.now(),
      bmi: vitals.height > 0 ? Number((vitals.weight / Math.pow(vitals.height / 100, 2)).toFixed(1)) : undefined
    };
    
    if (!apiAvailable) {
      const allVitals = getLocalStorageData<Vitals[]>('vitals', []);
      const updated = [newVitals, ...allVitals];
      setLocalStorageData('vitals', updated);
      return newVitals;
    }
    
    try {
      const result = await apiRequest<Vitals>('/api/vitals', {
        method: 'POST',
        body: JSON.stringify(newVitals),
      });
      
      // Update localStorage
      const allVitals = getLocalStorageData<Vitals[]>('vitals', []);
      setLocalStorageData('vitals', [result, ...allVitals]);
      
      return result;
    } catch (error) {
      // Fallback to localStorage
      const allVitals = getLocalStorageData<Vitals[]>('vitals', []);
      setLocalStorageData('vitals', [newVitals, ...allVitals]);
      throw error;
    }
  },
  
  update: async (id: number, vitalsData: Partial<Vitals>): Promise<Vitals> => {
    if (!apiAvailable) {
      const allVitals = getLocalStorageData<Vitals[]>('vitals', []);
      const index = allVitals.findIndex(v => v.id === id);
      if (index === -1) throw new Error('Vitals record not found');
      
      const updated = [...allVitals];
      updated[index] = { ...updated[index], ...vitalsData };
      
      // Recalculate BMI if weight or height changed
      if (vitalsData.weight || vitalsData.height) {
        const { weight, height } = updated[index];
        if (weight && height && height > 0) {
          updated[index].bmi = Number((weight / Math.pow(height / 100, 2)).toFixed(1));
        }
      }
      
      setLocalStorageData('vitals', updated);
      return updated[index];
    }
    
    try {
      return await apiRequest<Vitals>(`/api/vitals/${id}`, {
        method: 'PUT',
        body: JSON.stringify(vitalsData),
      });
    } catch (error) {
      throw error;
    }
  },
  
  delete: async (id: number): Promise<void> => {
    if (!apiAvailable) {
      const allVitals = getLocalStorageData<Vitals[]>('vitals', []);
      setLocalStorageData('vitals', allVitals.filter(v => v.id !== id));
      return;
    }
    
    try {
      await apiRequest<void>(`/api/vitals/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      throw error;
    }
  },
};

// Prescription API with localStorage fallback
export const prescriptionApi = {
  getByUsn: async (usn: string): Promise<Prescription[]> => {
    if (!apiAvailable) {
      const allPrescriptions = getLocalStorageData<Prescription[]>('prescriptions', []);
      return allPrescriptions.filter(p => p.usn === usn);
    }
    
    try {
      return await apiRequest<Prescription[]>(`/api/prescriptions/${usn}`);
    } catch {
      const allPrescriptions = getLocalStorageData<Prescription[]>('prescriptions', []);
      return allPrescriptions.filter(p => p.usn === usn);
    }
  },
  
  create: async (prescription: Omit<Prescription, 'id'>): Promise<Prescription> => {
    const newPrescription = { ...prescription, id: Date.now() };
    
    if (!apiAvailable) {
      const allPrescriptions = getLocalStorageData<Prescription[]>('prescriptions', []);
      const updated = [newPrescription, ...allPrescriptions];
      setLocalStorageData('prescriptions', updated);
      return newPrescription;
    }
    
    try {
      const result = await apiRequest<Prescription>('/api/prescriptions', {
        method: 'POST',
        body: JSON.stringify(prescription),
      });
      
      // Update localStorage
      const allPrescriptions = getLocalStorageData<Prescription[]>('prescriptions', []);
      setLocalStorageData('prescriptions', [result, ...allPrescriptions]);
      
      return result;
    } catch (error) {
      // Fallback to localStorage
      const allPrescriptions = getLocalStorageData<Prescription[]>('prescriptions', []);
      setLocalStorageData('prescriptions', [newPrescription, ...allPrescriptions]);
      throw error;
    }
  },
  
  update: async (id: number, prescriptionData: Partial<Prescription>): Promise<Prescription> => {
    if (!apiAvailable) {
      const allPrescriptions = getLocalStorageData<Prescription[]>('prescriptions', []);
      const index = allPrescriptions.findIndex(p => p.id === id);
      if (index === -1) throw new Error('Prescription not found');
      
      const updated = [...allPrescriptions];
      updated[index] = { ...updated[index], ...prescriptionData };
      setLocalStorageData('prescriptions', updated);
      return updated[index];
    }
    
    try {
      return await apiRequest<Prescription>(`/api/prescriptions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(prescriptionData),
      });
    } catch (error) {
      throw error;
    }
  },
  
  delete: async (id: number): Promise<void> => {
    if (!apiAvailable) {
      const allPrescriptions = getLocalStorageData<Prescription[]>('prescriptions', []);
      setLocalStorageData('prescriptions', allPrescriptions.filter(p => p.id !== id));
      return;
    }
    
    try {
      await apiRequest<void>(`/api/prescriptions/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      throw error;
    }
  },

  print: async (id: number): Promise<string> => {
    try {
      const response = await fetch(`${API_BASE_URL}/prescription/print/${id}`);
      return await response.text();
    } catch (error) {
      throw new Error('Failed to generate prescription print');
    }
  },
};

// Initialize API health check
checkApiHealth();

// Export utility functions
export { checkApiHealth, getLocalStorageData, setLocalStorageData };
