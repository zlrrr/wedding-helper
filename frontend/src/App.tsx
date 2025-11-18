// Wedding Helper - Main Application Component

import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import Chat from './pages/Chat';

/**
 * Main App component
 */
const App: React.FC = () => {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
        <Chat />
      </div>
    </AuthProvider>
  );
};

export default App;
