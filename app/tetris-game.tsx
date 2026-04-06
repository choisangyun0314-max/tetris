"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { playSound } from './sounds';
import './tetris.css';

// Tetromino definitions
const TETROMINOS = {
  I: { shape: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], color: 'I' },
  J: { shape: [[1, 0, 0], [1, 1, 1], [0, 0, 0]], color: 'J' },
  L: { shape: [[0, 0, 1], [1, 1, 1], [0, 0, 0]], color: 'L' },
  O: { shape: [[1, 1], [1, 1]], color: 'O' },
  S: { shape: [[0, 1, 1], [1, 1, 0], [0, 0, 0]], color: 'S' },
  T: { shape: [[0, 1, 0], [1, 1, 1], [0, 0, 0]], color: 'T' },
  Z: { shape: [[1, 1, 0], [0, 1, 1], [0, 0, 0]], color: 'Z' },
};

const RANDOM_TETROMINO = () => {
  const keys = Object.keys(TETROMINOS) as Array<keyof typeof TETROMINOS>;
  const randKey = keys[Math.floor(Math.random() * keys.length)];
  return TETROMINOS[randKey];
};

const COLS = 10;
const ROWS = 20;

export default function TetrisGame() {
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'PAUSED' | 'SUCCESS' | 'GAMEOVER'>('START');
  const [userName, setUserName] = useState('');
  const [grid, setGrid] = useState<string[][]>(Array.from({ length: ROWS }, () => Array(COLS).fill('empty')));
  const [currentPiece, setCurrentPiece] = useState<{ pos: { x: number, y: number }, tetromino: any } | null>(null);
  const [nextPiece, setNextPiece] = useState<any>(RANDOM_TETROMINO());
  const [clearedLines, setClearedLines] = useState(0);
  const [time, setTime] = useState(0); // in seconds
  const [topPlayers, setTopPlayers] = useState<{name: string, time: string}[]>([]);
  const [isLoadingTop, setIsLoadingTop] = useState(false);
  const [highScore, setHighScore] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);

  // Formatting time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start the game
  const startGame = () => {
    if (!userName.trim()) {
      alert('이름을 입력해주세요!');
      return;
    }
    setGrid(Array.from({ length: ROWS }, () => Array(COLS).fill('empty')));
    setClearedLines(0);
    setTime(0);
    setGameState('PLAYING');
    spawnPiece();
    playSound('start');
  };

  const spawnPiece = useCallback(() => {
    const piece = nextPiece;
    setNextPiece(RANDOM_TETROMINO());
    const newPos = { x: Math.floor(COLS / 2) - 1, y: 0 };
    
    // Check if spawn is blocked
    if (checkCollision(newPos.x, newPos.y, piece.shape, Array.from({ length: ROWS }, () => Array(COLS).fill('empty')))) {
        // This is a simplified check, actual check needs current grid
    }
    
    setCurrentPiece({ pos: newPos, tetromino: piece });
  }, [nextPiece]);

  // Check collision
  const checkCollision = (x: number, y: number, shape: number[][], currentGrid: string[][]) => {
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col] !== 0) {
          const newX = x + col;
          const newY = y + row;
          if (
            newX < 0 || newX >= COLS ||
            newY >= ROWS ||
            (newY >= 0 && currentGrid[newY][newX] !== 'empty')
          ) {
            return true;
          }
        }
      }
    }
    return false;
  };

  // Lock piece and check lines
  const lockPiece = useCallback((pieceToLock = currentPiece) => {
    if (!pieceToLock) return;

    const newGrid = [...grid.map(row => [...row])];
    pieceToLock.tetromino.shape.forEach((row: number[], yIdx: number) => {
      row.forEach((value: number, xIdx: number) => {
        if (value !== 0) {
          const gridY = pieceToLock.pos.y + yIdx;
          const gridX = pieceToLock.pos.x + xIdx;
          if (gridY >= 0 && gridY < ROWS && gridX >= 0 && gridX < COLS) {
            newGrid[gridY][gridX] = pieceToLock.tetromino.color;
          }
        }
      });
    });

    // Check for full lines
    let fullLineCount = 0;
    const filteredGrid = newGrid.filter(row => {
      const isFull = row.every(cell => cell !== 'empty');
      if (isFull) fullLineCount++;
      return !isFull;
    });

    while (filteredGrid.length < ROWS) {
      filteredGrid.unshift(Array(COLS).fill('empty'));
    }

    setGrid(filteredGrid);
    const newClearedCount = clearedLines + fullLineCount;
    setClearedLines(newClearedCount);

    if (fullLineCount > 0) {
        playSound('clear');
    }

    if (newClearedCount >= 3) {
      setGameState('SUCCESS');
      return;
    }

    // Spawn next piece
    const nextSpawnPiece = nextPiece;
    const nextSpawnPos = { x: Math.floor(COLS / 2) - 1, y: 0 };
    
    if (checkCollision(nextSpawnPos.x, nextSpawnPos.y, nextSpawnPiece.shape, filteredGrid)) {
      setGameState('GAMEOVER');
      playSound('gameover');
    } else {
      setCurrentPiece({ pos: nextSpawnPos, tetromino: nextSpawnPiece });
      setNextPiece(RANDOM_TETROMINO());
    }
  }, [currentPiece, grid, clearedLines, nextPiece]);

  // Move piece
  const movePiece = useCallback((dx: number, dy: number) => {
    if (gameState !== 'PLAYING' || !currentPiece) return;
    
    if (!checkCollision(currentPiece.pos.x + dx, currentPiece.pos.y + dy, currentPiece.tetromino.shape, grid)) {
      setCurrentPiece(prev => prev ? ({ ...prev, pos: { x: prev.pos.x + dx, y: prev.pos.y + dy } }) : null);
      if (dx !== 0) playSound('move');
    } else if (dy > 0) {
      lockPiece();
    }
  }, [currentPiece, grid, gameState, lockPiece]);

  // Rotate piece
  const rotatePiece = useCallback(() => {
    if (gameState !== 'PLAYING' || !currentPiece) return;
    const rotated = currentPiece.tetromino.shape[0].map((_: any, index: number) =>
      currentPiece.tetromino.shape.map((col: number[]) => col[index]).reverse()
    );
    if (!checkCollision(currentPiece.pos.x, currentPiece.pos.y, rotated, grid)) {
      setCurrentPiece(prev => prev ? ({ ...prev, tetromino: { ...prev.tetromino, shape: rotated } }) : null);
      playSound('rotate');
    }
  }, [currentPiece, grid, gameState]);

  // Hard drop
  const hardDrop = useCallback(() => {
    if (gameState !== 'PLAYING' || !currentPiece) return;
    
    let dropY = currentPiece.pos.y;
    while (!checkCollision(currentPiece.pos.x, dropY + 1, currentPiece.tetromino.shape, grid)) {
      dropY++;
    }
    
    lockPiece({ ...currentPiece, pos: { ...currentPiece.pos, y: dropY } });
  }, [currentPiece, grid, gameState, lockPiece]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'PLAYING') return;
      
      if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === 'ArrowLeft') movePiece(-1, 0);
      if (e.key === 'ArrowRight') movePiece(1, 0);
      if (e.key === 'ArrowDown') movePiece(0, 1);
      if (e.key === 'ArrowUp') rotatePiece();
      if (e.key === ' ') hardDrop();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, movePiece, rotatePiece, hardDrop]);

  // Game Timer
  useEffect(() => {
    if (gameState === 'PLAYING') {
      timerRef.current = setInterval(() => {
        setTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  // Game Loop
  useEffect(() => {
    if (gameState === 'PLAYING') {
      gameLoopRef.current = setInterval(() => {
        movePiece(0, 1);
      }, 800);
    } else {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    }
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [gameState, movePiece]);

  // Sync with Google Sheets on Success
  useEffect(() => {
    if (gameState === 'SUCCESS') {
      const saveRecord = async () => {
        const url = process.env.NEXT_PUBLIC_SHEET_API_URL;
        if (!url) return;

        setIsLoadingTop(true);
        try {
          const params = new URLSearchParams({
            name: userName,
            time: formatTime(time),
          });
          const response = await fetch(`${url}?${params.toString()}`, {
            method: 'GET',
          });
          const result = await response.json();
          if (result.top3) {
            setTopPlayers(result.top3);
          }
          console.log('Record saved and TOP 3 fetched via GET');
        } catch (error) {
          console.error('Error with API:', error);
        } finally {
          setIsLoadingTop(false);
        }
      };
      saveRecord();
    }
  }, [gameState, userName, time]);

  // Render the grid with current piece
  const renderGrid = () => {
    const displayGrid = grid.map(row => [...row]);
    if (currentPiece && gameState === 'PLAYING') {
      currentPiece.tetromino.shape.forEach((row: number[], yIdx: number) => {
        row.forEach((value: number, xIdx: number) => {
          if (value !== 0) {
            const gridY = currentPiece.pos.y + yIdx;
            const gridX = currentPiece.pos.x + xIdx;
            if (gridY >= 0 && gridY < ROWS && gridX >= 0 && gridX < COLS) {
              displayGrid[gridY][gridX] = currentPiece.tetromino.color;
            }
          }
        });
      });
    }
    return displayGrid;
  };

  return (
    <div className="tetris-container">
      {gameState === 'START' && (
        <div className="glass-panel">
          <h1 className="title">TETRIS</h1>
          <div className="input-group">
            <label className="input-label">플레이어 이름</label>
            <input 
              type="text" 
              className="text-input" 
              placeholder="이름을 입력하세요" 
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && startGame()}
            />
          </div>
          <button className="primary-button" onClick={startGame}>게임 시작</button>
          <div className="academic-info">
            <p>AI코딩을활용한창의적앱개발</p>
            <p>생명공학전공 | 202202565</p>
            <p>최상윤</p>
          </div>
        </div>
      )}

      {(gameState === 'PLAYING' || gameState === 'PAUSED') && (
        <>
          <div className="controls-overlay">
            <button className="control-btn" onClick={() => setGameState(gameState === 'PLAYING' ? 'PAUSED' : 'PLAYING')}>
              {gameState === 'PLAYING' ? '일시정지' : '계속하기'}
            </button>
            <button className="control-btn" onClick={() => setGameState('START')}>나가기</button>
          </div>

          <div className="game-layout">
            <div className="stats-panel">
              <div className="stat-box">
                <div className="stat-label">제거된 줄</div>
                <div className="stat-value">{clearedLines} / 3</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">진행 시간</div>
                <div className="stat-value">{formatTime(time)}</div>
              </div>
            </div>

            <div className="game-board">
              {renderGrid().map((row, y) => 
                row.map((cell, x) => (
                  <div key={`${x}-${y}`} className={`cell ${cell}`}></div>
                ))
              )}
            </div>

            <div className="stats-panel">
              <div className="stat-box">
                <div className="stat-label">다음 블록</div>
                <div 
                  className="next-piece-box"
                  style={{
                    gridTemplateRows: `repeat(${nextPiece.shape.length}, 25px)`,
                    gridTemplateColumns: `repeat(${nextPiece.shape.length}, 25px)`,
                    width: `${nextPiece.shape.length * 26}px`,
                    height: `${nextPiece.shape.length * 26}px`,
                  }}
                >
                  {nextPiece.shape.map((row: number[], y: number) => 
                    row.map((cell: number, x: number) => (
                      <div key={`${x}-${y}`} className={`cell ${cell ? nextPiece.color : 'empty'}`}></div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {gameState === 'PAUSED' && (
            <div className="modal">
               <div className="glass-panel">
                 <h2 className="title" style={{ fontSize: '2rem' }}>일시정지됨</h2>
                 <button className="primary-button" onClick={() => setGameState('PLAYING')}>계속하기</button>
               </div>
            </div>
          )}
        </>
      )}

      {(gameState === 'SUCCESS' || gameState === 'GAMEOVER') && (
        <div className="modal">
          <div className="glass-panel">
            <h2 className={gameState === 'SUCCESS' ? "success-title" : "title"} style={{ fontSize: '3rem' }}>
              {gameState === 'SUCCESS' ? '승리!' : '게임 종료'}
            </h2>
            <div className="stat-box" style={{ width: '100%', marginBottom: '1.5rem' }}>
              <div className="stat-label">최종 시간</div>
              <div className="stat-value">{formatTime(time)}</div>
            </div>

            {isLoadingTop ? (
              <div className="stat-box" style={{ width: '100%', marginBottom: '2rem' }}>
                <div className="stat-label">명예의 전당 정보를 불러오고 있습니다...</div>
              </div>
            ) : topPlayers.length > 0 && (
              <div className="stat-box" style={{ width: '100%', marginBottom: '2rem', background: 'rgba(255,255,255,0.05)' }}>
                <div className="stat-label" style={{ color: '#fbbf24', fontWeight: 'bold' }}>🏆 명예의 전당 (TOP 3)</div>
                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {topPlayers.map((p, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#e2e8f0' }}>
                      <span>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} {p.name}</span>
                      <span style={{ fontWeight: 'bold' }}>{p.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <button className="primary-button" onClick={() => {
              setGameState('START');
              setTopPlayers([]);
            }}>다시 하기</button>
          </div>
        </div>
      )}
    </div>
  );
}
