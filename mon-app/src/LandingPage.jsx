import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './LandingPage.css';
import Footer from './footer';

gsap.registerPlugin(ScrollTrigger);

const QUOTES = [
  { text: "Seul on va plus vite, ensemble on va plus loin.", author: "Proverbe africain" },
  { text: "Le savoir est la seule richesse qui se multiplie quand on la partage.", author: "Proverbe arabe" },
  { text: "L'éducation est l'arme la plus puissante pour changer le monde.", author: "Nelson Mandela" },
  { text: "Partager son savoir, c'est éclairer le chemin des autres.", author: "Confucius" },
  { text: "L'entraide est la clé de la réussite collective.", author: "Pierre Kropotkine" },
  { text: "Celui qui apprend et partage, grandit deux fois.", author: "Sénèque" },
  { text: "La connaissance partagée est la seule qui demeure.", author: "Socrate" },
  { text: "Ensemble, nous sommes plus forts que la somme de nos forces.", author: "Saint-Exupéry" },
  { text: "Apprendre aux autres, c'est apprendre deux fois.", author: "Joseph Joubert" },
  { text: "Le partage du savoir est le fondement de toute société prospère.", author: "Albert Einstein" }
];

const LandingPage = () => {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const visualRef = useRef(null); // ✅ RÉAJOUTÉ
  const textRef = useRef(null);
  const progressBarRef = useRef(null);
  const aboutRef = useRef(null);
  const stepsRef = useRef(null);
  const statsRef = useRef(null);
  const quoteRef = useRef(null);

  const [quote, setQuote] = useState(QUOTES[0]);
  
  useEffect(() => {
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  }, []);

  const goToAuth = () => navigate('/login');

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();
      
      // ✅ ANIMATION FLÈCHE (glissement depuis la gauche)
      gsap.set(visualRef.current, { x: -300, opacity: 0 });
      
      // ✅ ANIMATION TEXTE (glissement vers le haut)
      gsap.set(textRef.current, { y: 50, opacity: 0 });

      tl.to(visualRef.current, { 
        x: 0, 
        opacity: 1, 
        duration: 1.2, 
        ease: 'power4.out', 
        delay: 0.3 
      })
        .to(textRef.current, { 
          y: 0, 
          opacity: 1, 
          duration: 0.8 
        }, '-=0.6');

      gsap.to(progressBarRef.current, { 
        width: '100%', 
        ease: 'none', 
        scrollTrigger: { trigger: 'body', start: 'top top', end: 'bottom bottom', scrub: true } 
      });

      gsap.fromTo(aboutRef.current, 
        { y: 50, opacity: 0 },
        { 
          y: 0, 
          opacity: 1, 
          duration: 0.8, 
          scrollTrigger: { trigger: aboutRef.current, start: "top 85%", toggleActions: "play none none reverse" } 
        }
      );

      document.querySelectorAll('.stat-number').forEach(stat => {
        const target = parseInt(stat.getAttribute('data-target'));
        gsap.fromTo(stat, { innerText: 0 }, { 
          innerText: target, 
          duration: 4, 
          ease: 'power2.out', 
          snap: { innerText: 1 },
          scrollTrigger: { trigger: stat, start: 'top 80%' },
          onUpdate: function() { 
            stat.innerText = Math.ceil(this.targets()[0].innerText).toLocaleString(); 
          }
        });
      });

      gsap.fromTo(".stat-card", 
        { y: 40, opacity: 0 },
        { 
          y: 0, 
          opacity: 1, 
          stagger: 0.2, 
          duration: 0.7, 
          ease: 'power3.out', 
          scrollTrigger: { trigger: statsRef.current, start: "top 75%" } 
        }
      );

      gsap.fromTo(".step-card", 
        { y: 50, opacity: 0 },
        { 
          y: 0, 
          opacity: 1, 
          stagger: 0.2, 
          duration: 0.8, 
          ease: 'power3.out', 
          scrollTrigger: { trigger: stepsRef.current, start: "top 80%" } 
        }
      );

      gsap.fromTo(quoteRef.current, 
        { y: 30, opacity: 0 },
        { 
          y: 0, 
          opacity: 1, 
          duration: 1, 
          delay: 0.3, 
          scrollTrigger: { trigger: quoteRef.current, start: "top 85%" } 
        }
      );
    }, heroRef);
    return () => ctx.revert();
  }, []);

  return (
    <div className="landing-wrapper" ref={heroRef}>
      <div className="scroll-progress-container">
        <div className="scroll-progress-bar" ref={progressBarRef}></div>
      </div>

      <nav className="modern-nav">
        <div className="logo-section">
          <span className="logo-text">Co'study</span>
        </div>
        <div className="nav-links">
          <NavLink to="/">Accueil</NavLink>
          <a href="#propos">À propos</a>
          <a href="#activites">Activités</a>
          <a href="#contact">Contact</a>
        </div>
        <button className="btn-primary" onClick={goToAuth}>Espace Étudiant</button>
      </nav>

      <main className="hero-modern">
        <div className="hero-content">
          {/* ✅ FLÈCHE AVEC ANIMATION */}
          <div className="visual-column" ref={visualRef}>
            <div className="arrow-shape">
              <div className="logo-placeholder">C</div>
            </div>
          </div>
          <div className="text-column" ref={textRef}>
            <h1 className="main-title">Le Monde de <br /><span>Co'study.</span></h1>
            <p className="hero-description">
              La plateforme d'entraide pour les étudiants de l'Université d'Oran 1.
            </p>
            <button className="btn-primary" onClick={goToAuth}>Créer mon compte</button>
          </div>
        </div>
      </main>

      <section className="stats-section" ref={statsRef}>
        <div className="stat-card">
          <div className="stat-number" data-target="1247"></div>
          <div className="stat-label">Étudiants inscrits</div>
        </div>
        <div className="stat-divider"></div>
        <div className="stat-card">
          <div className="stat-number" data-target="3856"></div>
          <div className="stat-label">Documents partagés</div>
        </div>
        <div className="stat-divider"></div>
        <div className="stat-card">
          <div className="stat-number" data-target="142"></div>
          <div className="stat-label">Groupes actifs</div>
        </div>
      </section>

      <section className="about-modern-section" id="propos" ref={aboutRef}>
        <div className="about-frame">
          <div className="dot dot-top"></div>
          <div className="dot dot-bottom"></div>
          <div className="frame-content">
            <h2 className="frame-title">Collaboration <span>et Entraide</span></h2>
            <p className="frame-description">
              Co'Study est un espace collaboratif conçu par et pour les étudiants de l'Université d'Oran 1.
            </p>
            <p className="frame-description">
              Partagez vos cours, rejoignez des groupes et bénéficiez du soutien de toute la communauté.
            </p>
            <button className="btn-primary" onClick={goToAuth}>Rejoindre la communauté</button>
          </div>
        </div>
      </section>

      <section className="image-banner-section" id="universite">
        <div className="image-overlay"></div>
        <div className="banner-text">
          <h2>L'Université d'Oran 1</h2>
          <p>Excellence académique & esprit communautaire</p>
        </div>
      </section>

      <section className="steps-container" ref={stepsRef} id="activites">
        <h2>Commencer, c'est facile</h2>
        <div className="steps-grid">
          <div className="step-card card-blue">
            <span className="step-number">01</span>
            <h3>Créez votre compte</h3>
            <p>Inscrivez-vous en quelques secondes avec votre adresse universitaire.</p>
          </div>
          <div className="step-card card-yellow">
            <span className="step-number">02</span>
            <h3>Rejoignez un groupe</h3>
            <p>Trouvez votre filière et connectez-vous avec vos camarades.</p>
          </div>
          <div className="step-card card-green">
            <span className="step-number">03</span>
            <h3>Partagez et apprenez</h3>
            <p>Accédez aux ressources et progressez ensemble.</p>
          </div>
        </div>
        <div className="steps-action">
          <button className="btn-primary big-cta" onClick={goToAuth}>
            C'est parti, je crée mon compte
          </button>
          <p className="sub-text">Rejoignez les étudiants de l'Université d'Oran 1</p>
        </div>
      </section>

      <section className="quote-section" ref={quoteRef}>
        <div className="quote-content">
          <div className="quote-icon">"</div>
          <p className="quote-text">{quote.text}</p>
          <p className="quote-author">— {quote.author}</p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LandingPage;