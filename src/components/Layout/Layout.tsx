import React from 'react';
import { Box, styled } from '@mui/material';
import Sidebar from './Sidebar';
import Header from './Header';

const MainContent = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  marginLeft: 280,
  marginTop: 64,
  backgroundColor: theme.palette.background.default,
  minHeight: '100vh',
}));

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <Box sx={{ display: 'flex' }}>
      <Sidebar />
      <Header />
      <MainContent>
        {children}
      </MainContent>
    </Box>
  );
};

export default Layout; 