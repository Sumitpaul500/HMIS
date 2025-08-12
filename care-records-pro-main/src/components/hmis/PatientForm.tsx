import { useEffect, useMemo, useState } from "react";
import { Patient } from "@/types/hmis";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

interface Props {
  patients: Patient[];
  setPatients: (p: Patient[]) => void;
  onDeletePatient: (usn: string) => void; // cascade delete
}

export default function PatientForm({ patients, setPatients, onDeletePatient }: Props) {
  const [form, setForm] = useState<Patient>({
    usn: "",
    fullName: "",
    age: 0,
    gender: "Male",
    contact: "",
    address: "",
  });
  const [editingUSN, setEditingUSN] = useState<string | null>(null);

  const exists = useMemo(() => patients.some(p => p.usn === form.usn.trim()), [patients, form.usn]);

  function handleChange<K extends keyof Patient>(key: K, value: Patient[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function reset() {
    setForm({ usn: "", fullName: "", age: 0, gender: "Male", contact: "", address: "" });
    setEditingUSN(null);
  }

  function validate(): string | null {
    if (!form.usn.trim()) return "USN is required";
    if (!form.fullName.trim()) return "Full Name is required";
    if (!form.age || form.age <= 0) return "Age must be a positive number";
    if (!form.contact.trim()) return "Contact number is required";
    if (!form.address.trim()) return "Address is required";
    return null;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const error = validate();
    if (error) return toast({ title: error });
    const usn = form.usn.trim();

    if (editingUSN) {
      // Update existing (USN locked for integrity)
      setPatients(patients.map(p => (p.usn === editingUSN ? { ...form, usn: editingUSN } : p)));
      toast({ title: "Patient updated", description: `${form.fullName} saved.` });
      reset();
      return;
    }

    // Create new
    if (exists) return toast({ title: "USN already exists", description: "USN must be unique." });
    setPatients([{ ...form, usn }, ...patients]);
    toast({ title: "Patient saved", description: `${form.fullName} added.` });
    reset();
  }

  function editPatient(usn: string) {
    const p = patients.find(x => x.usn === usn);
    if (!p) return;
    setForm({ ...p });
    setEditingUSN(usn);
  }

  function deletePatient(usn: string) {
    onDeletePatient(usn);
    toast({ title: "Patient deleted", description: `${usn} and linked records removed.` });
    if (editingUSN === usn) reset();
  }

  useEffect(() => {
    document.title = "HMIS – Patient Entry";
  }, []);

  return (
    <Card className="card-elevated">
      <CardHeader>
        <CardTitle>Patient Entry</CardTitle>
        <CardDescription>Add or edit patients. USN is unique and cannot be changed after creation.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="usn">University Seat Number (USN)</Label>
              <Input id="usn" value={form.usn} onChange={e => handleChange("usn", e.target.value)} placeholder="e.g., 1AB20CS001" disabled={!!editingUSN}/>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" value={form.fullName} onChange={e => handleChange("fullName", e.target.value)} />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="age">Age</Label>
              <Input id="age" type="number" min={0} value={form.age}
                onChange={e => handleChange("age", Number(e.target.value))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="gender">Gender</Label>
              <select id="gender" className="h-10 rounded-md border bg-background px-3"
                value={form.gender}
                onChange={e => handleChange("gender", e.target.value as Patient["gender"])}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contact">Contact Number</Label>
              <Input id="contact" inputMode="tel" value={form.contact} onChange={e => handleChange("contact", e.target.value)} placeholder="10-digit number"/>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" value={form.address} onChange={e => handleChange("address", e.target.value)} />
          </div>

          <div className="flex gap-3">
            <Button type="submit" className="cta-hero text-primary-foreground">{editingUSN ? "Update Patient" : "Save Patient"}</Button>
            <Button type="button" variant="secondary" onClick={reset}>Reset</Button>
          </div>
          {!editingUSN && exists && form.usn.trim() && (
            <p className="text-sm text-destructive-foreground bg-destructive/10 rounded-md px-3 py-2">
              Warning: This USN already exists.
            </p>
          )}
        </form>

        {/* Patient list for quick edit/delete */}
        <div className="mt-8">
          <h3 className="font-semibold mb-2">Patients ({patients.length})</h3>
          <div className="rounded-md border divide-y">
            {patients.map((p) => (
              <div key={p.usn} className="flex flex-col md:flex-row md:items-center justify-between gap-2 p-3">
                <div className="text-sm">
                  <div className="font-medium">{p.fullName}</div>
                  <div className="text-muted-foreground">USN: {p.usn} • Contact: {p.contact}</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => editPatient(p.usn)}>Edit</Button>
                  <Button variant="destructive" onClick={() => deletePatient(p.usn)}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
