import { useState, useEffect, useMemo } from "react";
import { Patient } from "@/types/hmis";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Props {
  patients: Patient[];
  onPatientSelect?: (patient: Patient) => void;
  onPatientEdit?: (patient: Patient) => void;
  selectedPatient?: Patient | null;
}

interface SearchFilters {
  query: string;
  gender: string;
  ageRange: string;
  sortBy: 'name' | 'age' | 'recent';
}

export default function EnhancedPatientSearch({ 
  patients, 
  onPatientSelect, 
  onPatientEdit,
  selectedPatient 
}: Props) {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    gender: 'all',
    ageRange: 'all',
    sortBy: 'name'
  });

  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [quickActions, setQuickActions] = useState<Patient[]>([]);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentPatientSearches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch {
        setRecentSearches([]);
      }
    }
  }, []);

  // Save recent searches
  const addToRecentSearches = (query: string) => {
    if (!query.trim() || query.length < 2) return;
    
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentPatientSearches', JSON.stringify(updated));
  };

  // Filtered and sorted patients
  const filteredPatients = useMemo(() => {
    let results = [...patients];

    // Text search
    if (filters.query.trim()) {
      const query = filters.query.toLowerCase();
      results = results.filter(patient => 
        patient.fullName.toLowerCase().includes(query) ||
        patient.usn.toLowerCase().includes(query) ||
        patient.contact.includes(query) ||
        patient.address.toLowerCase().includes(query)
      );
    }

    // Gender filter
    if (filters.gender !== 'all') {
      results = results.filter(patient => patient.gender === filters.gender);
    }

    // Age range filter
    if (filters.ageRange !== 'all') {
      const [min, max] = filters.ageRange.split('-').map(Number);
      results = results.filter(patient => {
        if (max) return patient.age >= min && patient.age <= max;
        return patient.age >= min;
      });
    }

    // Sort results
    results.sort((a, b) => {
      switch (filters.sortBy) {
        case 'name':
          return a.fullName.localeCompare(b.fullName);
        case 'age':
          return a.age - b.age;
        case 'recent':
          // Sort by USN as proxy for recent (higher USN = more recent)
          return b.usn.localeCompare(a.usn);
        default:
          return 0;
      }
    });

    return results;
  }, [patients, filters]);

  // Quick access to recently added patients
  useEffect(() => {
    const recent = [...patients]
      .sort((a, b) => b.usn.localeCompare(a.usn))
      .slice(0, 5);
    setQuickActions(recent);
  }, [patients]);

  const handleSearch = (query: string) => {
    setFilters(prev => ({ ...prev, query }));
    
    if (query.length >= 2) {
      addToRecentSearches(query);
    }
  };

  const clearFilters = () => {
    setFilters({
      query: '',
      gender: 'all',
      ageRange: 'all',
      sortBy: 'name'
    });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getAgeGroup = (age: number) => {
    if (age < 13) return 'Child';
    if (age < 20) return 'Teen';
    if (age < 40) return 'Adult';
    if (age < 65) return 'Middle-aged';
    return 'Senior';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Patient Search & Quick Access</CardTitle>
        <CardDescription>
          Search and manage patient records with advanced filtering
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="search">Search</TabsTrigger>
            <TabsTrigger value="recent">Recent</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4">
            {/* Search Controls */}
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="search">Search Patients</Label>
                  <Input
                    id="search"
                    placeholder="Name, USN, or contact..."
                    value={filters.query}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select value={filters.gender} onValueChange={(value) => 
                    setFilters(prev => ({ ...prev, gender: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Genders</SelectItem>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Age Range</Label>
                  <Select value={filters.ageRange} onValueChange={(value) => 
                    setFilters(prev => ({ ...prev, ageRange: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Ages</SelectItem>
                      <SelectItem value="0-12">0-12 (Child)</SelectItem>
                      <SelectItem value="13-19">13-19 (Teen)</SelectItem>
                      <SelectItem value="20-39">20-39 (Adult)</SelectItem>
                      <SelectItem value="40-64">40-64 (Middle-aged)</SelectItem>
                      <SelectItem value="65">65+ (Senior)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Sort By</Label>
                  <Select value={filters.sortBy} onValueChange={(value: any) => 
                    setFilters(prev => ({ ...prev, sortBy: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name (A-Z)</SelectItem>
                      <SelectItem value="age">Age</SelectItem>
                      <SelectItem value="recent">Most Recent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
                <div className="flex-1" />
                <Badge variant="secondary">
                  {filteredPatients.length} of {patients.length} patients
                </Badge>
              </div>
            </div>

            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Recent Searches</Label>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((search, index) => (
                    <Badge 
                      key={index}
                      variant="outline" 
                      className="cursor-pointer hover:bg-accent"
                      onClick={() => handleSearch(search)}
                    >
                      {search}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Search Results */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredPatients.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {filters.query || filters.gender !== 'all' || filters.ageRange !== 'all' 
                    ? 'No patients found matching your criteria'
                    : 'No patients available'
                  }
                </div>
              ) : (
                filteredPatients.map((patient) => (
                  <div
                    key={patient.usn}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-accent ${
                      selectedPatient?.usn === patient.usn ? 'bg-accent border-primary' : ''
                    }`}
                    onClick={() => onPatientSelect?.(patient)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="text-sm">
                          {getInitials(patient.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium truncate">{patient.fullName}</h4>
                          <Badge variant="outline" className="text-xs">
                            {getAgeGroup(patient.age)}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {patient.gender}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          USN: {patient.usn} • Age: {patient.age} • {patient.contact}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {patient.address}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPatientEdit?.(patient);
                          }}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="recent" className="space-y-4">
            <div>
              <h4 className="font-medium mb-3">Recently Added Patients</h4>
              <div className="space-y-2">
                {quickActions.map((patient) => (
                  <div
                    key={patient.usn}
                    className="p-3 border rounded-lg cursor-pointer hover:bg-accent"
                    onClick={() => onPatientSelect?.(patient)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {getInitials(patient.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{patient.fullName}</div>
                        <div className="text-sm text-muted-foreground">
                          {patient.usn} • {patient.contact}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">{patients.length}</div>
                  <div className="text-sm text-muted-foreground">Total Patients</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">
                    {patients.filter(p => p.gender === 'Male').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Male Patients</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">
                    {patients.filter(p => p.gender === 'Female').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Female Patients</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">
                    {Math.round(patients.reduce((sum, p) => sum + p.age, 0) / patients.length) || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Average Age</div>
                </CardContent>
              </Card>
            </div>

            <div>
              <h4 className="font-medium mb-3">Age Distribution</h4>
              <div className="space-y-2">
                {[
                  { label: 'Children (0-12)', range: [0, 12] },
                  { label: 'Teenagers (13-19)', range: [13, 19] },
                  { label: 'Adults (20-39)', range: [20, 39] },
                  { label: 'Middle-aged (40-64)', range: [40, 64] },
                  { label: 'Seniors (65+)', range: [65, 150] },
                ].map(({ label, range }) => {
                  const count = patients.filter(p => p.age >= range[0] && p.age <= range[1]).length;
                  const percentage = patients.length > 0 ? (count / patients.length * 100).toFixed(1) : '0';
                  
                  return (
                    <div key={label} className="flex items-center justify-between p-2 bg-accent/30 rounded">
                      <span className="text-sm">{label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{count}</span>
                        <span className="text-xs text-muted-foreground">({percentage}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
