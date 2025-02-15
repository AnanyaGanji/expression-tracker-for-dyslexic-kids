// Layout.js
import React from 'react';
import Header from './Header';
import './Layout.css'; // Add styles for your layout

const Layout = ({ children }) => {
  return (
    <div className="layout">
      <Header />
      <main>{children}</main>
    </div>
  );
};

export default Layout;
