import React, { useState } from 'react';
import './CreateGroup.css';

const CreateGroup = ({ closeModal }) => {
  const [nomGroupe, setNomGroupe] = useState('');
  const [description, setDescription] = useState('');
  const [filiere, setFiliere] = useState(() => localStorage.getItem('userFiliere') || '');
  const [typeCursus, setTypeCursus] = useState('');
  const [niveau, setNiveau] = useState('');

  const optionsNiveaux = {
    LMD: ['L1', 'L2', 'L3', 'M1', 'M2'],
    Ingenieur: ['1er', '2eme', '3eme', '4eme', '5eme']
  };
    // On récupère l'objet user complet
const user = JSON.parse(localStorage.getItem('user'));
const userId = user ? user.id_etudiant : null;
const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 1. On récupère le TOKEN et l'ID utilisateur
    const token = localStorage.getItem('token'); 
    const id_etudiant = user?.id_etudiant; 

    if (!id_etudiant || !token) {
      alert("Vous devez être connecté pour créer un groupe");
      return;
    }
    
    const groupeData = {
      nom_groupe: nomGroupe,
      description,
      filiere,
      type_cursus: typeCursus,
      niveau,
      id_etudiant: id_etudiant 
    };

    try {
// Dans ton handleSubmit de CreateGroup.jsx
const response = await fetch('http://localhost:5000/api/create-group', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}` 
  },
  body: JSON.stringify(groupeData),
});

if (response.ok) {
  // CHANGEMENT DU MESSAGE : Plus honnête pour l'utilisateur
  alert("Demande envoyée ! L'administrateur doit valider la création de votre groupe.");
  closeModal();
}

      const data = await response.json();

      if (response.ok) {
        alert('Groupe créé avec succès !');
        closeModal();
        // Optionnel : recharger la page pour voir le nouveau groupe
        window.location.reload(); 
      } else {
        alert('Erreur : ' + (data.message || "Accès refusé"));
      }
    } catch (error) {
      console.error("Erreur creation groupe:", error);
      alert('Le serveur ne répond pas.');
    }
  };



  return (
    <div className="create-group-container"> {/* AJOUT DE CETTE DIV */}
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Créer un nouveau groupe</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label>Nom du groupe</label>
            <input type="text" value={nomGroupe} onChange={(e) => setNomGroupe(e.target.value)} required />
          </div>

<div className="form-field">
  <label>Description</label>
  <textarea 
    value={description} 
    onChange={(e) => setDescription(e.target.value)} 
    placeholder="Ex: Groupe d'étude pour le module Système d'Exploitation 2 "
    required 
  />
</div>
          <div className="form-field">
            <label>Filière</label>
            <input type="text" value={filiere} disabled style={{ background: 'var(--border-color)', cursor: 'not-allowed' }} />
          </div>

          <div className="form-field">
            <label>Cursus</label>
            <select value={typeCursus} onChange={(e) => { setTypeCursus(e.target.value); setNiveau(''); }} required>
              <option value="">-- Choisir --</option>
              <option value="LMD">LMD</option>
              <option value="Ingenieur">Ingénieur</option>
            </select>
          </div>

          <div className="form-field">
            <label>Niveau</label>
            <select value={niveau} onChange={(e) => setNiveau(e.target.value)} disabled={!typeCursus} required>
              <option value="">-- Choisir le niveau --</option>
              {typeCursus && optionsNiveaux[typeCursus].map((niv) => (
                <option key={niv} value={niv}>{niv}</option>
              ))}
            </select>
          </div>

          <div className="modal-buttons">
            <button type="button" onClick={closeModal} className="btn-cancel">Annuler</button>
            <button type="submit" className="btn-confirm">Créer le groupe</button>
          </div>
        </form>
      </div>
    </div>
    </div>
  );
};

export default CreateGroup;