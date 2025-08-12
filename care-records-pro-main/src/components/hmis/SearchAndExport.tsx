import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Patient, Prescription, Vitals } from "@/types/hmis";

interface Props {
  patients: Patient[];
  vitals: Vitals[];
  prescriptions: Prescription[];
}

function toCSV(rows: string[][]) {
  return rows.map(r => r.map(f => `"${String(f).replace(/"/g, '""')}"`).join(",")).join("\n");
}

export default function SearchAndExport({ patients, vitals, prescriptions }: Props) {
  const [query, setQuery] = useState("");

  const patient = useMemo(() => patients.find(p => p.usn === query.trim()), [patients, query]);
  const patientVitals = useMemo(() => vitals.filter(v => v.usn === query.trim()), [vitals, query]);
  const patientPrescriptions = useMemo(() => prescriptions.filter(p => p.usn === query.trim()), [prescriptions, query]);

  function handleExport() {
    const header = [
      "USN","Full Name","Age","Gender","Contact","Address",
      "BP","Pulse","Temp","Weight","Height","Vitals Time",
      "Prescription","Prescribed At"
    ];

    const rows: string[][] = [];
    if (patients.length === 0) return;

    patients.forEach(p => {
      const personVitals = vitals.filter(v => v.usn === p.usn);
      const latestVitals = personVitals[0];
      const personRx = prescriptions.filter(pr => pr.usn === p.usn);

      if (personRx.length === 0) {
        rows.push([
          p.usn, p.fullName, String(p.age), p.gender, p.contact, p.address,
          latestVitals?.bloodPressure ?? "", String(latestVitals?.pulse ?? ""), String(latestVitals?.temperature ?? ""), String(latestVitals?.weight ?? ""), String(latestVitals?.height ?? ""), latestVitals?.recordedAt ?? "",
          "", ""
        ]);
      } else {
        personRx.forEach(rx => {
          rows.push([
            p.usn, p.fullName, String(p.age), p.gender, p.contact, p.address,
            latestVitals?.bloodPressure ?? "", String(latestVitals?.pulse ?? ""), String(latestVitals?.temperature ?? ""), String(latestVitals?.weight ?? ""), String(latestVitals?.height ?? ""), latestVitals?.recordedAt ?? "",
            rx.notes.replace(/\n/g, " "), rx.prescribedAt
          ]);
        });
      }
    });

    const csv = toCSV([header, ...rows]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hmis-export-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="card-elevated">
      <CardHeader>
        <CardTitle>Search & Export</CardTitle>
        <CardDescription>Find patient by USN and export all data to CSV.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="search-usn">Search by USN</Label>
            <Input id="search-usn" placeholder="e.g., 1AB20CS001" value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button onClick={handleExport} className="w-full md:w-auto cta-hero text-primary-foreground">Export CSV</Button>
          </div>
        </div>

        {patient && (
          <div className="grid gap-2 rounded-lg border p-4">
            <h3 className="text-lg font-semibold">Patient</h3>
            <div className="grid md:grid-cols-3 gap-2 text-sm">
              <div><strong>USN:</strong> {patient.usn}</div>
              <div><strong>Name:</strong> {patient.fullName}</div>
              <div><strong>Age/Gender:</strong> {patient.age} / {patient.gender}</div>
              <div><strong>Contact:</strong> {patient.contact}</div>
              <div className="md:col-span-2"><strong>Address:</strong> {patient.address}</div>
            </div>

            {patientVitals.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium">Latest Vitals</h4>
                <div className="text-sm grid md:grid-cols-6 gap-2">
                  <div>BP: {patientVitals[0].bloodPressure}</div>
                  <div>Pulse: {patientVitals[0].pulse}</div>
                  <div>Temp: {patientVitals[0].temperature}</div>
                  <div>Weight: {patientVitals[0].weight}</div>
                  <div>Height: {patientVitals[0].height}</div>
                  <div>Time: {new Date(patientVitals[0].recordedAt).toLocaleString()}</div>
                </div>
              </div>
            )}

            {patientPrescriptions.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium">Prescriptions ({patientPrescriptions.length})</h4>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {patientPrescriptions.map((rx, i) => (
                    <li key={i}><span className="font-medium">{new Date(rx.prescribedAt).toLocaleString()}:</span> {rx.notes}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
