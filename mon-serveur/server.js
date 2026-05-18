const express = require('express'); // Framework web
const cors = require('cors');  // Sécurité cross-origin
const mysql = require('mysql2'); // Base de données
const http = require('http'); // Serveur HTTP
const { Server } = require('socket.io'); // Temps réel (chat)
const bcrypt = require('bcrypt'); // Cryptage mots de passe
const jwt = require('jsonwebtoken');  // Tokens d'authentification
const multer = require('multer');  // Upload fichiers
const path = require('path');
const fs = require('fs');

// CONFIGURATION 
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
    }
});
const PORT = 5000;
const JWT_SECRET = 'ma_cle_secrete_123'; 
const FRONTEND_URL = "http://localhost:5173";

//  MIDDLEWARES
app.use(cors({
  origin: FRONTEND_URL,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Créer dossier uploads si inexistant
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Configuration multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// CONNEXION BDD 
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'pfe_db',
  port: 3307
});

db.getConnection((err, connection) => {
  if (err) console.error("❌ Erreur pool MySQL:", err.message);
  else {
    console.log("✅ Pool MySQL connecté !");
    connection.release();
  }
});

//  MIDDLEWARES D'AUTHENTIFICATION

// Middleware de vérification de token (utilisateur)
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(403).json({ message: "Token manquant" });
  
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: "Token invalide ou expiré" });
    req.userId = decoded.id;
    next();
  });
};

//  Middleware de vérification ADMIN
const verifyAdmin = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(403).json({ message: "Token manquant" });
  
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: "Token invalide" });
    
    //  Vérification par email admin
    if (decoded.email !== 'admin@costudy.dz') {
      return res.status(403).json({ message: "Accès admin requis" });
    }
    
    req.adminId = decoded.id;
    next();
  });
};

