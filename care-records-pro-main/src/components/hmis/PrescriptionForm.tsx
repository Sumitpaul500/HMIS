import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Patient, Prescription } from "@/types/hmis";

interface Props {
  patients: Patient[];
  prescriptions: Prescription[];
  setPrescriptions: (p: Prescription[]) => void;
}

export default function PrescriptionForm({ patients, prescriptions, setPrescriptions }: Props) {
  const [quickQuery, setQuickQuery] = useState("");
  const match = useMemo(() => {
    const q = quickQuery.trim();
    if (!q) return undefined;
    return patients.find(p => p.usn === q || p.contact === q);
  }, [patients, quickQuery]);

  const [usn, setUsn] = useState("");
  const [notes, setNotes] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  function adoptMatch() {
    if (match) {
      setUsn(match.usn);
      toast({ title: "Patient selected", description: `${match.fullName} (${match.usn})` });
    } else if (quickQuery.trim()) {
      toast({ title: "No match found" });
    }
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const id = usn.trim();
    const found = patients.find(p => p.usn === id);
    if (!id || !found) return toast({ title: "Patient not found", description: "Enter a valid USN first." });
    if (!notes.trim()) return toast({ title: "Prescription notes required" });

    const record: Prescription = { usn: id, notes, prescribedAt: new Date().toISOString() };
    setPrescriptions([record, ...prescriptions]);
    toast({ title: "Prescription saved", description: `Saved for ${id}` });
    setUsn("");
    setNotes("");
    setQuickQuery("");
  }

  function handlePrint() {
    const id = usn.trim();
    const found = patients.find(p => p.usn === id);
    if (!id || !found) return toast({ title: "Patient not found", description: "Enter a valid USN to print." });

    const win = window.open("", "_blank", "width=800,height=600");
    if (!win) return;
    const content = printRef.current?.innerHTML ?? "";
    win.document.write(`<!doctype html><html><head><title>Prescription ${id}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>
        body{font-family: ui-sans-serif,system-ui; padding:24px;}
        h1{font-size:20px;margin:0 0 8px}
        h2{font-size:16px;margin:16px 0 8px}
        .muted{color:#555}
        .box{border:1px solid #ddd; padding:16px; border-radius:8px}
      </style></head><body>${content}<script>window.print();</script></body></html>`);
    win.document.close();
  }

  const patient = patients.find(p => p.usn === usn.trim());

  return (
    <Card className="card-elevated">
      <CardHeader>
        <CardTitle>Prescription</CardTitle>
        <CardDescription>Create and print patient prescriptions. Quick search by USN or phone.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="qp">Quick Search (USN or Phone)</Label>
            <Input id="qp" value={quickQuery} onChange={e => setQuickQuery(e.target.value)} placeholder="1AB20CS001 or 9876543210"/>
          </div>
          <div className="flex items-end">
            <Button type="button" variant="outline" onClick={adoptMatch} className="w-full md:w-auto">Use Match</Button>
          </div>
        </div>

        <form onSubmit={handleSave} className="grid gap-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="grid gap-2 md:col-span-1">
              <Label htmlFor="usn-p">USN</Label>
              <Input id="usn-p" value={usn} onChange={e => setUsn(e.target.value)} />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="notes">Prescription Notes</Label>
              <Textarea id="notes" rows={6} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Medicines, dosage, instructions..." />
            </div>
          </div>
          <div className="flex gap-3">
            <Button type="submit" className="cta-hero text-primary-foreground">Save Prescription</Button>
            <Button type="button" variant="outline" onClick={handlePrint}>Print</Button>
          </div>
        </form>

        <div className="sr-only">
          <div ref={printRef}>
            <h1>Hospital Management Information System</h1>
            {patient && (
              <div className="box">
                <h2>Patient</h2>
                <p><strong>USN:</strong> {patient.usn}</p>
                <p><strong>Name:</strong> {patient.fullName}</p>
                <p className="muted">Printed on {new Date().toLocaleString()}</p>
              </div>
            )}
            <h2>Prescription</h2>
            <div className="box"><pre style={{whiteSpace:'pre-wrap'}}>{notes}</pre></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
