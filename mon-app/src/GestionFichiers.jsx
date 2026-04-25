import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './GestionFichiers.css';

const GestionFichiers = ({ filiere, niveau }) => {
    const [fichiers, setFichiers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('pending'); // 'pending' ou 'validated'
    
    // États pour le renommage
    const [showRenameModal, setShowRenameModal] = useState(false);
    const [fileToRename, setFileToRename] = useState(null);
    const [newFileName, setNewFileName] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    const API_BASE = 'http://localhost:5000/api';
    const getToken = () => localStorage.getItem('token');

    useEffect(() => {
        fetchFichiers();
    }, [filiere, niveau, view]);

    const fetchFichiers = async () => {
        if (!filiere || !niveau) {
            setFichiers([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            // ✅ Endpoint unique avec paramètre statut
            const statut = view === 'pending' ? 'en_attente' : 'valide';
            const url = `${API_BASE}/fichiers?filiere=${encodeURIComponent(filiere)}&niveau=${encodeURIComponent(niveau)}&statut=${statut}`;
            
            const response = await axios.get(url);
            setFichiers(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error("❌ Erreur fetch fichiers:", error);
            setFichiers([]);
        } finally {
            setLoading(false);
        }
    };

    // ✅ Valider un fichier (pending → valide)
    const handleValidate = async (id) => {
        if (!window.confirm("Valider ce fichier ?")) return;
        setActionLoading(true);
        try {
            await axios.put(
                `${API_BASE}/fichiers/${id}/valider`,
                {},
                { headers: { 'Authorization': `Bearer ${getToken()}` } }
            );
            setFichiers(fichiers.filter(f => f.id_fichier !== id));
            alert("✅ Fichier validé !");
        } catch (error) {
            alert(error.response?.data?.message || "❌ Erreur lors de la validation");
        } finally {
            setActionLoading(false);
        }
    };

    // ❌ Refuser/supprimer un fichier (pending uniquement)
    const handleRefuse = async (id) => {
        const motif = prompt("Motif du refus (optionnel) :");
        if (motif === null) return;
        
        setActionLoading(true);
        try {
            await axios.delete(`${API_BASE}/fichiers/${id}`, {
                headers: { 'Authorization': `Bearer ${getToken()}` },
                data: { motif: motif || 'Aucun motif fourni' }
            });
            setFichiers(fichiers.filter(f => f.id_fichier !== id));
            alert("❌ Fichier refusé et supprimé !");
        } catch (error) {
            alert(error.response?.data?.message || "❌ Erreur lors du refus");
        } finally {
            setActionLoading(false);
        }
    };

    // ✏️ Ouvrir modal de renommage
    const openRenameModal = (file) => {
        setFileToRename(file);
        setNewFileName(file.nom_fichier);
        setShowRenameModal(true);
    };

    // ✏️ Renommer un fichier
    const handleRename = async () => {
        if (!newFileName.trim()) return alert("Le nom ne peut pas être vide");
        if (!fileToRename) return;
        
        setActionLoading(true);
        try {
            await axios.put(
                `${API_BASE}/fichiers/${fileToRename.id_fichier}/rename`,
                { nouveau_nom: newFileName },
                { headers: { 'Authorization': `Bearer ${getToken()}` } }
            );
            
            setFichiers(fichiers.map(f => 
                f.id_fichier === fileToRename.id_fichier 
                    ? { ...f, nom_fichier: newFileName } 
                    : f
            ));
            
            alert("✅ Nom modifié avec succès !");
            setShowRenameModal(false);
            setFileToRename(null);
        } catch (error) {
            alert(error.response?.data?.message || "❌ Erreur lors du renommage");
        } finally {
            setActionLoading(false);
        }
    };

    // 👁️ Voir/télécharger le fichier
    const viewFile = (file) => {
        const fileUrl = `http://localhost:5000/${file.url_fichier}`;
        window.open(fileUrl, '_blank');
    };

    // 🗑️ Supprimer un fichier validé (admin)
    const handleDeleteFile = async (id) => {
        if (!window.confirm("⚠️ Supprimer ce fichier DÉFINITIVEMENT ?")) return;
        setActionLoading(true);
        try {
            await axios.delete(`${API_BASE}/fichiers/${id}`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            setFichiers(fichiers.filter(f => f.id_fichier !== id));
            alert("🗑️ Fichier supprimé !");
        } catch (error) {
            alert("Erreur suppression");
        } finally {
            setActionLoading(false);
        }
    };

    // ✅ Affichage si pas de sélection
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
        return <div className="loading-state">Chargement des fichiers...</div>;
    }

    return (
        <div className="management-container">
            <header className="management-header">
                <div className="header-text">
                    <h1>Gestion des Fichiers</h1>
                    <p>Filière: {filiere} | Niveau: {niveau}</p>
                </div>
                
                {/* ✅ Onglets unifiés (comme GestionGroupes) */}
                <div className="view-tabs">
                    <button 
                        className={`tab-btn ${view === 'pending' ? 'active' : ''}`}
                        onClick={() => setView('pending')}
                    >
                        ⏳ En attente ({fichiers.filter(f => f.statut === 'en_attente').length})
                    </button>
                    <button 
                        className={`tab-btn ${view === 'validated' ? 'active' : ''}`}
                        onClick={() => setView('validated')}
                    >
                        ✅ Validés
                    </button>
                </div>
            </header>



            {/* Tableau des fichiers */}
            <div className="table-container card">
                {fichiers.length > 0 ? (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>FICHIER</th>
                                <th>MODULE</th>
                                <th>ANNÉE</th>
                                <th>STATUT</th>
                                <th>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {fichiers.map((f) => (
                                <tr key={f.id_fichier}>
                                    <td>#{f.id_fichier}</td>
                                    <td className="file-name" title={f.nom_fichier}>
                                        {f.nom_fichier?.substring(0, 25)}{f.nom_fichier?.length > 25 ? '...' : ''}
                                    </td>
                                    <td>{f.module || f.matiere || '-'}</td>
                                    <td>{f.annee || f.niveau || '-'}</td>
                                    <td>
                                        <span className={`badge ${f.statut}`}>
                                            {f.statut === 'en_attente' ? '⏳ En attente' : 
                                             f.statut === 'valide' ? '✅ Validé' : '❌ Refusé'}
                                        </span>
                                    </td>
                                    <td className="actions-cell">
                                        {/* Actions pour fichiers EN ATTENTE */}
                                        {view === 'pending' && f.statut === 'en_attente' && (
                                            <>
                                                <button 
                                                    className="btn-icon validate" 
                                                    onClick={() => handleValidate(f.id_fichier)} 
                                                    title="Valider"
                                                    disabled={actionLoading}
                                                >✅</button>
                                                <button 
                                                    className="btn-icon refuse" 
                                                    onClick={() => handleRefuse(f.id_fichier)} 
                                                    title="Refuser"
                                                    disabled={actionLoading}
                                                >❌</button>
                                            </>
                                        )}
                                        
                                        {/* Actions pour fichiers VALIDÉS */}
                                        {view === 'validated' && (
                                            <>
                                                <button 
                                                    className="btn-icon view" 
                                                    onClick={() => viewFile(f)} 
                                                    title="Voir/Télécharger"
                                                >👁️</button>
                                                <button 
                                                    className="btn-icon edit" 
                                                    onClick={() => openRenameModal(f)} 
                                                    title="Renommer"
                                                    disabled={actionLoading}
                                                >✏️</button>
                                                <button 
                                                    className="btn-icon delete-group" 
                                                    onClick={() => handleDeleteFile(f.id_fichier)} 
                                                    title="Supprimer"
                                                    disabled={actionLoading}
                                                >🗑️</button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="empty-state">
                        <p>📭 Aucun fichier {view === 'pending' ? 'en attente' : 'validé'} pour <strong>{filiere} - {niveau}</strong></p>
                    </div>
                )}
            </div>

            {/* ✏️ MODAL RENOMMER (unifié) */}
            {showRenameModal && fileToRename && (
                <div className="modal-overlay" onClick={() => setShowRenameModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>✏️ Renommer le fichier</h3>
                            <button className="modal-close" onClick={() => setShowRenameModal(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                                Nouveau nom :
                            </label>
                            <input 
                                type="text" 
                                value={newFileName}
                                onChange={(e) => setNewFileName(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleRename()}
                                autoFocus
                                placeholder="Ex: Cours_Algo_Chapitre3.pdf"
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

export default GestionFichiers;