//  ROUTES D'AUTHENTIFICATION
// Inscription avec Question de Sécurité générée
app.post('/api/signup', async (req, res) => {
  const { 
    email, nom, prenom, matricule, mot_de_passe, 
    filiere, cursus, niveau, 
    question_secrete,
    reponse_secrete
  } = req.body;
  
  try {
    const hashedPassword = await bcrypt.hash(mot_de_passe, 10);
    const hashedAnswer = await bcrypt.hash(reponse_secrete.toLowerCase(), 10);

    const sql = `INSERT INTO etudiants 
      (email, nom, prenom, matricule, mot_de_passe, filiere, cursus, niveau, question_secrete, reponse_secrete) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    db.query(sql, [
        email, nom, prenom, matricule, hashedPassword, 
        filiere, cursus || 'LMD', niveau, 
        question_secrete,
        hashedAnswer
      ], 
      (err) => {
        if (err) {
          console.error("Erreur SQL:", err);
          return res.status(500).json({ message: "Erreur lors de l'inscription" });
        }
        res.status(200).json({ message: "Succès" });
      }
    );
  } catch (error) {
    res.status(500).json({ message: "Erreur lors du traitement des données" });
  }
});

// Connexion
app.post('/api/login', (req, res) => {
  const { email, mot_de_passe } = req.body;
  
  db.query("SELECT * FROM etudiants WHERE email = ?", [email], async (err, result) => {
    if (err) return res.status(500).json({ message: "Erreur serveur" });
    if (result.length === 0) return res.status(401).json({ message: "Email ou mot de passe incorrect" });
    
    const user = result[0]; 
    
    console.log("Utilisateur trouvé en BDD:", user); 
    
    const match = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
    
    if (!match) return res.status(401).json({ message: "Email ou mot de passe incorrect" });
    
    const token = jwt.sign(
      { id: user.id_etudiant, email: user.email }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    );
    
delete user.mot_de_passe;
res.status(200).json({ 
  message: "Connexion réussie !", 
  user, 
  token 
});
  });
});

//  RÉCUPÉRATION MOT DE PASSE
// Route 1 : Récupérer la question de sécurité par email
app.get('/api/forgot-password/:email', (req, res) => {
  const { email } = req.params;
  
  db.query("SELECT id_etudiant, question_secrete FROM etudiants WHERE email = ?", [email], 
    (err, result) => {
      if (err) return res.status(500).json({ message: "Erreur serveur" });
      if (result.length === 0) {
        return res.status(404).json({ message: "Aucun compte trouvé avec cet email." });
      }
      
      res.json({ 
        message: "Question trouvée", 
        id_etudiant: result[0].id_etudiant,
        question_secrete: result[0].question_secrete 
      });
    }
  );
});

// Route 2 : Vérifier la réponse et changer le mot de passe
app.post('/api/reset-password', async (req, res) => {
  const { id_etudiant, reponse, nouveau_mdp } = req.body;
  
  db.query("SELECT reponse_secrete FROM etudiants WHERE id_etudiant = ?", [id_etudiant], 
    async (err, result) => {
      if (err || result.length === 0) {
        return res.status(500).json({ message: "Erreur serveur" });
      }
      
      const storedHashedAnswer = result[0].reponse_secrete;
      const match = await bcrypt.compare(reponse.toLowerCase(), storedHashedAnswer);
      
      if (!match) {
        return res.status(401).json({ message: "Réponse incorrecte." });
      }
      
      const hashedPassword = await bcrypt.hash(nouveau_mdp, 10);
      
      db.query("UPDATE etudiants SET mot_de_passe = ? WHERE id_etudiant = ?", 
        [hashedPassword, id_etudiant], 
        (err) => {
          if (err) return res.status(500).json({ message: "Erreur mise à jour" });
          res.json({ message: "Mot de passe modifié avec succès !" });
        }
      );
    }
  );
});

//  ROUTES UTILISATEURS
// Récupérer utilisateurs (avec filtres)
app.get('/api/users', (req, res) => {
  const { filiere, niveau } = req.query;
  
  let sql = `SELECT id_etudiant AS id, nom, prenom, email, matricule AS username, filiere, niveau, 'Active' AS status, 'User' AS role FROM etudiants`;
  const conditions = [], values = [];
  
  if (filiere && filiere !== 'undefined') { conditions.push('filiere = ?'); values.push(filiere); }
  if (niveau && niveau !== 'undefined') { conditions.push('niveau = ?'); values.push(niveau); }
  
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  
  db.query(sql, values, (err, results) => 
    err ? res.status(500).json({ error: err.message }) : res.json(results)
  );
});

// Supprimer utilisateur
app.delete('/api/users/:id', verifyToken, (req, res) => {
  db.query("DELETE FROM etudiants WHERE id_etudiant = ?", [req.params.id], 
    (err) => err ? res.status(500).send(err) : res.json({ message: "Étudiant supprimé" })
  );
});

// Profil utilisateur
app.get('/api/profil/:id_etudiant', (req, res) => {
  const sql = `SELECT id_etudiant, email, nom, prenom, matricule, filiere, bio,
    (SELECT COUNT(*) FROM groupes WHERE id_etudiant = e.id_etudiant) as nb_crees,
    (SELECT COUNT(*) FROM membres_groupe WHERE id_etudiant = e.id_etudiant) as nb_rejoints
    FROM etudiants e WHERE id_etudiant = ?`;
  
  db.query(sql, [req.params.id_etudiant], (err, result) => {
    if (err || !result.length) return res.status(err ? 500 : 404).json({ message: err ? "Erreur serveur" : "Utilisateur non trouvé" });
    res.json(result[0]);
  });
});

//  ROUTES NOTIFICATIONS
// recupere les notifs d'un user 
app.get('/api/notifications/:userId', verifyToken, (req, res) => {
  const queryUserId = req.userId || req.params.userId;
  db.query("SELECT * FROM notifications WHERE id_etudiant = ? ORDER BY created_at DESC", [queryUserId], 
    (err, data) => err ? res.status(500).json({ error: err.message }) : res.json(data)
  );
});
// Marquer une notification comme lue
app.put('/api/notifications/:id/lu', verifyToken, (req, res) => {
  db.query("UPDATE notifications SET lu = 1 WHERE id = ?", [req.params.id], 
    (err) => err ? res.status(500).json({ message: 'Erreur' }) : res.json({ message: 'Notification lue' })
  );
});

app.put('/api/notifications/lire-tout/:userId', verifyToken, (req, res) => {
  db.query("UPDATE notifications SET lu = 1 WHERE id_etudiant = ?", [req.params.userId], 
    (err) => err ? res.status(500).json({ message: 'Erreur' }) : res.json({ message: 'Tout est lu' })
  );
});

app.delete('/api/notifications/clear-all/:userId', verifyToken, (req, res) => {
  db.query("DELETE FROM notifications WHERE id_etudiant = ?", [req.params.userId], 
    (err) => err ? res.status(500).send(err) : res.status(200).send("Notifications vidées")
  );
});

app.post('/api/notifications', verifyToken, (req, res) => {
  const { id_etudiant, message, type, id_groupe } = req.body;
  db.query("INSERT INTO notifications (id_etudiant, message, type, id_groupe) VALUES (?, ?, ?, ?)", 
    [id_etudiant, message, type, id_groupe], 
    (err) => err ? res.status(500).json(err) : res.json({ message: "Notification envoyée" })
  );
});

//  ROUTES FICHIERS & UPLOAD
app.post('/api/upload', verifyToken, upload.single('fichier'), (req, res) => {
  if (!req.file) return res.status(400).send("Aucun fichier reçu.");
  
  const { id_groupe, type, module, annee, filiere } = req.body;
  const sql = `INSERT INTO fichiers (nom_fichier, url_fichier, module, id_groupe, type, annee, filiere, date_upload) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`;
  
  db.query(sql, [req.file.originalname, req.file.path, module, id_groupe || null, type, annee, filiere || 'Informatique'], 
    (err) => err ? res.status(500).send(err) : res.json({ message: "Fichier enregistré !" })
  );
});

// Récupérer fichiers (avec filtres)
app.get('/api/fichiers', (req, res) => {
  const { filiere, niveau, statut } = req.query;
  
  let query = `SELECT * FROM fichiers WHERE 1=1`;
  const params = [];
  
  if (filiere && filiere !== 'undefined') {
    query += ` AND filiere LIKE ?`;
    params.push(`%${filiere}%`);
  }
  
  if (niveau && niveau !== 'undefined') {
    query += ` AND niveau = ?`;
    params.push(niveau);
  }
  
if (!statut || statut === 'pending') {
  query += ` AND statut = 'en_attente'`;
} else if (statut === 'valide' || statut === 'validated') {
  query += ` AND statut = 'valide'`;
} else if (statut !== 'all') {
  query += ` AND statut = ?`;
  params.push(statut);
}
  
  query += ` ORDER BY id_fichier DESC`;
  
  db.query(query, params, (err, results) => {
    if (err) {
      console.error("❌ Erreur SQL fichiers:", err);
      return res.status(500).json({ error: err.message });
    }
    
    console.log("✅ Fichiers trouvés:", results.length);
    res.json(results);
  });
});

app.put('/api/fichiers/:id/valider', (req, res) => {
  db.query("UPDATE fichiers SET statut = 'valide' WHERE id_fichier = ?", [req.params.id], 
    (err) => err ? res.status(500).json({ error: err.message }) : res.json({ message: "Fichier validé" })
  );
});

app.delete('/api/fichiers/:id', (req, res) => {
  db.query("DELETE FROM fichiers WHERE id_fichier = ?", [req.params.id], 
    (err) => err ? res.status(500).json({ error: err.message }) : res.json({ message: "Fichier supprimé" })
  );
});
// Modifier le nom d'un fichier
app.put('/api/fichiers/:id/rename', verifyToken, (req, res) => {
  const { nouveau_nom } = req.body;
  
  if (!nouveau_nom) {
    return res.status(400).json({ message: "Nom requis" });
  }
  
  const sql = "UPDATE fichiers SET nom_fichier = ? WHERE id_fichier = ?";
  
  db.query(sql, [nouveau_nom, req.params.id], (err) => {
    if (err) {
      console.error("❌ Erreur renommage:", err);
      return res.status(500).json({ error: err.message });
    }
    
    console.log("✅ Fichier renommé");
    res.json({ message: "Fichier renommé avec succès" });
  });
});

// Favoris
app.post('/api/favoris', (req, res) => {
db.query("INSERT IGNORE INTO favoris (id_etudiant, id_fichier) VALUES (?, ?)", 
      [req.body.id_etudiant, req.body.id_fichier], 
    (err) => err ? res.status(500).send(err) : res.json({ message: "Ajouté aux favoris" })
  );
});

app.delete('/api/favoris', (req, res) => {
  db.query("DELETE FROM favoris WHERE id_etudiant = ? AND id_fichier = ?", 
    [req.body.id_etudiant, req.body.id_fichier], 
    (err) => err ? res.status(500).send(err) : res.json({ message: "Retiré des favoris" })
  );
});

app.get('/api/favoris/:id_etudiant', (req, res) => {
  db.query("SELECT f.* FROM favoris fav JOIN fichiers f ON fav.id_fichier = f.id_fichier WHERE fav.id_etudiant = ?", 
    [req.params.id_etudiant], 
    (err, results) => err ? res.status(500).send({ message: "Erreur" }) : res.json(results)
  );
});

//  ROUTES GROUPES
// Créer groupe
app.post('/api/create-group', verifyToken, (req, res) => {
  const { nom_groupe, description, filiere, type_cursus, niveau, id_etudiant } = req.body;
  
  db.query("INSERT INTO groupes (nom_groupe, description, filiere, type_cursus, niveau, id_etudiant, etat) VALUES (?, ?, ?, ?, ?, ?, 'en_attente')", 
    [nom_groupe, description, filiere, type_cursus, niveau, id_etudiant], 
    (err, result) => {
      if (err) return res.status(500).json({ message: "Erreur création" });
      
      db.query("INSERT INTO notifications (id_etudiant, message, type, id_reference) VALUES (1, ?, 'creation_groupe', ?)", 
        [`Nouveau groupe à valider : ${nom_groupe}`, result.insertId]
      );
      
      res.json({ message: "Demande envoyée !", id_groupe: result.insertId });
    }
  );
});

// Groupes par niveau
// Dans server.js - Route /api/groupes/:niveau
app.get('/api/groupes/:niveau', (req, res) => {
  const { niveau } = req.params;
  const { filiere } = req.query;
  // Si filiere n'est pas fournie ou invalide, on ne filtre pas dessus
  let sql = "SELECT * FROM groupes WHERE niveau = ? AND etat = 'valide'";
  const params = [niveau];
  
  if (filiere && filiere !== 'undefined' && filiere !== 'null') {
    sql += " AND filiere = ?";
    params.push(filiere);
  }
  
  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("❌ Erreur SQL groupes:", err);
      return res.status(500).json({ error: err.message });
    }
    console.log("✅ Groupes trouvés:", results.length);
    res.json(results);
  });
});

// Mes groupes
app.get('/api/mes-groupes/:id_etudiant', (req, res) => {
  const sql = `SELECT DISTINCT g.*, 
    CASE WHEN g.id_etudiant = ? THEN 'createur' WHEN mg.role = 'responsable' THEN 'responsable' ELSE 'membre' END as mon_role
    FROM groupes g LEFT JOIN membres_groupe mg ON g.id_groupe = mg.id_groupe AND mg.id_etudiant = ?
    WHERE g.etat = 'valide' AND (g.id_etudiant = ? OR mg.id_etudiant = ?) ORDER BY g.nom_groupe ASC`;
  
  db.query(sql, [req.params.id_etudiant, req.params.id_etudiant, req.params.id_etudiant, req.params.id_etudiant], 
    (err, results) => err ? res.status(500).send({ message: 'Erreur', error: err.message }) : res.json(results)
  );
});

// Détails groupe
app.get('/api/groupe/:id', (req, res) => {
  db.query("SELECT * FROM groupes WHERE id_groupe = ?", [req.params.id], (err, groupResult) => {
    if (err || !groupResult.length) return res.status(err ? 500 : 404).send("Groupe non trouvé");
    
    const sqlMembres = `SELECT e.id_etudiant as id, e.nom FROM etudiants e WHERE e.id_etudiant IN (
      SELECT id_etudiant FROM appartenir WHERE id_groupe = ? UNION
      SELECT id_etudiant FROM membres_groupe WHERE id_groupe = ? UNION
      SELECT id_etudiant FROM groupes WHERE id_groupe = ?)`;
    
    db.query(sqlMembres, [req.params.id, req.params.id, req.params.id], 
      (err, membersResult) => err ? res.status(500).json(err) : res.json({ ...groupResult[0], membres: membersResult })
    );
  });
});

// Créer une séance de révision
app.post('/api/groupes/:id/seances', verifyToken, (req, res) => {
  const { id: idGroupe } = req.params;
  const { titre, description, date_seance } = req.body;
  const idCreateur = req.userId;
  
  db.query("SELECT id_etudiant FROM groupes WHERE id_groupe = ? AND id_etudiant = ?", [idGroupe, idCreateur], (err, result) => {
    if (err || result.length === 0) {
      return res.status(403).json({ message: "Accès refusé : seul le créateur peut annoncer une séance." });
    }
    
    db.query("INSERT INTO seances_revision (id_groupe, id_createur, titre, description, date_seance) VALUES (?, ?, ?, ?, ?)", 
      [idGroupe, idCreateur, titre, description, date_seance], (err, result) => {
        if (err) return res.status(500).json({ message: "Erreur création" });
        
        const idSeance = result.insertId;
        
        db.query("SELECT id_etudiant FROM membres_groupe WHERE id_groupe = ? AND id_etudiant != ?", [idGroupe, idCreateur], (err, members) => {
          if (!err && members.length > 0) {
            const dateFr = new Date(date_seance).toLocaleDateString('fr-FR', { 
              weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' 
            });
            const notifMsg = `📅 Nouvelle séance : "${titre}"\n🗓️ ${dateFr}`;
            
            members.forEach(m => {
              db.query("INSERT INTO notifications (id_etudiant, message, type, id_reference) VALUES (?, ?, 'seance_revision', ?)", 
                [m.id_etudiant, notifMsg, idSeance]);
            });
            console.log(`📩 Séance annoncée à ${members.length} membres`);
          }
          res.status(201).json({ message: "Séance créée et membres notifiés !", id_seance: idSeance });
        });
      });
  });
});

// Récupérer les séances d'un groupe
app.get('/api/groupes/:id/seances', (req, res) => {
  const sql = `SELECT s.*, e.nom as createur_nom, e.prenom as createur_prenom 
               FROM seances_revision s 
               LEFT JOIN etudiants e ON s.id_createur = e.id_etudiant 
               WHERE s.id_groupe = ? 
               ORDER BY s.date_seance ASC`;
  db.query(sql, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Supprimer groupe (admin)
app.delete('/api/groupe/:id', verifyToken, (req, res) => {
  const groupId = req.params.id;
  
  db.query("SELECT id_etudiant FROM membres_groupe WHERE id_groupe = ?", [groupId], (err, members) => {
    if (err) {
      console.error("❌ Erreur récupération membres:", err);
    }
    
    const queries = [
      "DELETE FROM messages WHERE id_groupe = ?",
      "DELETE FROM membres_groupe WHERE id_groupe = ?",
      "DELETE FROM appartenir WHERE id_groupe = ?",
      "DELETE FROM demandes WHERE id_groupe = ?",
      "DELETE FROM groupes WHERE id_groupe = ?"
    ];
    
    const exec = (i) => {
      if (i >= queries.length) {
        if (members && members.length > 0) {
          const notifMsg = "⚠️ Le groupe auquel vous apparteniez a été supprimé par l'administrateur.";
          
          members.forEach(member => {
            db.query("INSERT INTO notifications (id_etudiant, message, type, id_reference) VALUES (?, ?, 'groupe_supprime', ?)", 
              [member.id_etudiant, notifMsg, groupId]);
          });
          console.log(`📩 Notifications envoyées à ${members.length} membres`);
        }
        
        io.to(groupId.toString()).emit('group_deleted');
        return res.status(200).send("Groupe supprimé");
      }
      db.query(queries[i], [groupId], () => exec(i + 1));
    };
    exec(0);
  });
});
// ROUTES ADHÉSIONS & DEMANDES
//responsable 
app.post('/api/demande-adhesion', (req, res) => {
  const { id_groupe, id_etudiant } = req.body;
  
  db.query("SELECT * FROM demandes WHERE id_groupe = ? AND id_etudiant = ? AND statut = 'en_attente'", 
    [id_groupe, id_etudiant], 
    (err, results) => {
      if (err) return res.status(500).send({ message: "Erreur" });
      if (results.length) return res.status(400).send({ message: "Déjà une demande en attente" });
      
      db.query("INSERT INTO demandes (id_groupe, id_etudiant, statut) VALUES (?, ?, 'en_attente')", 
        [id_groupe, id_etudiant], 
        (err, result) => {
          if (err) return res.status(500).send({ message: err.message });
          
          db.query("SELECT id_etudiant, nom_groupe FROM groupes WHERE id_groupe = ?", [id_groupe], 
            (err, adminResult) => {
              if (!err && adminResult.length) {
                db.query("INSERT INTO notifications (id_etudiant, message, type, id_reference) VALUES (?, ?, 'adhesion', ?)", 
                  [adminResult[0].id_etudiant, `Nouvelle demande pour "${adminResult[0].nom_groupe}"`, result.insertId]
                );
              }
              res.json({ message: "Demande envoyée !" });
            }
          );
        }
      );
    }
  );
});

app.put('/api/demande-adhesion/:id/accepter', (req, res) => {
  db.query("UPDATE demandes SET statut = 'accepte' WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).send({ message: 'Erreur' });
    
    db.query("SELECT * FROM demandes WHERE id = ?", [req.params.id], (err, results) => {
      if (!results.length) return res.status(500).send({ message: 'Erreur' });
      const d = results[0];
      
      db.query("INSERT INTO membres_groupe (id_groupe, id_etudiant, role, date_adhesion) VALUES (?, ?, 'membre', NOW())", 
        [d.id_groupe, d.id_etudiant]
      );
      
      db.query("INSERT INTO notifications (id_etudiant, message, type, id_reference) VALUES (?, ?, 'adhesion_acceptee', ?)", 
        [d.id_etudiant, "✅ Votre demande a été acceptée !", d.id_groupe]
      );
      
      res.json({ message: "Demande acceptée" });
    });
  });
});

app.get('/api/mes-demandes/:id_etudiant', (req, res) => {
  db.query("SELECT id_groupe FROM demandes WHERE id_etudiant = ? AND statut = 'en_attente'", 
    [req.params.id_etudiant], 
    (err, results) => err ? res.status(500).send({ message: 'Erreur' }) : res.json(results)
  );
});

app.delete('/api/annuler-demande', (req, res) => {
  db.query("DELETE FROM demandes WHERE id_groupe = ? AND id_etudiant = ? AND statut = 'en_attente'", 
    [req.body.id_groupe, req.body.id_etudiant], 
    (err) => err ? res.status(500).send({ message: "Erreur" }) : res.json({ message: "Demande annulée" })
  );
});

// AJOUTER UN MEMBRE (CReATEUR UNIQUEMENT)
app.post('/api/groupe/:id/membres', verifyToken, (req, res) => {
  const { id } = req.params;
  const { idEtudiantAjoute } = req.body;
  const adminId = req.userId;

  db.query("SELECT id_etudiant, nom_groupe FROM groupes WHERE id_groupe = ?", [id], (err, result) => {
    if (err) return res.status(500).send("Erreur serveur");
    if (result.length === 0) return res.status(404).send("Groupe introuvable");

    const createurId = result[0].id_etudiant;
    const nomGroupe = result[0].nom_groupe;

    if (createurId !== parseInt(adminId)) {
      return res.status(403).send("Accès refusé : seul le créateur peut ajouter des membres.");
    }

    db.query("SELECT * FROM etudiants WHERE id_etudiant = ?", [idEtudiantAjoute], (err, users) => {
      if (users.length === 0) return res.status(404).send("Cet étudiant n'existe pas.");

      db.query("SELECT * FROM membres_groupe WHERE id_groupe = ? AND id_etudiant = ?", [id, idEtudiantAjoute], (err, existing) => {
        if (existing.length > 0) return res.status(400).send("Cet utilisateur est déjà membre du groupe.");

        db.query("INSERT INTO membres_groupe (id_groupe, id_etudiant, role, date_adhesion) VALUES (?, ?, 'membre', NOW())", 
          [id, idEtudiantAjoute], (err) => {
            if (err) return res.status(500).send("Erreur lors de l'ajout.");

            db.query("INSERT INTO notifications (id_etudiant, message, type, id_reference) VALUES (?, ?, 'adhesion', ?)", 
              [idEtudiantAjoute, `Vous avez été ajouté au groupe "${nomGroupe}" par l'administrateur.`, id]);

            res.status(200).json({ message: "Membre ajouté avec succès !" });
          });
      });
    });
  });
});

//  ROUTES ADMIN (BASE)
// Stats
app.get('/api/admin/stats/:filiere/:niveau', (req, res) => {
  const { filiere, niveau } = req.params;
  
  const run = (sql, params, cb) => db.query(sql, params, (err, r) => cb(err, r?.[0]?.total || 0));
  
  run("SELECT COUNT(*) as total FROM fichiers WHERE filiere = ? AND niveau = ? AND statut = 'en_attente'", [filiere, niveau], (errF, fichiers) => {
    if (errF) return res.status(500).json({ error: errF.message });
    
    run("SELECT COUNT(*) as total FROM groupes WHERE filiere = ? AND niveau = ? AND etat = 'en_attente'", [filiere, niveau], (errG, groupes) => {
      if (errG) return res.status(500).json({ error: errG.message });
      
      run("SELECT COUNT(*) as total FROM etudiants WHERE filiere = ? AND niveau = ?", [filiere, niveau], (errM, membres) => {
        if (errM) return res.status(500).json({ error: errM.message });
        
        res.json({ fichiersEnAttente: fichiers, groupesEnAttente: groupes, totalEtudiants: membres });
      });
    });
  });
});
//groupes 
// Groupes en attente
app.get('/api/admin/pending-groups/:filiere/:niveau', (req, res) => {
  db.query("SELECT * FROM groupes WHERE filiere = ? AND niveau = ? AND etat = 'en_attente'", 
    [req.params.filiere, req.params.niveau], 
    (err, results) => err ? res.status(500).json(err) : res.json(results)
  );
});

