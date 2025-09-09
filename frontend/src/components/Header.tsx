
import React from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

const Header: React.FC = () => (
  <header>
    <ul>
      <li className="logo">VirtuMakerRPG</li>
      <li><Link to="/">Home</Link></li>
      <li><Link to="/galeria">Galeria</Link></li>
      <li><Link to="/criar">Criar</Link></li>
    </ul>
  </header>
);

export default Header;
