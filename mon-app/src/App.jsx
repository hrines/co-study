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

// Empêche l'accès à /admin si ce n'est pas le bon mail
const AdminGuard = ({ children }) => {
  const user = JSON.parse(localStorage.getItem('user'));
  
  if (!user || user.email !== 'admin@costudy.dz') {
    return <Navigate to="/home" replace />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        
        <Route path="/login" element={<Authentification />} />
        <Route path="/signup" element={<Authentification />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        
        {/*ROUTE ADMIN PROTÉGÉE */}
        <Route path="/admin" element={
          <AdminGuard>
            <AdminSy />
          </AdminGuard>
        } />

        <Route path="/home" element={<Home />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/create-group" element={<CreateGroup />} />
        <Route path="/agenda" element={<Agenda />} />
        <Route path="/groupe/:id" element={<GroupePage />} />
        <Route path="/groupes/:niveau" element={<GroupesList />} />
        <Route path="/biblio" element={<Biblio />} />
        
        {/* Redirection vers le chemin propre /admin */}
        <Route path="/adminsy" element={<Navigate to="/admin" replace />} />
        
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;