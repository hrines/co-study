const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const multer = require('multer');
const path = require('path');
const fs = require('fs'); // Pour vérifier si le dossier existe

const app = express();
const server = http.createServer(app);
const io = new Server(server , {
    cors: {
        origin: "http://localhost:5173", // Port de ton application React (Vite)
    }
});



app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());


// Créer le dossier uploads s'il n'existe pas
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// --- CONNEXION BDD ---
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'pfe_db',
    port: 3307 // Ton port MySQL spécifique
});

db.connect((err) => {
    if (err) console.error("Erreur SQL:", err.message);
    else console.log("Connecté à la base de données sur le port 3307");
});

// --- 1. ROUTES D'AUTHENTIFICATION ---
app.post('/api/signup', async (req, res) => { // 'async' est indispensable ici
    const { email, nom, prenom, matricule, mot_de_passe, filiere } = req.body;
    
    try {
        const saltRounds = 10;
        // On hache le mot de passe avant de l'envoyer à la BDD
        const hashedPassword = await bcrypt.hash(mot_de_passe, saltRounds);

        const sql = "INSERT INTO etudiants (email, nom, prenom, matricule, mot_de_passe, filiere) VALUES (?, ?, ?, ?, ?, ?)";
        
        // On remplace 'mot_de_passe' par 'hashedPassword'
        db.query(sql, [email, nom, prenom, matricule, hashedPassword, filiere], (err, result) => {
            if (err) return res.status(500).send({ message: "Erreur: " + err.message });
            res.status(200).send({ message: "Succès" });
        });
    } catch (error) {
        res.status(500).send({ message: "Erreur lors de la sécurisation du mot de passe" });
    }
});

app.post('/api/login', (req, res) => {
    const { email, mot_de_passe } = req.body;
    
    // On cherche l'utilisateur par son email seulement
    const sql = "SELECT * FROM etudiants WHERE email = ?"; 
    
    db.query(sql, [email], async (err, result) => {
        if (err) return res.status(500).send({ message: "Erreur serveur" });
        
        if (result.length > 0) {
            const user = result[0];
            console.log("MDP saisi:", mot_de_passe);
            console.log("Hash en BDD:", user.mot_de_passe);
            
            // On compare le mot de passe saisi avec le hash stocké dans la BDD
            const match = await bcrypt.compare(mot_de_passe, user.mot_de_passe);            
if (match) {
                // On crée le token qui contient l'ID de l'étudiant
                // 'ma_cle_secrete_123' est la signature de ton serveur (garde-la bien !)
                const token = jwt.sign(
                    { id: user.id_etudiant, email: user.email }, 
                    'ma_cle_secrete_123', 
                    { expiresIn: '24h' } // Le ticket expire après 1 jour
                );

                delete user.mot_de_passe; // Sécurité habituelle

                // On envoie le user ET le token au React
                res.status(200).send({ 
                    message: "Connexion réussie !", 
                    user: user,
                    token: token 
                });
            } else {
                res.status(401).send({ message: "Email ou mot de passe incorrect" });
            }
        } else {
            res.status(401).send({ message: "Email ou mot de passe incorrect" });
        }
    });
});

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]; // On récupère le token du Header

    if (!token) {
        return res.status(403).send({ message: "Token manquant, accès refusé !" });
    }

    jwt.verify(token, 'ma_cle_secrete_123', (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: "Token invalide ou expiré !" });
        }
        req.userId = decoded.id; // On stocke l'ID pour l'utiliser dans la route si besoin
        next(); // Tout est bon, on passe à la suite
    });
};
// Remplace ta route app.post('/api/upload', ...) par celle-ci :
app.post('/api/upload', upload.single('fichier'), (req, res) => {
    // On vérifie si le fichier est arrivé
    if (!req.file) {
        return res.status(400).send("Aucun fichier reçu.");
    }

    // On récupère les infos envoyées par le Front
    // Note : on ajoute 'filiere' car ta BDD l'exige (NOT NULL)
    const { id_groupe, type, module, annee, filiere } = req.body;
    const nom_fichier = req.file.originalname;
    const url_fichier = req.file.path; // On utilise url_fichier comme dans ta BDD

    // La requête SQL avec TES noms de colonnes (image_90d05e.png)
    const sql = `INSERT INTO fichiers 
                (nom_fichier, url_fichier, module, id_groupe, type, annee, filiere, date_upload) 
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`;
    
    // On passe les valeurs dans l'ordre
    db.query(sql, [nom_fichier, url_fichier, module, id_groupe || null, type, annee, filiere || 'Informatique'], (err, result) => {
        if (err) {
            console.error("Erreur MySQL détaillée :", err);
            return res.status(500).send(err);
        }
        res.status(200).json({ message: "Succès ! Fichier enregistré dans pfe_db" });
    });
});



