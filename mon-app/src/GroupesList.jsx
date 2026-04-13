import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './GroupesList.css';
import { useTheme } from './ThemeContext';

const GroupesList = () => {
  const { niveau } = useParams();
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useTheme();
  const [groupes, setGroupes] = useState([]);
  const userId = localStorage.getItem('userId');
  const [demandesEnvoyees, setDemandesEnvoyees] = useState([]);
  const userFiliere = localStorage.getItem('userFiliere');

  useEffect(() => {
    // 1. Charger les groupes 
fetch(`http://localhost:5000/api/groupes/${niveau}?filiere=${userFiliere}`)      .then(res => res.json())
      .then(data => setGroupes(data))
      .catch(err => console.error(err));
 // 2.Charger les demandes de l'utilisateur pour griser les boutons
    fetch(`http://localhost:5000/api/mes-demandes/${userId}`)
      .then(res => res.json())
      .then(data => {
        // On ne garde que les IDs des groupes demandés
        const ids = data.map(d => d.id_groupe);
        setDemandesEnvoyees(ids);
      })
      .catch(err => console.error("Erreur chargement demandes:", err));
  }, [niveau, userId]);

  const demanderAdhesion = async (idGroupe) => {
    try {
      const response = await fetch('http://localhost:5000/api/demande-adhesion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_groupe: idGroupe, id_etudiant: userId }),
      });
      const data = await response.json();
      if (response.ok) {
        alert('Demande envoyée au responsable du groupe !');
        setDemandesEnvoyees([...demandesEnvoyees, idGroupe]); // On grise le bouton
      } else {
        alert('Erreur : ' + data.message);
      }
    } catch (error) {
      alert('Le serveur ne répond pas.');
    }
  };


const annulerDemande = async (idGroupe) => {
  try {
    const response = await fetch('http://localhost:5000/api/annuler-demande', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_groupe: idGroupe, id_etudiant: userId }),
    });

    if (response.ok) {
      // On retire l'ID du groupe de notre liste locale pour que le bouton redevienne "Rejoindre"
      setDemandesEnvoyees(demandesEnvoyees.filter(id => id !== idGroupe));
    } else {
      alert("Erreur lors de l'annulation");
    }
  } catch (error) {
    console.error("Erreur:", error);
  }
};




  return (
    <div className="groupes-list-page">
      <div className="groupes-list-header">
        <button className="back-btn" onClick={() => navigate('/home')}>← Retour</button>
        <h2>Groupes — Niveau {niveau}</h2>
        <button className="dark-mode-btn" onClick={toggleDarkMode}>
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>

      <div className="groupes-grid">
        {groupes.length === 0 ? (
          <p className="empty-msg">Aucun groupe pour ce niveau pour le moment.</p>
        ) : (
          groupes.map(groupe => (
            <div key={groupe.id_groupe} className="groupe-card-item">
              <div className="groupe-card-info">
                <h3>{groupe.nom_groupe}</h3>
                <p>{groupe.description}</p>
                <div className="groupe-tags">
                  <span className="tag">{groupe.filiere}</span>
                  <span className="tag">{groupe.type_cursus}</span>
                  <span className="tag">{groupe.niveau}</span>
                </div>
              </div>
<div className="groupe-card-actions">
  {demandesEnvoyees.includes(groupe.id_groupe) ? (
    // Bouton ANNULER si déjà envoyé
    <button 
      className="btn-annuler"
      onClick={() => annulerDemande(groupe.id_groupe)}
    >
      ✖ Annuler la demande
    </button>
  ) : (
    // Bouton REJOINDRE si pas encore envoyé
    <button 
      className="btn-rejoindre"
      onClick={() => demanderAdhesion(groupe.id_groupe)}
    >
      🤝 Rejoindre
    </button>
  )}
</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default GroupesList;