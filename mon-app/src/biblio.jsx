import React, { useState, useEffect, useRef } from 'react';
import './Biblio.css';
import Footer from './footer';
import { useNavigate } from 'react-router-dom';


const Biblio = () => {
    const navigate = useNavigate();
    const [fichiers, setFichiers] = useState([]);
    const [favorisIds, setFavorisIds] = useState([]);
    const [filterAnnee, setFilterAnnee] = useState('Tous');
    const [modulesOuverts, setModulesOuverts] = useState({});
    
    const fileInputRef = useRef(null);
    // Remplace tes lignes 11 et 22 par une seule source de vérité
    const userId = localStorage.getItem('userId'); 
    const token = localStorage.getItem('token');
    const categories = ['Cours', 'TD', 'TP', 'Résumés', 'Test', 'Examen'];

    const toggleModule = (catName, moduleName) => {
        const uniqueKey = `${catName}-${moduleName}`;
        setModulesOuverts(prev => ({
            ...prev,
            [uniqueKey]: !prev[uniqueKey]
        }));
    };

 
useEffect(() => {
    // 1. Charger tous les fichiers valides
fetch('http://localhost:5000/api/fichiers?statut=valide')        .then(res => res.json())
        .then(data => setFichiers(Array.isArray(data) ? data : []))
        .catch(err => console.error(err));

    // 2. Charger les favoris de l'utilisateur actuel
    if (userId && token) {
        fetch(`http://localhost:5000/api/favoris/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                // On s'assure que data est bien un tableau avant de mapper
                if (Array.isArray(data)) {
                    setFavorisIds(data.map(f => f.id_fichier));
                }
            })
            .catch(err => console.error("Erreur chargement favoris:", err));
    }
}, [userId, token]);

    const handleDropzoneClick = () => {
        fileInputRef.current.click();
    };

    // --- LA FONCTION QUI MANQUAIT ---
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            uploadFile(file);
        }
    };

const uploadFile = async (file) => {
    const token = localStorage.getItem('token');
    
    // ✅ Vérifier si le token existe
    if (!token) {
        alert("Tu dois être connecté pour uploader des fichiers !");
        navigate('/login'); // Redirige vers login
        return;
    }
    
    const type = prompt("Type (Cours, TD, TP, Résumés, Test, Examen) ?");
    if (type === null) return; 

    const module = prompt("Nom du module ?");
    if (module === null) return; 

    const annee = prompt("Année du document ?", filterAnnee === 'Tous' ? 'L3' : filterAnnee);
    if (!annee) return; 

    // Récupère la filière et le niveau de l'utilisateur connecté
    const userFiliere = localStorage.getItem('userFiliere') || 'Informatique';
    const userNiveau = localStorage.getItem('userNiveau') || 'L3';

    const formData = new FormData();
    formData.append('fichier', file);
    formData.append('type', type);
    formData.append('module', module);
    formData.append('annee', annee);
    formData.append('filiere', userFiliere);
    formData.append('niveau', userNiveau);

    try {
        const response = await fetch('http://localhost:5000/api/upload', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}` 
            },
            body: formData,
        });

        if (response.status === 401) {
            // ✅ Token expiré : déconnecter et rediriger
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            alert("Session expirée. Veuillez vous reconnecter.");
            navigate('/login');
            return;
        }

        if (response.ok) {
            alert("✅ Fichier envoyé avec succès ! Il sera visible après validation.");
            window.location.reload(); 
        } else {
            const errorData = await response.json();
            alert("❌ Erreur : " + (errorData.message || "Échec de l'envoi"));
        }
    } catch (err) {
        console.error("Erreur réseau :", err);
        alert("❌ Erreur de connexion au serveur");
    }
};

console.log("ID récupéré :", userId);
console.log("Token récupéré :", token);

