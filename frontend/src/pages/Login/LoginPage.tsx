import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import './LoginPage.css';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (email === 'admin@admin.com' && password === 'admin') {
      setError('');
      setFeedback('Login realizado com sucesso! Bem-vindo de volta ao estúdio.');
    } else {
      setFeedback('');
      setError('Email ou senha inválidos. Tente novamente.');
    }
  };

  return (
    <div className="login-layout">
      <Header />
      <main className="login-main">
        <section className="login-hero">
          <span className="login-eyebrow">VirtuMaker RPG Studio</span>
          <h1>Conecte-se para sincronizar seus mundos.</h1>
          <p>
            Acesse projetos colaborativos, organize bibliotecas de assets e acompanhe a evolução das suas campanhas
            com segurança na nuvem VirtuMaker.
          </p>
          <ul className="login-highlights" aria-label="Benefícios da conta VirtuMaker">
            <li>
              <strong>Progresso contínuo</strong>
              <span>Sessões com autosave e histórico para voltar em qualquer etapa.</span>
            </li>
            <li>
              <strong>Bibliotecas compartilhadas</strong>
              <span>Tokens, interiores e cidades disponíveis para todo o time.</span>
            </li>
            <li>
              <strong>Fluxos inteligentes</strong>
              <span>Assistentes de geração com presets narrativos customizados.</span>
            </li>
          </ul>
        </section>

        <section className="login-card" aria-label="Formulário de login">
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="auth-heading">
              <h2>Entrar na plataforma</h2>
              <p>Use suas credenciais VirtuMaker para acessar o estúdio.</p>
            </div>

            {error && (
              <div className="login-alert login-alert--error" role="alert">
                {error}
              </div>
            )}

            {feedback && (
              <div className="login-alert login-alert--success" role="status">
                {feedback}
              </div>
            )}

            <div className="login-field">
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="nome@empresa.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="login-field">
              <label htmlFor="login-password">Senha</label>
              <input
                id="login-password"
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="Digite sua senha"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            <div className="login-actions">
              <label className="remember">
                <input type="checkbox" name="remember" />
                <span>Lembrar neste dispositivo</span>
              </label>
              <Link className="login-link" to="/criar">Precisa de acesso?</Link>
            </div>

            <button type="submit" className="login-submit">
              Entrar agora
            </button>

            <div className="login-meta">
              <span>
                Prefere explorar primeiro?{' '}
                <Link className="login-link" to="/criar/interior">Abrir editor de interiores</Link>
              </span>
              <Link className="login-link" to="/">Voltar ao dashboard</Link>
            </div>
          </form>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default LoginPage;
