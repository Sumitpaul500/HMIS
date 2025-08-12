import { useMemo } from "react";
import { Patient, Vitals, Prescription } from "@/types/hmis";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Props {
  patients: Patient[];
  vitals: Vitals[];
  prescriptions: Prescription[];
  onPatientSelect?: (patient: Patient) => void;
}

interface HealthMetrics {
  averageBMI: number;
  averageAge: number;
  hypertensionRate: number;
  underweightCount: number;
  overweightCount: number;
  recentVisits: number;
}

export default function Dashboard({ patients, vitals, prescriptions, onPatientSelect }: Props) {
  // Calculate health metrics
  const healthMetrics: HealthMetrics = useMemo(() => {
    const recentVitals = vitals.filter(v => {
      const vitalDate = new Date(v.recordedAt);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return vitalDate > thirtyDaysAgo;
    });

    const avgBMI = recentVitals.length > 0 
      ? recentVitals.reduce((sum, v) => sum + (v.bmi || 0), 0) / recentVitals.filter(v => v.bmi).length
      : 0;

    const avgAge = patients.length > 0 
      ? patients.reduce((sum, p) => sum + p.age, 0) / patients.length 
      : 0;

    // Count hypertension (BP > 140/90)
    const hypertensionCount = recentVitals.filter(v => {
      const bpMatch = v.bloodPressure.match(/(\d+)\/(\d+)/);
      if (bpMatch) {
        const systolic = parseInt(bpMatch[1]);
        const diastolic = parseInt(bpMatch[2]);
        return systolic >= 140 || diastolic >= 90;
      }
      return false;
    }).length;

    const hypertensionRate = recentVitals.length > 0 ? (hypertensionCount / recentVitals.length) * 100 : 0;

    // BMI categories
    const underweight = recentVitals.filter(v => v.bmi && v.bmi < 18.5).length;
    const overweight = recentVitals.filter(v => v.bmi && v.bmi >= 25).length;

    return {
      averageBMI: Number(avgBMI.toFixed(1)),
      averageAge: Number(avgAge.toFixed(1)),
      hypertensionRate: Number(hypertensionRate.toFixed(1)),
      underweightCount: underweight,
      overweightCount: overweight,
      recentVisits: recentVitals.length
    };
  }, [patients, vitals]);

  // Demographics breakdown
  const demographics = useMemo(() => {
    const ageGroups = {
      'Children (0-12)': patients.filter(p => p.age <= 12).length,
      'Teenagers (13-19)': patients.filter(p => p.age >= 13 && p.age <= 19).length,
      'Adults (20-39)': patients.filter(p => p.age >= 20 && p.age <= 39).length,
      'Middle-aged (40-64)': patients.filter(p => p.age >= 40 && p.age <= 64).length,
      'Seniors (65+)': patients.filter(p => p.age >= 65).length,
    };

    const genderDistribution = {
      Male: patients.filter(p => p.gender === 'Male').length,
      Female: patients.filter(p => p.gender === 'Female').length,
      Other: patients.filter(p => p.gender === 'Other').length,
    };

    return { ageGroups, genderDistribution };
  }, [patients]);

  // Recent activity
  const recentActivity = useMemo(() => {
    const recentPatients = [...patients]
      .sort((a, b) => b.usn.localeCompare(a.usn))
      .slice(0, 5);

    const recentVitals = [...vitals]
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
      .slice(0, 5);

    const recentPrescriptions = [...prescriptions]
      .sort((a, b) => new Date(b.prescribedAt).getTime() - new Date(a.prescribedAt).getTime())
      .slice(0, 5);

    return { recentPatients, recentVitals, recentPrescriptions };
  }, [patients, vitals, prescriptions]);

  // Alert conditions
  const alerts = useMemo(() => {
    const alerts: Array<{
      type: 'warning' | 'danger' | 'info';
      title: string;
      description: string;
      count?: number;
    }> = [];

    // High BMI alerts
    const obeseCount = vitals.filter(v => v.bmi && v.bmi >= 30).length;
    if (obeseCount > 0) {
      alerts.push({
        type: 'warning',
        title: 'Obesity Alert',
        description: `${obeseCount} patients with BMI ≥ 30`,
        count: obeseCount
      });
    }

    // Hypertension alerts
    const hyperCount = vitals.filter(v => {
      const bpMatch = v.bloodPressure.match(/(\d+)\/(\d+)/);
      if (bpMatch) {
        const systolic = parseInt(bpMatch[1]);
        return systolic >= 180;
      }
      return false;
    }).length;

    if (hyperCount > 0) {
      alerts.push({
        type: 'danger',
        title: 'Hypertensive Crisis',
        description: `${hyperCount} patients with severe hypertension`,
        count: hyperCount
      });
    }

    // Data quality alerts
    const patientsWithoutVitals = patients.filter(p => 
      !vitals.some(v => v.usn === p.usn)
    ).length;

    if (patientsWithoutVitals > 0) {
      alerts.push({
        type: 'info',
        title: 'Missing Vitals',
        description: `${patientsWithoutVitals} patients without recorded vitals`,
        count: patientsWithoutVitals
      });
    }

    return alerts;
  }, [patients, vitals]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{patients.length}</div>
            <div className="text-sm text-muted-foreground">Total Patients</div>
            <div className="mt-2">
              <div className="text-xs text-muted-foreground">
                {demographics.genderDistribution.Male}M • {demographics.genderDistribution.Female}F
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{healthMetrics.averageAge}</div>
            <div className="text-sm text-muted-foreground">Average Age</div>
            <div className="mt-2">
              <div className="text-xs text-muted-foreground">
                Range: {patients.length > 0 ? Math.min(...patients.map(p => p.age)) : 0} - {patients.length > 0 ? Math.max(...patients.map(p => p.age)) : 0} years
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{healthMetrics.recentVisits}</div>
            <div className="text-sm text-muted-foreground">Recent Vitals (30d)</div>
            <div className="mt-2">
              <div className="text-xs text-muted-foreground">
                Avg BMI: {healthMetrics.averageBMI || 'N/A'}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{prescriptions.length}</div>
            <div className="text-sm text-muted-foreground">Total Prescriptions</div>
            <div className="mt-2">
              <div className="text-xs text-muted-foreground">
                Active: {prescriptions.filter(p => p.status !== 'Completed').length}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Health Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Health Alerts</CardTitle>
            <CardDescription>Important health indicators requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert, index) => (
                <div key={index} className={`p-3 rounded-lg border ${
                  alert.type === 'danger' ? 'border-red-200 bg-red-50' :
                  alert.type === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                  'border-blue-200 bg-blue-50'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{alert.title}</div>
                      <div className="text-sm text-muted-foreground">{alert.description}</div>
                    </div>
                    <Badge variant={alert.type === 'danger' ? 'destructive' : 'secondary'}>
                      {alert.count}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Demographics */}
        <Card>
          <CardHeader>
            <CardTitle>Patient Demographics</CardTitle>
            <CardDescription>Age and gender distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="age" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="age">Age Groups</TabsTrigger>
                <TabsTrigger value="gender">Gender</TabsTrigger>
              </TabsList>
              
              <TabsContent value="age" className="space-y-3">
                {Object.entries(demographics.ageGroups).map(([group, count]) => {
                  const percentage = patients.length > 0 ? (count / patients.length * 100).toFixed(1) : '0';
                  return (
                    <div key={group} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{group}</span>
                        <span>{count} ({percentage}%)</span>
                      </div>
                      <Progress value={Number(percentage)} className="h-2" />
                    </div>
                  );
                })}
              </TabsContent>
              
              <TabsContent value="gender" className="space-y-3">
                {Object.entries(demographics.genderDistribution).map(([gender, count]) => {
                  const percentage = patients.length > 0 ? (count / patients.length * 100).toFixed(1) : '0';
                  return (
                    <div key={gender} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{gender}</span>
                        <span>{count} ({percentage}%)</span>
                      </div>
                      <Progress value={Number(percentage)} className="h-2" />
                    </div>
                  );
                })}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Health Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Health Overview</CardTitle>
            <CardDescription>Key health indicators from recent vitals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Hypertension Rate</span>
                  <span>{healthMetrics.hypertensionRate}%</span>
                </div>
                <Progress value={healthMetrics.hypertensionRate} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Underweight Patients</span>
                  <span>{healthMetrics.underweightCount}</span>
                </div>
                <div className="h-2 bg-muted rounded">
                  <div 
                    className="h-full bg-yellow-500 rounded" 
                    style={{ width: `${patients.length > 0 ? (healthMetrics.underweightCount / patients.length * 100) : 0}%` }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Overweight/Obese Patients</span>
                  <span>{healthMetrics.overweightCount}</span>
                </div>
                <div className="h-2 bg-muted rounded">
                  <div 
                    className="h-full bg-orange-500 rounded" 
                    style={{ width: `${patients.length > 0 ? (healthMetrics.overweightCount / patients.length * 100) : 0}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t">
                <div className="text-sm text-muted-foreground">
                  Average BMI: <span className="font-medium">{healthMetrics.averageBMI || 'N/A'}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest patient registrations and medical records</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="patients" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="patients">New Patients</TabsTrigger>
              <TabsTrigger value="vitals">Recent Vitals</TabsTrigger>
              <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
            </TabsList>
            
            <TabsContent value="patients" className="space-y-3">
              {recentActivity.recentPatients.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No patients registered yet
                </div>
              ) : (
                recentActivity.recentPatients.map((patient) => (
                  <div 
                    key={patient.usn}
                    className="flex items-center gap-3 p-3 hover:bg-accent rounded-lg cursor-pointer"
                    onClick={() => onPatientSelect?.(patient)}
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium">{getInitials(patient.fullName)}</span>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{patient.fullName}</div>
                      <div className="text-sm text-muted-foreground">
                        USN: {patient.usn} • {patient.age} years • {patient.gender}
                      </div>
                    </div>
                    <Badge variant="outline">{patient.gender}</Badge>
                  </div>
                ))
              )}
            </TabsContent>
            
            <TabsContent value="vitals" className="space-y-3">
              {recentActivity.recentVitals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No vitals recorded yet
                </div>
              ) : (
                recentActivity.recentVitals.map((vital) => {
                  const patient = patients.find(p => p.usn === vital.usn);
                  return (
                    <div key={vital.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{patient?.fullName || 'Unknown Patient'}</div>
                          <div className="text-sm text-muted-foreground">
                            BP: {vital.bloodPressure} • Pulse: {vital.pulse} • Temp: {vital.temperature}°C
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">BMI: {vital.bmi || 'N/A'}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(vital.recordedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </TabsContent>
            
            <TabsContent value="prescriptions" className="space-y-3">
              {recentActivity.recentPrescriptions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No prescriptions created yet
                </div>
              ) : (
                recentActivity.recentPrescriptions.map((prescription) => {
                  const patient = patients.find(p => p.usn === prescription.usn);
                  return (
                    <div key={prescription.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{patient?.fullName || 'Unknown Patient'}</div>
                          <div className="text-sm text-muted-foreground line-clamp-2">
                            {prescription.notes}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={prescription.status === 'Active' ? 'default' : 'secondary'}>
                            {prescription.status || 'Active'}
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(prescription.prescribedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
