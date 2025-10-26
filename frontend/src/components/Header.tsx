
import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import './Header.css';

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/tabletop', label: 'Tabletop' },
];

const Header: React.FC = () => (
  <header className="app-header">
    <div className="brand">
      <Link className="logo" to="/">VirtuMakerRPG</Link>
      <span className="tag">Alpha</span>
    </div>

    <nav aria-label="Secoes principais">
      <ul className="nav-list">
        {navItems.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              end={item.to === '/'}
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>

    <div className="header-actions">
      <Link className="ghost" to="/criar">Novo projeto</Link>
      <Link className="login" to="/login">Entrar</Link>
    </div>
  </header>
);

export default Header;
