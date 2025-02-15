import React from 'react';
import '../styles/Header.css'; // Add styles for your header

const Header = () => {
  return (
    <header className="header">
      <nav>
        <ul>
          <li><a href="/">Home</a></li>
          <li><a href="/about">About</a></li>
          <li><a href="/learn-more">Learn More</a></li>
        </ul>
      </nav>
    </header>
  );
};

export default Header;
