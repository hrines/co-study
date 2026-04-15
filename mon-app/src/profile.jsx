import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './profile.css';
import Footer from './footer';

const Profile = () => {
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [favoris, setFavoris] = useState([]);
  const user = JSON.parse(localStorage.getItem('user'));


  

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    fetch(`http://localhost:5000/api/profil/${user.id_etudiant}`)
      .then(res => res.json())
      .then(data => setProfileData(data))
      .catch(err => console.error(err));

    fetch(`http://localhost:5000/api/favoris/${user.id_etudiant}`)
      .then(res => res.json())
      .then(data => setFavoris(data))
      .catch(err => console.error(err));
  }, [user?.id_etudiant, navigate]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };


  if (!profileData) return <div className="loader">Chargement...</div>;

  return (
    <div className="profile-container">
      {/* Header moderne avec bannière sobre */}
      <header className="profile-hero">
        <div className="hero-banner"></div>
        <div className="hero-content">
          <div className="avatar-wrapper">
            <div className="profile-avatar-initials">
              {profileData.prenom[0]}{profileData.nom[0]}
            </div>
          </div>
          <div className="hero-text">
            <h1>{profileData.prenom} {profileData.nom}</h1>
            <p className="user-tag">Étudiant en {profileData.filiere}</p>
          </div>
        </div>
      </header>

      <div className="profile-content-grid">
        {/* Section Informations (Style eLearn amélioré) */}
        <section className="profile-main-card">
          <h3 className="section-title">Informations détaillées</h3>
          <div className="info-grid">
            <div className="info-box">
              <span className="info-label">Université</span>
              <p className="info-value">Université Oran 1</p>
            </div>
            <div className="info-box">
              <span className="info-label">Matricule</span>
              <p className="info-value">{profileData.matricule}</p>
            </div>
            <div className="info-box">
              <span className="info-label">Filière</span>
              <p className="info-value">{profileData.filiere}</p>
            </div>
            <div className="info-box">
              <span className="info-label">Statut</span>
              <p className="info-value">Actif</p>
            </div>
          </div>

          <h3 className="section-title mt-4">Statistiques Flow</h3>
          <div className="stats-container">
            <div className="stat-card">
              <span className="stat-number">{profileData.nb_crees}</span>
              <span className="stat-label">Groupes créés</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{profileData.nb_rejoints}</span>
              <span className="stat-label">Groupes rejoints</span>
            </div>
          </div>
        </section>

        {/* Section Bibliothèque / Favoris */}
        <aside className="profile-side-card">
          <h3 className="section-title">Ma Bibliothèque (Favoris)</h3>
          <div className="favoris-scroll-area">
            {favoris.length > 0 ? favoris.map(f => (
              <div key={f.id_fichier} className="modern-file-item">
                <div className="file-icon-box">📄</div>
                <div className="file-info">
                  <span className="file-name">{f.nom_fichier}</span>
                  <span className="file-meta">{f.module}</span>
                </div>
                <button className="btn-open-file">Ouvrir</button>
              </div>
            )) : <p className="empty-state">Aucun document favori.</p>}
          </div>
        </aside>
      </div>
      <Footer />
    </div>
  );
};

export default Profile;