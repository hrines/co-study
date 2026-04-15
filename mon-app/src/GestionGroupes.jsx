import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './GestionMembres.css'; // On réutilise le même CSS pour la cohérence

const GestionGroupes = ({ filiere, niveau }) => {
  const [groupes, setGroupes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [view, setView] = useState('pending'); // Par défaut on affiche les demandes

  useEffect(() => {
    const fetchGroupes = async () => {
      setLoading(true);
      try {
        // 'active' -> groupes validés, 'pending' -> groupes en attente
        const endpoint = view === 'active' ? `groupes/${niveau}?filiere=${filiere}` : `admin/pending-groups/${filiere}/${niveau}`;
        const response = await axios.get(`http://localhost:5000/api/${endpoint}`);
        
        setGroupes(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Erreur serveur :", error);
        setGroupes([]);
      } finally {
        setLoading(false);
      }
    };
    fetchGroupes();
  }, [view, filiere, niveau]);

const handleAction = async (id, action) => {
  const confirmMsg = action === 'valider' ? "Approuver ce groupe ?" : "Supprimer ce groupe ?";
  if (!window.confirm(confirmMsg)) return;

  try {
    const token = localStorage.getItem('token');
    const method = action === 'valider' ? 'put' : 'delete';
    const url = action === 'valider' 
      ? `http://localhost:5000/api/admin/valider-groupe/${id}`
      : `http://localhost:5000/api/admin/refuser-groupe/${id}`;

    // ✅ CORRECTION : method (variable) au lieu de 'put' (string fixe)
    await axios({
      method: method,
      url: url,
      headers: { 'Authorization': `Bearer ${token}` }
    });

    setGroupes(groupes.filter(g => (g.id_groupe || g.id) !== id));
    alert(action === 'valider' ? "Groupe activé !" : "Action effectuée.");
  } catch (error) {
    console.error("Erreur action admin:", error);
    alert("Erreur lors de l'opération");
  }
};

  if (loading) return <div className="loading-state">Chargement des groupes...</div>;

  return (
    <div className="management-container">
      <header className="management-header">
        <div className="header-text">
          <h1>Gestion des Groupes</h1>
          <p>Administration des espaces de travail pour {filiere} ({niveau})</p>
        </div>
      </header>

      {/* Barre de navigation entre Actifs et En attente */}
  {/* Barre de navigation entre Actifs et En attente */}
<div className="view-selector card">
  <button 
    className={`btn-view ${view === 'pending' ? 'active' : ''}`} 
    onClick={() => setView('pending')}
  >
    Demandes en attente
  </button>
  <button 
    className={`btn-view ${view === 'active' ? 'active' : ''}`} 
    onClick={() => setView('active')}
  >
    Groupes Actifs
  </button>
</div>

      <div className="action-bar card">
        <div className="search-box">
          <span>🔍</span>
          <input 
            type="text" 
            placeholder="Rechercher un groupe..." 
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container card">
        <table className="user-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nom du Groupe</th>
              <th>Description</th>
              <th>Créateur</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {groupes.length > 0 ? (
              groupes
                .filter(g => (g.nom_groupe || "").toLowerCase().includes(searchTerm.toLowerCase()))
                .map(groupe => (
                  <tr key={groupe.id_groupe}>
                    <td>#{groupe.id_groupe}</td>
                    <td className="user-cell"><strong>{groupe.nom_groupe}</strong></td>
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {groupe.description}
                    </td>
                    <td>ID Etudiant: {groupe.id_etudiant}</td>
                    <td>
                      <span className={`status-badge ${view === 'active' ? 'status-active' : 'status-inactive'}`}>
                        {view === 'active' ? 'Validé' : 'En attente'}
                      </span>
                    </td>
                    <td className="actions-cell">
                      {view === 'pending' && (
                        <button onClick={() => handleAction(groupe.id_groupe, 'valider')} className="icon-btn edit" title="Valider">✅</button>
                      )}
                      <button onClick={() => handleAction(groupe.id_groupe, 'refuser')} className="icon-btn delete" title="Supprimer">🗑️</button>
                    </td>
                  </tr>
                ))
            ) : (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>
                  Aucun groupe trouvé dans cette catégorie.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GestionGroupes;