app.get('/api/profil/:id_etudiant', (req, res) => {
    const { id_etudiant } = req.params;
    
    // Requête "augmentée" pour avoir les infos ET les statistiques
    const sql = `
        SELECT id_etudiant, email, nom, prenom, matricule, filiere, bio,
        (SELECT COUNT(*) FROM groupes WHERE id_etudiant = e.id_etudiant) as nb_crees,
        (SELECT COUNT(*) FROM membres_groupe WHERE id_etudiant = e.id_etudiant) as nb_rejoints
        FROM etudiants e 
        WHERE id_etudiant = ?`;

    db.query(sql, [id_etudiant], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send({ message: "Erreur serveur" });
        }
        if (result.length > 0) {
            // Attention : On envoie directement l'objet pour matcher avec setProfileData(data)
            res.status(200).send(result[0]);
        } else {
            res.status(404).send({ message: "Utilisateur non trouvé" });
        }
    });
});



app.get('/api/favoris/:id_etudiant', (req, res) => {
    const { id_etudiant } = req.params; 
    
    // On lie la table favoris à la table fichiers pour avoir le nom du cours
    const sql = `
        SELECT f.* FROM favoris fav
        JOIN fichiers f ON fav.id_fichier = f.id_fichier
        WHERE fav.id_etudiant = ?`;

    db.query(sql, [id_etudiant], (err, results) => {
        if (err) {
            console.error("Erreur Favoris:", err);
            return res.status(500).send({ message: "Erreur serveur" });
        }
        res.status(200).send(results);
    });
});

// --- 2. GESTION DES GROUPES ---
app.post('/api/create-group', verifyToken, (req, res) => {
    const { nom_groupe, description, filiere, type_cursus, niveau, id_etudiant} = req.body;
    const sql = "INSERT INTO groupes (nom_groupe, description, filiere, type_cursus, niveau, id_etudiant) VALUES (?, ?, ?, ?, ?, ?)";
  
  db.query(sql, [nom_groupe, description, filiere, type_cursus, niveau, id_etudiant], (err, result) => {
    if (err) {
      console.error("ERREUR SQL:", err); // ÇA va s'afficher dans ton terminal noir
      return res.status(500).send({ message: err.message });
    }
    res.status(201).send({ message: 'Groupe créé avec succès !' });
  });
});

app.get('/api/groupes/:niveau', (req, res) => {
  const { niveau } = req.params;
  const { filiere } = req.query;
  const sql = "SELECT * FROM groupes WHERE niveau = ? AND filiere = ?";
  db.query(sql, [niveau, filiere], (err, results) => {
    if (err) return res.status(500).send({ message: 'Erreur serveur' });
    res.status(200).send(results);
  });
});




app.post('/api/groupe/:id/ajouter', (req, res) => {
    const { idEtudiantAjoute, idAdmin } = req.body; // L'ID du membre à ajouter et celui qui fait l'action
    const groupId = req.params.id;

    // 1. Vérifier d'abord si idAdmin est bien le créateur du groupe
    const checkAdmin = "SELECT id_etudiant FROM groupes WHERE id_groupe = ?";
    
    db.query(checkAdmin, [groupId], (err, result) => {
        if (result[0].id_etudiant !== idAdmin) {
            return res.status(403).send("Seul l'admin peut ajouter des membres !");
        }

        // 2. Si c'est bon, on insère dans 'appartenir'
        const sql = "INSERT INTO appartenir (id_groupe, id_etudiant) VALUES (?, ?)";
        db.query(sql, [groupId, idEtudiantAjoute], (err, final) => {
            if (err) return res.status(500).json(err);
            res.send("Membre ajouté !");
        });
    });
});


