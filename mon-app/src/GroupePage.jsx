import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './GroupePage.css';
import { useTheme } from './ThemeContext';
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000');

const GroupePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useTheme();
  
  const nomClient = localStorage.getItem("userName");
  const userId = localStorage.getItem('userId');

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showModal, setShowModal] = useState(false); // Pour ouvrir la fenêtre
  const [newMemberId, setNewMemberId] = useState(''); // Pour l'input d'ajout
  const [isMuted, setIsMuted] = useState(false);
  const [membres, setMembres] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [groupeNom, setGroupeNom] = useState("Chargement...");
  
  const menuRef = useRef(null);

useEffect(() => {
  // 1. Rejoindre le groupe
  socket.emit('join_group', id);

  // 2. Vérification des droits
  fetch(`http://localhost:5000/api/groupe/${id}`)
    .then(res => res.json())
    .then(data => {
      const estVraimentMembre = data.membres?.some(m => Number(m.id) === Number(userId));
      const estAdmin = Number(data.id_etudiant) === Number(userId);

      if (!estVraimentMembre && !estAdmin) {
        navigate('/home', { replace: true });
        return;
      }

      setGroupeNom(data.nom_groupe || data.nom);
      setIsAdmin(estAdmin);
      setMembres(data.membres || []);
    })
    .catch(() => navigate('/home'));

  // 3. Écouteurs de messages
  socket.on('load_messages', (anciens) => {
    setMessages(anciens.map(m => ({
      id: m.id,
      auteur: m.auteur,
      texte: m.texte,
      est_epinglé: m.est_epinglé,
      heure: m.created_at ? new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '--:--',
    })));
  });

  socket.on('receive_message', (data) => {
    setMessages((prev) => [...prev, data]);
  });

  // NETTOYAGE
  return () => {
    socket.off('receive_message');
    socket.off('load_messages');
  };
}, [id, userId, navigate]);

  socket.on('group_deleted', () => {
    alert("Ce groupe a été supprimé par l'administrateur.");
    window.location.replace("/home");
});
  

  // Fermer le menu au clic extérieur
  useEffect(() => {
    const closeMenu = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);

  const sendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() === '') return;
    const now = new Date();
    const heure = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const messageData = {
      id: Date.now(),
      auteur: nomClient,
      texte: newMessage,
      heure,
      groupId: id,
    };
    
    socket.emit('send_message', messageData);
    setNewMessage('');
  };




  // 1. Fonction pour épingler
const handleEpingler = async (messageId) => {
  try {
    await fetch(`http://localhost:5000/api/messages/${messageId}/epingler`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idUser: userId })
    });
    // Optionnel : recharger les messages ou via socket pour actualiser chez tout le monde
  } catch (err) {
    console.error("Erreur épinglage:", err);
  }
};

// 2. Fonction pour supprimer le groupe
const handleDeleteGroup = async () => {
  if (window.confirm("Es-tu sûre de vouloir supprimer ce groupe ?")) {
    try {
      const response = await fetch(`http://localhost:5000/api/groupe/${id}`, { 
        method: 'DELETE' 
      });

      if (response.ok) {
        // L'admin n'attend pas le socket, il part direct
        navigate('/home', { replace: true });
      }
    } catch (err) {
      alert("Erreur lors de la suppression");
    }
  }
};




// 3. Fonction pour ajouter un membre via la Modal
const handleAddMember = async (idAAjouter) => {
    if (!idAAjouter) return alert("Veuillez saisir un ID");
    try {
        const response = await fetch(`http://localhost:5000/api/groupe/${id}/ajouter`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                idEtudiantAjoute: idAAjouter, 
                idAdmin: userId 
            })
        });
        if (response.ok) {
            alert("Membre ajouté !");
            window.location.reload(); // Recharge pour voir le nouveau membre
        } else {
            alert("Erreur lors de l'ajout");
        }
    } catch (err) {
        console.error("Erreur add member:", err);
    }
};

