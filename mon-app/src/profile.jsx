import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Profile.css';

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

    // 1. Récupérer les infos complètes + stats (nb groupes)
    fetch(`http://localhost:5000/api/profil/${user.id_etudiant}`)
      .then(res => res.json())
      .then(data => setProfileData(data))
      .catch(err => console.error(err));

    // 2. Récupérer les fichiers favoris
    fetch(`http://localhost:5000/api/favoris/${user.id_etudiant}`)
      .then(res => res.json())
      .then(data => setFavoris(data))
      .catch(err => console.error(err));
  }, [user?.id_etudiant]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  if (!profileData) return <div className="loader">Chargement...</div>;

  return (
  <div className="profile-page">
    <div className="profile-header-container">
      <div className="cover-photo"></div>
      <div className="profile-main-info">
        <div className="profile-avatar-large">
          {profileData.prenom[0]}{profileData.nom[0]}
        </div>
        <div className="user-name-bio">
          <h2>{profileData.prenom} {profileData.nom}</h2>
          <p>{profileData.bio || "Étudiant à l'Université Oran 1"}</p>
        </div>
      </div>
    </div>

    <div className="profile-grid">
      {/* Colonne Gauche : Intro */}
      <aside>
        <div className="fb-card">
          <h3>Intro</h3>
          <div className="info-item">
            <span className="info-icon">🎓</span> 
            Étudie à <strong>Université Oran 1</strong>
          </div>
          <div className="info-item">
            <span className="info-icon">🆔</span> 
            Matricule: <strong>{profileData.matricule}</strong>
          </div>
          <div className="info-item">
            <span className="info-icon">📚</span> 
            Filière: <strong>{profileData.filiere}</strong>
          </div>
          <button className="logout-btn" onClick={handleLogout}>Se déconnecter</button>
        </div>

        <div className="fb-card">
          <h3>Statistiques Flow</h3>
          <p>📊 {profileData.nb_crees} Groupes créés</p>
          <p>🤝 {profileData.nb_rejoints} Groupes rejoints</p>
        </div>
      </aside>

      {/* Colonne Droite : Bibliothèque */}
      <main>
        <div className="fb-card">
          <h3>⭐ Ma Bibliothèque (Favoris)</h3>
          <div className="favoris-list">
            {favoris.length > 0 ? favoris.map(f => (
              <div key={f.id_fichier} className="file-item">
                <span style={{fontSize: '24px', marginRight: '10px'}}>📄</span>
                <div>
                  <strong>{f.nom_fichier}</strong>
                  <div style={{fontSize: '0.8rem', color: '#65676b'}}>{f.module}</div>
                </div>
                <button className="view-btn">Ouvrir</button>
              </div>
            )) : <p>Aucun favori pour le moment.</p>}
          </div>
        </div>
      </main>
    </div>
  </div>
);
};

export default Profile;