import { Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "./admin/AdminLayout";
import DashboardPage from "./admin/DashboardPage";
import ModulesPage from "./admin/ModulesPage";
import LessonsPage from "./admin/LessonsPage";
import UsersPage from "./admin/UsersPage";
import SubscriptionsPage from "./admin/SubscriptionsPage";
import PlansManagePage from "./admin/PlansManagePage";
import ReferralsPage from "./admin/ReferralsPage";
import VideosPage from "./admin/VideosPage";
import ReportsPage from "./admin/ReportsPage";
import LessonQuestionSetsPage from "./admin/LessonQuestionSetsPage";
import SeoPage from "./admin/SeoPage";
import SeoEventsPage from "./admin/SeoEventsPage";
import DidacticBooksPage from "./admin/DidacticBooksPage";

const AdminRoutes = () => (
  <Routes>
    <Route element={<AdminLayout />}>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="modulos" element={<ModulesPage />} />
      <Route path="licoes" element={<LessonsPage />} />
      <Route path="usuarios" element={<UsersPage />} />
      <Route path="assinaturas" element={<SubscriptionsPage />} />
      <Route path="planos" element={<PlansManagePage />} />
      <Route path="indicacoes" element={<ReferralsPage />} />
      <Route path="videos" element={<VideosPage />} />
      <Route path="livros" element={<DidacticBooksPage />} />
      <Route path="relatorios" element={<ReportsPage />} />
      <Route path="seo" element={<SeoPage />} />
      <Route path="seo/eventos" element={<SeoEventsPage />} />
      <Route path="questoes" element={<LessonQuestionSetsPage />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Route>
  </Routes>
);

export default AdminRoutes;
