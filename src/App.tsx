import React from 'react';
import { ThemeProvider } from '@mui/material';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { theme } from './theme/theme';
import Dashboard from './pages/Dashboard/Dashboard';
import Marketplace from './pages/Marketplace/Marketplace';
import Integrations from './pages/Integrations/Integrations';
import ApiDocs from './pages/ApiDocs/ApiDocs';
import WebhooksConfig from './pages/WebhooksConfig/WebhooksConfig';
import Finances from './pages/Finances/Finances';
import Support from './pages/Support/Support';
import Products from './pages/Products/Products';
import Vendas from './pages/Vendas/Vendas';
import CheckoutPublico from './pages/CheckoutPublico/CheckoutPublico';
import CheckoutCustomization from './pages/CheckoutCustomization/CheckoutCustomization';
import Login from './pages/Login/Login';
import Register from './pages/Register/Register';
import Indique from './pages/Indique/Indique';
import Admin from './pages/Admin/Admin';

// Componente de proteção de rota
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('zucropay_token');
  return token ? <>{children}</> : <Navigate to="/login" />;
};

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <Router>
        <Routes>
          {/* Rotas públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/checkout/:linkId" element={<CheckoutPublico />} />
          
          {/* Rotas protegidas */}
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/produtos" element={<PrivateRoute><Products /></PrivateRoute>} />
          <Route path="/produtos/personalizar/:productId" element={<PrivateRoute><CheckoutCustomization /></PrivateRoute>} />
          <Route path="/vendas" element={<PrivateRoute><Vendas /></PrivateRoute>} />
          <Route path="/marketplace" element={<PrivateRoute><Marketplace /></PrivateRoute>} />
          <Route path="/integracoes" element={<PrivateRoute><Integrations /></PrivateRoute>} />
          <Route path="/api-docs" element={<PrivateRoute><ApiDocs /></PrivateRoute>} />
          <Route path="/webhooks" element={<PrivateRoute><WebhooksConfig /></PrivateRoute>} />
          <Route path="/financas" element={<PrivateRoute><Finances /></PrivateRoute>} />
          <Route path="/suporte" element={<PrivateRoute><Support /></PrivateRoute>} />
          <Route path="/indique" element={<PrivateRoute><Indique /></PrivateRoute>} />
          <Route path="/admin" element={<PrivateRoute><Admin /></PrivateRoute>} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
};

export default App;
