import React, { useEffect, useState } from 'react';
import './NotifModal.css';

const NotifModal = ({ closeModal, onNotifsRead }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // ✅ Récupération SÉCURISÉE de userId et token
  const getUserIdAndToken = () => {
    let userId = null;
    let token = localStorage.getItem('token');
    
    // Méthode 1 : via localStorage.getItem('userId')
    userId = localStorage.getItem('userId');
    
    // Méthode 2 : via parsing de l'objet user
    if (!userId) {
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          userId = user?.id_etudiant || user?.id;
        }
      } catch (e) {
        console.warn("⚠️ Impossible de parser user:", e);
      }
    }
    
    // Méthode 3 : via décodage du token JWT
    if (!userId && token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        userId = payload.id || payload.userId || payload.id_etudiant;
      } catch (e) {
        console.warn("⚠️ Impossible de décoder token:", e);
      }
    }
    
    console.log("🔍 NotifModal - userId:", userId, "token:", token ? 'présent' : 'absent');
    return { userId, token };
  };
  
  const { userId, token } = getUserIdAndToken();

  // Charger les notifications
  useEffect(() => {
    console.log("📡 NotifModal useEffect - userId:", userId, "token:", token ? 'OK' : 'MANQUANT');
    
    if (!userId || !token) {
      console.error("❌ Impossible de charger les notifs: userId ou token manquant");
      setLoading(false);
      return;
    }

    fetch(`http://localhost:5000/api/notifications/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(async res => {
      console.log("📦 Réponse serveur - status:", res.status);
      if (!res.ok) {
        const errText = await res.text();
        console.error("❌ Erreur HTTP:", res.status, errText);
        throw new Error(`Erreur ${res.status}: ${errText}`);
      }
      return res.json();
    })
    .then(data => {
      console.log("✅ Notifications reçues:", data?.length || 0, "items");
      if (Array.isArray(data)) {
        setNotifications(data);
      } else {
        console.warn("⚠️ Réponse non-array:", data);
        setNotifications([]);
      }
    })
    .catch(err => {
      console.error("❌ Erreur fetch notifications:", err.message);
      setNotifications([]);
    })
    .finally(() => {
      setLoading(false);
    });
  }, [userId, token]);

// Marquer tout comme lu
  const toutLire = async () => {
    try {
      await fetch(`http://localhost:5000/api/notifications/lire-tout/${userId}`, { 
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications([]);
      if (onNotifsRead) onNotifsRead(); // ✅ Rafraîchir le badge
    } catch (err) {
      console.error("Erreur toutLire:", err);
    }
  };

// Accepter une demande
  const accepter = async (idDemande, idNotif) => {
    try {
      await fetch(`http://localhost:5000/api/demande-adhesion/${idDemande}/accepter`, { method: 'PUT' });
      await fetch(`http://localhost:5000/api/notifications/${idNotif}/lu`, { method: 'PUT' });
      setNotifications(prev => prev.filter(n => n.id !== idNotif));
      if (onNotifsRead) onNotifsRead(); // ✅ Rafraîchir le badge
      alert('Demande acceptée !');
    } catch (err) {
      console.error("Erreur acceptation:", err);
    }
  };


// Refuser une demande
const refuser = async (idDemande, idNotif) => {
  try {
    await fetch(`http://localhost:5000/api/notifications/${idNotif}/lu`, { method: 'PUT' });
    
    // On filtre aussi ici pour la faire disparaître
    setNotifications(prevNotifs => prevNotifs.filter(n => n.id !== idNotif));
    
    alert('Demande refusée.');
  } catch (err) {
    console.error("Erreur refus:", err);
  }
};
  const nonLues = notifications.filter(n => n.lu === 0).length;




const getNotifIcon = (type) => {
  switch(type) {
    case 'adhesion': return '👥';
    case 'accepte': return '✅';
    case 'refuse': return '❌';
    case 'groupe_valide': return '🎉';
    case 'groupe_supprime': return '🗑️'; // ✅ Nouveau
    case 'seance_revision': return '📅'; // ✅ Nouveau
    default: return '🔔';
  }
};

  return (
    <div className="modal-overlay">
      <div className="notif-content">
        <div className="notif-header">
          <h2>🔔 Notifications {nonLues > 0 && <span className="notif-badge">{nonLues}</span>}</h2>
          <div className="notif-header-actions">
            {nonLues > 0 && <button className="btn-tout-lire" onClick={toutLire}>Tout lire</button>}
            <button className="close-x" onClick={closeModal}>✕</button>
          </div>
        </div>

        <div className="notif-list">
          {notifications.length === 0 ? (
            <p className="empty-msg">Aucune notification 🎉</p>
          ) : (
            notifications.map(notif => (
              <div key={notif.id} className={`notif-item ${notif.lu === 0 ? 'non-lue' : ''}`}>
<div className="notif-message">
  <span className="notif-icon">{getNotifIcon(notif.type)}</span>
  <div className="notif-text">
    {notif.message.split('\n')[0]} {/* Première ligne */}
    {notif.message.includes('Motif :') && (
      <div className="notif-motif">
        <strong>Motif :</strong> {notif.message.split('Motif :')[1]}
      </div>
    )}
  </div>
</div>                <div className="notif-date">
                  {new Date(notif.created_at).toLocaleDateString('fr-FR', {
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                  })}
                </div>
                {/* Boutons accepter/refuser uniquement pour les demandes d'adhésion */}
                {notif.type === 'adhesion' && notif.lu === 0 && (
                  <div className="notif-actions">
                    <button className="btn-accepter" onClick={() => accepter(notif.id_reference, notif.id)}>✅ Accepter</button>
                    <button className="btn-refuser" onClick={() => refuser(notif.id_reference, notif.id)}>❌ Refuser</button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NotifModal;