// Groupes validés
app.get('/api/admin/groups/:filiere/:niveau', (req, res) => {
  const sql = `
    SELECT g.*, e.nom as createur_nom, e.prenom as createur_prenom 
    FROM groupes g 
    LEFT JOIN etudiants e ON g.id_etudiant = e.id_etudiant 
    WHERE g.filiere = ? AND g.niveau = ? AND g.etat = 'valide' 
    ORDER BY g.id_groupe DESC
  `;
  
  db.query(sql, [req.params.filiere, req.params.niveau], (err, results) => {
    if (err) {
      console.error("❌ ERREUR SQL:", err);
      return res.status(500).json({ error: err.message });
    }
    console.log("✅ Groupes trouvés:", results.length);
    res.json(results);
  });
});

// Valider groupe
app.put('/api/admin/valider-groupe/:id', verifyToken, (req, res) => {
  db.query("SELECT id_etudiant FROM groupes WHERE id_groupe = ?", [req.params.id], (err, result) => {
    if (err || !result.length) return res.status(err ? 500 : 404).json({ message: "Groupe non trouvé" });
    
    const createurId = result[0].id_etudiant;
    
    db.query("UPDATE groupes SET etat = 'valide' WHERE id_groupe = ?", [req.params.id], (err) => {
      if (err) return res.status(500).json({ message: "Erreur" });
      
      db.query("INSERT INTO membres_groupe (id_groupe, id_etudiant, role, date_adhesion) VALUES (?, ?, 'responsable', NOW()) ON DUPLICATE KEY UPDATE role = 'responsable'", 
        [req.params.id, createurId]
      );
      
      db.query("INSERT INTO notifications (id_etudiant, message, type, id_reference) VALUES (?, ?, 'groupe_valide', ?)", 
        [createurId, "🎉 Votre groupe a été validé !", req.params.id]
      );
      
      res.json({ message: "Groupe validé !" });
    });
  });
});

