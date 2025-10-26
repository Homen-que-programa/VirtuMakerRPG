
import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import DashboardPage from './pages/Dashboard/DashboardPage';
import LoginPage from './pages/Login/LoginPage';
import CreatePage from './pages/Create/CreatePage';
import InteriorBuilderPage from './pages/Create/InteriorBuilderPage';
import CharacterCreatorPage from './pages/Create/CharacterCreatorPage';
import ItemCreatorPage from './pages/Create/ItemCreatorPage';
import SheetCreatorPage from './pages/Create/SheetCreatorPage';
import DocumentCreatorPage from './pages/Create/DocumentCreatorPage';
import TabletopPage from './pages/Tabletop/TabletopPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/criar" element={<CreatePage />} />
        <Route path="/criar/interior" element={<InteriorBuilderPage />} />
        <Route path="/criar/personagem" element={<CharacterCreatorPage />} />
        <Route path="/criar/item" element={<ItemCreatorPage />} />
        <Route path="/criar/ficha" element={<SheetCreatorPage />} />
        <Route path="/criar/documento" element={<DocumentCreatorPage />} />
        <Route path="/tabletop" element={<TabletopPage />} />
      </Routes>
    </Router>
  );
}

export default App;