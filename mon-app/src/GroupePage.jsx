import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './GroupePage.css';
import { io } from 'socket.io-client';

// Initialisation de Socket.io (une seule fois, hors du composant)
const socket = io('http://localhost:5000');

const GroupePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Récupération sécurisée des infos utilisateur
  const nomClient = localStorage.getItem("userName");
  
  const getUserId = useCallback(() => {
    let uid = localStorage.getItem('userId');
    if (!uid) {
      try {
        const user = JSON.parse(localStorage.getItem('user'));
        uid = user?.id_etudiant || user?.id;
      } catch (e) {
        try {
          const token = localStorage.getItem('token');
          if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            uid = payload.id || payload.userId || payload.id_etudiant;
          }
        } catch (err) { console.warn("Token decode error:", err); }
      }
    }
    return uid;
  }, []);
  
  const userId = getUserId();

  // États
  const [groupe, setGroupe] = useState(null);
  const [membres, setMembres] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [estMembre, setEstMembre] = useState(false);
  const [estCreateur, setEstCreateur] = useState(false);
  
  const [showMenu, setShowMenu] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newMemberId, setNewMemberId] = useState('');
  const [isMuted, setIsMuted] = useState(false);

  const [seances, setSeances] = useState([]);
  const [showSeanceModal, setShowSeanceModal] = useState(false);
  const [newSeance, setNewSeance] = useState({ titre: '', description: '', date_seance: '', lieu: '' });
  
  const menuRef = useRef(null);
  const messagesEndRef = useRef(null); // ✅ Pour l'auto-scroll

  // ==========================================
  // HANDLERS SOCKET
  // ==========================================
  const onLoadMessages = useCallback((anciens) => {
    setMessages(anciens.map(m => ({
      ...m,
      heure: m.created_at ? new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '--:--'
    })));
  }, []);

  const onReceiveMessage = useCallback((data) => {
    setMessages(prev => {
      if (prev.some(m => m.id === data.id)) return prev;
      return [...prev, {
        ...data,
        heure: new Date(data.created_at || Date.now()).toLocaleTimeString('fr-FR', { 
          hour: '2-digit', minute: '2-digit' 
        })
      }];
    });
  }, []);

  const onGroupDeleted = useCallback(() => {
    alert("Ce groupe a été supprimé par l'administrateur.");
    navigate('/home', { replace: true });
  }, [navigate]);

  const onUserKicked = useCallback((kickedId) => {
    if (Number(kickedId) === Number(userId)) {
      alert("Votre accès a été révoqué par l'administrateur.");
      navigate('/home', { replace: true });
    }
  }, [userId, navigate]);

  // Scroll automatique vers le bas
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // ==========================================
  // CHARGEMENT INITIAL + SOCKET
  // ==========================================
  useEffect(() => {
    if (!id || !userId) {
      navigate('/home');
      return;
    }

    console.log("📥 GroupePage chargé - Groupe ID:", id, "User ID:", userId);

    socket.emit('join_group', id);
    chargerGroupe();
    chargerSeances();

    socket.on('load_messages', onLoadMessages);
    socket.on('receive_message', onReceiveMessage);
    socket.on('group_deleted', onGroupDeleted);
    socket.on('user_kicked', onUserKicked);

    return () => {
      socket.off('load_messages');
      socket.off('receive_message');
      socket.off('group_deleted');
      socket.off('user_kicked');
    };
  }, [id, userId, navigate, onLoadMessages, onReceiveMessage, onGroupDeleted, onUserKicked]);

  // Fermer le menu au clic extérieur
  useEffect(() => {
    const closeMenu = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);

  // Auto-scroll quand les messages changent
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ==========================================
  // FONCTIONS DE CHARGEMENT
  // ==========================================
  const chargerGroupe = useCallback(async () => {
    if (!id) return;
    
    try {
      console.log("🔄 Chargement du groupe:", id);
      const response = await fetch(`http://localhost:5000/api/groupe/${id}`);
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.message || "Erreur chargement");
      
      console.log("📦 Données reçues:", data);
      setGroupe(data);
      setMembres(data.membres || []);
      
      if (userId) {
        const estLeCreateur = Number(data.id_etudiant) === Number(userId);
        const estLeMembre = data.membres?.some(m => Number(m.id) === Number(userId));
        
        setEstCreateur(estLeCreateur);
        setEstMembre(estLeMembre || estLeCreateur);
        
        if (!estLeMembre && !estLeCreateur) {
          console.log("🚫 Accès refusé, redirection");
          navigate('/home', { replace: true });
          return;
        }
      }
    } catch (err) {
      console.error("❌ Erreur chargement groupe:", err);
      navigate('/home');
    } finally {
      setLoading(false);
    }
  }, [id, userId, navigate]);

  const chargerMessages = useCallback(async () => {
    if (!id) return;
    try {
      if (messages.length > 0) return;
      const response = await fetch(`http://localhost:5000/api/messages/${id}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.map(m => ({
          ...m,
          heure: m.created_at ? new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '--:--'
        })));
      }
    } catch (err) {
      console.error("⚠️ Erreur chargement messages (fallback):", err);
    }
  }, [id, messages.length]);

  const chargerSeances = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`http://localhost:5000/api/groupes/${id}/seances`);
      const data = await res.json();
      setSeances(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ Erreur chargement séances:", err);
    }
  }, [id]);

  // ==========================================
  // ACTIONS MESSAGES
  // ==========================================
  const envoyerMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !userId) return;

    const messageData = {
      auteur: nomClient || 'Anonyme',
      texte: newMessage,
      groupId: id,
      created_at: new Date()
    };

    socket.emit('send_message', messageData);
    setNewMessage('');
  };

  const handleEpingler = async (messageId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/messages/${messageId}/epingler`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idUser: userId })
      });
      
      if (response.ok) {
        setMessages(prev => prev.map(m => 
          m.id === messageId ? { ...m, est_epinglé: m.est_epinglé ? 0 : 1 } : m
        ));
        socket.emit('message_pinned_updated', { messageId, groupId: id });
      }
    } catch (err) {
      console.error("❌ Erreur épinglage:", err);
      alert("Erreur lors de l'épinglage");
    }
  };

  const unpinMessage = async () => {
    const pinnedMsg = messages.find(m => m.est_epinglé);
    if (!pinnedMsg) return;
    await handleEpingler(pinnedMsg.id);
  };

  // ==========================================
  // ACTIONS ADMIN / GROUPE
  // ==========================================
  const handleDeleteGroup = async () => {
    if (!window.confirm("⚠️ Es-tu sûr de vouloir SUPPRIMER ce groupe définitivement ?")) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/groupe/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        socket.emit('group_deleted', id);
        navigate('/home', { replace: true });
      } else {
        alert("Erreur lors de la suppression");
      }
    } catch (err) {
      console.error("❌ Erreur suppression:", err);
      alert("Erreur de connexion");
    }
  };

  const handleAddMember = async () => {
    if (!newMemberId.trim()) return alert("Veuillez saisir un ID d'étudiant");
    
    try {
      const response = await fetch(`http://localhost:5000/api/groupe/${id}/membres`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idEtudiantAjoute: newMemberId, idAdmin: userId })
      });
      
      if (response.ok) {
        alert("✅ Membre ajouté !");
        setNewMemberId('');
        chargerGroupe();
      } else {
        const data = await response.json();
        alert("Erreur: " + (data.message || "Impossible d'ajouter ce membre"));
      }
    } catch (err) {
      console.error("❌ Erreur ajout membre:", err);
      alert("Erreur de connexion");
    }
  };

  const handleKick = async (memberId) => {
    if (Number(memberId) === Number(userId)) {
      return alert("Tu ne peux pas te retirer toi-même !");
    }
    
    if (!window.confirm(`Retirer définitivement ce membre du groupe ?`)) return;
    
    try {
      const response = await fetch(`http://localhost:5000/api/groupe/${id}/membres/${memberId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setMembres(prev => prev.filter(m => Number(m.id) !== Number(memberId)));
        socket.emit('user_kicked', { groupId: id, kickedId: memberId });
        alert("✅ Membre retiré");
      } else {
        alert("Erreur lors du retrait");
      }
    } catch (err) {
      console.error("❌ Erreur kick:", err);
      alert("Erreur de connexion");
    }
  };

  const rejoindreGroupe = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/demande-adhesion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id_groupe: id, id_etudiant: userId })
      });
      
      const data = await response.json();
      alert(data.message);
      
      if (data.est_createur || response.ok) {
        chargerGroupe();
      }
    } catch (err) {
      console.error("❌ Erreur demande adhésion:", err);
      alert("Erreur lors de la demande");
    }
  };

  const annoncerSeance = async (e) => {
    e.preventDefault();
    if (!newSeance.titre || !newSeance.date_seance) {
      alert("Titre et date sont obligatoires !");
      return;
    }
    
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:5000/api/groupes/${id}/seances`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newSeance)
      });
      
      if (res.ok) {
        alert("✅ Séance annoncée ! Tous les membres ont été notifiés.");
        setShowSeanceModal(false);
        setNewSeance({ titre: '', description: '', date_seance: '', lieu: '' });
        chargerSeances();
      } else {
        const data = await res.json();
        alert("Erreur: " + data.message);
      }
    } catch (err) {
      alert("Erreur de connexion");
    }
  };

  // ==========================================
  // AFFICHAGE
  // ==========================================
  if (loading) {
    return (
      <div className="groupe-page-loading">
        <div className="spinner"></div>
        <p>Chargement du groupe...</p>
      </div>
    );
  }

  if (!groupe) {
    return (
      <div className="groupe-page-error">
        <h2>❌ Groupe non trouvé</h2>
        <button onClick={() => navigate('/home')}>← Retour à l'accueil</button>
      </div>
    );
  }

  const pinnedMessage = messages.find(m => m.est_epinglé);

  return (
    <div className={`groupe-page ${darkMode ? 'dark' : ''}`}>
      
      {/* HEADER */}
      <header className="groupe-header">
        <button className="back-btn" onClick={() => navigate('/home')}>←</button>
        
        <div className="groupe-info">
          <h2>{groupe.nom_groupe}</h2>
          <span>{membres.length} membre{membres.length > 1 ? 's' : ''}</span>
        </div>

        <div className="header-right" ref={menuRef}>
          
          <button className="menu-dots" onClick={() => setShowMenu(!showMenu)}>⋮</button>
          
          {showMenu && (
            <div className="dropdown-chat-menu">
              <button className="menu-item" onClick={() => setIsMuted(!isMuted)}>
                <span>{isMuted ? '🔔' : '🔕'}</span>
                {isMuted ? 'Activer les notifications' : 'Désactiver les notifications'}
              </button>
              
              {!estCreateur && (
                <button className="menu-item" onClick={() => alert("Fonctionnalité à venir !")}>
                  <span>⚠️</span> Signaler le groupe
                </button>
              )}

              {estCreateur && (
                <>
                  <div className="admin-divider">⚙️ Administration</div>
                  <button className="menu-item" onClick={() => { setShowSeanceModal(true); setShowMenu(false); }}>
                    <span>📅</span> Annoncer une séance
                  </button>
                  <button className="menu-item" onClick={() => { setShowModal(true); setShowMenu(false); }}>
                    <span>👥</span> Gérer les membres ({membres.length})
                  </button>
                  <button className="menu-item danger" onClick={handleDeleteGroup}>
                    <span>🗑️</span> Supprimer le groupe
                  </button>
                </>
              )}

              <hr className="menu-separator" />

              {!estCreateur && (
                <button className="menu-item danger" onClick={() => navigate('/home')}>
                  <span>🚪</span> Quitter le groupe
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* BANDEAU MESSAGE ÉPINGLÉ */}
      {pinnedMessage && (
        <div className="pinned-banner">
          <span>📌 <strong>{pinnedMessage.auteur}:</strong> {pinnedMessage.texte}</span>
          {estCreateur && (
            <button className="unpin-btn" onClick={unpinMessage} title="Retirer l'épingle">✕</button>
          )}
        </div>
      )}

      {/* CONTENU PRINCIPAL */}
      <div className="groupe-content">
        
        {/* SIDEBAR - MEMBRES */}
        <aside className="groupe-sidebar">
          <div className="sidebar-header">
            <h3>👥 Membres</h3>
            {estCreateur && (
              <button className="btn-add-member" onClick={() => setShowModal(true)} title="Ajouter un membre">
                ➕
              </button>
            )}
          </div>
          
          <ul className="membres-list">
            {membres.map((membre, index) => (
              <li key={index} className="membre-item">
                <div className="membre-avatar">
                  {(membre.nom || '?').charAt(0).toUpperCase()}
                </div>
                <div className="membre-info">
                  <span className="membre-nom">{membre.nom || 'Membre'}</span>
                  {Number(groupe.id_etudiant) === Number(membre.id) && (
                    <span className="membre-role admin">👑 Admin</span>
                  )}
                </div>
                {estCreateur && Number(membre.id) !== Number(userId) && (
                  <button className="kick-btn" onClick={() => handleKick(membre.id)} title="Retirer">✕</button>
                )}
              </li>
            ))}
          </ul>

          {!estMembre && !estCreateur && (
            <button className="btn-rejoindre" onClick={rejoindreGroupe}>
              ✅ Rejoindre le groupe
            </button>
          )}
        </aside>

        {/* ZONE DE CHAT */}
        <main className="groupe-chat">
          {(estMembre || estCreateur) ? (
            <>
              {/* BANDEAU SÉANCES À VENIR */}
              {seances.filter(s => new Date(s.date_seance) > new Date()).length > 0 && (
                <div className="seances-banner">
                  <h4>📅 Séances à venir</h4>
                  <div className="seances-list">
                    {seances.filter(s => new Date(s.date_seance) > new Date()).slice(0, 2).map(seance => (
                      <div key={seance.id_seance} className="seance-item">
                        <strong>{seance.titre}</strong>
                        <span>{new Date(seance.date_seance).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit' })}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="messages-container">
                {messages.length === 0 ? (
                  <div className="no-messages">
                    <p>💬 Aucun message pour le moment</p>
                    <p>Soyez le premier à écrire !</p>
                  </div>
                ) : (
                  messages.map((msg, index) => (
                    <div 
                      key={msg.id || index} 
                      className={`message ${msg.auteur === nomClient ? 'mine' : 'theirs'} ${msg.est_epinglé ? 'pinned' : ''}`}
                    >
                      {msg.auteur !== nomClient && (
                        <span className="msg-auteur">{msg.auteur}</span>
                      )}
                      
                      <div className="msg-bubble">
                        {msg.texte}
                        {msg.est_epinglé && <span className="pin-badge">📌</span>}
                        
                        {estCreateur && (
                          <button 
                            className="pin-btn" 
                            onClick={() => handleEpingler(msg.id)}
                            title={msg.est_epinglé ? "Retirer l'épingle" : "Épingler ce message"}
                          >
                            {msg.est_epinglé ? '📍' : '📌'}
                          </button>
                        )}
                      </div>
                      
                      <span className="msg-heure">{msg.heure}</span>
                    </div>
                  ))
                )}
                {/* ✅ Élément invisible pour l'auto-scroll */}
                <div ref={messagesEndRef} />
              </div>

              <form className="chat-input" onSubmit={envoyerMessage}>
                <input
                  type="text"
                  placeholder="Écrire un message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={!estMembre && !estCreateur}
                />
                <button type="submit" disabled={!newMessage.trim()}>
                  ➤
                </button>
              </form>
            </>
          ) : (
            <div className="not-member-message">
              <h3>🔒 Groupe privé</h3>
              <p>Vous devez rejoindre ce groupe pour voir et envoyer des messages.</p>
              <button className="btn-rejoindre" onClick={rejoindreGroupe}>
                ✅ Rejoindre le groupe
              </button>
            </div>
          )}
        </main>
      </div>

      {/* MODAL GESTION MEMBRES */}
      {showModal && estCreateur && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>👥 Gérer les membres</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="add-member-section">
                <label>Ajouter un étudiant par ID :</label>
                <div className="add-member-input">
                  <input 
                    type="text" 
                    placeholder="Ex: 5" 
                    value={newMemberId}
                    onChange={(e) => setNewMemberId(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddMember()}
                  />
                  <button onClick={handleAddMember}>Ajouter</button>
                </div>
                <small className="help-text">💡 L'ID se trouve dans la liste des membres ci-dessous</small>
              </div>

              <hr />

              <div className="members-list-admin">
                <p><strong>{membres.length}</strong> membre{membres.length > 1 ? 's' : ''} dans ce groupe :</p>
                
                {membres.map(m => (
                  <div key={m.id} className="member-row">
                    <div className="member-info">
                      <span className="member-name">{m.nom || 'Inconnu'}</span>
                      <span className="member-id">ID: {m.id}</span>
                      {Number(groupe.id_etudiant) === Number(m.id) && (
                        <span className="member-badge admin">👑 Créateur</span>
                      )}
                    </div>
                    
                    {Number(m.id) !== Number(userId) && (
                      <button 
                        className="kick-btn-modal" 
                        onClick={() => handleKick(m.id)}
                        title="Retirer du groupe"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ANNONCER UNE SÉANCE */}
      {showSeanceModal && estCreateur && (
        <div className="modal-overlay" onClick={() => setShowSeanceModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📅 Annoncer une séance de révision</h3>
              <button className="modal-close" onClick={() => setShowSeanceModal(false)}>✕</button>
            </div>
            <form className="modal-body" onSubmit={annoncerSeance}>
              <div className="form-group">
                <label>Titre *</label>
                <input 
                  type="text" 
                  value={newSeance.titre}
                  onChange={(e) => setNewSeance({...newSeance, titre: e.target.value})}
                  placeholder="Ex: Révision Partiel Algo"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea 
                  value={newSeance.description}
                  onChange={(e) => setNewSeance({...newSeance, description: e.target.value})}
                  placeholder="Chapitres concernés, exercices à préparer..."
                  rows="3"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Date et heure *</label>
                  <input 
                    type="datetime-local" 
                    value={newSeance.date_seance}
                    onChange={(e) => setNewSeance({...newSeance, date_seance: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Lieu</label>
                  <input 
                    type="text" 
                    value={newSeance.lieu}
                    onChange={(e) => setNewSeance({...newSeance, lieu: e.target.value})}
                    placeholder="Ex: Bibliothèque, Salle A12..."
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowSeanceModal(false)}>Annuler</button>
                <button type="submit" className="btn-confirm">📢 Annoncer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupePage;