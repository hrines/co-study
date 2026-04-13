import React, { useState, useEffect, useRef } from 'react';
import './Biblio.css';

const Biblio = () => {
  const [fichiers, setFichiers] = useState([]);
  const [favorisIds, setFavorisIds] = useState([]);
  const [filterAnnee, setFilterAnnee] = useState('Tous');
  const [modulesOuverts, setModulesOuverts] = useState({});
  
  // Référence pour l'input de fichier (le bouton invisible)
  const fileInputRef = useRef(null);
  
  const userId = localStorage.getItem('userId') || 0;
  const categories = ['Cours', 'TD', 'TP', 'Résumés', 'Test', 'Examen'];


      // Crée une fonction pour basculer l'affichage
const toggleModule = (catName, moduleName) => {
  const uniqueKey = `${catName}-${moduleName}`; // Crée une clé unique
  setModulesOuverts(prev => ({
    ...prev,
[uniqueKey]: !prev[uniqueKey]  }));
};


useEffect(() => {
  // 1. Charger TOUS les fichiers (indépendant de l'utilisateur)
  fetch('http://localhost:5000/api/fichiers')
    .then(res => res.json())
    .then(data => {
      console.log("Fichiers récupérés :", data);
      setFichiers(Array.isArray(data) ? data : []);
    })
    .catch(err => console.error("Erreur chargement fichiers:", err));

  // 2. Charger les favoris SEULEMENT si un utilisateur est connecté
  const storedUserId = localStorage.getItem('userId');
  if (storedUserId && storedUserId !== "0") {
    fetch(`http://localhost:5000/api/favoris/${storedUserId}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setFavorisIds(data.map(f => f.id_fichier));
      })
      .catch(err => console.error("Erreur chargement favoris:", err));
  }
}, []); // On vide les dépendances pour que ça s'exécute une fois au démarrage

  // FONCTION : Déclenche l'explorateur de fichiers au clic sur la zone bleue
  const handleDropzoneClick = () => {
    fileInputRef.current.click();
  };

  // FONCTION : S'exécute quand tu as choisi un fichier
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      uploadFile(file);
    }
  };

  // FONCTION : Envoie le fichier au serveur Node.js
const uploadFile = async (file) => {
    console.log("1. Fichier sélectionné :", file.name); // Vérification

    const type = prompt("Type (Cours, TD, TP, Résumés, Test, Examen) ?");
    if (type === null) return; // ARRÊTE tout si on clique sur "Cancel"

    const module = prompt("Nom du module (ex: Système d'Exploitation) ?");
    if (module === null) return; // ARRÊTE tout si on clique sur "Cancel"
const annee = prompt("Année du document ? (L1, L2, L3, M1, M2)", filterAnnee === 'Tous' ? 'L3' : filterAnnee);
if (!annee) return; // Annule si l'utilisateur ne répond pas
    if (!type || !module) {
        console.log("Upload annulé : type ou module manquant");
        return;
    }




const formData = new FormData();
    formData.append('fichier', file);
    formData.append('id_groupe', 1); // Remplace par l'ID du groupe actuel ou 1 pour tester
    formData.append('type', type);
    formData.append('module', module);
    formData.append('annee', annee);
    formData.append('filiere', 'L3 Informatique'); // Important car NOT NULL dans ta BDD

    console.log("2. Envoi de la requête vers le serveur...");

    try {
        const response = await fetch('http://localhost:5000/api/upload', {
            method: 'POST',
            body: formData,
        });

        console.log("3. Réponse reçue :", response.status);

        if (response.ok) {
        alert("Fichier envoyé avec succès ! Il sera visible dès qu'un délégué l'aura validé.");            window.location.reload(); 
        } else {
            const errorText = await response.text();
            console.error("Erreur serveur :", errorText);
        }
    } catch (err) {
        console.error("4. Erreur de connexion au serveur :", err);
    }
};

  const toggleFavori = async (idFichier) => {
    const isFavori = favorisIds.includes(idFichier);
    const method = isFavori ? 'DELETE' : 'POST';
    
    const response = await fetch('http://localhost:5000/api/favoris', {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_etudiant: userId, id_fichier: idFichier })
    });

    if (response.ok) {
      setFavorisIds(prev => isFavori ? prev.filter(id => id !== idFichier) : [...prev, idFichier]);
    }
  };


  console.log("Types détectés en BDD :", fichiers.map(f => f.type));

  return (
    <div className="biblio-container">
      {/* Zone Upload inspirée de StuDocu */}
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
  // On compare en minuscules pour éviter les erreurs de saisie
  f.type?.toLowerCase() === cat.toLowerCase() && 
  (filterAnnee === 'Tous' || f.annee === filterAnnee)
);
            const modulesUniques = [...new Set(fichiersDeLaCategorie.map(f => f.module))];

            return (
              <div key={cat} className="shelf">
                <h2 className="shelf-title"><span className="folder-icon">📂</span> {cat}</h2>
                <div className="modules-wrapper">
{modulesUniques.map(moduleName => { // <-- On utilise une accolade ici
    const cle = `${cat}-${moduleName}`;
    const estOuvert = modulesOuverts[cle];

return ( // <-- On DOIT ajouter un return ici pour le JSX
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
        {/* On ne compte que les fichiers qui entrent dans tes catégories connues */}
        {fichiers.filter(f => categories.some(cat => cat.toLowerCase() === f.type?.toLowerCase())).length}
    </span>
</div>

{categories.map(cat => (
  <div key={cat} className="stat-item">
    <span className="stat-label">{cat}</span>
    <span className="stat-value">
      {/* On utilise .toLowerCase() pour comparer sans erreur de majuscule */}
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