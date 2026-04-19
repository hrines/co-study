import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './GestionGroupes.css';

const GestionGroupes = ({ filiere, niveau }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('existing'); // 'existing' ou 'pending'

  useEffect(() => {
    const fetchGroups = async () => {
      if (!filiere || !niveau) {
        setGroups([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // ✅ Route différente selon la vue
        const endpoint = view === 'pending' 
          ? `admin/pending-groups/${filiere}/${niveau}`
          : `admin/groups/${filiere}/${niveau}`;
        
        const url = `http://localhost:5000/api/${endpoint}`;
        console.log("📡 Requête vers:", url);
        
        const response = await axios.get(url);
        setGroups(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("❌ Erreur fetch groupes:", error);
        setGroups([]);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, [filiere, niveau, view]);

  const handleDelete = async (groupId) => {
    if (!window.confirm("Supprimer ce groupe définitivement ?")) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `http://localhost:5000/api/groupe/${groupId}`,
        { headers: { 'Authorization': `Bearer ${token}` }}
      );
      setGroups(groups.filter(g => g.id_groupe !== groupId));
      alert("🗑️ Groupe supprimé !");
    } catch (error) {
      console.error("Erreur suppression:", error);
      alert("Erreur lors de la suppression");
    }
  };

  if (!filiere || !niveau) {
    return (
      <div className="management-container">
        <div className="empty-state">
          <p>⚠️ Sélectionnez une filière et un niveau.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="management-container">
        <div className="loading-state">Chargement des groupes...</div>
      </div>
    );
  }

  return (
    <div className="management-container">
      <header className="management-header">
        <div className="header-text">
          <h1>Gestion des Groupes</h1>
          <p>Filière: {filiere} | Niveau: {niveau}</p>
        </div>
        
        {/* Onglets pour switcher */}
        <div className="view-tabs">
          <button 
            className={`tab-btn ${view === 'existing' ? 'active' : ''}`}
            onClick={() => setView('existing')}
          >
            ✅ Groupes Validés ({groups.length})
          </button>
          <button 
            className={`tab-btn ${view === 'pending' ? 'active' : ''}`}
            onClick={() => setView('pending')}
          >
            ⏳ En Attente
          </button>
        </div>
      </header>

      <div className="cards-grid">
        {groups.length > 0 ? (
          groups.map(group => (
            <div key={group.id_groupe} className="group-card">
              <h3>{group.nom_groupe}</h3>
              <p className="group-description">{group.description || 'Pas de description'}</p>
              
              <div className="group-meta">
                <span>🎓 {group.filiere}</span>
                <span>📚 {group.niveau}</span>
                <span>👤 Créateur: {group.createur_nom || 'ID: ' + group.id_etudiant}</span>
                {group.created_at && (
                  <span>📅 {new Date(group.created_at).toLocaleDateString('fr-FR')}</span>
                )}
              </div>
              
              <div className="group-actions">
                {view === 'existing' && (
                  <button 
                    className="btn-delete"
                    onClick={() => handleDelete(group.id_groupe)}
                  >
                    🗑️ Supprimer
                  </button>
                )}
                {view === 'pending' && (
                  <>
                    <button className="btn-validate" onClick={() => handleValidate(group.id_groupe)}>
                      ✅ Valider
                    </button>
                    <button className="btn-refuse" onClick={() => handleRefuse(group.id_groupe)}>
                      ❌ Refuser
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <p>
              {view === 'existing' 
                ? `Aucun groupe validé pour ${filiere} - ${niveau}`
                : `Aucun groupe en attente pour ${filiere} - ${niveau}`
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GestionGroupes;