// Route pour supprimer (kick) un membre du groupe
// Dans ton server.js, modifie la route DELETE
app.delete('/api/groupe/:id', (req, res) => {
    const groupId = req.params.id;
    
    // 1. Supprimer les dépendances d'abord (pour éviter l'erreur de clé étrangère)
    const queries = [
        "DELETE FROM messages WHERE id_groupe = ?",
        "DELETE FROM membres_groupe WHERE id_groupe = ?",
        "DELETE FROM appartenir WHERE id_groupe = ?",
        "DELETE FROM demandes WHERE id_groupe = ?",
        "DELETE FROM groupes WHERE id_groupe = ?"
    ];

    // Exécution en série (ou utilise Promise.all si tu es à l'aise avec async/await)
    db.query(queries[0], [groupId], () => {
        db.query(queries[1], [groupId], () => {
            db.query(queries[2], [groupId], () => {
                db.query(queries[3], [groupId], () => {
                    db.query(queries[4], [groupId], (err) => {
                        if (err) return res.status(500).send(err);
                        
                        // Prévenir les autres membres
                        io.to(groupId.toString()).emit('group_deleted');
                        res.status(200).send("Groupe supprimé");
                    });
                });
            });
        });
    });
});


app.delete('/api/notifications/clear-all/:userId', (req, res) => {
    const { userId } = req.params;
    const sql = "DELETE FROM notifications WHERE id_destinataire = ?";
    
    db.query(sql, [userId], (err, result) => {
        if (err) return res.status(500).send(err);
        res.status(200).send("Notifications vidées");
    });
});

app.put('/api/messages/:idMessage/epingler', (req, res) => {
    const { idMessage } = req.params;
    const { idUser } = req.body;

    const sqlCheck = `
        SELECT g.id_etudiant, m.id_groupe 
        FROM groupes g 
        JOIN messages m ON g.id_groupe = m.id_groupe 
        WHERE m.id = ?`;

    db.query(sqlCheck, [idMessage], (err, result) => {
        if (err || result.length === 0) return res.status(500).send("Erreur ou message introuvable");
        
        if (result[0].id_etudiant !== parseInt(idUser)) {
            return res.status(403).send("Action réservée à l'admin !");
        }

        const groupId = result[0].id_groupe;
        const sqlUpdate = "UPDATE messages SET est_epinglé = NOT est_epinglé WHERE id = ?";
        
        db.query(sqlUpdate, [idMessage], (err, final) => {
            if (err) return res.status(500).send(err);
            
            // INDISPENSABLE : On prévient tout le groupe via Socket qu'un message a changé
            io.to(groupId.toString()).emit('message_pinned_updated'); 
            res.send("État mis à jour");
        });
    });
});

