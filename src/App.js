import React, { useEffect } from 'react';
import './App.css';
import Navbar from './components/Navbar';
import MainContent from './components/MainContent';
import Footer from './components/Footer';

function App() {
  useEffect(() => {
    // Debug logging
    console.log('Environment variables check:');
    console.log('REACT_APP_GOOGLE_CLIENT_ID:', process.env.REACT_APP_GOOGLE_CLIENT_ID);
    console.log('All env vars:', process.env);
  }, []);

  return (
    <div className="app-container">
      <Navbar />
      <MainContent />
      <Footer />
    </div>
  );
}

export default App; 