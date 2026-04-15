import React, { useState, useEffect, useRef } from 'react';
import './Biblio.css';

const Biblio = () => {
    const [fichiers, setFichiers] = useState([]);
    const [favorisIds, setFavorisIds] = useState([]);
    const [filterAnnee, setFilterAnnee] = useState('Tous');
    const [modulesOuverts, setModulesOuverts] = useState({});
    
    const fileInputRef = useRef(null);
    const userId = localStorage.getItem('userId') || 0;
    const categories = ['Cours', 'TD', 'TP', 'Résumés', 'Test', 'Examen'];

    const toggleModule = (catName, moduleName) => {
        const uniqueKey = `${catName}-${moduleName}`;
        setModulesOuverts(prev => ({
            ...prev,
            [uniqueKey]: !prev[uniqueKey]
        }));
    };

    useEffect(() => {
        // 1. Charger les fichiers
        fetch('http://localhost:5000/api/fichiers')
            .then(res => res.json())
            .then(data => setFichiers(Array.isArray(data) ? data : []))
            .catch(err => console.error(err));

        // 2. Charger les favoris avec Token
        const storedUserId = localStorage.getItem('userId');
        const token = localStorage.getItem('token');

        if (storedUserId && storedUserId !== "0" && token) {
            fetch(`http://localhost:5000/api/favoris/${storedUserId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) setFavorisIds(data.map(f => f.id_fichier));
                })
                .catch(err => console.error(err));
        }
    }, []);

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
        const type = prompt("Type (Cours, TD, TP, Résumés, Test, Examen) ?");
        if (type === null) return; 

        const module = prompt("Nom du module ?");
        if (module === null) return; 

        const annee = prompt("Année du document ?", filterAnnee === 'Tous' ? 'L3' : filterAnnee);
        if (!annee) return; 

        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('fichier', file);
        formData.append('id_groupe', 1);
        formData.append('type', type);
        formData.append('module', module);
        formData.append('annee', annee);
        formData.append('filiere', 'L3 Informatique');

        try {
            const response = await fetch('http://localhost:5000/api/upload', {
                method: 'POST',
                body: formData,
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (response.ok) {
                alert("Fichier envoyé avec succès !");
                window.location.reload(); 
            } else {
                const data = await response.json();
                alert("Erreur : " + (data.message || "Accès refusé"));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const toggleFavori = async (idFichier) => {
        const isFavori = favorisIds.includes(idFichier);
        const method = isFavori ? 'DELETE' : 'POST';
        const token = localStorage.getItem('token');
        
        const response = await fetch('http://localhost:5000/api/favoris', {
            method: method,
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ id_etudiant: userId, id_fichier: idFichier })
        });

        if (response.ok) {
            setFavorisIds(prev => isFavori ? prev.filter(id => id !== idFichier) : [...prev, idFichier]);
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
                                                                    <div className="file-icon">📄</div>
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
        </div>
    );
};

export default Biblio;