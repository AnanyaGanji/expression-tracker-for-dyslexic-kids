// import React from 'react';
// import './Home.css'; // Assuming your styles are in Home.css

// const Home = () => {
//   return (
//     <div className="home-container">
//       <header className="header">
//         <nav className="nav-links">
          
//           <a href="/">Home</a>
//           <a href="/about">About</a>
//           <a href="/learn-more">Learn More</a>
//         </nav>
//       </header>
//       <main className="main-content">
//         <div className="home-buttons">
//           <button onClick={() => window.location.href = '/login'}>Play the Game</button>
//           <button onClick={() => window.location.href = '/analysis'}>Get Analysis</button>
//         </div>
//       </main>
//       <footer className="footer">Footer Content</footer>
//     </div>
//   );
// };

// export default Home;
import '../styles/Home.css';
import React from 'react';
 // Assuming your styles are in Home.css

const Home = () => {
  return (
    <div className='home-background'>
    <div className="home-container">
      <nav className="navbar navbar-expand-lg navbar-light fixed-top"  style={{
        backgroundColor: 'rgba(173, 216, 230, 0.7)', // Pale white with 70% opacity
        boxShadow: 'none',
      }}>
        <div className="container-fluid">
          <a className="navbar-brand" href="/"  > <img src="favicon.ico" alt="Favicon" style={{ width: '50px',height:'50px', marginRight: '10px' }}/> <b>EXPRESSION TRACKER </b> </a>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav">
            <li className="nav-item">
                <a className="nav-link" href="/">Home</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="/about">About</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="/learn-more">Learn More</a>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      <main className="main-content" style={{ marginTop: '70px' }}>
        <div className="home-buttons">
          <button className="btn btn-primary" onClick={() => window.location.href = '/select-game'}>Play the Game</button>
          <button className="btn btn-secondary" onClick={() => window.location.href = '/analysis'}>Get Analysis</button>
        </div>
      </main>
      
    </div>
    </div>
  );
};

export default Home;
