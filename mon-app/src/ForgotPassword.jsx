import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Auth.css'; // Réutilise le même CSS

function ForgotPassword() {
  const navigate = useNavigate();
  
  // Étape 1 : Email
  const [email, setEmail] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Étape 2 : Question + Réponse
  const [question, setQuestion] = useState('');
  const [reponse, setReponse] = useState('');
  const [userId, setUserId] = useState(null);
  const [showQuestion, setShowQuestion] = useState(false);
  const [showReponse, setShowReponse] = useState(false);
  
  // Étape 3 : Nouveau mot de passe
  const [nouveauMdp, setNouveauMdp] = useState('');
  const [confirmMdp, setConfirmMdp] = useState('');
  const [showMdp, setShowMdp] = useState(false);
  const [showConfirmMdp, setShowConfirmMdp] = useState(false);

  // Icônes
  const EyeIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );

  const EyeOffIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );

  // Étape 1 : Trouver le compte par email
  const handleFindAccount = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`http://localhost:5000/api/forgot-password/${email}`);
      const data = await response.json();
      
      if (response.ok) {
        setUserId(data.id_etudiant);
        setQuestion(data.question_secrete);
        setStep(2);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Le serveur ne répond pas.");
    } finally {
      setLoading(false);
    }
  };

  // Étape 2 : Vérifier la réponse
  const handleVerifyAnswer = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (!reponse.trim()) {
      setError("Veuillez entrer votre réponse.");
      setLoading(false);
      return;
    }
    
    setStep(3); // Passe directement à l'étape du nouveau mot de passe
    setLoading(false);
  };

  // Étape 3 : Changer le mot de passe
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (nouveauMdp !== confirmMdp) {
      setError("Les mots de passe ne correspondent pas.");
      setLoading(false);
      return;
    }
    
    if (nouveauMdp.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      setLoading(false);
      return;
    }
    
    try {
      const response = await fetch('http://localhost:5000/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_etudiant: userId,
          reponse: reponse,
          nouveau_mdp: nouveauMdp
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccess("✅ Mot de passe modifié avec succès ! Redirection...");
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Le serveur ne répond pas.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-forms-wrapper" style={{maxWidth: '600px'}}>
        <div className="auth-form-panel active">
          <button className="back-btn" onClick={() => navigate('/')} style={{marginBottom: '1rem', background:'none', border:'none', cursor:'pointer', fontSize:'1rem'}}>
            ← Retour à la connexion
          </button>
          
          <h1 className="auth-title">Récupération de compte</h1>
          <p className="auth-subtitle">
            {step === 1 && "Entrez votre email pour commencer"}
            {step === 2 && "Prouvez que c'est bien vous"}
            {step === 3 && "Définissez votre nouveau mot de passe"}
          </p>
          
          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}
          
          {/* ÉTAPE 1 : Email */}
          {step === 1 && (
            <form onSubmit={handleFindAccount} className="auth-form">
              <div className="auth-field">
                <label>Email</label>
                <input 
                  type="email" 
                  placeholder="exemple@email.com" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                />
              </div>
              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? 'Recherche...' : 'Continuer'}
              </button>
            </form>
          )}
          
          {/* ÉTAPE 2 : Question de sécurité */}
          {step === 2 && (
            <form onSubmit={handleVerifyAnswer} className="auth-form">
              <div className="auth-field">
                <label>Question de sécurité</label>
                <div className={`question-display-box visible`}>
                  <div className="question-visible-content">
                    <p className="full-question-text">{question}</p>
                  </div>
                </div>
              </div>
              
              <div className="auth-field">
                <label>Votre réponse *</label>
                <div className="auth-input-icon">
                  <input 
                    type={showReponse ? 'text' : 'password'} 
                    placeholder="Votre réponse secrète" 
                    value={reponse} 
                    onChange={(e) => setReponse(e.target.value)} 
                    required 
                    autoComplete="off"
                  />
                  <button 
                    type="button" 
                    className="toggle-pw" 
                    onClick={() => setShowReponse(!showReponse)}
                  >
                    {showReponse ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>
              
              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? 'Vérification...' : 'Vérifier'}
              </button>
            </form>
          )}
          
          {/* ÉTAPE 3 : Nouveau mot de passe */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="auth-form">
              <div className="auth-field">
                <label>Nouveau mot de passe</label>
                <div className="auth-input-icon">
                  <input 
                    type={showMdp ? 'text' : 'password'} 
                    placeholder="Nouveau mot de passe" 
                    value={nouveauMdp} 
                    onChange={(e) => setNouveauMdp(e.target.value)} 
                    required 
                  />
                  <button 
                    type="button" 
                    className="toggle-pw" 
                    onClick={() => setShowMdp(!showMdp)}
                  >
                    {showMdp ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>
              
              <div className="auth-field">
                <label>Confirmer le mot de passe</label>
                <div className="auth-input-icon">
                  <input 
                    type={showConfirmMdp ? 'text' : 'password'} 
                    placeholder="Confirmer le mot de passe" 
                    value={confirmMdp} 
                    onChange={(e) => setConfirmMdp(e.target.value)} 
                    required 
                  />
                  <button 
                    type="button" 
                    className="toggle-pw" 
                    onClick={() => setShowConfirmMdp(!showConfirmMdp)}
                  >
                    {showConfirmMdp ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>
              
              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? 'Modification...' : 'Changer le mot de passe'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;