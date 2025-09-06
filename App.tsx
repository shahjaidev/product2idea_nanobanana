import React, { useState } from 'react';
import LoginPage from './components/LoginPage';
import ProductStudio from './components/ProductStudio';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 font-sans">
      {isLoggedIn ? <ProductStudio /> : <LoginPage onLogin={handleLogin} />}
    </div>
  );
};

export default App;