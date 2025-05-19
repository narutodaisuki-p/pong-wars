import { Routes, Route } from 'react-router-dom';
import AuthProvider from './context/AuthContext';
import Home from './pages/Home';
import Game from './pages/Game';
import PrivateRoute from './context/PrivateRoute';
import Register from './pages/Register';
import Settings from './pages/Setting';

function App() {
  return (

    <AuthProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/game"
          element={
            <PrivateRoute>
              <Game />
            </PrivateRoute>
          }
        />
        <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
      </Routes>
    </AuthProvider>
  );
}

export default App;