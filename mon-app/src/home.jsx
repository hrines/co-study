import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './home.css';
import Footer from './footer';

// Composants modaux
import CreateGroup from './CreateGroup';
import TodoModal from './TodoModal';
import NotifModal from './NotifModal';
import Agenda from './agenda';

const Home = () => {
  const navigate = useNavigate();

  // ==========================================
  // ÉTATS
  // ==========================================
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isTodoOpen, setIsTodoOpen] = useState(false);
  const [isGroupeOpen, setIsGroupeOpen] = useState(false);
  const [isAgendaOpen, setIsAgendaOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  
  const [selectedSystem, setSelectedSystem] = useState(null);
  const [mesGroupes, setMesGroupes] = useState([]);
  const [nbNotifs, setNbNotifs] = useState(0);
  
  // Pomodoro
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState('work');

  // ==========================================
  // UTILS : Récupération sécurisée de userId
  // ==========================================
  const getUserId = useCallback(() => {
    // 1. Essayer userId direct
    let id = localStorage.getItem('userId');
    if (id) return id;
    
    // 2. Essayer de parser l'objet user
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user?.id_etudiant) return user.id_etudiant;
        if (user?.id) return user.id;
      }
    } catch (e) {
      console.warn('⚠️ Impossible de parser user:', e);
    }
    
    // 3. Essayer de décoder le token JWT
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.id || payload.userId || payload.id_etudiant;
      }
    } catch (e) {
      console.warn('⚠️ Impossible de décoder token:', e);
    }
    
    return null;
  }, []);

// ✅ BON
const userId = getUserId();

