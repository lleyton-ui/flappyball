import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

const BIRD_SIZE = 35;
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const PIPE_WIDTH = 60;
const PIPE_GAP = 160;

function App() {
  const [gameState, setGameState] = useState('MENU');
  const [showHowTo, setShowHowTo] = useState(false);
  const [birdPosition, setBirdPosition] = useState(300);
  const [velocity, setVelocity] = useState(0);
  const [pipeHeight, setPipeHeight] = useState(250);
  const [pipeLeft, setPipeLeft] = useState(GAME_WIDTH);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(0);
  const [playerName, setPlayerName] = useState("");
  const [gameStarted, setGameStarted] = useState(false);
  
  const lastLifeAwardedAt = useRef(0);

  // Speed and Lives logic
  const rawMultiplier = 1 + Math.floor(score / 10);
  const speedMultiplier = Math.min(rawMultiplier, 6); 
  const currentSpeed = 4 * speedMultiplier;

  useEffect(() => {
    if (score > 0 && score % 10 === 0 && score !== lastLifeAwardedAt.current) {
      setLives(prev => (prev < 5 ? prev + 1 : prev));
      lastLifeAwardedAt.current = score;
    }
  }, [score]);

  const startGame = () => {
    setScore(0);
    setLives(0);
    lastLifeAwardedAt.current = 0;
    setGameState('PLAYING');
    setGameStarted(false); // Shows the Ready prompt
    setPipeLeft(GAME_WIDTH + 200);
    setBirdPosition(300);
    setVelocity(0);
  };

  const handleJump = useCallback(() => {
    if (gameState === 'PLAYING') {
      if (!gameStarted) setGameStarted(true); // Hides prompt and starts movement
      setVelocity(-10);
    }
  }, [gameState, gameStarted]);

  useEffect(() => {
    if (gameState === 'PLAYING' && gameStarted) {
      const id = setInterval(() => {
        setBirdPosition((pos) => pos + velocity);
        setVelocity((vel) => vel + 0.8);
      }, 24);
      return () => clearInterval(id);
    }
  }, [gameState, velocity, gameStarted]);

  useEffect(() => {
    if (gameState === 'PLAYING' && gameStarted) {
      const id = setInterval(() => {
        setPipeLeft((l) => {
          if (l <= -PIPE_WIDTH) {
            setScore(s => s + 1);
            setPipeHeight(Math.floor(Math.random() * (GAME_HEIGHT - 300)) + 100);
            return GAME_WIDTH;
          }
          return l - currentSpeed;
        });
      }, 24);
      return () => clearInterval(id);
    }
  }, [gameState, gameStarted, currentSpeed]);

  useEffect(() => {
    if (gameState !== 'PLAYING' || !gameStarted) return;
    const hitPipes = pipeLeft < 100 + BIRD_SIZE && pipeLeft + PIPE_WIDTH > 100 &&
      (birdPosition < pipeHeight || birdPosition + BIRD_SIZE > pipeHeight + PIPE_GAP);
    const hitBounds = birdPosition >= GAME_HEIGHT - BIRD_SIZE || birdPosition <= 0;

    if (hitPipes || hitBounds) {
      if (lives > 0) {
        setLives(l => l - 1);
        setPipeLeft(GAME_WIDTH + 200);
        setBirdPosition(300);
        setVelocity(0);
        setGameStarted(false); // Resets to "Ready" state after losing a life
      } else {
        setGameState('GAMEOVER');
      }
    }
  }, [birdPosition, pipeLeft, lives, gameStarted, gameState, pipeHeight]);

  return (
    <div className="container" onMouseDown={handleJump}>
      <div className="header-ui">
        <div className="stat-pill">SCORE <span className="gold-text">{score}</span></div>
        <div className="stat-pill">LIVES <span className="red-text">🎁 {lives}/5</span></div>
        <div className="stat-pill">SPEED <span className="cyan-text">x{speedMultiplier.toFixed(1)}</span></div>
      </div>

      <div className="game-viewport xmas-bg">
        {[...Array(10)].map((_, i) => <div key={i} className={`snowflake s-${i}`} />)}

        <div className="bird ornament" style={{ top: birdPosition, transform: `rotate(${velocity * 3}deg)` }} />
        
        <div className="pipe candy-cane" style={{ left: pipeLeft, height: pipeHeight, width: PIPE_WIDTH, top: 0 }} />
        <div className="pipe candy-cane" style={{ left: pipeLeft, top: pipeHeight + PIPE_GAP, height: GAME_HEIGHT - pipeHeight - PIPE_GAP, width: PIPE_WIDTH }} />

        {/* READY PROMPT FIX */}
        {gameState === 'PLAYING' && !gameStarted && (
          <div className="ready-container">
             <div className="ready-prompt xmas-text">READY?</div>
             <div className="click-hint">CLICK TO JUMP! 🎄</div>
          </div>
        )}

        {gameState === 'MENU' && (
          <div className="menu-overlay">
            <h1 className="xmas-title">MERRY<br/>FLAPPY</h1>
            <div className="glass-panel">
              <input type="text" placeholder="NAME YOUR ELF..." className="modern-input" value={playerName} onChange={(e) => setPlayerName(e.target.value)} />
              <button className="btn-primary xmas-btn" onClick={startGame}>START</button>
              <button className="btn-outline" onClick={() => setShowHowTo(true)}>HOW TO PLAY</button>
            </div>
          </div>
        )}

        {showHowTo && (
          <div className="menu-overlay z-high">
            <div className="glass-panel">
              <h2 className="red-text">WINTER RULES</h2>
              <div className="instruction-content">
                <p>❄️ Tap to jump</p>
                <p>🎁 +1 Life every 10 pts (Max 5)</p>
                <p>⚡ Max speed x6.0</p>
              </div>
              <button className="btn-primary xmas-btn" onClick={() => setShowHowTo(false)}>GOT IT!</button>
            </div>
          </div>
        )}

        {gameState === 'GAMEOVER' && (
          <div className="menu-overlay">
            <div className="glass-panel">
              <h2 className="red-text">NAUGHTY LIST!</h2>
              <div className="final-score">{score}</div>
              <button className="btn-primary xmas-btn" onClick={startGame}>RETRY</button>
              <button className="btn-outline" onClick={() => setGameState('MENU')}>MENU</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;