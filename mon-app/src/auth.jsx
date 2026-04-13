import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Auth.css';
import { useTheme } from './ThemeContext';

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
  const [password, setPassword] = useState('');
  const [showSignupPw, setShowSignupPw] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState('');
  const [signupSuccess, setSignupSuccess] = useState('');

  // --- Handlers ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const response = await fetch('http://localhost:5000/api/login', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, mot_de_passe: loginPassword }),
      });
      
      const data = await response.json();
      
if (response.ok) {
  // On enregistre l'objet utilisateur complet pour être tranquille plus tard
  localStorage.setItem('user', JSON.stringify(data.user));
  
  // On met à jour les clés individuelles avec le nouveau nom de colonne
  localStorage.setItem('userName', data.user.prenom);
  localStorage.setItem('userFiliere', data.user.filiere);
  
  // C'EST ICI : On utilise id_etudiant à la place de id
  localStorage.setItem('userId', data.user.id_etudiant); 
  
  navigate('/home');
}
else {
        setLoginError(data.message || 'Email ou mot de passe incorrect.');
      }
    } catch (err) {
      console.error(err);
      setLoginError('Le serveur ne répond pas.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setSignupLoading(true);
    setSignupError('');
    setSignupSuccess('');
    try {
      const response = await fetch('http://localhost:5000/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          nom: name,
          prenom: firstName,
          matricule,
          mot_de_passe: password,
          filiere,
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

  const { darkMode, toggleDarkMode } = useTheme();


  return (
    <>
    <div className="auth-header">
      <button className="dark-toggle-auth" onClick={toggleDarkMode}>
        {darkMode ? '☀️' : '🌙'}
      </button>
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
              <input type="email" placeholder="exemple@email.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
            </div>
            <div className="auth-field">
              <label>Mot de passe</label>
              <div className="auth-input-icon">
                <input
                  type={showLoginPw ? 'text' : 'password'}
                  placeholder="Votre mot de passe"
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
          <p className="auth-switch-mobile">Pas encore de compte ? <button onClick={() => setIsLogin(false)}>S'inscrire</button></p>
        </div>

        {/* Formulaire SIGNUP */}
        <div className={`auth-form-panel ${!isLogin ? 'active' : 'hidden'}`}>
          <h1 className="auth-title">Créer un compte</h1>
          <p className="auth-subtitle">Rejoins ta communauté</p>
          {signupError && <div className="auth-error">{signupError}</div>}
          {signupSuccess && <div className="auth-success">{signupSuccess}</div>}
          <form onSubmit={handleSignup} className="auth-form">
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
            <div className="auth-field"><label>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <div className="auth-field"><label>Matricule</label><input type="text" value={matricule} onChange={(e) => setMatricule(e.target.value)} required /></div>
            <div className="auth-field">
              <label>Filière</label>
              <select value={filiere} onChange={(e) => setFiliere(e.target.value)} required>
                <option value="">Sélectionnez votre filière</option>
                <option value="informatique">Informatique</option>
                <option value="mathematiques">Mathématiques</option>
                <option value="chimie">Chimie</option>
                <option value="physique">Physique</option>
              </select>
            </div>
            <div className="auth-field">
              <label>Mot de passe</label>
              <div className="auth-input-icon">
                <input type={showSignupPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button type="button" className="toggle-pw" onClick={() => setShowSignupPw(!showSignupPw)}><EyeIcon /></button>
              </div>
            </div>
            <button type="submit" className="auth-submit" disabled={signupLoading}>{signupLoading ? <span className="auth-spinner" /> : "S'inscrire"}</button>
          </form>
          <p className="auth-switch-mobile">Déjà un compte ? <button onClick={() => setIsLogin(true)}>Se connecter</button></p>
        </div>
      </div>

      {/* --- OVERLAY --- */}
      <div className={`auth-overlay ${isLogin ? 'overlay-right' : 'overlay-left'}`}>
        <div className="auth-overlay-content">
          <div className="auth-brand">⚡ <span className="auth-brand-name">Flow</span></div>
          {isLogin ? (
            <><h2>Nouveau ici ?</h2><p>Rejoins les groupes d'étude !</p><button className="auth-overlay-btn" onClick={() => setIsLogin(false)}>S'inscrire</button></>
          ) : (
            <><h2>Déjà inscrit ?</h2><p>Connecte-toi vite !</p><button className="auth-overlay-btn" onClick={() => setIsLogin(true)}>Se connecter</button></>
          )}
        </div>
      </div>
    </div>
  </>
    );

}

export default Auth;