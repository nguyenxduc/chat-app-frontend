import { Navigate, Route, Routes } from 'react-router';

import { AuthScreen } from './components/AuthScreen';
import { ChatShell } from './components/ChatShell';
import { ChatWindow } from './components/ChatWindow';
import { EmptyChatState } from './components/EmptyChatState';
import { RequireAuth } from './components/RequireAuth';
import { useAuth } from './context/AuthContext';

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <AuthScreen />} />
      <Route element={<RequireAuth />}>
        <Route element={<ChatShell />}>
          <Route index element={<EmptyChatState />} />
          <Route path="c/:id" element={<ChatWindow />} />
        </Route>
      </Route>
    </Routes>
  );
}
