import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="main-footer" id="contact">
      <div className="footer-content">
        <div className="footer-column brand-col">
          <h2 className="logo-text">Co'study</h2> {/* On garde le nouveau nom Flow */}
          <p className="footer-desc">
            La plateforme collaborative dédiée aux étudiants de l'Université d'Oran 1. 
            Simplifiez votre réussite, ensemble.
          </p>
          <div className="social-links">
            <i className="fab fa-facebook"></i>
            <i className="fab fa-instagram"></i> {/* Instagram est souvent plus utilisé par les étudiants */}
            <i className="fab fa-github"></i>
          </div>
        </div>

        <div className="footer-column">
          <h3>Liens Utiles</h3>
          <ul>
            <li><a href="https://www.univ-oran1.dz/" target="_blank" rel="noreferrer">Université Oran 1</a></li>
            <li><a href="#">Bibliothèque Centrale</a></li>
            <li><a href="https://elearn.univ-oran1.dz/" target="_blank" rel="noreferrer">Plateforme eLearn</a></li>
            <li><a href="#">Demande de documents</a></li>
          </ul>
        </div>

        <div className="footer-column">
          <h3>Contactez-nous</h3>
          <p className="contact-email">Email: <strong>admin@costudy.dz</strong></p>
        </div>
      </div>

      <div className="footer-bottom">
        <p>Copyright © 2026 - Développé par une étudiante de L3 Informatique. Tous droits réservés.</p>
      </div>
    </footer>
  );
};

export default Footer;