// Refuser groupe avec motif
app.delete('/api/admin/refuser-groupe/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  const { motif } = req.body;

  db.query("SELECT id_etudiant, nom_groupe FROM groupes WHERE id_groupe = ? AND etat = 'en_attente'", [id], (err, results) => {
    if (err || !results.length) return res.status(404).json({ message: "Groupe non trouvé" });

    const createurId = results[0].id_etudiant;
    const nomGroupe = results[0].nom_groupe;
    const messageRefus = ` Votre groupe "${nomGroupe}" a été refusé par l'administrateur.\nMotif : ${motif}`;
    
    db.query("INSERT INTO notifications (id_etudiant, message, type, id_reference) VALUES (?, ?, 'refuse', ?)", 
      [createurId, messageRefus, id], (notifErr) => {
        if (notifErr) console.error("⚠️ Erreur insertion notif refus:", notifErr);
      });

    db.query("DELETE FROM groupes WHERE id_groupe = ?", [id], (deleteErr) => {
      if (deleteErr) return res.status(500).json({ message: "Erreur lors de la suppression" });
      res.json({ message: "Demande refusée et groupe supprimé." });
    });
  });
});

// Inscriptions en attente
app.get('/api/admin/pending-registrations', verifyToken, (req, res) => {
  db.query("SELECT id_etudiant AS id, nom, prenom, email, matricule, 'Pending' as status FROM etudiants WHERE statut = 'en_attente'", 
    (err, results) => err ? res.status(500).send(err) : res.json(results)
  );
});

