import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './GestionFichiers.css';

const GestionFichiers = ({ filiere, niveau }) => {  // ✅ Ajoute les props
    const [fichiers, setFichiers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFichiers = async () => {
            if (!filiere || !niveau) {
                setFichiers([]);
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                // ✅ Route avec filtres
                const url = `http://localhost:5000/api/fichiers?filiere=${filiere}&niveau=${niveau}`;
                console.log("📡 Requête fichiers vers:", url);
                
                const response = await axios.get(url);
                setFichiers(Array.isArray(response.data) ? response.data : []);
            } catch (error) {
                console.error("❌ Erreur fetch fichiers:", error);
                setFichiers([]);
            } finally {
                setLoading(false);
            }
        };

        fetchFichiers();
    }, [filiere, niveau]);

    const handleValidate = async (id) => {
        try {
            await axios.put(`http://localhost:5000/api/fichiers/${id}/valider`);
            setFichiers(fichiers.map(f => f.id_fichier === id ? {...f, statut: 'valide'} : f));
        } catch (error) {
            console.error("Erreur validation:", error);
        }
    };

    const handleRefuse = async (id) => {
        try {
            await axios.delete(`http://localhost:5000/api/fichiers/${id}`);
            setFichiers(fichiers.filter(f => f.id_fichier !== id));
        } catch (error) {
            console.error("Erreur refus:", error);
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
        return <div className="loading-state">Chargement des fichiers...</div>;
    }

    return (
        <div className="management-container">
            <header className="management-header">
                <div className="header-text">
                    <h1>Gestion des Fichiers</h1>
                    <p>Filière: {filiere} | Niveau: {niveau}</p>
                </div>
                
                <div className="stats-cards">
                    <div className="stat-card blue">
                        <div className="stat-icon">📄</div>
                        <div>
                            <h3>Total Fichiers</h3>
                            <p>{fichiers.length} fichiers</p>
                        </div>
                    </div>
                    <div className="stat-card white">
                        <div className="stat-icon">⏳</div>
                        <div>
                            <h3>En attente</h3>
                            <p>{fichiers.filter(f => f.statut === 'en_attente').length} à valider</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="table-container card">
                {fichiers.length > 0 ? (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>NOM DU FICHIER</th>
                                <th>ÉTUDIANT</th>
                                <th>MATIÈRE</th>
                                <th>DATE</th>
                                <th>STATUS</th>
                                <th>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {fichiers.map((f) => (
                                <tr key={f.id_fichier}>
                                    <td>#{f.id_fichier}</td>
                                    <td className="file-name">{f.nom_fichier}</td>
                                    <td>{f.nom_etudiant || 'Inconnu'}</td>
                                    <td>{f.matiere || f.module || '-'}</td>
                                    <td>{new Date(f.date_upload).toLocaleDateString('fr-FR')}</td>
                                    <td>
                                        <span className={`badge ${f.statut}`}>
                                            {f.statut === 'en_attente' ? '⏳ En attente' : 
                                             f.statut === 'valide' ? '✅ Validé' : '❌ Refusé'}
                                        </span>
                                    </td>
                                    <td className="actions-cell">
                                        {f.statut === 'en_attente' && (
                                            <>
                                                <button 
                                                    className="btn-icon validate" 
                                                    onClick={() => handleValidate(f.id_fichier)}
                                                    title="Valider"
                                                >✅</button>
                                                <button 
                                                    className="btn-icon refuse" 
                                                    onClick={() => handleRefuse(f.id_fichier)}
                                                    title="Refuser"
                                                >❌</button>
                                            </>
                                        )}
                                        <button className="btn-icon view" title="Voir">👁️</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="empty-state">
                        <p>Aucun fichier trouvé pour {filiere} - {niveau}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GestionFichiers;