// --- 3. ADHÉSIONS ET NOTIFICATIONS ---
app.post('/api/demande-adhesion', (req, res) => {
  const { id_groupe, id_etudiant } = req.body;

  // 1. VERIFICATION : Existe-t-il déjà une demande en cours ?
  const sqlCheck = "SELECT * FROM demandes WHERE id_groupe = ? AND id_etudiant = ? AND statut = 'en_attente'";
  
  db.query(sqlCheck, [id_groupe, id_etudiant], (err, results) => {
    if (err) return res.status(500).send({ message: "Erreur vérification" });

    if (results.length > 0) {
      // Si une demande existe déjà, on arrête tout ici
      return res.status(400).send({ message: "Vous avez déjà une demande en attente pour ce groupe." });
    }

    // 2. Si aucune demande, on continue l'insertion (ton code actuel)
    const sqlDemande = "INSERT INTO demandes (id_groupe, id_etudiant) VALUES (?, ?)";
    db.query(sqlDemande, [id_groupe, id_etudiant], (err, result) => {
      if (err) return res.status(500).send({ message: 'Erreur: ' + err.message });
      
      const idDemande = result.insertId;
      const sqlGetAdmin = "SELECT id_etudiant, nom_groupe FROM groupes WHERE id_groupe = ?";
      
      db.query(sqlGetAdmin, [id_groupe], (err, adminResult) => {
        if (err || adminResult.length === 0) return res.status(200).send({ message: 'Demande envoyée' });

        const idAdmin = adminResult[0].id_etudiant;
        const nomG = adminResult[0].nom_groupe;
        const sqlNotif = "INSERT INTO notifications (id_etudiant, message, type, id_reference) VALUES (?, ?, 'adhesion', ?)";
        const message = `Nouvelle demande pour rejoindre le groupe "${nomG}"`;

        db.query(sqlNotif, [idAdmin, message, idDemande], (err) => {
          res.status(200).send({ message: 'Demande envoyée !' });
        });
      });
    });
  });
});
app.put('/api/demande-adhesion/:id/accepter', (req, res) => {
  const { id } = req.params;
  const sqlUpdate = "UPDATE demandes SET statut = 'accepte' WHERE id = ?";
  db.query(sqlUpdate, [id], (err) => {
    if (err) return res.status(500).send({ message: 'Erreur serveur' });
    const sqlGet = "SELECT * FROM demandes WHERE id = ?";
    db.query(sqlGet, [id], (err, results) => {
      if (err || results.length === 0) return res.status(500).send({ message: 'Erreur' });
      const demande = results[0];
      const sqlMembre = "INSERT INTO membres_groupe (id_groupe, id_etudiant) VALUES (?, ?)";
      db.query(sqlMembre, [demande.id_groupe, demande.id_etudiant]);
      const sqlNotif = "INSERT INTO notifications (id_etudiant, message, type, id_reference) VALUES (?, ?, 'accepte', ?)";
      db.query(sqlNotif, [demande.id_etudiant, 'Votre demande d\'adhésion a été acceptée !', demande.id_groupe]);
      res.status(200).send({ message: 'Demande acceptée' });
    });
  });
});

// Marquer toutes les notifications comme lues
app.put('/api/notifications/lire-tout/:id_etudiant', (req, res) => {
    const { id_etudiant } = req.params;
    const sql = "UPDATE notifications SET lu = 1 WHERE id_etudiant = ?";
    db.query(sql, [id_etudiant], (err) => {
        if (err) return res.status(500).send({ message: 'Erreur serveur' });
        res.status(200).send({ message: 'Tout est lu' });
    });
});


// Marquer une notification spécifique comme lue (appelée par le bouton Accepter/Refuser)
app.put('/api/notifications/:id/lu', (req, res) => {
    const { id } = req.params;
    const sql = "UPDATE notifications SET lu = 1 WHERE id = ?";
    db.query(sql, [id], (err) => {
        if (err) return res.status(500).send({ message: 'Erreur serveur' });
        res.status(200).send({ message: 'Notification lue' });
    });
});

app.get('/api/notifications/:id_etudiant', (req, res) => {
  const { id_etudiant } = req.params;
  const sql = "SELECT * FROM notifications WHERE id_etudiant = ? ORDER BY created_at DESC";
  db.query(sql, [id_etudiant], (err, results) => {
    if (err) return res.status(500).send({ message: 'Erreur serveur' });
    res.status(200).send(results);
  });
});

// --- 4. RÉCUPÉRATION DES LISTES ---
app.get('/api/groupe/:id', (req, res) => {
    const groupId = req.params.id;

    const sqlGroupe = "SELECT * FROM groupes WHERE id_groupe = ?";
    db.query(sqlGroupe, [groupId], (err, groupResult) => {
        if (err || groupResult.length === 0) return res.status(404).send("Groupe non trouvé");

        const groupe = groupResult[0];

        // On cherche dans 'appartenir' ET dans 'membres_groupe' pour être sûr de ne rien rater
        const sqlMembres = `
            SELECT e.id_etudiant as id, e.nom 
            FROM etudiants e 
            WHERE e.id_etudiant IN (
                SELECT id_etudiant FROM appartenir WHERE id_groupe = ?
                UNION
                SELECT id_etudiant FROM membres_groupe WHERE id_groupe = ?
                UNION
                SELECT id_etudiant FROM groupes WHERE id_groupe = ? -- Pour inclure l'admin
            )`;

        db.query(sqlMembres, [groupId, groupId, groupId], (err, membersResult) => {
            if (err) return res.status(500).json(err);
            res.json({ ...groupe, membres: membersResult });
        });
    });
});

