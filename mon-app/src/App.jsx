import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './home';
import Authentification from './auth'; 
import './App.css';
import GroupePage from './GroupePage';
import GroupesList from './GroupesList';
import Profile from './profile';       // <-- AJOUTÉ
import CreateGroup from './CreateGroup'; // <-- AJOUTÉ
import Biblio from './biblio';
import AdminSy from './adminsy';
import LandingPage from './LandingPage';

function App() {
  return (
    <Router>
      <Routes>
        {/* Page d'accueil (landing page) */ }
        <Route path="/" element={<LandingPage />} />
        {/* Pages d'authentification */}
        <Route path="/login" element={<Authentification />} />
        <Route path="/signup" element={<Authentification />} />
        
        {/* Pages principales */}
        <Route path="/home" element={<Home />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/create-group" element={<CreateGroup />} />
        
        {/* Pages de groupes */}
        <Route path="/groupe/:id" element={<GroupePage />} />
        <Route path="/groupes/:niveau" element={<GroupesList />} />
        {/* Bibliothèque de fichiers */}  
        <Route path="/biblio" element={<Biblio />} />
        {/* Admin Système */}
        <Route path="/adminsy" element={<AdminSy />} />

        {/* Redirection par défaut : si l'URL ne correspond à rien, on va au login */}
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="*" element={<Authentification />} />




        
      </Routes>
    </Router>
  );
}

export default App;