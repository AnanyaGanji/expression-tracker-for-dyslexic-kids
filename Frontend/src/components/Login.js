import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Login.css'; 
import axios from 'axios';

const Login = () => {
  const [playerName, setPlayerName] = useState(''); // User input for name
  const [defaultName, setDefaultName] = useState(''); // The ChildXXX name fetched from the database
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch the next available child name from the backend
    const fetchNextChildName = async () => {
      try {
        const response = await axios.get('http://localhost:5000/next-child');
        setDefaultName(response.data.nextChildName); // Store the next available ChildXXX name
      } catch (error) {
        console.error('Error fetching next child name:', error);
      }
    };

    fetchNextChildName(); // Fetch the next name on component load
  }, []);

  const handleLogin = () => {
    // Use the provided player name or the default ChildXXX name
    const assignedName = playerName ? playerName : defaultName;

    // Show an alert with the assigned session name
    alert(`Your Session Name is: ${assignedName}`);

    // Redirect to the Game page and pass the session name via state
    navigate('/game', { state: { sessionName: assignedName } });
  };

  return (
    <div className="login-container">
      <h1>Enter Your Name</h1>
      <input
        type="text"
        placeholder="Player Name"
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value)}
      />
      <button className="btn" onClick={handleLogin}>Submit</button>
    </div>
  );
};

export default Login;
