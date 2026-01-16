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
import AdminLogin from './pages/AdminLogin/AdminLogin';
import Settings from './pages/Settings/Settings';
import Manager from './pages/Manager/Manager';
import ManagerLogin from './pages/ManagerLogin/ManagerLogin';

// Componente de proteção de rota (usuário normal)
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('zucropay_token');
  return token ? <>{children}</> : <Navigate to="/login" />;
};

// Componente de proteção de rota do Admin (separado)
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const adminToken = localStorage.getItem('zucropay_admin_token');
  
  // Verificar se o token é válido e não expirou
  if (adminToken) {
    try {
      const payload = JSON.parse(atob(adminToken));
      if (payload.exp && payload.exp > Date.now()) {
        return <>{children}</>;
      }
    } catch {
      // Token inválido
    }
    // Token expirado ou inválido, limpar
    localStorage.removeItem('zucropay_admin_token');
    localStorage.removeItem('zucropay_admin_user');
  }
  
  return <Navigate to="/admin-login" />;
};

// Componente de proteção de rota do Gerente
const ManagerRoute = ({ children }: { children: React.ReactNode }) => {
  const managerToken = localStorage.getItem('zucropay_manager_token');
  
  // Verificar se o token é válido e não expirou
  if (managerToken) {
    try {
      const payload = JSON.parse(atob(managerToken));
      if (payload.exp && payload.exp > Date.now() && payload.role === 'gerente') {
        return <>{children}</>;
      }
    } catch {
      // Token inválido
    }
    // Token expirado ou inválido, limpar
    localStorage.removeItem('zucropay_manager_token');
    localStorage.removeItem('zucropay_manager_user');
  }
  
  return <Navigate to="/gerente-login" />;
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
          <Route path="/admin-login" element={<AdminLogin />} />
          
          {/* Rotas protegidas (usuário normal) */}
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
          <Route path="/configuracoes" element={<PrivateRoute><Settings /></PrivateRoute>} />
          
          {/* Rota Admin (login separado) */}
          <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
          
          {/* Rotas Gerente de Conta */}
          <Route path="/gerente-login" element={<ManagerLogin />} />
          <Route path="/gerente" element={<ManagerRoute><Manager /></ManagerRoute>} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
};

export default App;