app.get('/api/mes-groupes/:id_etudiant', (req, res) => {
  const { id_etudiant } = req.params;

  // Cette requête récupère :
  // 1. Les groupes où l'étudiant est le créateur (id_etudiant dans la table groupes)
  // 2. Les groupes où l'étudiant est membre (via la table membres_groupe)
  const sql = `
    SELECT * FROM groupes WHERE id_etudiant = ?
    UNION
    SELECT g.* FROM groupes g
    INNER JOIN membres_groupe mg ON g.id_groupe = mg.id_groupe
    WHERE mg.id_etudiant = ?
  `;

  db.query(sql, [id_etudiant, id_etudiant], (err, results) => {
    if (err) {
      console.error("Erreur SQL Mes Groupes:", err);
      return res.status(500).send({ message: 'Erreur serveur' });
    }
    res.status(200).send(results);
  });
});
// vérifier les demandes déjà faites par un étudiant
app.get('/api/mes-demandes/:id_etudiant', (req, res) => {
  const { id_etudiant } = req.params;
  // On récupère seulement les id_groupe pour les demandes qui sont encore 'en_attente'
  const sql = "SELECT id_groupe FROM demandes WHERE id_etudiant = ? AND statut = 'en_attente'";
  
  db.query(sql, [id_etudiant], (err, results) => {
    if (err) {
      console.error("Erreur SQL mes-demandes:", err);
      return res.status(500).send({ message: 'Erreur serveur' });
    }
    res.status(200).send(results);
  });
});


// Route pour annuler une demande d'adhésion
app.delete('/api/annuler-demande', (req, res) => {
  const { id_groupe, id_etudiant } = req.body;
  const sql = "DELETE FROM demandes WHERE id_groupe = ? AND id_etudiant = ? AND statut = 'en_attente'";

  db.query(sql, [id_groupe, id_etudiant], (err, result) => {
    if (err) return res.status(500).send({ message: "Erreur lors de l'annulation" });
    
    // On supprime aussi la notification envoyée à l'admin pour ne pas le laisser avec une notif inutile
    const sqlDeleteNotif = "DELETE FROM notifications WHERE id_reference = (SELECT id FROM demandes WHERE id_groupe = ? AND id_etudiant = ?) AND type = 'adhesion'";
    // Note: cette sous-requête est optionnelle mais rend ton projet plus pro.
    
    res.status(200).send({ message: "Demande annulée avec succès" });
  });
});


// Route pour récupérer TOUS les fichiers (indispensable pour l'affichage)
app.get('/api/fichiers', (req, res) => {
    const sql = "SELECT * FROM fichiers WHERE statut = 'valide'";
    db.query(sql, (err, data) => {
        if (err) return res.status(500).json(err);
        return res.json(data);
    });
});



// 1. Ajouter un favori
app.post('/api/favoris', (req, res) => {
  const { id_etudiant, id_fichier } = req.body;
  const sql = "INSERT INTO favoris (id_etudiant, id_fichier) VALUES (?, ?)";
  db.query(sql, [id_etudiant, id_fichier], (err) => {
    if (err) return res.status(500).send(err);
    res.status(200).send({ message: "Ajouté aux favoris" });
  });
});

// 2. Retirer un favori
app.delete('/api/favoris', (req, res) => {
  const { id_etudiant, id_fichier } = req.body;
  const sql = "DELETE FROM favoris WHERE id_etudiant = ? AND id_fichier = ?";
  db.query(sql, [id_etudiant, id_fichier], (err) => {
    if (err) return res.status(500).send(err);
    res.status(200).send({ message: "Retiré des favoris" });
  });
});



