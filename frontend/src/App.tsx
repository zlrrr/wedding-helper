// Wedding Helper - Main Application Component

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Chat from './pages/Chat';
import Admin from './pages/Admin';

/**
 * Router component - Simple hash-based routing
 */
const Router: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<string>('chat');
  const { user } = useAuth();

  // Listen to hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) || 'chat';
      setCurrentPage(hash);
    };

    handleHashChange(); // Initial load
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Navigation component
  const Navigation = () => {
    if (!user || user.role !== 'admin') {
      return null; // Only show nav for admin users
    }

    return (
      <div className="fixed top-4 right-4 z-50 flex space-x-2">
        <a
          href="#chat"
          className={`px-4 py-2 rounded-lg font-medium transition shadow-lg ${
            currentPage === 'chat'
              ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          聊天
        </a>
        <a
          href="#admin"
          className={`px-4 py-2 rounded-lg font-medium transition shadow-lg ${
            currentPage === 'admin'
              ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          管理
        </a>
      </div>
    );
  };

  return (
    <>
      <Navigation />
      {currentPage === 'admin' ? <Admin /> : <Chat />}
    </>
  );
};

/**
 * Main App component
 */
const App: React.FC = () => {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
        <Router />
      </div>
    </AuthProvider>
  );
};

export default App;
