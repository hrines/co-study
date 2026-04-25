import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './home';
import Authentification from './auth'; 
import './App.css';
import GroupePage from './GroupePage';
import GroupesList from './GroupesList';
import Profile from './profile';
import CreateGroup from './CreateGroup';
import Biblio from './biblio';
import AdminSy from './adminsy';
import LandingPage from './LandingPage';
import Agenda from './agenda';
import ForgotPassword from './ForgotPassword';

// ✅ PLUS BESOIN DE ProtectedRoute ni Dashboard

function App() {
  return (
    <Router>
      <Routes>
        {/* Page d'accueil */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Pages d'authentification */}
        <Route path="/login" element={<Authentification />} />
        <Route path="/signup" element={<Authentification />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        
        {/* Routes protégées - Accès direct (la vérif se fait dans le login) */}
        <Route path="/admin" element={<AdminSy />} />
        <Route path="/home" element={<Home />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/create-group" element={<CreateGroup />} />
        <Route path="/agenda" element={<Agenda />} />
        <Route path="/groupe/:id" element={<GroupePage />} />
        <Route path="/groupes/:niveau" element={<GroupesList />} />
        <Route path="/biblio" element={<Biblio />} />
        <Route path="/adminsy" element={<Navigate to="/admin" replace />} />
        
        {/* Redirection par défaut */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;