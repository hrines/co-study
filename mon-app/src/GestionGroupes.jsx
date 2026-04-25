import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './GestionGroupes.css';

const GestionGroupes = ({ filiere, niveau }) => {
  const [groupes, setGroupes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('pending');
  
  // États pour la gestion avancée
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const API_BASE = 'http://localhost:5000/api';
  const getToken = () => localStorage.getItem('token');

  useEffect(() => {
    fetchGroupes();
  }, [filiere, niveau, view]);

  const fetchGroupes = async () => {
    if (!filiere || !niveau) { setGroupes([]); setLoading(false); return; }
    setLoading(true);
    try {
      const endpoint = view === 'pending' 
        ? `admin/pending-groups/${filiere}/${niveau}`
        : `admin/groups/${filiere}/${niveau}`;
      const res = await axios.get(`${API_BASE}/${endpoint}`);
      setGroupes(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("❌ Erreur fetch groupes:", err);
      setGroupes([]);
    } finally {
      setLoading(false);
    }
  };

  // 📋 Charger les membres d'un groupe
  const loadGroupMembers = async (groupId) => {
    try {
      const res = await axios.get(`${API_BASE}/admin/groupes/${groupId}/membres`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      setMembers(res.data);
      setSelectedGroup(groupes.find(g => g.id_groupe === groupId));
      setShowMembersModal(true);
    } catch (err) {
      alert("Erreur lors du chargement des membres");
    }
  };

  // 👢 Kick un membre
  const handleKick = async (groupeId, etudiantId, nomMembre) => {
    if (!window.confirm(`Retirer ${nomMembre} de ce groupe ?`)) return;
    setActionLoading(true);
    try {
      await axios.delete(`${API_BASE}/admin/groupes/${groupeId}/membres/${etudiantId}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      setMembers(members.filter(m => m.id !== etudiantId));
      alert("✅ Membre retiré");
    } catch (err) {
      alert(err.response?.data?.message || "Erreur lors du kick");
    } finally {
      setActionLoading(false);
    }
  };

  // 👑 Changer le rôle
  const handleChangeRole = async (groupeId, etudiantId, newRole) => {
    setActionLoading(true);
    try {
      await axios.put(`${API_BASE}/admin/groupes/${groupeId}/membres/${etudiantId}/role`, 
        { nouveau_role: newRole },
        { headers: { 'Authorization': `Bearer ${getToken()}` } }
      );
      setMembers(members.map(m => 
        m.id === etudiantId ? { ...m, role: newRole } : m
      ));
      alert("✅ Rôle mis à jour");
    } catch (err) {
      alert(err.response?.data?.message || "Erreur");
    } finally {
      setActionLoading(false);
    }
  };

  // ✏️ Renommer le groupe
  const openRenameModal = (group) => {
    setNewGroupName(group.nom_groupe);
    setSelectedGroup(group);
    setShowRenameModal(true);
  };

  const handleRename = async () => {
    if (!newGroupName.trim()) return alert("Nom requis");
    setActionLoading(true);
    try {
      await axios.put(`${API_BASE}/admin/groupes/${selectedGroup.id_groupe}/rename`, 
        { nouveau_nom: newGroupName },
        { headers: { 'Authorization': `Bearer ${getToken()}` } }
      );
      setGroupes(groupes.map(g => 
        g.id_groupe === selectedGroup.id_groupe ? { ...g, nom_groupe: newGroupName } : g
      ));
      alert("✅ Groupe renommé");
      setShowRenameModal(false);
    } catch (err) {
      alert(err.response?.data?.message || "Erreur");
    } finally {
      setActionLoading(false);
    }
  };

  // 🗑️ Supprimer un groupe (admin)
  const handleDeleteGroup = async (id) => {
    if (!window.confirm("⚠️ Supprimer ce groupe DÉFINITIVEMENT ? Cette action est irréversible.")) return;
    setActionLoading(true);
    try {
      await axios.delete(`${API_BASE}/admin/groupes/${id}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      setGroupes(groupes.filter(g => g.id_groupe !== id));
      alert("🗑️ Groupe supprimé");
    } catch (err) {
      alert("Erreur suppression");
    } finally {
      setActionLoading(false);
    }
  };

  // Validation/Refus (existant)
  const handleValidate = async (id) => {
    if (!window.confirm("Valider ce groupe ?")) return;
    try {
      await axios.put(`${API_BASE}/admin/valider-groupe/${id}`, {}, 
        { headers: { 'Authorization': `Bearer ${getToken()}` }}
      );
      setGroupes(groupes.filter(g => g.id_groupe !== id));
      alert("✅ Groupe validé !");
    } catch (error) { alert("Erreur validation"); }
  };

  const handleRefuse = async (id) => {
    const motif = prompt("Motif du refus :");
    if (motif === null || !motif.trim()) return;
    try {
      await axios.delete(`${API_BASE}/admin/refuser-groupe/${id}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` },
        data: { motif }
      });
      setGroupes(groupes.filter(g => g.id_groupe !== id));
      alert("❌ Groupe refusé");
    } catch (error) { alert("Erreur"); }
  };

  if (!filiere || !niveau) return <div className="empty-state">Sélectionnez un niveau.</div>;
  if (loading) return <div className="loading-state">Chargement...</div>;

  return (
    <div className="management-container">
      <header className="management-header">
        <div className="header-text">
          <h1>Gestion des Groupes</h1>
          <p>Filière: {filiere} | Niveau: {niveau}</p>
        </div>
        <div className="view-tabs">
          <button className={`tab-btn ${view === 'pending' ? 'active' : ''}`} onClick={() => setView('pending')}>
            ⏳ En attente
          </button>
          <button className={`tab-btn ${view === 'validated' ? 'active' : ''}`} onClick={() => setView('validated')}>
            ✅ Validés
          </button>
        </div>
      </header>

      <div className="table-container card">
        {groupes.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>NOM</th>
                <th>CRÉATEUR</th>
                <th>TYPE</th>
                <th>STATUT</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {groupes.map(g => (
                <tr key={g.id_groupe}>
                  <td>#{g.id_groupe}</td>
                  <td className="group-name">{g.nom_groupe}</td>
                  <td>{g.createur_nom} {g.createur_prenom}</td>
                  <td>{g.type_cursus || 'LMD'}</td>
                  <td><span className={`badge ${g.etat}`}>{g.etat === 'en_attente' ? '⏳' : '✅'} {g.etat}</span></td>
                  <td className="actions-cell">
                    {view === 'pending' ? (
                      <>
                        <button className="btn-icon validate" onClick={() => handleValidate(g.id_groupe)} title="Valider">✅</button>
                        <button className="btn-icon refuse" onClick={() => handleRefuse(g.id_groupe)} title="Refuser">❌</button>
                      </>
                    ) : (
                      <>
                        {/* 👁️ Voir membres */}
                        <button className="btn-icon view" onClick={() => loadGroupMembers(g.id_groupe)} title="Voir membres">👥</button>
                        {/* ✏️ Renommer */}
                        <button className="btn-icon edit" onClick={() => openRenameModal(g)} title="Renommer">✏️</button>
                        {/* 🗑️ Supprimer */}
                        <button className="btn-icon delete-group" onClick={() => handleDeleteGroup(g.id_groupe)} title="Supprimer">🗑️</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state"><p>Aucun groupe {view === 'pending' ? 'en attente' : 'validé'}.</p></div>
        )}
      </div>

      {/* 👥 MODAL MEMBRES */}
      {showMembersModal && selectedGroup && (
        <div className="modal-overlay" onClick={() => setShowMembersModal(false)}>
          <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>👥 Membres de "{selectedGroup.nom_groupe}"</h3>
              <button className="modal-close" onClick={() => setShowMembersModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {members.length > 0 ? (
                <table className="members-table">
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Email</th>
                      <th>Matricule</th>
                      <th>Rôle</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map(m => (
                      <tr key={m.id}>
                        <td>{m.nom} {m.prenom}</td>
                        <td>{m.email}</td>
                        <td>{m.matricule}</td>
                        <td>
                          {m.role === 'createur' ? (
                            <span className="badge createur">👑 Créateur</span>
                          ) : (
                            <select 
                              value={m.role} 
                              onChange={(e) => handleChangeRole(selectedGroup.id_groupe, m.id, e.target.value)}
                              disabled={actionLoading}
                              className="role-select"
                            >
                              <option value="membre">Membre</option>
                              <option value="responsable">Responsable</option>
                            </select>
                          )}
                        </td>
                        <td>
                          {m.role !== 'createur' && (
                            <button 
                              className="btn-icon kick" 
                              onClick={() => handleKick(selectedGroup.id_groupe, m.id, `${m.nom} ${m.prenom}`)}
                              disabled={actionLoading}
                              title="Retirer du groupe"
                            >
                              👢
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="empty-state">Aucun membre dans ce groupe.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ✏️ MODAL RENOMMER */}
      {showRenameModal && (
        <div className="modal-overlay" onClick={() => setShowRenameModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✏️ Renommer le groupe</h3>
              <button className="modal-close" onClick={() => setShowRenameModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <input 
                type="text" 
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleRename()}
                autoFocus
                className="form-input"
                placeholder="Nouveau nom du groupe"
              />
              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setShowRenameModal(false)}>Annuler</button>
                <button className="btn-confirm" onClick={handleRename} disabled={actionLoading}>
                  {actionLoading ? '...' : 'Renommer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionGroupes;