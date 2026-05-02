import axios from 'axios'; 
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Auth.css';
function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();

  // --- États Login ---
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // --- États Signup ---
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [matricule, setMatricule] = useState('');
  const [filiere, setFiliere] = useState('');
  const [cursus, setCursus] = useState('LMD'); // ✅ NOUVEAU : LMD ou Ingénieur
  const [niveau, setNiveau] = useState('');     // ✅ NOUVEAU : Niveau sélectionné
  const [password, setPassword] = useState('');
  const [showSignupPw, setShowSignupPw] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState('');
  const [signupSuccess, setSignupSuccess] = useState('');
  const [loading, setLoading] = useState(false); 

const [questionSecrete, setQuestionSecrete] = useState('');
const [reponseSecrete, setReponseSecrete] = useState('');
const [showReponse, setShowReponse] = useState(false);
const [showQuestion, setShowQuestion] = useState(false); 


// Liste des questions (privée)
const questionsList = [
  "Quel était le nom de votre premier animal de compagnie ?",
  "Quelle est vote auteure préférée ?",
  "Quel était le nom de votre professeur préféré ?",
  "Quel est le modèle de la première voiture de vos parents ?",
  "Quel est le nom de votre livre préféré ?",
  "Quel était le nom de votre meilleur ami en primaire ?",
  "Quelle est votre sportif préféré ?",
  "Quel est le nom de votre école primaire ?",
  "Quel est votre plat préféré ?",
  "Quel est le nom de votre film préféré ?"
];

// Générer une question aléatoire au chargement du composant
useEffect(() => {
  if (!isLogin) {
    const randomIndex = Math.floor(Math.random() * questionsList.length);
    setQuestionSecrete(questionsList[randomIndex]);
  }
}, [isLogin]); // Se déclenche uniquement quand on passe en mode inscription



  // Niveaux disponibles par type de cursus
  const niveaux = {
    LMD: ['L1', 'L2', 'L3', 'M1', 'M2'],
    Ingenieur: ['1ere', '2eme', '3eme', '4eme', '5eme']
  };

  // --- Handlers ---
