import { useState } from 'react';
import './index.css'; // N'oublie pas d'importer ton CSS !
import { Link } from 'react-router-dom';

function Signup() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [matricule, setMatricule] = useState('');
  const [filiere, setFiliere] = useState('');
  const [password, setPassword] = useState('');


  const handleSignup = async (e) => {
    e.preventDefault();
    const userData = { 
     email: email,
     nom: name,            // 'name' devient 'nom'
     prenom: firstName,    // 'firstName' devient 'prenom'
     matricule: matricule,
     mot_de_passe: password, // 'password' devient 'mot_de_passe'
     filiere: filiere
  };

    try {
      const response = await fetch('http://localhost:5000/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const data = await response.json();
      if (response.ok) {
        alert("Succès : " + data.message);
      } else {
        alert("Erreur lors de l'inscription");
      }
    } catch (error) {
      alert("Le serveur ne répond pas.");
    }
  };

  return (
    <div className="signup-wrapper">
      <div className="signup-container">
        <h1>Créer un compte</h1>
                <form onSubmit={handleSignup} className="signup-form">
          <input 
            type="email" 
            placeholder="Email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
          <input 
            type="text" 
            placeholder="Nom" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
          />
          <input 
            type="text" 
            placeholder="Prénom" 
            value={firstName} 
            onChange={(e) => setFirstName(e.target.value)} 
          />
          <input 
            type="text" 
            placeholder="Matricule" 
            value={matricule} 
            onChange={(e) => setMatricule(e.target.value)} 
          />
          <input 
            type="password" 
            placeholder="Mot de passe" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
        <select id="workshop" name="filiere" className="filiere-select"
        value={filiere} onChange={(e) => setFiliere(e.target.value)}
        required
        >
            <option value="select">selectionnez votre filiere</option>
            <option value="informatique">informatique</option>
            <option value="mathematiques">mathematiques</option>
            <option value="chimie">chimie</option>
            <option value="physique">physique</option>
        </select>
          
          <button type="submit" className="btn-submit">
            S'inscrire
          </button>
          <p style={{ color: '#b5bac1', marginTop: '1rem' }}>
          Déjà un compte ? <Link to="/login" style={{ color: '#00a8fc' }}>Se connecter</Link>
         </p>
        </form>
      </div>
    </div>
  );
}

export default Signup;