import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // 1. On importe Link et useNavigate

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate(); // 2. On initialise useNavigate

 const handleLogin = async (e) => {
    e.preventDefault();

    try {
      // 1. On lance l'appel au serveur (port 5000)
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // 2. On envoie l'email et le password (attention au nom 'mot_de_passe')
        body: JSON.stringify({ email, mot_de_passe: password }), 
      });

      const data = await response.json();

      if (response.ok) { 
        // 3. Si le serveur répond 200 (OK)
        alert("Succès : " + data.message);
        // 4. On redirige vers la page d'accueil (home.jsx)
        navigate('/home'); 
        if (response.ok) {
    // On enregistre le prénom dans la mémoire du navigateur
    localStorage.setItem("userName", data.user.prenom); 
    navigate('/home'); 
}
      } else {
        // 4. Si le serveur répond une erreur (ex: 401 Mauvais mot de passe)
        alert("Erreur : " + data.message);
      }
    } catch (error) {
      // 5. Si le serveur est éteint
      alert("Le serveur ne répond pas.");
    }
  };

  return (
    <div className="signup-wrapper">
      <div className="signup-container">
        <h1>Connexion</h1>
        <form onSubmit={handleLogin} className="signup-form">
          <input 
            type="email" 
            placeholder="Email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
          <input 
            type="password" 
            placeholder="Mot de passe" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
          <button type="submit" className="btn-submit">Se connecter</button>
        </form>
      </div>
    </div>
  );
}

export default Login; // <--- TRÈS IMPORTANT