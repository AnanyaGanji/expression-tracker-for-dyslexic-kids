import React from 'react';
import Navbar from './Navbar';

const GameSelection = () => {
  const username = 'JohnDoe'; // Replace with dynamic data if available
  
  const handleLogout = () => {
    // Add logout logic here
    console.log('User logged out');
  };

  return (
    <div>
      <Navbar username={username} onLogout={handleLogout} />
      <h1>Game Selection Page</h1>
      {/* Other content for game selection */}
    </div>
  );
};

export default GameSelection;
