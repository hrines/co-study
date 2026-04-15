import React, { useEffect, useState } from 'react';
import './NotifModal.css';

const NotifModal = ({ closeModal }) => {
const [notifications, setNotifications] = useState([]);
const user = JSON.parse(localStorage.getItem('user'));
const userId = user ? user.id_etudiant : null;
const token = localStorage.getItem('token');

  // Charger les notifications
useEffect(() => {
        if (!userId || !token) return;

        fetch(`http://localhost:5000/api/notifications/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
            if (Array.isArray(data)) {
                setNotifications(data);
            } else {
                setNotifications([]);
            }
        })
        .catch(err => {
            console.error("Erreur fetch notifications:", err);
            setNotifications([]);
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
        } catch (err) {
            console.error("Erreur toutLire:", err);
        }
    };


// Accepter une demande
const accepter = async (idDemande, idNotif) => {
  try {
    // 1. Appel API pour accepter l'adhésion
    await fetch(`http://localhost:5000/api/demande-adhesion/${idDemande}/accepter`, { method: 'PUT' });
    
    // 2. Appel API pour marquer la notif comme lue en BDD
    await fetch(`http://localhost:5000/api/notifications/${idNotif}/lu`, { method: 'PUT' });
    
    // 3. MISE À JOUR LOCALE : On retire la notification de la liste
    // Au lieu de mettre .map(...), on utilise .filter
    setNotifications(prevNotifs => prevNotifs.filter(n => n.id !== idNotif));
    
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
                <div className="notif-message">{notif.message}</div>
                <div className="notif-date">
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