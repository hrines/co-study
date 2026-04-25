import React, { useState, useEffect } from 'react';
import './AdminSy.css';
import GestionMembres from './GestionMembres';
import GestionGroupes from './GestionGroupes';
import GestionFichiers from './GestionFichiers';


  const AdminSy = () => {
  // 1. ÉTATS
  const [menuOuvert, setMenuOuvert] = useState({});
  const [selection, setSelection] = useState({ filiere: null, cursus: null, niveau: null });  // État pour savoir quel niveau est sélectionné au milieu
  const [ongletActif, setOngletActif] = useState('membres');
  const [stats, setStats] = useState({ fichiers: 0, membres: 0, groupes: 0 });
  

  // Fonction pour déplier/replier les menus
  const toggleMenu = (key) => {
    setMenuOuvert(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Structure de tes données (tu pourras l'étendre plus tard)
  const structures = {
    "Informatique": {
      "LMD": ["L1", "L2", "L3", "M1", "M2"],
      "Ingénieur": ["1ere", "2eme", "3eme", "4eme", "5eme"]
    },
    "Mathématiques": {
      "LMD": ["L1", "L2", "L3", "M1", "M2"],
    },
    "Chimie": {
      "LMD": ["L1", "L2", "L3", "M1", "M2"],
    }
  };



  useEffect(() => {
    if (selection.niveau && selection.filiere) {
      // On ajoute un timestamp pour forcer le rechargement si besoin
      const url = `http://localhost:5000/api/admin/stats/${selection.filiere}/${selection.niveau}?t=${Date.now()}`;
      
      fetch(url)
        .then(res => res.json())
        .then(data => {
          setStats({
            fichiers: data.fichiersEnAttente || 0,
            membres: data.totalEtudiants || 0,
            groupes: data.groupesEnAttente || 0
          });
        })
        .catch(err => console.error("Stats error:", err));
    }
  }, [selection]); // Dépendance correcte

  return (
    <div className="admin-layout">
      {/* SIDEBAR GAUCHE */}
      <aside className="admin-sidebar">
        <div className="admin-logo">Co'study Admin</div>
        <nav className="admin-nav">
          {Object.keys(structures).map(filiere => (
            <div key={filiere} className="filiere-block">
              <div className="menu-header" onClick={() => toggleMenu(filiere)}>
                📂 {filiere} {menuOuvert[filiere] ? '▼' : '▶'}
              </div>
              {menuOuvert[filiere] && (
                <div className="cursus-container">
                  {Object.keys(structures[filiere]).map(cursus => (
                    <div key={cursus} className="cursus-block">
                      <div className="menu-sub-header" onClick={() => toggleMenu(`${filiere}-${cursus}`)}>
                        🎓 {cursus} {menuOuvert[`${filiere}-${cursus}`] ? '▼' : '▶'}
                      </div>
                      {menuOuvert[`${filiere}-${cursus}`] && (
                        <ul className="niveaux-list">
                          {structures[filiere][cursus].map(niv => (
                            <li 
                              key={niv} 
                              className={selection.niveau === niv ? 'active-niv' : ''}
                              onClick={() => {
  if (filiere && cursus && niv) {
    setSelection({ filiere, cursus, niveau: niv });
    setOngletActif('membres');
  }
}}

                            >
                              {niv}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </aside>

      {/* ZONE CENTRALE */}
<main className="admin-main">
  {selection.niveau ? (
    <div className="dashboard-content">
      <header className="content-header">
        <h1>{selection.filiere} &gt; {selection.cursus} {selection.niveau}</h1>
      </header>


      {/* 2. BOUTONS DE NAVIGATION (Les accès aux fichiers) */}
<div className="navigation-menu">
  <button 
    className={`nav-btn ${ongletActif === 'membres' ? 'active' : ''}`}
    onClick={() => setOngletActif('membres')}
  >
    <span className="nav-btn-icon">👥</span>
    <div className="nav-btn-text">
      <span className="nav-btn-title">Gérer les Membres</span>
    </div>
  </button>

  <button 
    className={`nav-btn ${ongletActif === 'groupes' ? 'active' : ''}`}
    onClick={() => setOngletActif('groupes')}
  >
    <span className="nav-btn-icon">💬</span>
    <div className="nav-btn-text">
      <span className="nav-btn-title">Gérer les Groupes</span>
    </div>
  </button>

  <button 
    className={`nav-btn ${ongletActif === 'fichiers' ? 'active' : ''}`}
    onClick={() => setOngletActif('fichiers')}
  >
    <span className="nav-btn-icon">📄</span>
    <div className="nav-btn-text">
      <span className="nav-btn-title">Gérer les Fichiers</span>
    </div>
  </button>
</div>

{/* 3. ZONE DE TRAVAIL (Le contenu des fichiers) */}
<div className="admin-sections-container">
  {ongletActif === 'membres' && <GestionMembres filiere={selection.filiere} niveau={selection.niveau} />}
  {ongletActif === 'groupes' && <GestionGroupes filiere={selection.filiere} niveau={selection.niveau} />}     
  {ongletActif === 'fichiers' && <GestionFichiers filiere={selection.filiere} niveau={selection.niveau} />}    
</div>
    </div>
  ) : (
    <div className="welcome-admin">
      <h2>👋 Sélectionnez un niveau pour commencer</h2>
    </div>
  )}
</main>
    </div>
  );
}; // <-- L'accolade que j'ai rajoutée

export default AdminSy;