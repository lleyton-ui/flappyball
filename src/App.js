import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

const BIRD_SIZE = 35;
const PIPE_WIDTH = 60;
const PIPE_GAP = 170;
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

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
  
  const [isSlowMo, setIsSlowMo] = useState(false);
  const [slowMoTimer, setSlowMoTimer] = useState(0);
  const [slowMoCooldown, setSlowMoCooldown] = useState(0);

  const [isScoreBoost, setIsScoreBoost] = useState(false);
  const [scoreBoostTimer, setScoreBoostTimer] = useState(0);
  const [scoreCooldown, setScoreCooldown] = useState(0);

  const [leaderboard, setLeaderboard] = useState([]);
  const lastLifeAwardedAt = useRef(0);
  const requestRef = useRef();

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 850;
  const mobileAdjustment = isMobile ? 1.4 : 1.0; 

  // --- PC KEYBOARD HANDLERS ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gameState !== 'PLAYING') return;

      if (e.key === '1') {
        triggerSlowMo(e);
      } else if (e.key === '2') {
        triggerScoreBoost(e);
      } else if (e.key === ' ' || e.key === 'ArrowUp') {
        handleAction();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, gameStarted, slowMoCooldown, scoreCooldown, isSlowMo, isScoreBoost]);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('flappy_leaderboard')) || [];
    setLeaderboard(saved);
  }, []);

  useEffect(() => {
    if (score > 0 && score % 10 === 0 && score !== lastLifeAwardedAt.current) {
      setLives(prev => (prev < 5 ? prev + 1 : prev));
      lastLifeAwardedAt.current = score;
    }
  }, [score]);

  useEffect(() => {
    let timer;
    if (gameState === 'PLAYING') {
      timer = setInterval(() => {
        if (isSlowMo) {
          setSlowMoTimer(p => (p <= 0.1 ? (setIsSlowMo(false), setSlowMoCooldown(10), 0) : p - 0.1));
        } else {
          setSlowMoCooldown(p => Math.max(0, p - 0.1));
        }
        if (isScoreBoost) {
          setScoreBoostTimer(p => (p <= 0.1 ? (setIsScoreBoost(false), setScoreCooldown(15), 0) : p - 0.1));
        } else {
          setScoreCooldown(p => Math.max(0, p - 0.1));
        }
      }, 100);
    }
    return () => clearInterval(timer);
  }, [isSlowMo, isScoreBoost, gameState]);

  const rawMultiplier = 1 + Math.floor(score / 10) * 0.2;
  const baseSpeedMultiplier = Math.min(rawMultiplier, 2.0);
  const speedMultiplier = isSlowMo ? baseSpeedMultiplier * 0.5 : baseSpeedMultiplier;
  const currentSpeed = 3.5 * speedMultiplier * mobileAdjustment;

  const startGame = () => {
    setScore(0); setLives(0); setGameState('PLAYING'); setGameStarted(false);
    setIsSlowMo(false); setSlowMoTimer(0); setSlowMoCooldown(0);
    setIsScoreBoost(false); setScoreBoostTimer(0); setScoreCooldown(0);
    setPipeLeft(GAME_WIDTH); setBirdPosition(300); setVelocity(0);
  };

  const triggerSlowMo = (e) => {
    if (e && e.stopPropagation) e.stopPropagation(); 
    if (e && e.cancelable) e.preventDefault();
    if (!isSlowMo && slowMoCooldown <= 0 && gameStarted) { 
      setIsSlowMo(true); 
      setSlowMoTimer(4); 
    }
  };

  const triggerScoreBoost = (e) => {
    if (e && e.stopPropagation) e.stopPropagation(); 
    if (e && e.cancelable) e.preventDefault();
    if (!isScoreBoost && scoreCooldown <= 0 && gameStarted) { 
      setIsScoreBoost(true); 
      setScoreBoostTimer(7); 
    }
  };

  const handleAction = useCallback(() => {
    if (gameState === 'PLAYING') {
      if (!gameStarted) setGameStarted(true);
      setVelocity(JUMP_STRENGTH * mobileAdjustment);
    }
  }, [gameState, gameStarted, mobileAdjustment]);

  const animate = useCallback(() => {
    if (gameState === 'PLAYING' && gameStarted) {
      setVelocity(v => {
        const nextVel = Math.min(v + (GRAVITY * mobileAdjustment), MAX_FALL_SPEED * mobileAdjustment);
        setBirdPosition(pos => pos + nextVel);
        return nextVel;
      });
      setPipeLeft(prev => {
        if (prev <= -PIPE_WIDTH) {
          setScore(s => s + (isScoreBoost ? 2 : 1));
          setPipeHeight(Math.floor(Math.random() * (GAME_HEIGHT - 350)) + 100);
          return GAME_WIDTH;
        }
        return prev - currentSpeed;
      });
    }
    requestRef.current = requestAnimationFrame(animate);
  }, [gameState, gameStarted, currentSpeed, mobileAdjustment, isScoreBoost]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [animate]);

  useEffect(() => {
    if (gameState !== 'PLAYING' || !gameStarted) return;
    const hit = pipeLeft < 100 + BIRD_SIZE && pipeLeft + PIPE_WIDTH > 100 && (birdPosition < pipeHeight || birdPosition + BIRD_SIZE > pipeHeight + PIPE_GAP);
    if (hit || birdPosition >= GAME_HEIGHT - BIRD_SIZE || birdPosition <= 0) {
      if (lives > 0) {
        setLives(l => l - 1); setPipeLeft(GAME_WIDTH); setBirdPosition(300); setVelocity(0); setGameStarted(false);
        setIsSlowMo(false); setIsScoreBoost(false);
      } else {
        const updated = [...leaderboard, { name: playerName || "Anon", score, id: Date.now() }].sort((a,b) => b.score - a.score).slice(0, 5);
        setLeaderboard(updated); localStorage.setItem('flappy_leaderboard', JSON.stringify(updated));
        setGameState('GAMEOVER');
      }
    }
  }, [birdPosition, pipeLeft, lives, gameStarted, gameState, pipeHeight, score, playerName, leaderboard]);

  return (
    <div className="container" onMouseDown={handleAction} onTouchStart={handleAction}>
      <div className="header-ui">
        <div className="stat-pill">SCORE <span className="gold-text">{score}</span></div>
        <div className="stat-pill">LIVES <span className="red-text">🎁 {lives}/5</span></div>
        {isSlowMo && <div className="stat-pill boost-pill cyan">❄️ {slowMoTimer.toFixed(1)}s</div>}
        {isScoreBoost && <div className="stat-pill boost-pill gold">🔥 {scoreBoostTimer.toFixed(1)}s</div>}
      </div>

      <div className="game-viewport">
        <div className="bird ornament" style={{ top: birdPosition, transform: `rotate(${Math.min(velocity * 4, 90)}deg)`, left: '100px' }} />
        <div className="pipe candy-cane" style={{ left: pipeLeft, height: pipeHeight, width: PIPE_WIDTH, top: 0 }} />
        <div className="pipe candy-cane" style={{ left: pipeLeft, top: pipeHeight + PIPE_GAP, height: GAME_HEIGHT - pipeHeight - PIPE_GAP, width: PIPE_WIDTH }} />

        {gameState === 'PLAYING' && !gameStarted && <div className="ready-container"><div className="ready-prompt">READY?</div><div className="click-hint">TAP TO JUMP! 🎄</div></div>}

        {gameState === 'PLAYING' && gameStarted && (
          <div className="boost-controls">
            <button 
              className={`boost-btn slow ${slowMoCooldown > 0 ? 'cd' : ''}`} 
              onMouseDown={triggerSlowMo} 
              onTouchStart={triggerSlowMo}
              disabled={isSlowMo || slowMoCooldown > 0}
            >
              <span className="kb-hint">1</span>
              {isSlowMo ? "ACTIVE" : slowMoCooldown > 0 ? `${Math.ceil(slowMoCooldown)}s` : "❄️ SLOW"}
            </button>
            <button 
              className={`boost-btn score ${scoreCooldown > 0 ? 'cd' : ''}`} 
              onMouseDown={triggerScoreBoost} 
              onTouchStart={triggerScoreBoost}
              disabled={isScoreBoost || scoreCooldown > 0}
            >
              <span className="kb-hint">2</span>
              {isScoreBoost ? "ACTIVE" : scoreCooldown > 0 ? `${Math.ceil(scoreCooldown)}s` : "🔥 +2"}
            </button>
          </div>
        )}

        {gameState === 'MENU' && (
          <div className="menu-overlay">
            <h1 className="xmas-title">MERRY<br/>FLAPPY</h1>
            <div className="glass-panel">
              <input type="text" placeholder="NAME..." className="modern-input" value={playerName} onChange={(e) => setPlayerName(e.target.value)} onMouseDown={(e) => e.stopPropagation()} />
              <button className="btn-primary" onClick={startGame}>START GAME</button>
              <button className="btn-outline" onClick={(e) => { e.stopPropagation(); setShowHowTo(true); }}>HOW TO PLAY</button>
              <button className="btn-outline" onClick={(e) => { e.stopPropagation(); setShowLeaderboard(true); }}>LEADERBOARD</button>
            </div>
          </div>
        )}

        {showHowTo && (
          <div className="menu-overlay modal-layer">
            <div className="glass-panel">
              <h2 className="gold-text">HOW TO PLAY</h2>
              <ul className="instruction-list">
                <li>🖱️ <strong>Click / [Space]</strong> to jump.</li>
                <li>❄️ <strong>Key [1]</strong>: Slo-mo (4s).</li>
                <li>🔥 <strong>Key [2]</strong>: +2 Score (7s).</li>
                <li>🎁 <strong>10 Points</strong> = +1 Life.</li>
              </ul>
              <button className="btn-primary" onClick={(e) => { e.stopPropagation(); setShowHowTo(false); }}>GOT IT!</button>
            </div>
          </div>
        )}

        {showLeaderboard && (
          <div className="menu-overlay modal-layer">
            <div className="glass-panel">
              <h2 className="gold-text">TOP SCORES</h2>
              <div className="leaderboard-list">
                {leaderboard.map((e, i) => <div key={e.id} className="leaderboard-item"><span>{i+1}. {e.name}</span><span className="gold-text">{e.score}</span></div>)}
              </div>
              <button className="btn-primary" onClick={(e) => { e.stopPropagation(); setShowLeaderboard(false); }}>CLOSE</button>
            </div>
          </div>
        )}

        {gameState === 'GAMEOVER' && (
          <div className="menu-overlay">
            <div className="glass-panel">
              <h2 className="red-text">GAME OVER!</h2>
              <div className="final-score">{score}</div>
              <button className="btn-primary" onClick={startGame}>RETRY</button>
              <button className="btn-outline" onClick={() => setGameState('MENU')}>MENU</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;