// ROUTES ADMIN - GESTION AVANCÉE GROUPES 
// Lister les membres d'un groupe
app.get('/api/admin/groupes/:id/membres', verifyAdmin, (req, res) => {
  const sql = `
    SELECT e.id_etudiant as id, e.nom, e.prenom, e.email, e.matricule, 
           mg.role, mg.date_adhesion
    FROM membres_groupe mg
    JOIN etudiants e ON mg.id_etudiant = e.id_etudiant
    WHERE mg.id_groupe = ?
    ORDER BY mg.role DESC, e.nom ASC
  `;
  
  db.query(sql, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Ajouter le créateur s'il n'est pas dans membres_groupe
    db.query("SELECT id_etudiant as id, nom, prenom, email, matricule FROM etudiants WHERE id_etudiant = (SELECT id_etudiant FROM groupes WHERE id_groupe = ?)", 
      [req.params.id], 
      (err2, createur) => {
        if (!err2 && createur.length) {
          const existe = results.some(m => m.id === createur[0].id);
          if (!existe) {
            results.unshift({ ...createur[0], role: 'createur', date_adhesion: null });
          }
        }
        res.json(results);
      }
    );
  });
});
// RECHERCHE D'ÉTUDIANTS (pour ajout membre)
app.get('/api/users/search', verifyToken, (req, res) => {
  const { q } = req.query;
  
  if (!q || q.length < 2) {
    return res.json([]);
  }
  
  const searchTerm = `%${q}%`;
  const currentUserId = req.userId;
  
  const sql = `
    SELECT id_etudiant, nom, prenom, email, filiere, niveau 
    FROM etudiants 
    WHERE (nom LIKE ? OR prenom LIKE ? OR email LIKE ?)
    AND id_etudiant != ?
    ORDER BY nom, prenom
    LIMIT 10
  `;
  
  db.query(sql, [searchTerm, searchTerm, searchTerm, currentUserId], 
    (err, results) => {
      if (err) {
        console.error("❌ Erreur recherche utilisateurs:", err);
        return res.status(500).json({ error: err.message });
      }
      res.json(results);
    }
  );
});