const toggleFavori = async (idFichier) => {
    if (!userId || !token) {
        alert("Tu dois être connecté pour ajouter des favoris !");
        return;
    }

    const isFavori = favorisIds.includes(idFichier);
    const method = isFavori ? 'DELETE' : 'POST';
    
    try {
        const response = await fetch('http://localhost:5000/api/favoris', {
            method: method,
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
                id_etudiant: userId, 
                id_fichier: idFichier 
            })
        });

        if (response.ok) {
            setFavorisIds(prev => 
                isFavori 
                ? prev.filter(id => id !== idFichier) 
                : [...prev, idFichier]
            );
        } else {
            console.error("Erreur API Favoris:", response.status);
        }
    } catch (err) {
        console.error("Erreur réseau favoris:", err);
    }
};

    return (
        <div className="biblio-container">
            <section className="upload-banner">
                <div className="upload-text">
                    <h1 className="underline-blue">Partage tes notes !</h1>
                </div>
                <div className="upload-dropzone" onClick={handleDropzoneClick}>
                    <div className="dropzone-inner">
                        <span className="upload-icon">📤</span>
                        <p className="blue-text">Télécharge des fichiers</p>
                        <p className="sub-text">(clique pour sélectionner)</p>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            style={{ display: 'none' }} 
                            onChange={handleFileChange}
                        />
                    </div>
                </div>
            </section>

            <div className="biblio-main-content">
                <div className="biblio-left">
                    <div className="shelves-filters">
                        {['Tous', 'L1', 'L2', 'L3', 'M1', 'M2'].map(annee => (
                            <button 
                                key={annee} 
                                className={filterAnnee === annee ? 'active' : ''}
                                onClick={() => setFilterAnnee(annee)}
                            >
                                {annee}
                            </button>
                        ))}
                    </div>

                    {categories.map(cat => {
                        const fichiersDeLaCategorie = fichiers.filter(f => 
                            f.type?.toLowerCase() === cat.toLowerCase() && 
                            (filterAnnee === 'Tous' || f.annee === filterAnnee)
                        );
                        const modulesUniques = [...new Set(fichiersDeLaCategorie.map(f => f.module))];

                        return (
                            <div key={cat} className="shelf">
                                <h2 className="shelf-title"><span className="folder-icon">📂</span> {cat}</h2>
                                <div className="modules-wrapper">
                                    {modulesUniques.map(moduleName => {
                                        const cle = `${cat}-${moduleName}`;
                                        const estOuvert = modulesOuverts[cle];
                                        return (
                                            <div key={moduleName} className="module-section">
                                                <h3 onClick={() => toggleModule(cat, moduleName)} style={{cursor: 'pointer'}}>
                                                    {estOuvert ? '▼' : '▶'} {moduleName}
                                                </h3>
                                                {estOuvert && (
                                                    <div className="shelf-row">
                                                        {fichiersDeLaCategorie.filter(f => f.module === moduleName).map(file => (
                                                            <div key={file.id_fichier} className="file-card">
                                                                <button 
                                                                    className={`star-btn ${favorisIds.includes(file.id_fichier) ? 'active' : ''}`} 
                                                                    onClick={() => toggleFavori(file.id_fichier)}
                                                                > ★ </button>
                                                                <a href={`http://localhost:5000/${file.url_fichier}`} target="_blank" rel="noopener noreferrer" className="file-link-container">
                                                                    <div className="file-icon">
                                                                    {file.nom_fichier.endsWith('.pdf') ? '📕' : 
                                                                      file.nom_fichier.endsWith('.docx') ? '📘' : '📄'}
                                                                    </div>
                                                                    <div className="file-info">
                                                                        <h4 title={file.nom_fichier}>{file.nom_fichier}</h4>
                                                                        <span className="view-link">Ouvrir le document</span>
                                                                    </div>
                                                                </a>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <aside className="biblio-right">
                    <div className="bib-stats-card">
                        <h3>Contenu des catégories</h3>
                        <div className="stat-item">
                            <span className="stat-label">Documents</span>
                            <span className="stat-value">
                                {fichiers.filter(f => categories.some(cat => cat.toLowerCase() === f.type?.toLowerCase())).length}
                            </span>
                        </div>
                        {categories.map(cat => (
                            <div key={cat} className="stat-item">
                                <span className="stat-label">{cat}</span>
                                <span className="stat-value">
                                    {fichiers.filter(f => f.type?.toLowerCase() === cat.toLowerCase()).length}
                                </span>
                            </div>
                        ))}
                    </div>
                </aside>
            </div>
            <Footer />
        </div>
    );
};

export default Biblio;