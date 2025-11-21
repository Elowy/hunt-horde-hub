import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Register from "./pages/Register";
import Login from "./pages/Login";
import AddAnimal from "./pages/AddAnimal";
import Profile from "./pages/Profile";
import Users from "./pages/Users";
import Subscriptions from "./pages/Subscriptions";
import HuntingRegistrations from "./pages/HuntingRegistrations";
import GuestRegistration from "./pages/GuestRegistration";
import HiredHunters from "./pages/HiredHunters";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import ZoneStatistics from "./pages/ZoneStatistics";
import Settings from "./pages/Settings";
import HunterSocietySettings from "./pages/HunterSocietySettings";
import Reports from "./pages/Reports";
import HunterStatistics from "./pages/HunterStatistics";
import TimeBasedStatistics from "./pages/TimeBasedStatistics";
import TransportArchive from "./pages/TransportArchive";
import Tickets from "./pages/Tickets";
import ActivityLog from "./pages/ActivityLog";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Documents from "./pages/Documents";
import MembershipPayments from "./pages/MembershipPayments";
import QRAnimalSubmit from "./pages/QRAnimalSubmit";
import PendingAnimals from "./pages/PendingAnimals";
import HunterDashboard from "./pages/HunterDashboard";
import DeleteAllUsers from "./pages/DeleteAllUsers";
import HiredHunterRegister from "./pages/HiredHunterRegister";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="hunting-theme">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/add-animal" element={<AddAnimal />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/users" element={<Users />} />
            <Route path="/subscriptions" element={<Subscriptions />} />
            <Route path="/hunting-registrations" element={<HuntingRegistrations />} />
            <Route path="/guest-registration" element={<GuestRegistration />} />
            <Route path="/hired-hunters" element={<HiredHunters />} />
            <Route path="/super-admin" element={<SuperAdminDashboard />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/hunter-society-settings" element={<HunterSocietySettings />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/hunter-statistics" element={<HunterStatistics />} />
            <Route path="/time-based-statistics" element={<TimeBasedStatistics />} />
            <Route path="/transport-archive" element={<TransportArchive />} />
            <Route path="/tickets" element={<Tickets />} />
            <Route path="/activity-log" element={<ActivityLog />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/membership-payments" element={<MembershipPayments />} />
            <Route path="/qr-animal-submit/:qrCode" element={<QRAnimalSubmit />} />
            <Route path="/pending-animals" element={<PendingAnimals />} />
            <Route path="/hunter-dashboard" element={<HunterDashboard />} />
            <Route path="/zone-statistics" element={<ZoneStatistics />} />
            <Route path="/delete-all-users" element={<DeleteAllUsers />} />
            <Route path="/hired-hunter-register/:token" element={<HiredHunterRegister />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </BrowserRouter>
);

export default App;
