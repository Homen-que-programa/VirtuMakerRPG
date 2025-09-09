import React from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

const MapCreatorPage: React.FC = () => {
  return (
    <div className="create-layout">
      <Header />
      <main className="create-content">
        <h1>Criar Mapa</h1>
        <p>Editor de mapas (em breve).</p>
      </main>
      <Footer />
    </div>
  );
};

export default MapCreatorPage;
