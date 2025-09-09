
import React from 'react';
import './Footer.css';

const Footer: React.FC = () => (
  <footer className="footer">
    <span>© {new Date().getFullYear()} VirtuMakerRPG. Todos os direitos reservados.</span>
  </footer>
);

export default Footer;
