import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './GroupesList.css';
import Footer from './footer';

const GroupesList = () => {
  const { niveau } = useParams();
  const navigate = useNavigate();
  const [groupes, setGroupes] = useState([]);
  const userId = localStorage.getItem('userId');
  const [demandesEnvoyees, setDemandesEnvoyees] = useState([]);
  const userFiliere = localStorage.getItem('userFiliere');

useEffect(() => {
  // 1. Récupérer la filière proprement
  const filiere = localStorage.getItem('userFiliere');
  const userId = localStorage.getItem('userId');
  
  // 2. Charger les groupes (avec ou sans filière)
  let url = `http://localhost:5000/api/groupes/${niveau}`;
  if (filiere && filiere !== 'undefined' && filiere !== 'null') {
    url += `?filiere=${encodeURIComponent(filiere)}`;
  }
  
  console.log("🔄 Chargement groupes depuis:", url);
  
  fetch(url)
    .then(res => {
      console.log("📡 Status groupes:", res.status);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => {
      console.log("✅ Groupes reçus:", data?.length || 0);
      setGroupes(Array.isArray(data) ? data : []);
    })
    .catch(err => {
      console.error("❌ Erreur chargement groupes:", err);
      setGroupes([]);
    });

  // 3. Charger les demandes (seulement si userId valide)
  if (userId && userId !== 'undefined' && userId !== 'null') {
    fetch(`http://localhost:5000/api/mes-demandes/${userId}`)
      .then(res => res.json())
      .then(data => {
        const ids = Array.isArray(data) ? data.map(d => d.id_groupe) : [];
        console.log("✅ Demandes envoyées:", ids);
        setDemandesEnvoyees(ids);
      })
      .catch(err => console.error("❌ Erreur demandes:", err));
  }
}, [niveau]);

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
        setDemandesEnvoyees([...demandesEnvoyees, idGroupe]); 
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
      <Footer />
    </div>
  );
};

export default GroupesList;