// Récupère l'objet user complet
const user = JSON.parse(localStorage.getItem('user') || '{}');
const nomClient = user?.prenom || user?.nom || 'Invité'; // ← Utilise les bonnes clés
  const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${nomClient || 'Guest'}&backgroundColor=205375`;

  // ==========================================
  // REDIRECTION SI NON CONNECTÉ
  // ==========================================
  useEffect(() => {
    if (!nomClient || !userId) {
      navigate('/auth', { replace: true });
    }
  }, [nomClient, userId, navigate]);

  // ==========================================
  // POMODORO TIMER
  // ==========================================
  const setTimerMode = (minutes, newMode) => {
    setIsActive(false);
    setTimeLeft(minutes * 60);
    setMode(newMode);
  };

  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0) {
      // Auto-switch work/break
      if (mode === 'work') {
        setMode('break');
        setTimeLeft(5 * 60);
      } else {
        setMode('work');
        setTimeLeft(25 * 60);
      }
      setIsActive(true);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, mode]);

  // ==========================================
  // NOTIFICATIONS : Chargement + Badge
  // ==========================================
  const fetchNotifCount = useCallback(() => {
    if (!userId) return;
    const token = localStorage.getItem('token');
    
    fetch(`http://localhost:5000/api/notifications/${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setNbNotifs(data.filter(n => n.lu === 0).length);
        }
      })
      .catch(err => console.error('❌ Erreur chargement notifs:', err));
  }, [userId]);

  // Charger au montage + rafraîchir toutes les 30s
  useEffect(() => {
    fetchNotifCount();
    const interval = setInterval(fetchNotifCount, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifCount]);

  // Fonction à passer au modal pour rafraîchir le badge
  const refreshNotifCount = useCallback(() => {
    fetchNotifCount();
  }, [fetchNotifCount]);

  // ==========================================
  // GROUPES : Chargement des groupes utilisateur
  // ==========================================
  useEffect(() => {
    if (!userId) return;
    
    const token = localStorage.getItem('token');
    
    fetch(`http://localhost:5000/api/mes-groupes/${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        console.log('📦 Groupes chargés:', data?.length || 0);
        setMesGroupes(Array.isArray(data) ? data : []);
      })
      .catch(err => console.error('❌ Erreur chargement groupes:', err));
  }, [userId]);

  // ==========================================
  // RECHERCHE GLOBALE
  // ==========================================
  const handleSearch = useCallback((val) => {
    setSearchTerm(val);
    
    if (val.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    fetch(`http://localhost:5000/api/search-all?q=${encodeURIComponent(val)}`)
      .then(res => {
        if (!res.ok) throw new Error(`Erreur ${res.status}`);
        return res.json();
      })
      .then(data => setSearchResults(Array.isArray(data) ? data : []))
      .catch(err => {
        console.error('❌ Erreur recherche:', err);
        setSearchResults([]);
      });
  }, []);

  const handleSearchResultClick = (result) => {
    if (result.type === 'groupe') {
      navigate(`/groupe/${result.id}`);
    } else {
      navigate('/biblio');
    }
    setSearchTerm('');
    setSearchResults([]);
  };

  // ==========================================
  // ACTIONS
  // ==========================================
  const toggleSidebar = () => setIsCollapsed(prev => !prev);
  
  const handleLogout = () => {
    localStorage.clear();
    navigate('/auth', { replace: true });
  };

  const levels = {
    LMD: ['L1', 'L2', 'L3', 'M1', 'M2'],
    Ingenieur: ['1ere', '2eme', '3eme', '4eme', '5eme']
  };

  // ==========================================
  // AFFICHAGE : Loading
  // ==========================================
  if (!nomClient || !userId) {
    return (
      <div className="loading-fullscreen">
        <div className="spinner" />
        <p>Chargement...</p>
      </div>
    );
  }

  // ==========================================
  // RENDER PRINCIPAL
  // ==========================================
  return (
    <div className={`dashboard-layout ${isCollapsed ? 'collapsed' : ''} `}>
      
      {/* ========== SIDEBAR ========== */}
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          {!isCollapsed && <div className="logo">Co'study 🎓</div>}
          <button className="toggle-btn" onClick={toggleSidebar}>
            {isCollapsed ? '☰' : '✕'}
          </button>
        </div>

        <nav className="nav-menu">
          {/* Profil */}
          <div className="nav-item" onClick={() => navigate('/profile')}>
            <span className="icon">👤</span>
            {!isCollapsed && <span className="text">Mon Profil</span>}
          </div>

          {/* Notifications avec badge */}
          <div className="nav-item" onClick={() => setIsNotifOpen(true)}>
            <span className="icon">🔔</span>
            {!isCollapsed && <span className="text">Notifications</span>}
            {nbNotifs > 0 && (
              <span className="notif-count">
                {nbNotifs > 99 ? '99+' : nbNotifs}
              </span>
            )}
          </div>

          {/* Bibliothèque */}
          <div className="nav-item" onClick={() => navigate('/biblio')}>
            <span className="icon">📚</span>
            {!isCollapsed && <span className="text">Bibliothèque</span>}
          </div>

          {/* Agenda */}
          <div className="nav-item" onClick={() => setIsAgendaOpen(true)}>
            <span className="icon">📅</span>
            {!isCollapsed && <span className="text">Agenda</span>}
          </div>

          {/* To-Do */}
          <div className="nav-item" onClick={() => setIsTodoOpen(true)}>
            <span className="icon">✅</span>
            {!isCollapsed && <span className="text">To-Do List</span>}
          </div>

          {/* Groupes (cascade) */}
          <div className="nav-item" onClick={() => !isCollapsed && setIsGroupeOpen(!isGroupeOpen)}>
            <span className="icon">📁</span>
            {!isCollapsed && (
              <span className="text">
                Groupes {isGroupeOpen ? '▼' : '▶'}
              </span>
            )}
          </div>

          {!isCollapsed && isGroupeOpen && (
            <div className="cascade-level-1">
              {/* LMD */}
              <div 
                className={`nav-item sub-item ${selectedSystem === 'LMD' ? 'active' : ''}`}
                onClick={() => setSelectedSystem(prev => prev === 'LMD' ? null : 'LMD')}
              >
                🎓 LMD
              </div>
              {selectedSystem === 'LMD' && (
                <div className="cascade-level-2">
                  {levels.LMD.map(lvl => (
                    <button 
                      key={lvl} 
                      className="leaf-item"
                      onClick={() => navigate(`/groupes/${lvl}`)}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              )}

              {/* Ingénieur */}
              <div 
                className={`nav-item sub-item ${selectedSystem === 'Ingenieur' ? 'active' : ''}`}
                onClick={() => setSelectedSystem(prev => prev === 'Ingenieur' ? null : 'Ingenieur')}
              >
                ⚙️ Ingénieur
              </div>
              {selectedSystem === 'Ingenieur' && (
                <div className="cascade-level-2">
                  {levels.Ingenieur.map(lvl => (
                    <button 
                      key={lvl} 
                      className="leaf-item"
                      onClick={() => navigate(`/groupes/${lvl}`)}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Pomodoro Widget */}
        {!isCollapsed && (
          <div className="pomodoro-widget">
            <div className="pomodoro-mode">
              ⏱️ {mode === 'work' ? 'Travail' : 'Pause'}
            </div>
            <div className="pomodoro-timer">
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>
            <div className="pomodoro-controls">
              <button className="pomo-btn play" onClick={() => setIsActive(!isActive)}>
                {isActive ? '⏸' : '▶'}
              </button>
              <button className="pomo-btn reset" onClick={() => {
                setIsActive(false);
                setTimeLeft(mode === 'work' ? 25 * 60 : 5 * 60);
              }}>
                🔄
              </button>
            </div>
            <div className="pomodoro-cycles">
              <button 
                className={`cycle-btn ${timeLeft === 25*60 ? 'active' : ''}`}
                onClick={() => setTimerMode(25, 'work')}
              >
                25/5
              </button>
              <button 
                className={`cycle-btn ${timeLeft === 40*60 ? 'active' : ''}`}
                onClick={() => setTimerMode(40, 'work')}
              >
                40/20
              </button>
            </div>
          </div>
        )}

        <button className="logout-btn" onClick={handleLogout}>
          {isCollapsed ? '↪' : 'Se déconnecter'}
        </button>
      </aside>

      {/* ========== CONTENU PRINCIPAL ========== */}
      <div className="main-wrapper">
        
        {/* Navbar */}
        <nav className="top-navbar">
          <div className="actions-section">
            <button className="btn-create" onClick={() => setIsModalOpen(true)}>
              + Créer un Groupe
            </button>
            
            
            <div className="user-profile">
              <span>Salut, <strong>{nomClient}</strong></span>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="main-content">
          
          {/* Hero Section */}
          <section className="hero-section">
            <h1>Apprenons ensemble</h1>
            <p>Trouve les meilleurs groupes et documents pour ton cursus.</p>
            
            <div className="search-container-hero">
              <input
                type="text"
                placeholder="Recherche de groupes ou de documents..."
                className="hero-search-bar"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
              />
              <button className="hero-search-btn">🔍</button>
              
              {/* Résultats de recherche */}
              {searchResults.length > 0 && (
                <div className="search-dropdown-results">
                  {searchResults.map((result) => (
                    <div
                      key={`${result.type}-${result.id}`}
                      className="search-item-row"
                      onClick={() => handleSearchResultClick(result)}
                    >
                      <span className="type-icon">
                        {result.type === 'groupe' ? '👥' : '📄'}
                      </span>
                      <span className="result-text">{result.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Mes Groupes */}
<div className="mes-groupes">
  <span>👥 Mes groupes</span>
  <section className="groupes-list">
    {mesGroupes.length === 0 ? (
      <p>Vous n'appartenez à aucun groupe pour le moment.</p>
    ) : (
      mesGroupes.map(groupe => (
        <div key={groupe.id_groupe} className="groupe-card">
          <h3>
            {groupe.nom_groupe}
            {groupe.id_etudiant == userId && (
              <span className="admin-inline-badge">Admin</span>
            )}
          </h3>
          <p className="groupe-description">
            {groupe.description || "Pas de description."}
          </p>
          <button 
            className="btn-small"
            onClick={() => navigate(`/groupe/${groupe.id_groupe}`)}
          >
            Ouvrir →
          </button>
        </div>
      ))
    )}
  </section>
</div>

        </main>

           <Footer />
   
      </div>

      {/* ========== MODALS ========== */}
      {isModalOpen && <CreateGroup closeModal={() => setIsModalOpen(false)} />}
      {isTodoOpen && <TodoModal closeModal={() => setIsTodoOpen(false)} />}
      {isAgendaOpen && <Agenda closeModal={() => setIsAgendaOpen(false)} />}
      
      {isNotifOpen && (
        <NotifModal 
          closeModal={() => setIsNotifOpen(false)} 
          onNotifsRead={refreshNotifCount} // ✅ Rafraîchit le badge
        />
      )}
    </div>
  );
};

export default Home;