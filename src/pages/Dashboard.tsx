import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Filter, Eye, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Mock data for demonstration
const mockAnimals = [
  {
    id: "ANI-001",
    type: "White-tailed Deer",
    weight: "180 lbs",
    date: "2024-01-15",
    location: "North Woods - Sector 3",
    status: "Processed",
    hunter: "John Smith"
  },
  {
    id: "ANI-002", 
    type: "Wild Boar",
    weight: "220 lbs",
    date: "2024-01-18",
    location: "South Ridge - Sector 7",
    status: "Storage",
    hunter: "Mike Johnson"
  },
  {
    id: "ANI-003",
    type: "Turkey",
    weight: "25 lbs", 
    date: "2024-01-20",
    location: "East Field - Sector 2",
    status: "Fresh",
    hunter: "Sarah Wilson"
  }
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const filteredAnimals = mockAnimals.filter(animal => {
    const matchesSearch = animal.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         animal.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || animal.status.toLowerCase() === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "fresh": return "bg-green-100 text-green-800";
      case "storage": return "bg-blue-100 text-blue-800";
      case "processed": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-forest-deep to-forest-light text-white py-8">
        <div className="container mx-auto px-6">
          <h1 className="text-3xl font-bold mb-2">Animal Inventory Dashboard</h1>
          <p className="text-primary-foreground/90">Manage your hunting records and storage</p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Animals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-forest-deep">{mockAnimals.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">In Storage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {mockAnimals.filter(a => a.status === "Storage").length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Fresh Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {mockAnimals.filter(a => a.status === "Fresh").length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Processed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-hunt-orange">
                {mockAnimals.filter(a => a.status === "Processed").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter Bar */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-col md:flex-row gap-4 flex-1">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search by animal type or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-40">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border border-border shadow-lg z-50">
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="fresh">Fresh</SelectItem>
                      <SelectItem value="storage">Storage</SelectItem>
                      <SelectItem value="processed">Processed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button variant="hunting" size="lg" onClick={() => navigate("/add-animal")}>
                <Plus className="h-4 w-4 mr-2" />
                Add Animal
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Animals Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-forest-deep">Animal Records</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Animal ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Hunter</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAnimals.map((animal) => (
                  <TableRow key={animal.id}>
                    <TableCell className="font-medium">{animal.id}</TableCell>
                    <TableCell>{animal.type}</TableCell>
                    <TableCell>{animal.weight}</TableCell>
                    <TableCell>{animal.date}</TableCell>
                    <TableCell>{animal.location}</TableCell>
                    <TableCell>{animal.hunter}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(animal.status)}>
                        {animal.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;