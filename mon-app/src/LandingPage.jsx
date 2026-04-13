import React from 'react';
import './LandingPage.css';

const LandingPage = () => {
  // Simulation pour le rendu, à remplacer par tes vraies données plus tard
  const selection = { filiere: "Informatique" }; 

  return (
    
    <div className="landing-wrapper">
      {/* Barre de Navigation style FIED */}
      <nav className="main-nav">
<div className="logo-icon" style={{ 
  background: '#38bdf8', 
  color: 'white', 
  padding: '0.5rem', 
  borderRadius: '0.5rem',
  fontWeight: 'bold'
}}>
  C
</div>
<span className="logo-text">Co'study</span>
        <div className="nav-links">
          <a href="#propos">À propos</a>
          <a href="#activites">Activités</a>
          <a href="#ressources">Ressources</a>
        </div>
        <button className="auth-btn">Espace Étudiant</button>
      </nav>

      {/* Hero Section style DisasterReady */}
      <header className="hero-section">
        <div className="hero-overlay">
          <h1>Développez vos compétences avec Flow</h1>
          <p className="description">
            La plateforme d'entraide pour les étudiants en <span>{selection.filiere}</span> de l'Université d'Oran. 
            Partagez, révisez et réussissez ensemble.
          </p>
          <button className="cta-orange">Créer mon compte gratuit</button>
        </div>
      </header>

      {/* Section À Propos (Nouveau) */}
      <section id="propos" className="about-section">
        <h2>À propos de Flow</h2>
        <p>
          Flow est né de la volonté de faciliter la collaboration entre étudiants. 
          Que ce soit pour le partage de documents ou la gestion de groupes d'étude, 
          tout est centralisé pour votre réussite.
        </p>
      </section>



      
      {/* Section Activités (Nouveau) */}
      <section id="activites" className="about-section">
        <h2>Activités</h2>
        <p>
          Flow est né de la volonté de faciliter la collaboration entre étudiants. 
          Que ce soit pour le partage de documents ou la gestion de groupes d'étude, 
          tout est centralisé pour votre réussite.
        </p>
      </section>

      {/* Section Étapes style "Post-it" */}
      <section className="steps-container">
        <h2>Commencer, c'est facile comme 1, 2, 3 !</h2>
        <div className="steps-grid">
          <div className="step-card card-blue">
            <span className="step-number">Étape 1</span>
            <h3>Connexion</h3>
            <p>Créez votre compte en quelques secondes.</p>
          </div>
          <div className="step-card card-yellow">
            <span className="step-number">Étape 2</span>
            <h3>Rejoignez des groupes</h3>
            <p>Trouvez votre filière et vos camarades.</p>
          </div>
          <div className="step-card card-green">
            <span className="step-number">Étape 3</span>
            <h3>Révisez !</h3>
            <p>Accédez aux ressources et progressez.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="main-footer">
        <div className="footer-content">
          <p>© 2026 Flow - Université d'Oran 1</p>
          <div className="footer-links">
            <span>Contact Admin</span> | <span>Aide</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;