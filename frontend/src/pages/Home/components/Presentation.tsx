
import React from 'react';
import { Link } from 'react-router-dom';
import './Presentation.css';

const Presentation: React.FC = () => (
  <main>
    <div className="presentation">
      <h1>Bem-vindo ao VirtuMaker RPG!</h1>
      <p>Crie e personalize mapas, personagens, itens e muito mais.</p>
  <Link className="cta" to="/login">Conecte-se</Link>
    </div>
  </main>
);

export default Presentation;
