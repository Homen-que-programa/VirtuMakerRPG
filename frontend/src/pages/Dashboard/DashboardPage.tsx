import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import './DashboardPage.css';

const quickActions = [
  {
    title: 'Gerar interior com IA',
    description: 'Escolha estilo, dimensao e atmosfera e deixe o assistente montar o layout base.',
    cta: 'Abrir assistente',
    to: '/criar/interior',
  },
  {
    title: 'Criar planta manualmente',
    description: 'Comece do zero com grade expansivel, salas modulares e paletas personalizadas.',
    cta: 'Abrir editor',
    to: '/criar/interior',
  },
  {
    title: 'Biblioteca de tokens',
    description: 'Organize personagens, criaturas e itens para arrastar direto nos mapas.',
    cta: 'Ver biblioteca',
    to: '/criar/personagem',
  },
  {
    title: 'Sprites e assets',
    description: 'Gerencie tiles, objetos e decalques gerados por voce ou pelo time.',
    cta: 'Organizar sprites',
    to: '/criar/item',
  },
];

const spotlightItems = [
  {
    label: 'Casas narrativas',
    detail: 'Misture IA com ajustes manuais para montar residencias coerentes com sua campanha.',
  },
  {
    label: 'Comodos conectados',
    detail: 'Templates de cozinhas, oficinas e saloes com fluxo de passagem realista.',
  },
  {
    label: 'Detalhes imersivos',
    detail: 'Biblioteca modular de props, iluminacao e ganchos narrativos por ambiente.',
  },
];

const activity = [
  { title: 'Mapa "Costa Nebulosa" atualizado', time: 'ha 2 horas' },
  { title: 'Token "Guardiao Arcano" gerado pela IA', time: 'ha 6 horas' },
  { title: 'Template de cidade salvo nos favoritos', time: 'ha 1 dia' },
];

const DashboardPage: React.FC = () => {
  return (
    <div className="dashboard-layout">
      <Header />
      <main className="dashboard-main">
        <section className="hero">
          <div className="hero-text">
            <span className="eyebrow">VirtuMaker RPG Studio</span>
            <h1>Seu hub para construir mundos e historias incriveis.</h1>
            <p>
              Centralize mapas, tokens, assets e fluxos de geracao inteligente em um painel unificado.
              Continue de onde parou ou experimente novos estilos em segundos.
            </p>
            <div className="hero-actions">
              <Link className="btn primary" to="/criar/interior">Gerar novo interior</Link>
              <Link className="btn secondary" to="/login">Conectar conta principal</Link>
            </div>
          </div>
          <div className="hero-card">
            <h2>Assistente Inteligente</h2>
            <p>Defina bioma, escala e tom narrativo; receba sugestoes de mapas com camadas editaveis.</p>
            <ul className="hero-metrics">
              <li>
                <strong>+120</strong>
                <span>Templates prontos</span>
              </li>
              <li>
                <strong>3 modos</strong>
                <span>Mundo, cidade, interior</span>
              </li>
              <li>
                <strong>Autosave</strong>
                <span>Sessoes seguras</span>
              </li>
            </ul>
          </div>
        </section>

        <section className="quick-grid" aria-label="Acoes rapidas">
          {quickActions.map((action) => (
            <article key={action.title} className="quick-card">
              <h3>{action.title}</h3>
              <p>{action.description}</p>
              <Link className="link" to={action.to}>{action.cta}</Link>
            </article>
          ))}
        </section>

        <section className="columns">
          <article className="panel spotlight">
            <header>
              <h2>Destaques criativos</h2>
              <Link to="/criar/interior">Ver todos</Link>
            </header>
            <ul>
              {spotlightItems.map((item) => (
                <li key={item.label}>
                  <strong>{item.label}</strong>
                  <span>{item.detail}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="panel activity">
            <header>
              <h2>Atividades recentes</h2>
              <Link to="/login">Sincronizar conta</Link>
            </header>
            <ul>
              {activity.map((item) => (
                <li key={item.title}>
                  <span className="activity-title">{item.title}</span>
                  <time>{item.time}</time>
                </li>
              ))}
            </ul>
          </article>
        </section>

        <section className="cta-strip">
          <div>
            <h2>Pronto para expandir o multiverso da sua mesa?</h2>
            <p>Conecte-se a conta principal para acessar bibliotecas compartilhadas e publicar mapas na comunidade.</p>
          </div>
          <Link className="btn primary" to="/login">Entrar com conta VirtuMaker</Link>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default DashboardPage;
