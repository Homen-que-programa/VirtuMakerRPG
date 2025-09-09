import React from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

const ItemCreatorPage: React.FC = () => {
  return (
    <div className="create-layout">
      <Header />
      <main className="create-content">
        <h1>Criar Item</h1>
        <p>Editor de itens (em breve).</p>
      </main>
      <Footer />
    </div>
  );
};

export default ItemCreatorPage;
