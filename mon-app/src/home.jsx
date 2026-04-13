

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './home.css';
import CreateGroup from './CreateGroup';
import TodoModal from './TodoModal';
import { useTheme } from './ThemeContext';
import NotifModal from './NotifModal';





const Home = () => {
  const navigate = useNavigate();  
  const nomClient = localStorage.getItem("userName");
  const userId = localStorage.getItem('userId');

  const [isCollapsed, setIsCollapsed] = useState(false);  // État pour gérer si le menu est réduit ou pas
  const toggleSidebar = () => { setIsCollapsed(!isCollapsed);};  // Fonction pour inverser l'état du menu
  
  const [isTodoOpen, setIsTodoOpen] = useState(false); // Modal To-Do List
  const [isGroupeOpen, setIsGroupeOpen] = useState(false); // Menu principal "Groupes"
  const [selectedSystem, setSelectedSystem] = useState(null); // "LMD" ou "Ingenieur"

  const levels = {
     LMD: ['L1', 'L2', 'L3', 'M1', 'M2'],
     Ingenieur: ['1ere', '2eme', '3eme', '4eme', '5eme']
};
const [isModalOpen, setIsModalOpen] = useState(false);
//mes groupes = groupes dont je fais partie 
const [mesGroupes, setMesGroupes] = useState([]);
const [nbNotifs, setNbNotifs] = useState(0);

  useEffect(() => {
    if (!nomClient) {
      navigate('/auth'); // Redirige vers la page de connexion si pas de nom trouvé
    }
  }, [nomClient, navigate]);

  



const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 min par défaut
const [isActive, setIsActive] = useState(false);
const [mode, setMode] = useState('work'); // 'work' ou 'break'

// Fonction pour changer le temps selon le besoin
const setTimerMode = (minutes, type) => {
  setIsActive(false); // On stop si ça tournait
  setTimeLeft(minutes * 60);
  setMode(type);
};


/*sonnerie pomodoro
const playBeep = () => {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  oscillator.frequency.value = 880;
  oscillator.type = 'sine';
  gainNode.gain.setValueAtTime(1, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 1);
};*/

// moteur du pomodoro
useEffect(() => {
  let interval = null;
  if (isActive && timeLeft > 0) {
    interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
  } else if (timeLeft === 0) {
    clearInterval(interval);
    playBeep();
    if (mode === 'work') {
      setMode('break');
      setTimeLeft(5 * 60);
      setIsActive(true);
    } else {
      setMode('work');
      setTimeLeft(25 * 60);
      setIsActive(true);
    }
  }
  return () => clearInterval(interval);
}, [isActive, timeLeft, mode]);



// Charger le nombre de notifs non lues
useEffect(() => {
  if (!userId) return;

  
  fetch(`http://localhost:5000/api/notifications/${userId}`)
    .then(res => res.json())
    .then(data => setNbNotifs(data.filter(n => n.lu === 0).length))
    .catch(err => console.error(err));
}, [userId]);

useEffect(() => {
  if (!nomClient) {
    navigate('/auth'); 
  }
}, [nomClient, navigate]);

// Charger TOUS les groupes (Créés + Rejoints)
useEffect(() => {
  fetch(`http://localhost:5000/api/mes-groupes/${userId}`)
    .then(res => res.json())
    .then(data => setMesGroupes(data))
    .catch(err => console.error(err));

}, [userId]);

const { darkMode, toggleDarkMode } = useTheme();
const [isNotifOpen, setIsNotifOpen] = useState(false);


    const handleLogout = () => {
    localStorage.removeItem("userName");
    navigate('/auth');
  };






  return (
    <div className={`dashboard-layout ${isCollapsed ? 'collapsed' : ''}`}>
{/* 1. BARRE LATÉRALE (SIDEBAR) */}
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
       <div className="sidebar-header">
       {!isCollapsed && <div className="logo">Flow 🎓</div>}
       <button className="toggle-btn" onClick={toggleSidebar}>
       {isCollapsed ? '☰' : '✕'}
       </button>
       </div>

        <nav className="nav-menu">
<div 
  className="nav-item active" 
  title="Mon Profil" onClick={() => navigate('/profile')} // <--- Redirige vers la page Profil
  style={{ cursor: 'pointer' }}
>
  <span className="icon">👤</span> {/* Tu peux changer l'icône par un avatar */}
  {!isCollapsed && <span className="text">Mon Profil</span>}
</div>

           <div className="nav-item" onClick={() => setIsNotifOpen(true)} title="Notifications">
             <span className="icon">🔔</span>
             {!isCollapsed && <span className="text">Notifications</span>}
             {nbNotifs > 0 && <span className="notif-count">{nbNotifs}</span>}
           </div>
<div className="nav-item" onClick={() => navigate('/adminsy')} title="Interface Admin">             <span className="icon">🛠️</span>
             {!isCollapsed && <span className="text">Interface Admin</span>}
           </div>
           <div className="nav-item" onClick={() => navigate('/agenda')} title="Agenda">
             <span className="icon">📅</span>
             {!isCollapsed && <span className="text">Agenda</span>}
           </div>

          <div className="nav-item" onClick={() => navigate('/biblio')} title="Bibliothèque de fichiers">
             <span className="icon">📚</span>
             {!isCollapsed && <span className="text">Bibliothèque</span>}
          </div>
          <div className="nav-item" onClick={() => navigate('/agenda')} title="agenda">
            <span className="icon">📅</span>
            {!isCollapsed && <span className="text">agenda</span>}
          </div>
          <div className="nav-item" onClick={() => setIsTodoOpen(true)} title="To-Do List">
            <span className="icon">✅</span>
            {!isCollapsed && <span className="text">To-Do List</span>}
          </div>

             {/* Système de sélection LMD / Ingénieur */}
    

  {/* NIVEAU 1 : Rubrique Groupes */}
<div className="nav-item" onClick={() => !isCollapsed && setIsGroupeOpen(!isGroupeOpen)}>
  <span className="icon">📁</span>
  {!isCollapsed && <span className="text">Groupes Existants {isGroupeOpen ? '▼' : '▶'}</span>}
</div>

  {!isCollapsed && isGroupeOpen && (
    <div className="cascade-level-1">
      {/* NIVEAU 2 : Systèmes */}
      <div className={`nav-item ${selectedSystem === 'LMD' ? 'active' : ''}`} 
           onClick={() => setSelectedSystem(selectedSystem === 'LMD' ? null : 'LMD')}>
        🎓 LMD
      </div>
      
      {isGroupeOpen && selectedSystem === 'LMD' && (
        <div className="cascade-level-2">
          {/* NIVEAU 3 : Niveaux LMD */}
          {levels.LMD.map(lvl => (
            <button key={lvl} className="leaf-item" onClick={() => window.location.href=`/groupes/${lvl}`}>
              {lvl}
            </button>
          ))}
        </div>
      )}

      <div className={`nav-item ${selectedSystem === 'Ingenieur' ? 'active' : ''}`}
           onClick={() => setSelectedSystem(selectedSystem === 'Ingenieur' ? null : 'Ingenieur')}>
        ⚙️ Ingénieur
      </div>

      {isGroupeOpen && selectedSystem === 'Ingenieur' && (
        <div className="cascade-level-2">
          {/* NIVEAU 3 : Niveaux Ingénieur */}
          {levels.Ingenieur.map(lvl => (
            <button key={lvl} className="leaf-item" onClick={() => window.location.href=`/groupes/${lvl}`}>
              {lvl}
            </button>
          ))}
        </div>
      )}
    </div>
  )}




        </nav>

        {/* POMODORO WIDGET */}
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
      }}>🔄</button>
    </div>
    <div className="pomodoro-cycles">
      <button 
        className={`cycle-btn ${timeLeft === 25*60 || timeLeft === 5*60 ? 'active-cycle' : ''}`}
        onClick={() => { setTimerMode(25, 'work'); }}>
        25 / 5
      </button>
      <button 
        className={`cycle-btn`}
        onClick={() => { setTimerMode(40, 'work'); }}>
        40 / 20
      </button>
    </div>
  </div>
)}

        <button className="logout-btn" onClick={handleLogout}>
          {isCollapsed ? '↪' : 'Se déconnecter'}
        </button>
      </aside>



      {/* NOUVEAU WRAPPER : Navbar + Contenu Principal */}
      <div className="main-wrapper">
        {/* 2. NAVBAR HORIZONTALE */}
        <nav className="top-navbar">
         

          <div className="actions-section">
