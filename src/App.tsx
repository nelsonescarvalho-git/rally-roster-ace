import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Games from "./pages/Games";
import Teams from "./pages/Teams";
import TeamDetail from "./pages/TeamDetail";
import KPIs from "./pages/KPIs";
import Settings from "./pages/Settings";
import Setup from "./pages/Setup";
import Live from "./pages/Live";
import Stats from "./pages/Stats";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/jogos" element={<Games />} />
          <Route path="/equipas" element={<Teams />} />
          <Route path="/equipas/:teamId" element={<TeamDetail />} />
          <Route path="/kpis" element={<KPIs />} />
          <Route path="/definicoes" element={<Settings />} />
          <Route path="/setup/:matchId" element={<Setup />} />
          <Route path="/live/:matchId" element={<Live />} />
          <Route path="/stats/:matchId" element={<Stats />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