app.get('/api/groupe/:id', (req, res) => {
    const groupId = req.params.id;

    // 1. Récupérer les infos du groupe
    const sqlGroupe = "SELECT * FROM groupes WHERE id_groupe = ?";
    
    db.query(sqlGroupe, [groupId], (err, groupResult) => {
        if (err) return res.status(500).json(err);
        if (groupResult.length === 0) return res.status(404).send("Groupe non trouvé");

        const groupe = groupResult[0];

        // 2. Récupérer les membres dans la table 'appartenir'
        const sqlMembres = `
            SELECT e.id_etudiant as id, e.nom 
            FROM etudiants e 
            JOIN appartenir a ON e.id_etudiant = a.id_etudiant 
            WHERE a.id_groupe = ?`;

        db.query(sqlMembres, [groupId], (err, membersResult) => {
            if (err) return res.status(500).json(err);
            
            // On combine les deux et on renvoie
            res.json({
                ...groupe,
                membres: membersResult || []
            });
        });
    });
});
// --- SECTION ADMIN : STATS ---
app.get('/api/admin/stats/:filiere/:niveau', (req, res) => {
    const { filiere, niveau } = req.params;

    const sqlFichiers = "SELECT COUNT(*) as total FROM fichiers WHERE filiere = ? AND niveau = ? AND statut = 'en_attente'";
    const sqlMembres = "SELECT COUNT(*) as total FROM etudiants WHERE filiere = ? AND niveau = ?";
    const sqlGroupes = "SELECT COUNT(*) as total FROM groupes WHERE filiere = ? AND niveau = ? AND statut = 'en_attente'";

    db.query(sqlFichiers, [filiere, niveau], (err, resF) => {
        if (err) return res.status(500).json({ error: err.message });
        const fichiersCount = (resF && resF.length > 0) ? resF[0].total : 0;

        db.query(sqlMembres, [filiere, niveau], (err, resM) => {
            if (err) return res.status(500).json({ error: err.message });
            const membresCount = (resM && resM.length > 0) ? resM[0].total : 0;

            db.query(sqlGroupes, [filiere, niveau], (err, resG) => {
                if (err) return res.status(500).json({ error: err.message });
                const groupesCount = (resG && resG.length > 0) ? resG[0].total : 0;

                res.json({
                    fichiersEnAttente: fichiersCount,
                    totalEtudiants: membresCount,
                    groupesEnAttente: groupesCount
                });
            }); // Fin groupes
        }); // Fin membres
    }); // Fin fichiers
});



// Route pour récupérer tous les utilisateurs
app.get('/api/users', (req, res) => {
  // On sélectionne les colonnes qui existent dans ta table 'etudiants'
  // J'ai ajouté des alias (ex: id_etudiant AS id) pour que ça marche avec ton code React
  const query = `
    SELECT 
      id_etudiant AS id, 
      nom, 
      prenom, 
      email, 
      matricule AS username, 
      'Active' AS status, 
      'User' AS role, 
      NOW() AS joined, 
      'Online' AS active 
    FROM etudiants`;
  
  db.query(query, (err, result) => {
    if (err) {
      console.error("Erreur SQL route users:", err);
      return res.status(500).send(err);
    }
    res.json(result);
  });
});

// Route pour supprimer un utilisateur
app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const query = "DELETE FROM etudiants WHERE id_etudiant = ?";
  
  db.query(query, [id], (err, result) => {
    if (err) return res.status(500).send(err);
    res.json({ message: "Étudiant supprimé avec succès" });
  });
});


app.get('/api/admin/pending-registrations', (req, res) => {
    // On récupère les étudiants dont le statut n'est pas encore 'actif'
    // Note : assure-toi d'avoir une colonne 'statut' dans ta table etudiants
    const sql = "SELECT id_etudiant AS id, nom, prenom, email, matricule, 'Pending' as status FROM etudiants WHERE statut = 'en_attente'";
    
    db.query(sql, (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

// --- 5. SOCKET.IO (CHAT) ---
io.on('connection', (socket) => {
socket.on('join_group', (groupId) => {
    socket.join(groupId);
    // On ajoute est_epinglé dans le SELECT
    const sql = "SELECT id, auteur, texte, est_epinglé, created_at FROM messages WHERE id_groupe = ? ORDER BY created_at ASC LIMIT 50";
    db.query(sql, [groupId], (err, results) => {
        if (!err) socket.emit('load_messages', results);
    });
});

// Configuration du stockage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Assure-toi que ce dossier existe à la racine du backend
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

  socket.on('send_message', (data) => {
    // Correction ici : id_groupe au lieu de groupe_id
    const sql = "INSERT INTO messages (id_groupe, auteur, texte) VALUES (?, ?, ?)";
    db.query(sql, [data.groupId, data.auteur, data.texte], (err, result) => {
      if (!err) {
        io.to(data.groupId).emit('receive_message', { ...data, id: result.insertId });
      }
    });
  });
});
server.listen(5000, () => console.log("Serveur démarré sur le port 5000"));