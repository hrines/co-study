import React, { useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap'; // Import manquant ajouté
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './LandingPage.css';

gsap.registerPlugin(ScrollTrigger);

const LandingPage = () => {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const visualRef = useRef(null);
  const textRef = useRef(null);
  const progressBarRef = useRef(null);
  const aboutRef = useRef(null);
  const stepsRef = useRef(null); 

  const goToAuth = () => {
    navigate('/login'); 
  };

  useEffect(() => {
    const ctx = gsap.context(() => {
      // 1. Animation Hero
      const tl = gsap.timeline();
      gsap.set(visualRef.current, { x: -300, opacity: 0 });
      gsap.set(textRef.current, { y: 50, opacity: 0 });

      tl.to(visualRef.current, { x: 0, opacity: 1, duration: 1.2, ease: 'power4.out', delay: 0.3 })
        .to(textRef.current, { y: 0, opacity: 1, duration: 0.8 }, '-=0.6');

      // 2. Barre de progression
      gsap.to(progressBarRef.current, {
        width: '100%',
        ease: 'none',
        scrollTrigger: { trigger: 'body', start: 'top top', end: 'bottom bottom', scrub: true }
      });

      // 3. Animation Section À propos
      gsap.fromTo(aboutRef.current, 
        { y: 50, opacity: 0 },
        { 
          y: 0, 
          opacity: 1, 
          scrollTrigger: { 
            trigger: aboutRef.current, 
            start: "top 85%", 
            toggleActions: "play none none reverse" 
          } 
        }
      );

      // 4. Animation des Post-it (Apparition un par un)
      gsap.fromTo(".step-card", 
        { y: 50, opacity: 0, rotate: -5 },
        { 
          y: 0, 
          opacity: 1, 
          rotate: 0, 
          stagger: 0.2, 
          duration: 0.8,
          scrollTrigger: {
            trigger: stepsRef.current, // Utilisation de la ref ici
            start: "top 80%",
          }
        }
      );
    }, heroRef);
    return () => ctx.revert();
  }, []);

  return (
    <div className="landing-wrapper-v2" ref={heroRef}>
      <div className="scroll-progress-container">
        <div className="scroll-progress-bar" ref={progressBarRef}></div>
      </div>

      <nav className="modern-nav">
        <div className="logo-section"><span className="logo-text">Co'study</span></div>
        <div className="nav-links">
          <NavLink to="/">Accueil</NavLink>
          <a href="#propos">À propos</a>
          <a href="#activites">Activités</a>
          <a href="#contact">Contact</a>

        </div>
        <button className="auth-btn" onClick={goToAuth}>Espace Étudiant</button>
      </nav>

      <main className="hero-modern">
        <div className="hero-split">
          <div className="visual-column" ref={visualRef}>
            <div className="arrow-shape">
              <div className="logo-placeholder">C</div>
            </div>
          </div>
          <div className="text-column" ref={textRef}>
            <h1 className="main-title">Le Monde de <br /><span>Co'study.</span></h1>
            <p className="hero-description">La plateforme d'entraide pour les étudiants de l'Université d'Oran 1.</p>
            <button className="cta-orange" onClick={goToAuth}>Créer mon compte</button>
          </div>
        </div>
      </main>

      {/* --- SECTION À PROPOS --- */}
      <section className="about-modern-section" id="propos">
        <div className="about-frame" ref={aboutRef}>
          <div className="dot dot-top"></div>
          <div className="dot dot-bottom"></div>
          <div className="frame-content">
            <h2 className="frame-title">Collaboration <span>et Entraide</span></h2>
            <p className="frame-description">Un espace centralisé pour gérer vos documents et vos projets.</p>
          </div>
        </div>
      </section>

      {/* --- SECTION ÉTAPES STYLE POST-IT --- */}
      <section className="steps-container" ref={stepsRef} id="activites">
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

        <div className="steps-action">
          <button className="cta-orange big-cta" onClick={goToAuth}>C'est parti, je crée mon compte !</button>
          <p className="sub-text">Rejoignez les étudiants de l'Université d'Oran 1</p>
        </div>
      </section>

      {/* --- FOOTER MODERNE --- */}
      <footer className="main-footer" id="contact">
        <div className="footer-content">
          <div className="footer-column brand-col">
            <h2 className="logo-text">Co'study</h2>
            <p className="footer-desc">
              La plateforme collaborative dédiée aux étudiants de l'Université d'Oran 1. 
              Simplifiez votre réussite, ensemble.
            </p>
            <div className="social-links">
              <i className="fab fa-facebook"></i>
              <i className="fab fa-twitter"></i>
            </div>
          </div>

          <div className="footer-column">
            <h3>Liens Utiles</h3>
            <ul>
              <li><a href="#">Université Oran 1</a></li>
              <li><a href="#">Bibliothèque Centrale</a></li>
              <li><a href="#">Plateforme EDX</a></li>
              <li><a href="#">Demande Diplôme</a></li>
            </ul>
          </div>

          <div className="footer-column">
            <h3>Contactez-nous</h3>
            <p>Email: admin@costudy.dz</p>
          </div>
        </div>

        <div className="footer-bottom">
          <p>Copyright © 2026 - Développé par une étudiante de L3 Informatique. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;