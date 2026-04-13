import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './GestionMembres.css';

const GestionMembres = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [view, setView] = useState('active'); // 'active' ou 'pending'

useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true); // On remet le chargement à vrai quand on change de vue
      try {
        const endpoint = view === 'active' ? 'users' : 'admin/pending-registrations';
        const response = await axios.get(`http://localhost:5000/api/${endpoint}`);
        
        setUsers(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Erreur de connexion au serveur :", error);
        setUsers([]); // On vide la liste en cas d'erreur pour éviter d'afficher de vieilles données
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [view]); // <--- CRUCIAL : React ré-exécute la fonction dès que "view" change

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

  if (loading) return <div className="loading-state">Connexion à la base de données...</div>;

  return (
    <div className="management-container">
      <header className="management-header">
        <div className="header-text">
          <h1>User Management</h1>
          <p>Liste des étudiants inscrits sur la plateforme Co'study.</p>
        </div>
      </header>

      <div className="action-bar card">
        <div className="search-box">
          <span>🔍</span>
          <input 
            type="text" 
            placeholder="Rechercher par nom..." 
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="main-actions">
          <button className="btn-primary"><span>➕</span> Ajouter</button>
        </div>
      </div>

      <div className="table-container card">
        <table className="user-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nom complet</th>
              <th>Email</th>
              <th>Matricule</th>
              <th>Status</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length > 0 ? (
              users
                // Filtrage sécurisé (on vérifie que le nom existe)
                .filter(u => (u.nom || "").toLowerCase().includes(searchTerm.toLowerCase()))
                .map(user => (
                  <tr key={user.id}>
                    <td>#{user.id}</td>
                    <td className="user-cell">
                      <img src={user.avatar || 'https://via.placeholder.com/40'} alt="" className="user-avatar" />
                      {/* On utilise les colonnes de TA table : nom et prenom */}
                      {user.nom} {user.prenom}
                    </td>
                    <td className="email-cell">{user.email}</td>
                    <td>{user.username}</td> {/* C'est ton matricule via l'alias SQL */}
                    <td>
                      <span className={`status-badge ${getStatusClass(user.status)}`}>
                        {user.status || 'Active'}
                      </span>
                    </td>
                    <td>{user.role || 'User'}</td>
                    <td className="actions-cell">
                      <button className="icon-btn edit">✏️</button>
                      <button onClick={() => handleDelete(user.id)} className="icon-btn delete">🗑️</button>
                    </td>
                  </tr>
                ))
            ) : (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>
                  Aucun étudiant trouvé dans la base de données.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GestionMembres;