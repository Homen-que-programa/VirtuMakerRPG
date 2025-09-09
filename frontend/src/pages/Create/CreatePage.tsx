import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import './CreatePage.css';

const CreatePage: React.FC = () => {
  return (
    <div className="create-layout">
      <Header />
      <main className="create-content">
        <h1>Criar</h1>
        <p>Escolha o que deseja criar:</p>
        <div className="create-grid">
          <Link className="create-card" to="/criar/mapa">
            <div className="icon">🗺️</div>
            <h2>Mapa</h2>
            <p>Construa mapas para o seu mundo.</p>
          </Link>
          <Link className="create-card" to="/criar/personagem">
            <div className="icon">🧙‍♂️</div>
            <h2>Personagem</h2>
            <p>Modele heróis e NPCs.</p>
          </Link>
          <Link className="create-card" to="/criar/item">
            <div className="icon">🗡️</div>
            <h2>Item</h2>
            <p>Crie armas, poções e mais.</p>
          </Link>
          <Link className="create-card" to="/criar/sprite">
            <div className="icon">🎨</div>
            <h2>Sprite</h2>
            <p>Desenhe pixels como no Paint/Photoshop.</p>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CreatePage;