// ROUTE POUR CRÉATEUR : Kick un membre
app.delete('/api/groupe/:id/membres/:memberId', verifyToken, (req, res) => {
  const { id, memberId } = req.params;
  const userId = req.userId;
  
  // 1. Vérifier que le groupe existe et récupérer le créateur
  db.query("SELECT id_etudiant, nom_groupe FROM groupes WHERE id_groupe = ?", [id], 
    (err, group) => {
      if (err || !group.length) {
        return res.status(404).json({ message: "Groupe non trouvé" });
      }
      
      const createurId = group[0].id_etudiant;
      const nomGroupe = group[0].nom_groupe;
      
      // 2. Seul le créateur peut kick
      if (Number(createurId) !== Number(userId)) {
        return res.status(403).json({ message: "Seul le créateur peut retirer des membres" });
      }
      
      // 3. On ne peut pas se kick soi-même
      if (Number(memberId) === Number(userId)) {
        return res.status(400).json({ message: "Tu ne peux pas te retirer toi-même" });
      }
      
      // 4. Supprimer le membre de membres_groupe
      db.query("DELETE FROM membres_groupe WHERE id_groupe = ? AND id_etudiant = ?", 
        [id, memberId], 
        (err) => {
          if (err) {
            return res.status(500).json({ message: "Erreur serveur" });
          }
          
          // 5. Notification au membre kické
          db.query("INSERT INTO notifications (id_etudiant, message, type, id_reference) VALUES (?, ?, 'kick_groupe', ?)",
            [memberId, `Vous avez été retiré du groupe "${nomGroupe}" par le créateur.`, id]
          );
          
          // 6. Socket : informer les autres membres en temps réel
          io.to(id.toString()).emit('user_kicked', { kickedId: parseInt(memberId) });
          
          res.json({ message: "Membre retiré avec succès" });
        }
      );
    }
  );
});

//  Renommer un groupe
app.put('/api/admin/groupes/:id/rename', verifyAdmin, (req, res) => {
  const { nouveau_nom } = req.body;
  
  if (!nouveau_nom?.trim()) {
    return res.status(400).json({ message: "Nom requis" });
  }
  
  db.query("UPDATE groupes SET nom_groupe = ? WHERE id_groupe = ?", 
    [nouveau_nom.trim(), req.params.id], 
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      
      db.query("SELECT id_etudiant FROM membres_groupe WHERE id_groupe = ?", [req.params.id], 
        (err, membres) => {
          if (!err && membres?.length) {
            membres.forEach(m => {
              db.query("INSERT INTO notifications (id_etudiant, message, type, id_reference) VALUES (?, ?, 'groupe_renomme', ?)", 
                [m.id_etudiant, `Le groupe a été renommé en "${nouveau_nom}" par l'administrateur.`, req.params.id]
              );
            });
          }
        }
      );
      
      io.to(req.params.id.toString()).emit('group_renamed', { nouveau_nom: nouveau_nom.trim() });
      
      res.json({ message: "Groupe renommé avec succès" });
    }
  );
});
//  Changer le rôle d'un membre (membre ↔ responsable)
app.put('/api/admin/groupes/:groupeId/membres/:etudiantId/role', verifyAdmin, (req, res) => {
  const { groupeId, etudiantId } = req.params;
  const { nouveau_role } = req.body;
  
  if (!['membre', 'responsable'].includes(nouveau_role)) {
    return res.status(400).json({ message: "Rôle invalide" });
  }
  
  db.query("SELECT id_etudiant FROM groupes WHERE id_groupe = ?", [groupeId], 
    (err, group) => {
      if (err || !group.length) return res.status(404).json({ message: "Groupe non trouvé" });
      
      if (group[0].id_etudiant == etudiantId) {
        return res.status(400).json({ message: "Le rôle du créateur ne peut pas être modifié" });
      }
      
      db.query(`INSERT INTO membres_groupe (id_groupe, id_etudiant, role, date_adhesion) 
                VALUES (?, ?, ?, NOW()) 
                ON DUPLICATE KEY UPDATE role = ?`, 
        [groupeId, etudiantId, nouveau_role, nouveau_role], 
        (err) => {
          if (err) return res.status(500).json({ error: err.message });
          
          db.query("INSERT INTO notifications (id_etudiant, message, type, id_reference) VALUES (?, ?, 'role_change', ?)", 
            [etudiantId, `Votre rôle dans le groupe a été changé en "${nouveau_role}" par l'administrateur.`, groupeId]
          );
          
          io.to(groupeId.toString()).emit('member_role_changed', { 
            etudiantId: parseInt(etudiantId), 
            nouveau_role 
          });
          
          res.json({ message: "Rôle mis à jour" });
        }
      );
    }
  );
});
//  Supprimer un groupe (version admin renforcée)
app.delete('/api/admin/groupes/:id', verifyAdmin, (req, res) => {
  const groupId = req.params.id;
  
  const sqlGetInfo = `
    SELECT g.id_etudiant as createur_id, g.nom_groupe,
           (SELECT GROUP_CONCAT(id_etudiant) FROM membres_groupe WHERE id_groupe = ?) as membres_ids
    FROM groupes g WHERE id_groupe = ?
  `;
  
  db.query(sqlGetInfo, [groupId, groupId], (err, info) => {
    if (err || !info.length) return res.status(404).json({ message: "Groupe non trouvé" });
    
    const { createur_id, nom_groupe, membres_ids } = info[0];
    const allUserIds = [createur_id, ...(membres_ids ? membres_ids.split(',').map(Number) : [])];
    
    const queries = [
      "DELETE FROM messages WHERE id_groupe = ?",
      "DELETE FROM membres_groupe WHERE id_groupe = ?",
      "DELETE FROM appartenir WHERE id_groupe = ?",
      "DELETE FROM demandes WHERE id_groupe = ?",
      "DELETE FROM seances_revision WHERE id_groupe = ?",
      "DELETE FROM groupes WHERE id_groupe = ?"
    ];
    
    const exec = (i) => {
      if (i >= queries.length) {
        allUserIds.forEach(uid => {
          if (uid) {
            db.query("INSERT INTO notifications (id_etudiant, message, type, id_reference) VALUES (?, ?, 'groupe_supprime_admin', ?)", 
              [uid, `⚠️ Le groupe "${nom_groupe}" a été supprimé par l'administrateur.`, groupId]
            );
          }
        });
        
        io.to(groupId.toString()).emit('group_deleted_by_admin');
        return res.json({ message: "Groupe supprimé avec succès" });
      }
      db.query(queries[i], [groupId], () => exec(i + 1));
    };
    exec(0);
  });
});
//  ROUTES MESSAGES & CHAT
app.get('/api/messages/:id_groupe', (req, res) => {
  db.query("SELECT id, auteur, texte, created_at FROM messages WHERE id_groupe = ? ORDER BY created_at ASC", 
    [req.params.id_groupe], 
    (err, results) => err ? res.status(500).json({ error: err.message }) : res.json(results)
  );
});