const handleKick = async (memberId) => {
    if (window.confirm("Voulez-vous vraiment retirer ce membre ?")) {
        try {
            const response = await fetch(`http://localhost:5000/api/groupe/${id}/membres/${memberId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                // MISE À JOUR LOCALE : On retire le membre du tableau pour qu'il disparaisse de la liste
                setMembres(prevMembres => prevMembres.filter(m => m.id !== memberId));
                alert("Membre retiré !");
            } else {
                alert("Erreur lors de la suppression sur le serveur.");
            }
        } catch (err) {
            console.error("Erreur kick:", err);
            alert("Erreur de connexion au serveur.");
        }
    }
};

useEffect(() => {
  if (socket) {
    // Écouteur pour l'expulsion (Kick)
    socket.on('user_kicked', (kickedId) => {
      if (Number(kickedId) === Number(userId)) {
        alert("Votre accès a été révoqué.");
        window.location.replace("/home"); 
      }
    });

    // Écouteur pour la suppression du groupe
    socket.on('group_deleted', () => {
      // TRÈS IMPORTANT : L'admin est déjà parti via handleDeleteGroup
      // Seuls les membres reçoivent l'alerte
      if (!isAdmin) {
        alert("Ce groupe a été supprimé par l'administrateur.");
        navigate('/home', { replace: true });
      }
    });
  }

  return () => {
    socket.off('user_kicked');
    socket.off('group_deleted');
  };
}, [userId, isAdmin, navigate]); // On ajoute isAdmin pour que la condition soit toujours à jour





const unpinMessage = async () => {
    // On trouve le message qui a est_epinglé à 1
    const pinnedMsg = messages.find(m => m.est_epinglé === 1);
    
    if (!pinnedMsg) return;

    try {
        const response = await fetch(`http://localhost:5000/api/messages/${pinnedMsg.id}/epingler`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idUser: userId }) // userId doit être "1" d'après ta console
        });

        if (response.ok) {
            // On met à jour l'état local pour que le bandeau disparaisse
            setMessages(prev => prev.map(m => 
                m.id === pinnedMsg.id ? { ...m, est_epinglé: 0 } : m
            ));
        }
    } catch (err) {
        console.error("Erreur unpin:", err);
    }
};





  return (
    <div className="groupe-page">
      <div className="groupe-header">
        <button className="back-btn" onClick={() => navigate('/home')}>←</button>
        
        <div className="groupe-info">
          <h2>{groupeNom}</h2>
          <span>{membres.length} membres</span>
        </div>

        <div className="header-right" ref={menuRef}>
          <button className="dark-mode-btn" onClick={toggleDarkMode}>
            {darkMode ? '☀️' : '🌙'}
          </button>
          
          <button className="menu-dots" onClick={() => setShowMenu(!showMenu)}>⋮</button>
          
{showMenu && (
  <div className="dropdown-chat-menu">
    {/* --- OPTIONS POUR TOUT LE MONDE --- */}
    <button className="menu-item" onClick={() => setIsMuted(!isMuted)}>
      <span>{isMuted ? '🔔' : '🔕'}</span>
      {isMuted ? 'Activer notifications' : 'Désactiver notifications'}
    </button>
    
    {/* --- OPTION SIGNALER : Uniquement si pas admin --- */}
    {!isAdmin && (
      <button className="menu-item" onClick={() => {/* Logique signalement */}}>
        <span>⚠️</span> Signaler le groupe à l'admin
      </button>
    )}

    {/* --- SECTION ADMINISTRATION : Uniquement pour l'admin --- */}
{isAdmin && (
  <>
    <div className="admin-header">Administration</div>
<button className="menu-item" onClick={() => { setShowModal(true); setShowMenu(false); }}>    
    <span>👥</span> Voir / Gérer les membres ({membres.length})
    </button>
    <button className="menu-item danger-text" onClick={handleDeleteGroup}>
      <span>🗑️</span> Supprimer le groupe
    </button>
  </>
)}

    <hr style={{ border: '0.5px solid rgba(255,255,255,0.1)', margin: '5px 0' }} />

    {/* --- QUITTER : Uniquement pour les membres (pas l'admin) --- */}
    {!isAdmin && (
      <button className="menu-item danger-text" onClick={() => navigate('/home')}>
        <span>🚪</span> Quitter le groupe
      </button>
    )}
  </div>
)}
          
        </div>
      </div>

      <div className="chat-zone">
        {/* Section Message Épinglé */}
{messages.find(m => m.est_epinglé) && (
  <div className="pinned-banner">
    <span>📌 {messages.find(m => m.est_epinglé).texte}</span>
    {isAdmin && <button onClick={unpinMessage}>✕</button>}
  </div>
)}
<div className="messages-list">
  {messages.map(msg => {
    // Sécurité : Si le message n'a pas de texte, on ne l'affiche pas
    if (!msg.texte) return null;

    return (
      <div key={msg.id} className={`message ${msg.auteur === nomClient ? 'mine' : 'theirs'}`}>
        {msg.auteur !== nomClient && <span className="msg-auteur">{msg.auteur}</span>}
        
        <div className="msg-bubble">
          {msg.texte}
          {/* On n'affiche l'épingle que SI le message est vraiment épinglé */}
          {msg.est_epinglé === 1 && <span className="pin-indicator">📌</span>}
          
          {isAdmin && (
            <button className="pin-btn" onClick={() => handleEpingler(msg.id)}>
              📌
            </button>
          )}
        </div>
        
        <span className="msg-heure">{msg.heure}</span>
      </div>
    );
  })}
</div>

        <form className="chat-input" onSubmit={sendMessage}>
          <input
            type="text"
            placeholder="Écrire un message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <button type="submit">Envoyer</button>
        </form>
      </div>



      {showModal && (
  <div className="modal-overlay">
    <div className="modal-content">
      <div className="modal-header">
        <h3>Gestion du groupe</h3>
        <button onClick={() => setShowModal(false)}>✕</button>
      </div>

      <div className="modal-body">
        {/* Section Ajouter */}
        <div className="add-member-section">
          <input type="text" placeholder="Entrez l'ID de l'étudiant..." id="newMemberId" />
          <button onClick={() => handleAddMember(document.getElementById('newMemberId').value)}>
            Ajouter
          </button>
        </div>

        <hr />

{/* Liste des membres avec bouton de suppression */}
<div className="members-list-admin">
  <p>{membres.length} Membres actuels :</p>
  {membres.map(m => (
    <div key={m.id} className="member-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', background: '#36393f', padding: '10px', borderRadius: '5px' }}>
      <span>{m.nom} (ID: {m.id})</span>
      
      {/* On affiche le bouton X pour tout le monde sauf toi (l'admin ID 1) */}
      {Number(m.id) !== Number(userId) ? (
        <button 
          onClick={() => handleKick(m.id)} 
          style={{ color: '#ff4757', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold' }}
        >
          ✕
        </button>
      ) : (
        <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>(Admin)</span>
      )}
    </div>
  ))}
</div>
      </div>
    </div>
  </div>
)}
    </div>
  );
};

export default GroupePage;