import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

const BIRD_SIZE = 35;
const PIPE_WIDTH = 60;
const PIPE_GAP = 170;
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

// PHYSICS CONSTANTS
const GRAVITY = 0.2;        
const JUMP_STRENGTH = -4.5;   
const MAX_FALL_SPEED = 4;   

function App() {
  const [gameState, setGameState] = useState('MENU');
  const [showHowTo, setShowHowTo] = useState(false); 
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [birdPosition, setBirdPosition] = useState(300);
  const [velocity, setVelocity] = useState(0);
  const [pipeHeight, setPipeHeight] = useState(250);
  const [pipeLeft, setPipeLeft] = useState(GAME_WIDTH);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(0);
  const [playerName, setPlayerName] = useState("");
  const [gameStarted, setGameStarted] = useState(false);
  
  // BOOST & COOLDOWN STATE
  const [isSlowMo, setIsSlowMo] = useState(false);
  const [slowMoTimer, setSlowMoTimer] = useState(0);
  const [cooldownTimer, setCooldownTimer] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);

  const lastLifeAwardedAt = useRef(0);
  const requestRef = useRef();

  // Detection for Mobile Speed Sync
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 850;
  const mobileAdjustment = isMobile ? 1.4 : 1.0; 

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('flappy_leaderboard')) || [];
    setLeaderboard(saved);
  }, []);

  // Award lives logic
  useEffect(() => {
    if (score > 0 && score % 10 === 0 && score !== lastLifeAwardedAt.current) {
      setLives(prev => (prev < 5 ? prev + 1 : prev));
      lastLifeAwardedAt.current = score;
    }
  }, [score]);

  // SYNCED SPEED LOGIC
  const rawMultiplier = 1 + Math.floor(score / 10) * 0.2;
  const baseSpeedMultiplier = Math.min(rawMultiplier, 2.0);
  const speedMultiplier = isSlowMo ? baseSpeedMultiplier * 0.5 : baseSpeedMultiplier;
  const currentSpeed = 3.5 * speedMultiplier * mobileAdjustment;

  // Timers Logic
  useEffect(() => {
    let timer;
    if ((isSlowMo || cooldownTimer > 0) && gameState === 'PLAYING') {
      timer = setInterval(() => {
        if (isSlowMo) {
          setSlowMoTimer(prev => {
            if (prev <= 0.1) {
              setIsSlowMo(false);
              setCooldownTimer(10.0); 
              return 0;
            }
            return prev - 0.1;
          });
        }
        if (cooldownTimer > 0 && !isSlowMo) {
          setCooldownTimer(prev => Math.max(0, prev - 0.1));
        }
      }, 100);
    }
    return () => clearInterval(timer);
  }, [isSlowMo, cooldownTimer, gameState]);

  const startGame = () => {
    setScore(0);
    setLives(0); 
    setIsSlowMo(false);
    setSlowMoTimer(0);
    setCooldownTimer(0);
    lastLifeAwardedAt.current = 0;
    setGameState('PLAYING');
    setGameStarted(false); 
    setPipeLeft(GAME_WIDTH);
    setBirdPosition(300);
    setVelocity(0);
  };

  const handleGameOver = useCallback(() => {
    const newEntry = { name: playerName || "Anon", score: score, id: Date.now() };
    const updated = [...leaderboard, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    setLeaderboard(updated);
    localStorage.setItem('flappy_leaderboard', JSON.stringify(updated));
    setGameState('GAMEOVER');
  }, [score, playerName, leaderboard]);

  const triggerSlowMo = (e) => {
    e.stopPropagation();
    if (gameState === 'PLAYING' && !isSlowMo && cooldownTimer <= 0 && gameStarted) {
      setIsSlowMo(true);
      setSlowMoTimer(4.0);
    }
  };

  const handleAction = useCallback((e) => {
    if (gameState === 'PLAYING') {
      if (!gameStarted) setGameStarted(true);
      setVelocity(JUMP_STRENGTH * mobileAdjustment);
    }
  }, [gameState, gameStarted, mobileAdjustment]);

  const animate = useCallback(() => {
    if (gameState === 'PLAYING' && gameStarted) {
      setVelocity(v => {
        const adjustedGravity = GRAVITY * mobileAdjustment;
        const nextVel = Math.min(v + adjustedGravity, MAX_FALL_SPEED * mobileAdjustment);
        setBirdPosition(pos => pos + nextVel);
        return nextVel;
      });

      setPipeLeft(prev => {
        if (prev <= -PIPE_WIDTH) {
          setScore(s => s + 1);
          setPipeHeight(Math.floor(Math.random() * (GAME_HEIGHT - 350)) + 100);
          return GAME_WIDTH; 
        }
        return prev - currentSpeed;
      });
    }
    requestRef.current = requestAnimationFrame(animate);
  }, [gameState, gameStarted, currentSpeed, mobileAdjustment]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [animate]);

  // Collision
  useEffect(() => {
    if (gameState !== 'PLAYING' || !gameStarted) return;
    const hitPipes = pipeLeft < 100 + BIRD_SIZE && pipeLeft + PIPE_WIDTH > 100 &&
      (birdPosition < pipeHeight || birdPosition + BIRD_SIZE > pipeHeight + PIPE_GAP);
    const hitBounds = birdPosition >= GAME_HEIGHT - BIRD_SIZE || birdPosition <= 0;

    if (hitPipes || hitBounds) {
      if (lives > 0) {
        setLives(l => l - 1);
        setPipeLeft(GAME_WIDTH);
        setBirdPosition(300);
        setVelocity(0);
        setGameStarted(false); // Resets to "READY?" screen
        setIsSlowMo(false);
        setSlowMoTimer(0);
      } else {
        handleGameOver();
      }
    }
  }, [birdPosition, pipeLeft, lives, gameStarted, gameState, pipeHeight, handleGameOver]);

  return (
    <div className="container" onMouseDown={handleAction} onTouchStart={handleAction}>
      <div className="header-ui">
        <div className="stat-pill">SCORE <span className="gold-text">{score}</span></div>
        <div className="stat-pill">LIVES <span className="red-text">🎁 {lives}/5</span></div>
        <div className="stat-pill">SPEED <span className="cyan-text">x{speedMultiplier.toFixed(1)}</span></div>
        {isSlowMo && <div className="stat-pill boost-pill">SLO-MO: {slowMoTimer.toFixed(1)}s</div>}
      </div>

      <div className="game-viewport">
        <div className="bird ornament" style={{ top: birdPosition, transform: `rotate(${Math.min(velocity * 4, 90)}deg)`, left: '100px' }} />
        <div className="pipe candy-cane" style={{ left: pipeLeft, height: pipeHeight, width: PIPE_WIDTH, top: 0 }} />
        <div className="pipe candy-cane" style={{ left: pipeLeft, top: pipeHeight + PIPE_GAP, height: GAME_HEIGHT - pipeHeight - PIPE_GAP, width: PIPE_WIDTH }} />

        {gameState === 'PLAYING' && !gameStarted && (
          <div className="ready-container">
             <div className="ready-prompt">READY?</div>
             <div className="click-hint">TAP TO JUMP! 🎄</div>
          </div>
        )}

        {gameState === 'PLAYING' && gameStarted && (
            <button 
              className={`slow-mo-btn ${cooldownTimer > 0 ? 'cooldown' : ''}`} 
              onClick={triggerSlowMo} 
              disabled={isSlowMo || cooldownTimer > 0}
            >
                {isSlowMo ? `ACTIVE (${slowMoTimer.toFixed(1)}s)` : 
                 cooldownTimer > 0 ? `COOLDOWN ${Math.ceil(cooldownTimer)}s` : "❄️ SLO-MO"}
            </button>
        )}

        {gameState === 'MENU' && (
          <div className="menu-overlay">
            <h1 className="xmas-title">MERRY<br/>FLAPPY</h1>
            <div className="glass-panel">
              <input type="text" placeholder="NAME..." className="modern-input" value={playerName} onChange={(e) => setPlayerName(e.target.value)} onMouseDown={(e) => e.stopPropagation()} />
              <button className="btn-primary xmas-btn" onClick={startGame}>START</button>
              <button className="btn-outline" onClick={(e) => { e.stopPropagation(); setShowHowTo(true); }}>HOW TO PLAY</button>
              <button className="btn-outline" onClick={(e) => { e.stopPropagation(); setShowLeaderboard(true); }}>LEADERBOARD</button>
            </div>
          </div>
        )}

        {showLeaderboard && (
          <div className="menu-overlay modal-layer">
            <div className="glass-panel">
              <h2 className="gold-text">TOP SCORES</h2>
              <div className="leaderboard-list">
                {leaderboard.map((entry, i) => (
                  <div key={entry.id} className="leaderboard-item">
                    <span>{i + 1}. {entry.name}</span>
                    <span className="gold-text">{entry.score}</span>
                  </div>
                ))}
              </div>
              <button className="btn-primary" onClick={(e) => { e.stopPropagation(); setShowLeaderboard(false); }}>CLOSE</button>
            </div>
          </div>
        )}

        {showHowTo && (
          <div className="menu-overlay modal-layer">
            <div className="glass-panel instruction-panel">
              <h2 className="gold-text">HOW TO PLAY</h2>
              <ul className="instruction-list">
                <li>🖱️ <strong>Click/Tap</strong> to jump up.</li>
                <li>❄️ <strong>Slo-mo</strong>: 4s duration, 10s cooldown.</li>
                <li>🎁 Every <strong>10 points</strong> gives a Life.</li>
                <li>⚡ Speed caps at <strong>x2.0</strong>!</li>
              </ul>
              <button className="btn-primary" onClick={(e) => { e.stopPropagation(); setShowHowTo(false); }}>GOT IT!</button>
            </div>
          </div>
        )}

        {gameState === 'GAMEOVER' && (
          <div className="menu-overlay">
            <div className="glass-panel">
              <h2 className="red-text">GAME OVER!</h2>
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