import { Routes, Route } from 'react-router-dom';

// Pages (we'll build these out one by one)
// import Home from './pages/Home';
// import Login from './pages/Login';

function App() {
  return (
    <div className="min-h-screen">
      <Routes>
        {/* Placeholder — routes get added as we build pages */}
        <Route path="/" element={
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-accent mb-2">QIU Sport Club</h1>
              <p className="text-white/50">Setup complete. Time to build.</p>
            </div>
          </div>
        } />
      </Routes>
    </div>
  );
}

export default App;