// Après la réponse réussie de l'API login
const handleLogin = async (e) => {
  e.preventDefault();
  setLoginLoading(true);
  setLoginError('');
  
  try {
    console.log("📤 Tentative de connexion...");
    console.log("Email:", loginEmail);
    console.log("Mot de passe:", loginPassword);
    
    const response = await axios.post('http://localhost:5000/api/login', {
      email: loginEmail,
      mot_de_passe: loginPassword
    });
    
    console.log("✅ Réponse reçue:", response.data);
    
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));

    if (response.data.user.email === 'admin@costudy.dz') {
      console.log("👑 Redirection vers /admin");
      navigate('/admin');
    } else {
      console.log("👤 Redirection vers /home");
      navigate('/home');
    }
    
  } catch (error) {
    console.error("❌ ERREUR LOGIN:", error);
    
    if (error.response) {
      console.error("📄 Status:", error.response.status);
      console.error("📄 Message:", error.response.data);
      alert(error.response.data.message || 'Erreur de connexion');
    } else if (error.request) {
      console.error("📡 Pas de réponse du serveur:", error.request);
      alert("Le serveur ne répond pas. Vérifie qu'il est démarré sur le port 5000.");
    } else {
      alert('Erreur de connexion');
    }
  } finally {
    setLoginLoading(false);
  }
};

  const handleSignup = async (e) => {
    e.preventDefault();
    setSignupLoading(true);
    setSignupError('');
    setSignupSuccess('');
    
    if (!niveau) {
      setSignupError('Veuillez sélectionner votre niveau d\'étude.');
      setSignupLoading(false);
      return;
    }
    
    try {
      const response = await fetch('http://localhost:5000/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          nom: name,
          prenom: firstName,
          matricule,
          filiere,
          cursus,      // ✅ Envoyer le type de cursus
          niveau,      // ✅ Envoyer le niveau
          mot_de_passe: password,
          question_secrete: questionSecrete, 
          reponse_secrete: reponseSecrete,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSignupSuccess('Compte créé avec succès ! Connecte-toi.');
        setTimeout(() => setIsLogin(true), 1800);
      } else {
        setSignupError(data.message || "Erreur lors de l'inscription.");
      }
    } catch (err) {
      console.error(err);
      setSignupError('Le serveur ne répond pas.');
    } finally {
      setSignupLoading(false);
    }
  };

  // --- Icônes SVG ---
  const EyeIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );

  const EyeOffIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );


  return (
    <>
    <div className="auth-header">

    </div>
    <div className="auth-page">
      <div className="auth-forms-wrapper">
        
        {/* Formulaire LOGIN */}
        <div className={`auth-form-panel ${isLogin ? 'active' : 'hidden'}`}>
          <h1 className="auth-title">Connexion</h1>
          <p className="auth-subtitle">Bon retour parmi nous 👋</p>
          {loginError && <div className="auth-error">{loginError}</div>}
          <form onSubmit={handleLogin} className="auth-form">
            <div className="auth-field">
              <label>Email</label>
              <input type="email" name="email" placeholder="exemple@email.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
            </div>
            <div className="auth-field">
              <label>Mot de passe</label>
              <div className="auth-input-icon">
                <input
                  type={showLoginPw ? 'text' : 'password'}
                  placeholder="Votre mot de passe"
                  name="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
                <button type="button" className="toggle-pw" onClick={() => setShowLoginPw(!showLoginPw)}>
                  {showLoginPw ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
<div className="auth-forgot">
  <a href="/forgot-password">Mot de passe oublié ?</a>
</div>
            </div> 
            <button type="submit" className="auth-submit" disabled={loginLoading}>
              {loginLoading ? <span className="auth-spinner" /> : 'Se connecter'}
            </button>
          </form>
        </div>

        {/* Formulaire SIGNUP */}
        <div className={`auth-form-panel ${!isLogin ? 'active' : 'hidden'}`}>
          <h1 className="auth-title">Créer un compte</h1>
          <p className="auth-subtitle">Rejoins ta communauté</p>
          {signupError && <div className="auth-error">{signupError}</div>}
          {signupSuccess && <div className="auth-success">{signupSuccess}</div>}
          <form onSubmit={handleSignup} className="auth-form">
            
            {/* Nom + Prénom */}
            <div className="auth-row">
              <div className="auth-field">
                <label>Nom</label>
                <input type="text" placeholder="Nom" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="auth-field">
                <label>Prénom</label>
                <input type="text" placeholder="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </div>
            </div>
            
            {/* Email + Matricule */}
            <div className="auth-field"><label>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <div className="auth-field"><label>Matricule</label><input type="text" value={matricule} onChange={(e) => setMatricule(e.target.value)} required /></div>
            
            {/* ✅ NOUVEAU : Filière + Cursus + Niveau */}
            <div className="auth-row">
              <div className="auth-field">
                <label>Filière</label>
                <select value={filiere} onChange={(e) => setFiliere(e.target.value)} required>
                  <option value="">Sélectionnez</option>
                  <option value="informatique">Informatique</option>
                  <option value="mathematiques">Mathématiques</option>
                  <option value="chimie">Chimie</option>
                  <option value="physique">Physique</option>
                </select>
              </div>
              
              <div className="auth-field">
                <label>Cursus</label>
                <select value={cursus} onChange={(e) => {
                  setCursus(e.target.value);
                  setNiveau(''); // Reset niveau quand on change de cursus
                }} required>
                  <option value="LMD">LMD</option>
                  <option value="Ingenieur">Ingénieur</option>
                </select>
              </div>
            </div>
            
            {/* Niveau dynamique */}
            <div className="auth-field">
              <label>Niveau</label>
              <select value={niveau} onChange={(e) => setNiveau(e.target.value)} required disabled={!filiere}>
                <option value="">Sélectionnez votre niveau</option>
                {niveaux[cursus]?.map(niv => (
                  <option key={niv} value={niv}>{niv}</option>
                ))}
              </select>
            </div>
            
            {/* Mot de passe */}
            <div className="auth-field">
              <label>Mot de passe</label>
              <div className="auth-input-icon">
                <input type={showSignupPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button type="button" className="toggle-pw" onClick={() => setShowSignupPw(!showSignupPw)}><EyeIcon /></button>
              </div>
            </div>


{/* Question de sécurité masquée */}
{/* Question de sécurité - Mode Affichage Intelligent */}
<div className="auth-field">
  <label>Question de sécurité <span className="required">*</span></label>
  
  {/* Zone d'affichage personnalisée (remplace l'input) */}
  <div className={`question-display-box ${showQuestion ? 'visible' : 'masked'}`}>
    
    {/* ÉTAT MASQUÉ (Clic pour voir) */}
    {!showQuestion ? (
      <div className="question-masked-content" onClick={() => setShowQuestion(true)}>
        <span className="masked-text">••••••••••••••••••••••••••••••••••••</span>
        <button type="button" className="eye-btn" title="Voir la question">
          <EyeIcon />
        </button>
      </div>
    ) : (
      /* ÉTAT VISIBLE (Clic pour masquer) */
      <div className="question-visible-content">
        <p className="full-question-text">{questionSecrete}</p>
        <button type="button" className="eye-btn" onClick={() => setShowQuestion(false)} title="Masquer la question">
          <EyeOffIcon />
        </button>
      </div>
    )}

  </div>
  
  <small className="help-text">Cliquez sur l'icône 👁️ pour révéler la question.</small>
</div>

<div className="auth-field">
  <label>Votre réponse <span className="required">*</span></label>
  <div className="auth-input-icon">
    <input 
      type={showReponse ? 'text' : 'password'} 
      placeholder="Votre réponse secrète" 
      value={reponseSecrete} 
      onChange={(e) => setReponseSecrete(e.target.value)} 
      required 
      autoComplete="off"
    />
    <button 
      type="button" 
      className="toggle-pw" 
      onClick={() => setShowReponse(!showReponse)}
      title={showReponse ? "Masquer la réponse" : "Afficher la réponse"}
    >
      {showReponse ? <EyeOffIcon /> : <EyeIcon />}
    </button>
  </div>
  <small className="help-text">Gardez cette réponse secrète en mémoire.</small>
</div>


            
            <button type="submit" className="auth-submit" disabled={signupLoading}>
              {signupLoading ? <span className="auth-spinner" /> : "S'inscrire"}
            </button>
          </form>
        </div>

        {/* --- OVERLAY --- */}
        <div className={`auth-overlay ${isLogin ? 'overlay-right' : 'overlay-left'}`}>
          <div className="auth-overlay-content">
            <div className="auth-brand">🎓 <span className="auth-brand-name">Co'study</span></div>
            {isLogin ? (
              <><h2>Nouveau ici ?</h2><p>Rejoins les groupes d'étude d'Oran 1 !</p><button className="auth-overlay-btn" onClick={() => setIsLogin(false)}>S'inscrire</button></>
            ) : (
              <><h2>Déjà inscrit ?</h2><p>Connecte-toi vite à ton espace !</p><button className="auth-overlay-btn" onClick={() => setIsLogin(true)}>Se connecter</button></>
            )}
          </div>
          <div className="auth-left-shapes">
             <div className="shape shape-1"></div>
             <div className="shape shape-2"></div>
             <div className="shape shape-3"></div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

export default Auth;