import React from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

const GalleryPage: React.FC = () => {
  return (
    <div className="create-layout">
      <Header />
      <main className="create-content">
        <h1>Galeria</h1>
        <p>Em breve: explore e compartilhe criações da comunidade.</p>
      </main>
      <Footer />
    </div>
  );
};

export default GalleryPage;