<button 
  className="btn-create" 
  onClick={() => {
    setIsModalOpen(true);
  }}
>
  + Créer un Groupe
</button>   
      { /* Dans ton bouton dark mode */}
            <button className="dark-mode-btn" onClick={toggleDarkMode}>
              {darkMode ? '☀️' : '🌙'}
            </button>            <div className="user-profile">
              <span>Salut, <strong>{nomClient}</strong></span>
            </div>
          </div>
        </nav>

        {/* 3. CONTENU DES WIDGETS */}
        <main className="main-content">
            {/* SECTION HERO STYLE STUDOCU */}
    <section className="hero-section">
      <h1>Apprenons ensemble</h1>
      <p>Trouve les meilleurs groupes et documents pour ton cursus.</p>
      
      <div className="search-container-hero">
        <input 
          type="text" 
          placeholder="Recherche de groupes ou de documents..." 
          className="hero-search-bar" 
        />
        <button className="hero-search-btn">🔍</button>
      </div>
      </section>


<div className='mes-groupes'>
  <span>👥 Mes groupes</span>
  <section className="groupes-list">
    {mesGroupes.length === 0 ? (
      <p style={{color: 'var(--text-sub)', padding: '1rem'}}>
        Vous n'appartenez à aucun groupe pour le moment.
      </p>
    ) : (
      mesGroupes.map(groupe => (
        <div key={groupe.id_groupe} className="w33 card groupe-card">
          
          {/* TITRE + BADGE ADMIN DISCRET */}
          <h3>
            {groupe.nom_groupe} 
            {groupe.id_etudiant == userId && (
              <span className="admin-inline-badge"> (Admin)</span>
            )}
          </h3>

          {/* DESCRIPTION RÉCUPÉRÉE DU CREATEGROUP */}
          <p className="groupe-description">
            {groupe.description || "Pas de description."}
          </p>

          {/* BOUTON UNIQUE "OUVRIR" */}
          <button 
            className="btn-small"
            onClick={() => navigate(`/groupe/${groupe.id_groupe}`)}
          >
            Ouvrir
          </button>
        </div>
      ))
    )}
  </section>
</div>


        </main>
      </div>
      {isModalOpen && <CreateGroup closeModal={() => setIsModalOpen(false)} />}
      {isTodoOpen && <TodoModal closeModal={() => setIsTodoOpen(false)} />}
      {isNotifOpen && <NotifModal closeModal={() => setIsNotifOpen(false)} />}
    </div>

    
  );

};

export default Home;