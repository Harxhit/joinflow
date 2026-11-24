import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/SignUp";
import Dashboard from "./pages/Dasboard";
import GroupPage from "./pages/GroupPage";
import AssignmentFormPage from "./pages/AssignmentFormPage";
import AssignmentEditPage from "./pages/AssignmentEditPage";
import SubmissionsPage from "./pages/SubmissionsPage";
import ProtectedRoute from "./routes/ProtectedRoute";
import NotFoundPage from "./pages/NotFoundPage";
import AnalyticsPage from "./pages/Analytics";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="*" element={<NotFoundPage />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/groups/:groupId" element={<GroupPage />} />
          <Route path="/assignments/new" element={<AssignmentFormPage />} />
          <Route path="/assignments/:assignmentId/edit" element={<AssignmentEditPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/submissions" element={<SubmissionsPage />}/>
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Routes>
    </BrowserRouter>
  );
}
