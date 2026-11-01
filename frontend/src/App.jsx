import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Styleguide from './pages/Styleguide';

export function App() {
  return (
    <Routes>
      <Route path="/styleguide" element={<Styleguide />} />
      <Route path="*" element={<Navigate to="/styleguide" replace />} />
    </Routes>
  );
}

export default App;

