import React, { useState } from 'react';
import './agenda.css';

const Agenda = ({ closeModal }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState([
    { id: 1, title: 'Examen Sécurité', date: '2026-04-20', time: '09:00', category: 'exam' },
    { id: 2, title: 'Réunion PFE', date: '2026-04-15', time: '14:30', category: 'work' }
  ]);
  const [newEvent, setNewEvent] = useState({ title: '', time: '', category: 'work' });

  // Simulation des jours du mois d'Avril 2026
  const days = Array.from({ length: 30 }, (_, i) => i + 1);

const handleAddEvent = (e) => {
  e.preventDefault();
  if (!newEvent.title) return;

  // On construit la chaîne YYYY-MM-DD manuellement pour éviter le décalage UTC
  const year = selectedDate.getFullYear();
  const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
  const day = String(selectedDate.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  setEvents([...events, { 
    ...newEvent, 
    id: Date.now(), 
    date: dateStr 
  }]);
  
  setNewEvent({ title: '', time: '', category: 'work' });
};


const handleDeleteEvent = (id) => {
  // On filtre la liste pour ne garder que les événements 
  // dont l'ID est différent de celui qu'on veut supprimer
  setEvents(events.filter(event => event.id !== id));
};



  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="agenda-container" onClick={(e) => e.stopPropagation()}>
        <button className="close-icon" onClick={closeModal}>✕</button>

        {/* COLONNE GAUCHE : Calendrier */}
        <aside className="calendar-sidebar">
          <div className="calendar-nav">
            <h4>Avril 2026</h4>
            <div className="nav-arrows"><span>‹</span><span>›</span></div>
          </div>
          <div className="weekdays-grid">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => <span key={d}>{d}</span>)}
          </div>
          <div className="days-grid">
            {days.map(day => (
              <div 
                key={day} 
                className={`day-cell ${day === 15 ? 'today' : ''} ${day === selectedDate.getDate() ? 'selected' : ''}`}
                onClick={() => setSelectedDate(new Date(2026, 3, day))}
              >
                {day}
                {events.some(e => parseInt(e.date.split('-')[2]) === day) && <span className="event-dot"></span>}
              </div>
            ))}
          </div>
        </aside>

        {/* COLONNE DROITE : Tâches */}
        <main className="events-panel">
          <header className="panel-header">
            <h3>{selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
            <p>{events.filter(e => parseInt(e.date.split('-')[2]) === selectedDate.getDate()).length} Événements</p>
          </header>

          <form className="quick-add-form" onSubmit={handleAddEvent}>
            <input 
              type="text" 
              placeholder="Nouvelle tâche..." 
              value={newEvent.title}
              onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
            />
            <input 
              type="time" 
              value={newEvent.time}
              onChange={(e) => setNewEvent({...newEvent, time: e.target.value})}
            />
            <button type="submit">+</button>
          </form>

  <div className="events-scroll-list">
  {events
    .filter(e => {
      // On s'assure de comparer les dates correctement
      const eventDate = new Date(e.date);
      return eventDate.getDate() === selectedDate.getDate() &&
             eventDate.getMonth() === selectedDate.getMonth();
    })
    .map(event => (
      <div key={event.id} className={`event-item ${event.category}`}>
        <div className="event-time">{event.time || "--:--"}</div>
        <div className="event-title">{event.title}</div>
        
        {/* BOUTON SUPPRIMER */}
        <button 
          className="btn-delete-event" 
          onClick={() => handleDeleteEvent(event.id)}
          title="Supprimer l'événement"
        >
          🗑️
        </button>
      </div>
    ))}
</div>
        </main>
      </div>
    </div>
  );
};

export default Agenda;