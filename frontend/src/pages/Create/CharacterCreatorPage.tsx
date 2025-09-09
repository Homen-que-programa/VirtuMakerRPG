import React from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

const CharacterCreatorPage: React.FC = () => {
  return (
    <div className="create-layout">
      <Header />
      <main className="create-content">
        <h1>Criar Personagem</h1>
        <p>Editor de personagens (em breve).</p>
      </main>
      <Footer />
    </div>
  );
};

export default CharacterCreatorPage;
