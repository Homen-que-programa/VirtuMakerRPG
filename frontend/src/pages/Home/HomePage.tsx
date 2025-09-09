import React from 'react';

import Header from '../../components/Header';
import Presentation from './components/Presentation';
import Footer from '../../components/Footer';
import './HomePage.css';

const HomePage: React.FC = () => {
  return (
    <div className="home-layout">
      <Header />
      <div className="home-content">
        <Presentation />
      </div>
      <Footer />
    </div>
  );
};

export default HomePage;
