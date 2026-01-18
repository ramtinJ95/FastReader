import { useState } from 'react';
import { RSVPDisplay } from './components/RSVPDisplay';
import './App.css';

function App() {
  const [word] = useState('Reading');

  return (
    <div className="app">
      <h1>FastReader - Phase 2</h1>
      <div style={{ width: '100%', height: '300px', border: '1px solid #333' }}>
        <RSVPDisplay word={word} />
      </div>
      <p>The "a" should be highlighted in red and centered</p>
    </div>
  );
}

export default App;
