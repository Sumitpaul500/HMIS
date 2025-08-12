import { useMemo, useState } from "react";
import { Vitals } from "@/types/hmis";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Patient } from "@/types/hmis";

interface Props {
  patients: Patient[];
  vitals: Vitals[];
  setVitals: (v: Vitals[]) => void;
}

export default function VitalsForm({ patients, vitals, setVitals }: Props) {
  const [quickQuery, setQuickQuery] = useState("");
  const match = useMemo(() => {
    const q = quickQuery.trim();
    if (!q) return undefined;
    return patients.find(p => p.usn === q || p.contact === q);
  }, [patients, quickQuery]);

  const [form, setForm] = useState<Omit<Vitals, "recordedAt">>({
    usn: "",
    bloodPressure: "",
    pulse: 0,
    temperature: 98.4,
    weight: 0,
    height: 0,
  });

  function handleChange<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function adoptMatch() {
    if (match) {
      setForm(prev => ({ ...prev, usn: match.usn }));
      toast({ title: "Patient selected", description: `${match.fullName} (${match.usn})` });
    } else if (quickQuery.trim()) {
      toast({ title: "No match found" });
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const usn = form.usn.trim();
    const found = patients.find(p => p.usn === usn);
    if (!usn || !found) return toast({ title: "Patient not found", description: "Enter a valid USN first." });
    if (!form.bloodPressure.trim()) return toast({ title: "Blood Pressure is required" });
    if (form.pulse <= 0 || form.temperature <= 0 || form.weight <= 0 || form.height <= 0)
      return toast({ title: "All vitals must be positive" });

    const record: Vitals = { ...form, usn, recordedAt: new Date().toISOString() };
    setVitals([record, ...vitals]);
    toast({ title: "Vitals saved", description: `Recorded for ${usn}` });
    setForm({ usn: "", bloodPressure: "", pulse: 0, temperature: 98.4, weight: 0, height: 0 });
    setQuickQuery("");
  }

  return (
    <Card className="card-elevated">
      <CardHeader>
        <CardTitle>Vitals Entry</CardTitle>
        <CardDescription>Link vitals to a patient by USN. Quick search by USN or phone.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="q">Quick Search (USN or Phone)</Label>
            <Input id="q" value={quickQuery} onChange={e => setQuickQuery(e.target.value)} placeholder="1AB20CS001 or 9876543210"/>
          </div>
          <div className="flex items-end">
            <Button type="button" variant="outline" onClick={adoptMatch} className="w-full md:w-auto">Use Match</Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="usn-v">USN</Label>
              <Input id="usn-v" value={form.usn} onChange={e => handleChange("usn", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bp">Blood Pressure</Label>
              <Input id="bp" placeholder="120/80" value={form.bloodPressure} onChange={e => handleChange("bloodPressure", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pulse">Pulse (bpm)</Label>
              <Input id="pulse" type="number" value={form.pulse} onChange={e => handleChange("pulse", Number(e.target.value))} />
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="temp">Temperature (°F)</Label>
              <Input id="temp" type="number" step="0.1" value={form.temperature} onChange={e => handleChange("temperature", Number(e.target.value))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input id="weight" type="number" step="0.1" value={form.weight} onChange={e => handleChange("weight", Number(e.target.value))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="height">Height (cm)</Label>
              <Input id="height" type="number" step="0.1" value={form.height} onChange={e => handleChange("height", Number(e.target.value))} />
            </div>
          </div>
          <Button type="submit" className="cta-hero text-primary-foreground">Save Vitals</Button>
        </form>
      </CardContent>
    </Card>
  );
}
