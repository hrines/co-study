// Dans GestionMembres.jsx - Version sécurisée
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './GestionMembres.css';

const GestionMembres = ({ filiere, niveau }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [view, setView] = useState('active');






useEffect(() => {
  const fetchUsers = async () => {
    if (!filiere || !niveau) {
      setUsers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const url = `http://localhost:5000/api/users?filiere=${filiere}&niveau=${niveau}`;
      
      const response = await axios.get(url);
      
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("❌ Erreur fetch users:", error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  fetchUsers();
}, [filiere, niveau]);










  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const endpoint = view === 'active' ? 'users' : 'admin/pending-registrations';
        
        // ✅ SÉCURISÉ : Gestion des undefined
        const params = new URLSearchParams();
        if (filiere) params.append('filiere', filiere);
        if (niveau) params.append('niveau', niveau);
        
        const url = `http://localhost:5000/api/${endpoint}${params.toString() ? '?' + params.toString() : ''}`;
        
        console.log("📡 Requête vers:", url); // Pour déboguer
        
        const response = await axios.get(url);
        setUsers(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("❌ Erreur fetch users:", error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [view, filiere, niveau]);

  const handleDelete = async (id) => {
    if (window.confirm("Voulez-vous vraiment supprimer cet étudiant ?")) {
      try {
        await axios.delete(`http://localhost:5000/api/users/${id}`);
        setUsers(users.filter(user => user.id !== id));
      } catch (error) {
        alert("Erreur lors de la suppression");
      }
    }
  };

  const getStatusClass = (status) => {
    const s = status?.toLowerCase();
    if (s === 'active') return 'status-active';
    return 'status-inactive';
  };

  // ✅ Afficher un message si pas de filière/niveau sélectionné
  if (!filiere || !niveau) {
    return (
      <div className="management-container">
        <p style={{ padding: '2rem', textAlign: 'center', color: '#546e7a' }}>
          ⚠️ Sélectionnez une filière et un niveau dans la sidebar pour voir les membres.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="management-container">
        <div className="loading-state">Chargement des membres...</div>
      </div>
    );
  }

  return (
    <div className="management-container">
      <header className="management-header">
        <div className="header-text">
          <h1>Gestion des Membres</h1>
          <p>Filière: {filiere} | Niveau: {niveau}</p>
        </div>
      </header>

      <div className="table-container card">
        {users.length > 0 ? (
          <table className="user-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nom complet</th>
                <th>Email</th>
                <th>Matricule</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users
                .filter(u => (u.nom || "").toLowerCase().includes(searchTerm.toLowerCase()))
                .map(user => (
                  <tr key={user.id}>
                    <td>#{user.id}</td>
                    <td className="user-cell">
                      {/* ✅ BADGE AVEC INITIALES */}
                      <div className="user-avatar-badge">
                        {(user.nom?.charAt(0) || '?').toUpperCase()}
                      </div>
                      {user.nom} {user.prenom}
                    </td>
                    <td className="email-cell">{user.email}</td>
                    <td>{user.username || user.matricule}</td>
                    <td>
                      <span className={`status-badge ${getStatusClass(user.status)}`}>
                        {user.status || 'Active'}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button onClick={() => handleDelete(user.id)} className="icon-btn delete">🗑️</button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <p>Aucun membre trouvé pour {filiere} - {niveau}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GestionMembres;