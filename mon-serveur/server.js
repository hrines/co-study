/* ==========================================
   SERVER.JS - CO'STUDY BACKEND (OPTIMISÉ)
   ========================================== */

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ========== CONFIGURATION ==========
const app = express();
const server = http.createServer(app);
const io = new Server(server, {  // ✅ io doit être défini ICI
    cors: {
        origin: "http://localhost:5173",
    }
});
const PORT = 5000;
const JWT_SECRET = 'ma_cle_secrete_123'; // 🔐 À mettre dans un .env en prod !
const FRONTEND_URL = "http://localhost:5173";

// ========== MIDDLEWARES ==========
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

// ========== CONNEXION BDD ==========
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

// ========== MIDDLEWARE AUTH ==========
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(403).json({ message: "Token manquant" });
  
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: "Token invalide ou expiré" });
    req.userId = decoded.id;
    next();
  });
};

// ==========================================
// 🔐 ROUTES D'AUTHENTIFICATION
// ==========================================

// Inscription
app.post('/api/signup', async (req, res) => {
  const { email, nom, prenom, matricule, mot_de_passe, filiere, cursus, niveau } = req.body;
  
  try {
    const hashedPassword = await bcrypt.hash(mot_de_passe, 10);
    const sql = `INSERT INTO etudiants 
      (email, nom, prenom, matricule, mot_de_passe, filiere, cursus, niveau) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    
    db.query(sql, [email, nom, prenom, matricule, hashedPassword, filiere, cursus || 'LMD', niveau], 
      (err) => err 
        ? res.status(500).json({ message: "Erreur: " + err.message })
        : res.status(200).json({ message: "Succès" })
    );
  } catch (error) {
    res.status(500).json({ message: "Erreur hash mot de passe" });
  }
});

// Connexion
app.post('/api/login', (req, res) => {
  const { email, mot_de_passe } = req.body;
  
  db.query("SELECT * FROM etudiants WHERE email = ?", [email], async (err, result) => {
    if (err) return res.status(500).json({ message: "Erreur serveur" });
    if (result.length === 0) return res.status(401).json({ message: "Email ou mot de passe incorrect" });
    
    const user = result[0];
    const match = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
    
    if (!match) return res.status(401).json({ message: "Email ou mot de passe incorrect" });
    
    const token = jwt.sign(
      { id: user.id_etudiant, email: user.email }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    );
    
    delete user.mot_de_passe;
    res.status(200).json({ message: "Connexion réussie !", user, token });
  });
});

// ==========================================
// 👥 ROUTES UTILISATEURS
// ==========================================

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

// ==========================================
// 🔔 ROUTES NOTIFICATIONS
// ==========================================

app.get('/api/notifications/:userId', verifyToken, (req, res) => {
  const queryUserId = req.userId || req.params.userId;
  db.query("SELECT * FROM notifications WHERE id_etudiant = ? ORDER BY created_at DESC", [queryUserId], 
    (err, data) => err ? res.status(500).json({ error: err.message }) : res.json(data)
  );
});

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

// ==========================================
// 📁 ROUTES FICHIERS & UPLOAD
// ==========================================

app.post('/api/upload', verifyToken, upload.single('fichier'), (req, res) => {
  if (!req.file) return res.status(400).send("Aucun fichier reçu.");
  
  const { id_groupe, type, module, annee, filiere } = req.body;
  const sql = `INSERT INTO fichiers (nom_fichier, url_fichier, module, id_groupe, type, annee, filiere, date_upload) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`;
  
  db.query(sql, [req.file.originalname, req.file.path, module, id_groupe || null, type, annee, filiere || 'Informatique'], 
    (err) => err ? res.status(500).send(err) : res.json({ message: "Fichier enregistré !" })
  );
});

// Récupérer fichiers (avec filtres) - VERSION CORRIGÉE
app.get('/api/fichiers', (req, res) => {
  const { filiere, niveau, statut } = req.query;
  
  console.log("📥 Requête fichiers - filiere:", filiere, "niveau:", niveau);
  
  // ✅ Requête simplifiée qui fonctionne avec TA table
  let query = `
    SELECT f.*, e.nom as nom_etudiant, e.prenom as prenom_etudiant
    FROM fichiers f
    LEFT JOIN etudiants e ON f.id_etudiant = e.id_etudiant
    WHERE 1=1
  `;
  
  const params = [];
  
  // Ajoute les filtres SEULEMENT si les colonnes existent
  if (filiere && filiere !== 'undefined') {
    query += ` AND f.filiere = ?`;
    params.push(filiere);
  }
  
  if (niveau && niveau !== 'undefined') {
    query += ` AND f.niveau = ?`;
    params.push(niveau);
  }
  
  // Par défaut : fichiers en attente
  if (!statut || statut === 'pending') {
    query += ` AND f.statut = 'en_attente'`;
  } else if (statut !== 'all') {
    query += ` AND f.statut = ?`;
    params.push(statut);
  }
  
  query += ` ORDER BY f.id_fichier DESC`;
  
  console.log("📝 SQL:", query, "Params:", params);
  
  db.query(query, params, (err, results) => {
    if (err) {
      console.error("❌ Erreur SQL fichiers:", err);
      return res.status(500).json({ error: err.message });
    }
    
    console.log("✅ Fichiers trouvés:", results.length);
    res.json(results);
  });
});

app.put('/api/fichiers/:id/valider', verifyToken, (req, res) => {
  db.query("UPDATE fichiers SET statut = 'valide' WHERE id_fichier = ?", [req.params.id], 
    (err) => err ? res.status(500).json({ error: err.message }) : res.json({ message: "Fichier validé" })
  );
});

app.delete('/api/fichiers/:id', verifyToken, (req, res) => {
  db.query("DELETE FROM fichiers WHERE id_fichier = ?", [req.params.id], 
    (err) => err ? res.status(500).json({ error: err.message }) : res.json({ message: "Fichier supprimé" })
  );
});

// Favoris
app.post('/api/favoris', (req, res) => {
  db.query("INSERT INTO favoris (id_etudiant, id_fichier) VALUES (?, ?)", 
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

// ==========================================
// 👥 ROUTES GROUPES
// ==========================================

// Créer groupe
app.post('/api/create-group', verifyToken, (req, res) => {
  const { nom_groupe, description, filiere, type_cursus, niveau, id_etudiant } = req.body;
  
  db.query("INSERT INTO groupes (nom_groupe, description, filiere, type_cursus, niveau, id_etudiant, etat) VALUES (?, ?, ?, ?, ?, ?, 'en_attente')", 
    [nom_groupe, description, filiere, type_cursus, niveau, id_etudiant], 
    (err, result) => {
      if (err) return res.status(500).json({ message: "Erreur création" });
      
      // Notification admin
      db.query("INSERT INTO notifications (id_etudiant, message, type, id_reference) VALUES (1, ?, 'creation_groupe', ?)", 
        [`Nouveau groupe à valider : ${nom_groupe}`, result.insertId]
      );
      
      res.json({ message: "Demande envoyée !", id_groupe: result.insertId });
    }
  );
});

// Groupes par niveau (public)
app.get('/api/groupes/:niveau', (req, res) => {
  db.query("SELECT * FROM groupes WHERE niveau = ? AND filiere = ? AND etat = 'valide'", 
    [req.params.niveau, req.query.filiere], 
    (err, results) => err ? res.status(500).send({ message: 'Erreur' }) : res.json(results)
  );
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

// Supprimer groupe (admin)
app.delete('/api/groupe/:id', verifyToken, (req, res) => {
  const queries = [
    "DELETE FROM messages WHERE id_groupe = ?",
    "DELETE FROM membres_groupe WHERE id_groupe = ?",
    "DELETE FROM appartenir WHERE id_groupe = ?",
    "DELETE FROM demandes WHERE id_groupe = ?",
    "DELETE FROM groupes WHERE id_groupe = ?"
  ];
  
  const exec = (i) => {
    if (i >= queries.length) {
      io.to(req.params.id.toString()).emit('group_deleted');
      return res.status(200).send("Groupe supprimé");
    }
    db.query(queries[i], [req.params.id], () => exec(i + 1));
  };
  exec(0);
});

// ==========================================
// 🤝 ROUTES ADHÉSIONS & DEMANDES
// ==========================================

app.post('/api/demande-adhesion', (req, res) => {
  const { id_groupe, id_etudiant } = req.body;
  
  // Vérifier demande existante
  db.query("SELECT * FROM demandes WHERE id_groupe = ? AND id_etudiant = ? AND statut = 'en_attente'", 
    [id_groupe, id_etudiant], 
    (err, results) => {
      if (err) return res.status(500).send({ message: "Erreur" });
      if (results.length) return res.status(400).send({ message: "Déjà une demande en attente" });
      
      // Insérer demande
      db.query("INSERT INTO demandes (id_groupe, id_etudiant, statut) VALUES (?, ?, 'en_attente')", 
        [id_groupe, id_etudiant], 
        (err, result) => {
          if (err) return res.status(500).send({ message: err.message });
          
          // Notifier admin
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
      
      // Notification étudiant
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

// ==========================================
// 👑 ROUTES ADMIN
// ==========================================

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

// Groupes en attente
app.get('/api/admin/pending-groups/:filiere/:niveau', (req, res) => {
  db.query("SELECT * FROM groupes WHERE filiere = ? AND niveau = ? AND etat = 'en_attente'", 
    [req.params.filiere, req.params.niveau], 
    (err, results) => err ? res.status(500).json(err) : res.json(results)
  );
});

// Route pour récupérer les groupes VALIDÉS (Corrigée pour ta table)
app.get('/api/admin/groups/:filiere/:niveau', (req, res) => {
  const filiere = req.params.filiere;
  const niveau = req.params.niveau;
  
  console.log(`🔍 Recherche groupes admin: ${filiere} / ${niveau}`);

  // ✅ ICI : On utilise id_groupe au lieu de created_at (qui n'existe pas)
  // et on utilise * pour prendre toutes tes colonnes exactes
  const sql = `
    SELECT g.*, e.nom as createur_nom, e.prenom as createur_prenom 
    FROM groupes g 
    LEFT JOIN etudiants e ON g.id_etudiant = e.id_etudiant 
    WHERE g.filiere = ? AND g.niveau = ? AND g.etat = 'valide' 
    ORDER BY g.id_groupe DESC
  `;
  
  db.query(sql, [filiere, niveau], (err, results) => {
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
    
    // Valider groupe
    db.query("UPDATE groupes SET etat = 'valide' WHERE id_groupe = ?", [req.params.id], (err) => {
      if (err) return res.status(500).json({ message: "Erreur" });
      
      // Ajouter créateur comme responsable
      db.query("INSERT INTO membres_groupe (id_groupe, id_etudiant, role, date_adhesion) VALUES (?, ?, 'responsable', NOW()) ON DUPLICATE KEY UPDATE role = 'responsable'", 
        [req.params.id, createurId]
      );
      
      // Notification créateur
      db.query("INSERT INTO notifications (id_etudiant, message, type, id_reference) VALUES (?, ?, 'groupe_valide', ?)", 
        [createurId, "🎉 Votre groupe a été validé !", req.params.id]
      );
      
      res.json({ message: "Groupe validé !" });
    });
  });
});

// Refuser groupe
app.delete('/api/admin/refuser-groupe/:id', verifyToken, (req, res) => {
  db.query("SELECT id_etudiant, nom_groupe FROM groupes WHERE id_groupe = ? AND etat = 'en_attente'", 
    [req.params.id], 
    (err, results) => {
      if (err || !results.length) return res.status(err ? 500 : 404).json({ message: "Groupe non trouvé" });
      
      const { id_etudiant, nom_groupe } = results[0];
      
      // Notification refus
      db.query("INSERT INTO notifications (id_etudiant, message, type, id_reference) VALUES (?, ?, 'refuse', ?)", 
        [id_etudiant, `❌ Votre groupe "${nom_groupe}" a été refusé.`, req.params.id]
      );
      
      // Supprimer groupe
      db.query("DELETE FROM groupes WHERE id_groupe = ?", [req.params.id], 
        (err) => err ? res.status(500).json({ message: "Erreur" }) : res.json({ message: "Groupe refusé" })
      );
    }
  );
});

// Inscriptions en attente
app.get('/api/admin/pending-registrations', verifyToken, (req, res) => {
  db.query("SELECT id_etudiant AS id, nom, prenom, email, matricule, 'Pending' as status FROM etudiants WHERE statut = 'en_attente'", 
    (err, results) => err ? res.status(500).send(err) : res.json(results)
  );
});

// ==========================================
// 💬 ROUTES MESSAGES & CHAT
// ==========================================

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

// ==========================================
// 🔍 RECHERCHE GLOBALE
// ==========================================

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

// ==========================================
// 📅 AGENDA
// ==========================================

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

// ==========================================
// 🚀 SOCKET.IO (CHAT TEMPS RÉEL)
// ==========================================

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

// ==========================================
// 🎬 DÉMARRAGE SERVEUR
// ==========================================

server.listen(PORT, () => {
  console.log(`✅ Serveur Co'Study démarré sur http://localhost:${PORT}`);
  console.log(`🌐 Frontend attendu sur ${FRONTEND_URL}`);
});