import { motion } from "framer-motion";
import { RotateCcwIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const gridSize = 26;

const ROWS = 12;
const COLS = 12;
const BLOCK_WIDTH = 20;
const BLOCK_HEIGHT = 5;
const PADDLE_HEIGHT = 5;
const BALL_SIZE = 4;

type Ball = { x: number; y: number; dx: number; dy: number };
type Paddle = { x: number; width: number };

export const GameBlockBreaker: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ball, setBall] = useState<Ball>({ x: 130, y: 320, dx: 0, dy: 0 });
  const [paddle, setPaddle] = useState<Paddle>({ x: 100, width: 60 });
  const [blocks, setBlocks] = useState(
    Array.from({ length: ROWS }, () => Array(COLS).fill(true))
  );
  const [score, setScore] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ width: 300, height: 400 });
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [justStarted, setJustStarted] = useState(false);

  useEffect(() => {
    const updateSize = () => {
      const width = window.innerWidth / 1.5;
      const height = window.innerHeight / 1.5;
      const mobile = width < 768;
      const arenaWidth = mobile ? width : width * 0.5;
      const arenaHeight = mobile ? height : height * 0.5;
      const cell = Math.floor(Math.min(arenaWidth, arenaHeight) / gridSize);
      const canvas = cell * gridSize;
      setCanvasSize({ width: canvas, height: canvas });
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      setPaddle(p => ({ ...p, x: Math.max(p.x - 10, 0) }));
    }
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      setPaddle(p => ({
        ...p,
        x: Math.min(p.x + 10, canvasSize.width - paddle.width),
      }));
    }
    if ((e.key === "w" || e.key === "ArrowUp") && !running && !gameOver) {
      setJustStarted(true);
      setRunning(true);
      setBall(prev => ({
        ...prev,
        dx: 2,
        dy: -2,
      }));
    }
  };

  useEffect(() => {
    if (justStarted) {
      const timeout = setTimeout(() => setJustStarted(false), 100);
      return () => clearTimeout(timeout);
    }
  }, [justStarted]);

  const drawGame = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
 
    ctx.beginPath();
    ctx.fillStyle = "#de1d5e";
    ctx.roundRect(
      paddle.x,
      canvasSize.height - PADDLE_HEIGHT - 10,
      paddle.width,
      PADDLE_HEIGHT,
      3
    );
    ctx.fill();
    ctx.closePath();
 
    const ballX = running ? ball.x : paddle.x + paddle.width / 2;
    const ballY = running ? ball.y : canvasSize.height - PADDLE_HEIGHT - 10 - BALL_SIZE;
    ctx.beginPath();
    ctx.arc(ballX, ballY, BALL_SIZE, 0, Math.PI * 2);
    ctx.fillStyle = "#484e80";
    ctx.fill();
    ctx.closePath();
 
    const spacingX = (canvasSize.width - COLS * BLOCK_WIDTH) / (COLS + 1);
    const spacingY = 6;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (blocks[r][c]) {
          const x = spacingX + c * (BLOCK_WIDTH + spacingX);
          const y = spacingY + r * (BLOCK_HEIGHT + spacingY);
          ctx.beginPath();
          ctx.fillStyle = "#269dd8";
          ctx.roundRect(x, y, BLOCK_WIDTH, BLOCK_HEIGHT, 2);
          ctx.fill();
          ctx.closePath();
        }
      }
    }

    if (!running || justStarted) return;

    setBall(prev => {
      let { x, y, dx, dy } = prev;
      x += dx;
      y += dy;

      if (x + BALL_SIZE > canvasSize.width || x - BALL_SIZE < 0) dx = -dx;
      if (y - BALL_SIZE < 0) dy = -dy;

      if (
        y + BALL_SIZE > canvasSize.height - PADDLE_HEIGHT - 10 &&
        x > paddle.x &&
        x < paddle.x + paddle.width
      ) {
        dy = -dy;
      }

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (blocks[r][c]) {
            const bx = spacingX + c * (BLOCK_WIDTH + spacingX);
            const by = spacingY + r * (BLOCK_HEIGHT + spacingY);
            if (
              x > bx &&
              x < bx + BLOCK_WIDTH &&
              y > by &&
              y < by + BLOCK_HEIGHT
            ) {
              dy = -dy;
              setBlocks(prev => {
                const updated = [...prev];
                updated[r][c] = false;
                return updated;
              });
              setScore(s => s + 1);
            }
          }
        }
      }

      const remainingBlocks = blocks.flat().filter(Boolean).length;
      if (remainingBlocks === 0 || y > canvasSize.height) {
        setRunning(false);
        setGameOver(true);
      }

      return { x, y, dx, dy };
    });
  };

  const resetGame = () => {
    setBall({ x: 100, y: 100, dx: 0, dy: 0 });
    setPaddle({ x: 100, width: 60 });
    setBlocks(Array.from({ length: ROWS }, () => Array(COLS).fill(true)));
    setScore(0);
    setRunning(false);
    setGameOver(false);
    setJustStarted(false);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    const interval = setInterval(() => drawGame(ctx), 1000 / 60);
    return () => clearInterval(interval);
  });

  useEffect(() => {
    const ctx = CanvasRenderingContext2D.prototype as any;

    if (!ctx.roundRect) {
      ctx.roundRect = function (
        x: number,
        y: number,
        w: number,
        h: number,
        r: number | { tl: number; tr: number; br: number; bl: number }
      ) {
        if (typeof r === "number") r = { tl: r, tr: r, br: r, bl: r };
        else r = Object.assign({ tl: 0, tr: 0, br: 0, bl: 0 }, r);

        this.beginPath();
        this.moveTo(x + r.tl, y);
        this.lineTo(x + w - r.tr, y);
        this.quadraticCurveTo(x + w, y, x + w, y + r.tr);
        this.lineTo(x + w, y + h - r.br);
        this.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
        this.lineTo(x + r.bl, y + h);
        this.quadraticCurveTo(x, y + h, x, y + h - r.bl);
        this.lineTo(x, y + r.tl);
        this.quadraticCurveTo(x, y, x + r.tl, y);
        this.closePath();
      };
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  return (
    <div className="flex flex-col items-center justify-center min-h-screen -mt-10">
      {/* <motion.img
        src="/images/logo/myasn-3-v2.png"
        alt="myasn-logo"
        className="object-cover w-[200px]"
        animate={{ y: [0, -20, 0], x: [0, 20, 0], scale: [1, 1.2, 1], rotate: [0, 1.5, -1.5, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      /> */}
      <motion.h1
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="text-[1.3em] font-extrabold uppercase text-center text-primaryBkn my-2"
      >
        Situs Sedang Dalam Pemeliharaan
      </motion.h1>
      <p className="text-[0.7em] text-secondaryBkn text-center font-semibold mb-2 px-4">
        Pecahkan semua blok untuk menghibur diri! <br />
        Tekan W atau ↑ untuk memulai dan A D atau ← → untuk menggerakan paddle
      </p>

      <div
        className="shadow-lg"
        style={{
          backgroundColor: "#eff2f6",
          border: "2px solid #269dd8",
          borderRadius: "20px",
          width: canvasSize.width,
          height: canvasSize.height,
        }}
      >
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          style={{ borderRadius: "20px" }}
        />
      </div>

      {gameOver && (
        <div className="flex flex-col items-center mt-3 gap-2 text-[0.8em] font-semibold">
          <span className="text-primaryBkn">Skor: {score}</span>
          <button
            onClick={resetGame}
            className="flex items-center px-3 py-1 rounded text-white bg-[#DF2463]"
          >
            <RotateCcwIcon className="mr-1 w-4 h-4" /> Coba Lagi
          </button>
        </div>
      )}
    </div>
  );
};