app.post('/api/messages', verifyToken, (req, res) => {
  const { id_groupe, auteur, texte } = req.body;
  
  db.query("INSERT INTO messages (id_groupe, auteur, texte, created_at) VALUES (?, ?, ?, NOW())", 
    [id_groupe, auteur, texte], 
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      
      const newMessage = { id: result.insertId, auteur, texte, created_at: new Date() };
      io.to(id_groupe.toString()).emit('receive_message', newMessage);
      
      res.status(201).json(newMessage);
    }
  );
});

app.put('/api/messages/:idMessage/epingler', verifyToken, (req, res) => {
  db.query("SELECT g.id_etudiant, m.id_groupe FROM groupes g JOIN messages m ON g.id_groupe = m.id_groupe WHERE m.id = ?", 
    [req.params.idMessage], 
    (err, result) => {
      if (err || !result.length || result[0].id_etudiant !== parseInt(req.body.idUser)) 
        return res.status(err ? 500 : 403).send("Erreur ou accès refusé");
      
      const groupId = result[0].id_groupe;
      db.query("UPDATE messages SET est_epinglé = NOT est_epinglé WHERE id = ?", [req.params.idMessage], 
        (err) => {
          if (err) return res.status(500).send(err);
          io.to(groupId.toString()).emit('message_pinned_updated');
          res.send("État mis à jour");
        }
      );
    }
  );
});
//  RECHERCHE GLOBALE
app.get('/api/search-all', (req, res) => {
  const term = `%${req.query.q}%`;
  
  db.query("SELECT id_groupe as id, nom_groupe as title, 'groupe' as type FROM groupes WHERE nom_groupe LIKE ?", [term], (err, groups) => {
    if (err) return res.status(500).json(err);
    
    db.query("SELECT id_fichier as id, nom_fichier as title, 'document' as type FROM fichiers WHERE nom_fichier LIKE ?", [term], (err, docs) => {
      if (err) return res.status(500).json(err);
      res.json([...groups, ...docs]);
    });
  });
});

//  AGENDA

app.get('/api/agenda/:userId', verifyToken, (req, res) => {
  db.query("SELECT * FROM agenda WHERE id_etudiant = ? ORDER BY date ASC", [req.params.userId], 
    (err, results) => err ? res.status(500).json(err) : res.json(results)
  );
});

app.post('/api/agenda', verifyToken, (req, res) => {
  const { titre, date, heure, description } = req.body;
  db.query("INSERT INTO agenda (id_etudiant, titre, date, heure, description) VALUES (?, ?, ?, ?, ?)", 
    [req.userId, titre, date, heure, description], 
    (err, result) => err ? res.status(500).json(err) : res.json({ message: "Événement ajouté", id: result.insertId })
  );
});
//  SOCKET.IO (CHAT TEMPS RÉEL)
io.on('connection', (socket) => {
  console.log("🔌 Client connecté:", socket.id);
  
  socket.on('join_group', (groupId) => {
    socket.join(groupId);
    db.query("SELECT id, auteur, texte, est_epinglé, created_at FROM messages WHERE id_groupe = ? ORDER BY created_at ASC LIMIT 50", 
      [groupId], 
      (err, results) => { if (!err) socket.emit('load_messages', results); }
    );
  });
  
  socket.on('send_message', (data) => {
    db.query("INSERT INTO messages (id_groupe, auteur, texte, created_at) VALUES (?, ?, ?, NOW())", 
      [data.groupId, data.auteur, data.texte], 
      (err, result) => {
        if (!err) io.to(data.groupId.toString()).emit('receive_message', { ...data, id: result.insertId, created_at: new Date() });
      }
    );
  });
  
  socket.on('message_pinned_updated', (data) => {
    socket.to(data.groupId.toString()).emit('message_pinned_updated', data);
  });
  
  socket.on('disconnect', () => {
    console.log("🔌 Client déconnecté:", socket.id);
  });
});

//  DÉMARRAGE SERVEUR
server.listen(PORT, () => {
  console.log(`✅ Serveur Co'Study démarré sur http://localhost:${PORT}`);
  console.log(`🌐 Frontend attendu sur ${FRONTEND_URL}`);
});