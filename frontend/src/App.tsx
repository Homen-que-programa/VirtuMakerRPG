
import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import HomePage from './pages/Home/HomePage';
import LoginPage from './pages/Login/LoginPage';
import CreatePage from './pages/Create/CreatePage.tsx';
import SpriteEditorPage from './pages/Create/SpriteEditorPage.tsx';
import MapCreatorPage from './pages/Create/MapCreatorPage.tsx';
import CharacterCreatorPage from './pages/Create/CharacterCreatorPage.tsx';
import ItemCreatorPage from './pages/Create/ItemCreatorPage.tsx';
import GalleryPage from './pages/Gallery/GalleryPage.tsx';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
  <Route path="/galeria" element={<GalleryPage />} />
  <Route path="/criar" element={<CreatePage />} />
  <Route path="/criar/sprite" element={<SpriteEditorPage />} />
  <Route path="/criar/mapa" element={<MapCreatorPage />} />
  <Route path="/criar/personagem" element={<CharacterCreatorPage />} />
  <Route path="/criar/item" element={<ItemCreatorPage />} />
      </Routes>
    </Router>
  );
}

export default App;