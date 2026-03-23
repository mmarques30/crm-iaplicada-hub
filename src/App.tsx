import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "./pages/Index";
import Pipeline from "./pages/Pipeline";
import Contacts from "./pages/Contacts";
import ContactDetail from "./pages/ContactDetail";
import DealDetail from "./pages/DealDetail";
import Settings from "./pages/Settings";
import InstagramAutomations from "./pages/InstagramAutomations";
import PainelGeral from "./pages/PainelGeral";
import InstagramAnalytics from "./pages/InstagramAnalytics";
import FacebookAdsPage from "./pages/FacebookAdsPage";
import CrmAnalytics from "./pages/CrmAnalytics";
import Financeiro from "./pages/Financeiro";
import ReceitaTasks from "./pages/ReceitaTasks";
import Forms from "./pages/Forms";
import FormEmbed from "./pages/FormEmbed";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pipeline" element={<Navigate to="/pipeline/business" replace />} />
            <Route path="/pipeline/:product" element={<Pipeline />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/contacts/:id" element={<ContactDetail />} />
            <Route path="/deals/:id" element={<DealDetail />} />
            <Route path="/instagram" element={<InstagramAutomations />} />
            <Route path="/painel" element={<PainelGeral />} />
            <Route path="/analytics/instagram" element={<InstagramAnalytics />} />
            <Route path="/analytics/facebook-ads" element={<FacebookAdsPage />} />
            <Route path="/analytics/crm" element={<CrmAnalytics />} />
            <Route path="/financeiro" element={<Financeiro />} />
            <Route path="/tarefas" element={<ReceitaTasks />} />
            <Route path="/formularios" element={<Forms />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          {/* Public form page (outside layout) */}
          <Route path="/form/:slug" element={<FormEmbed />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
