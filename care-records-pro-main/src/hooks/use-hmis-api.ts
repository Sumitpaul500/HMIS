import { useState, useEffect, useCallback } from 'react';
import { 
  Patient, 
  Vitals, 
  Prescription, 
  Appointment, 
  LabOrder, 
  Encounter 
} from '@/types/hmis';
import {
  patientApi,
  vitalsApi,
  prescriptionApi,
  checkApiHealth
} from '@/services/api';

// Generic hook for API operations with loading and error states
interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

function useApiState<T>(initialData: T | null = null): [
  ApiState<T>,
  (data: T | null) => void,
  (loading: boolean) => void,
  (error: string | null) => void
] {
  const [state, setState] = useState<ApiState<T>>({
    data: initialData,
    loading: false,
    error: null,
  });

  const setData = useCallback((data: T | null) => {
    setState(prev => ({ ...prev, data, error: null }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error, loading: false }));
  }, []);

  return [state, setData, setLoading, setError];
}

// Patient hooks
export const usePatients = () => {
  const [state, setData, setLoading, setError] = useApiState<Patient[]>([]);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const patients = await patientApi.getAll();
      setData(patients);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch patients');
    } finally {
      setLoading(false);
    }
  }, [setData, setLoading, setError]);

  const createPatient = useCallback(async (patient: Omit<Patient, 'id'>) => {
    setLoading(true);
    try {
      const newPatient = await patientApi.create(patient);
      setData([newPatient, ...(state.data || [])]);
      return newPatient;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create patient');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [state.data, setData, setLoading, setError]);

  const updatePatient = useCallback(async (usn: string, patientData: Partial<Patient>) => {
    setLoading(true);
    try {
      const updatedPatient = await patientApi.update(usn, patientData);
      setData((state.data || []).map(p => p.usn === usn ? updatedPatient : p));
      return updatedPatient;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update patient');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [state.data, setData, setLoading, setError]);

  const deletePatient = useCallback(async (usn: string) => {
    setLoading(true);
    try {
      await patientApi.delete(usn);
      setData((state.data || []).filter(p => p.usn !== usn));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete patient');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [state.data, setData, setLoading, setError]);

  const searchPatients = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const results = await patientApi.search(query);
      return results;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to search patients');
      return [];
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  return {
    ...state,
    refetch: fetchPatients,
    createPatient,
    updatePatient,
    deletePatient,
    searchPatients,
  };
};

// Patient vitals hooks
export const useVitals = (usn: string) => {
  const [state, setData, setLoading, setError] = useApiState<Vitals[]>([]);

  const fetchVitals = useCallback(async () => {
    if (!usn) return;
    setLoading(true);
    try {
      const vitals = await vitalsApi.getByUsn(usn);
      setData(vitals);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch vitals');
    } finally {
      setLoading(false);
    }
  }, [usn, setData, setLoading, setError]);

  const createVitals = useCallback(async (vitals: Omit<Vitals, 'id'>) => {
    setLoading(true);
    try {
      const newVitals = await vitalsApi.create(vitals);
      setData([newVitals, ...(state.data || [])]);
      return newVitals;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create vitals');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [state.data, setData, setLoading, setError]);

  const updateVitals = useCallback(async (id: number, vitalsData: Partial<Vitals>) => {
    setLoading(true);
    try {
      const updatedVitals = await vitalsApi.update(id, vitalsData);
      setData((state.data || []).map(v => v.id === id ? updatedVitals : v));
      return updatedVitals;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update vitals');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [state.data, setData, setLoading, setError]);

  const deleteVitals = useCallback(async (id: number) => {
    setLoading(true);
    try {
      await vitalsApi.delete(id);
      setData((state.data || []).filter(v => v.id !== id));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete vitals');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [state.data, setData, setLoading, setError]);

  useEffect(() => {
    fetchVitals();
  }, [fetchVitals]);

  return {
    ...state,
    refetch: fetchVitals,
    createVitals,
    updateVitals,
    deleteVitals,
  };
};

// Prescription hooks
export const usePrescriptions = (usn: string) => {
  const [state, setData, setLoading, setError] = useApiState<Prescription[]>([]);

  const fetchPrescriptions = useCallback(async () => {
    if (!usn) return;
    setLoading(true);
    try {
      const prescriptions = await prescriptionApi.getByUsn(usn);
      setData(prescriptions);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch prescriptions');
    } finally {
      setLoading(false);
    }
  }, [usn, setData, setLoading, setError]);

  const createPrescription = useCallback(async (prescription: Omit<Prescription, 'id'>) => {
    setLoading(true);
    try {
      const newPrescription = await prescriptionApi.create(prescription);
      setData([newPrescription, ...(state.data || [])]);
      return newPrescription;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create prescription');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [state.data, setData, setLoading, setError]);

  const updatePrescription = useCallback(async (id: number, prescriptionData: Partial<Prescription>) => {
    setLoading(true);
    try {
      const updatedPrescription = await prescriptionApi.update(id, prescriptionData);
      setData((state.data || []).map(p => p.id === id ? updatedPrescription : p));
      return updatedPrescription;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update prescription');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [state.data, setData, setLoading, setError]);

  const deletePrescription = useCallback(async (id: number) => {
    setLoading(true);
    try {
      await prescriptionApi.delete(id);
      setData((state.data || []).filter(p => p.id !== id));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete prescription');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [state.data, setData, setLoading, setError]);

  useEffect(() => {
    fetchPrescriptions();
  }, [fetchPrescriptions]);

  return {
    ...state,
    refetch: fetchPrescriptions,
    createPrescription,
    updatePrescription,
    deletePrescription,
  };
};

// Connection status hook
export const useConnectionStatus = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [apiStatus, setApiStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');

  const checkConnection = useCallback(async () => {
    setApiStatus('checking');
    try {
      const isHealthy = await checkApiHealth();
      setApiStatus(isHealthy ? 'connected' : 'disconnected');
    } catch {
      setApiStatus('disconnected');
    }
  }, []);

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check every 30 seconds
    
    const handleOnline = () => {
      setIsOnline(true);
      checkConnection();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setApiStatus('disconnected');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkConnection]);

  return {
    isOnline,
    apiStatus,
    refetch: checkConnection,
  };
};
