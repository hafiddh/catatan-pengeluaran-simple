import { motion } from "framer-motion";
import { HomeIcon, RotateCcwIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const gridSize = 20;
const initialSnake = [{ x: 2, y: 2 }];
const initialFood = { x: 5, y: 5 };

type Position = {
  x: number;
  y: number;
};

export const GameUlarUlar: React.FC = () => {
  const [snake, setSnake] = useState<Position[]>(initialSnake);
  const [food, setFood] = useState<Position>(initialFood);
  const [direction, setDirection] = useState<string>("RIGHT");
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [cellSize, setCellSize] = useState<number>(20);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [started, setStarted] = useState<boolean>(false);
  const [statLogin, setStatLogin] = useState<boolean>(false);

  useEffect(() => {
    const statLog = localStorage.getItem("user-data");
    if (statLog) {
      setStatLogin(true);
    }

    const updateSize = () => {
      const width = window.innerWidth / 1.5;
      const height = window.innerHeight / 1.5;
      const mobile = width < 768;
      setIsMobile(mobile);
      const arenaWidth = mobile ? width : width * 0.5;
      const arenaHeight = mobile ? height : height * 0.5;
      const cell = Math.floor(Math.min(arenaWidth, arenaHeight) / gridSize);
      setCellSize(cell);
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (!started) setStarted(true);
      switch (key) {
        case "arrowup":
        case "w":
          if (direction !== "DOWN") setDirection("UP");
          break;
        case "arrowdown":
        case "s":
          if (direction !== "UP") setDirection("DOWN");
          break;
        case "arrowleft":
        case "a":
          if (direction !== "RIGHT") setDirection("LEFT");
          break;
        case "arrowright":
        case "d":
          if (direction !== "LEFT") setDirection("RIGHT");
          break;
      }
    },
    [direction, started]
  );

  useEffect(() => {
    if (gameOver || !started) return;
    const interval = setInterval(() => {
      const newSnake = [...snake];
      const head = { ...newSnake[0] };

      switch (direction) {
        case "UP":
          head.y -= 1;
          break;
        case "DOWN":
          head.y += 1;
          break;
        case "LEFT":
          head.x -= 1;
          break;
        case "RIGHT":
          head.x += 1;
          break;
      }

      newSnake.unshift(head);

      if (
        head.x < 0 ||
        head.x >= gridSize ||
        head.y < 0 ||
        head.y >= gridSize ||
        newSnake.slice(1).some((seg) => seg.x === head.x && seg.y === head.y)
      ) {
        setGameOver(true);
        return;
      }

      if (head.x === food.x && head.y === food.y) {
        const newFood = {
          x: Math.floor(Math.random() * gridSize),
          y: Math.floor(Math.random() * gridSize),
        };
        setFood(newFood);
        setScore((prev) => prev + 1);
      } else {
        newSnake.pop();
      }

      setSnake(newSnake);
    }, 200);

    return () => clearInterval(interval);
  }, [snake, direction, food, gameOver, started]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const restartGame = () => {
    setSnake(initialSnake);
    setFood(initialFood);
    setDirection("RIGHT");
    setGameOver(false);
    setScore(0);
    setStarted(false);
  };

  const moveUp = () => direction !== "DOWN" && setDirection("UP");
  const moveDown = () => direction !== "UP" && setDirection("DOWN");
  const moveLeft = () => direction !== "RIGHT" && setDirection("LEFT");
  const moveRight = () => direction !== "LEFT" && setDirection("RIGHT");

  const renderSnake = () =>
    snake.map((seg, i) => (
      <div
        key={i}
        style={{
          position: "absolute",
          width: cellSize,
          height: cellSize,
          backgroundColor: "#DF2463",
          borderRadius: "4px",
          top: seg.y * cellSize,
          left: seg.x * cellSize,
        }}
      />
    ));

  const renderFood = () => (
    <div
      style={{
        position: "absolute",
        width: cellSize,
        height: cellSize,
        backgroundColor: "#FACC15",
        borderRadius: "50%",
        top: food.y * cellSize,
        left: food.x * cellSize,
      }}
    />
  );

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-gradient-to-br  to-secondaryBkn/50 via-white from-primaryBkn/20 text-white">
      <motion.img
        src="/images/logo/myasn-3-v2.png"
        alt="myasn-logo"
        className="object-cover w-[200px]"
        animate={{
          y: [0, -20, 0],
          x: [0, 20, 0],
          scale: [1, 1.2, 1],
          rotate: [0, 1.5, -1.5, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.h1
        animate={{ y: [0, -10, 0] }}
        transition={{
          duration: 10,
          repeat: Infinity,
          repeatType: "loop",
          ease: "easeInOut",
        }}
        className="text-[1.5em] font-extrabold uppercase text-center text-primaryBkn my-4"
      >
        Halaman Tidak Ditemukan
      </motion.h1>

      <p className="text-[0.9em] border p-1 bg-white rounded-lg text-secondaryBkn hover:text-primaryBkn cursor-pointer text-center font-semibold mb-4 px-4 flex items-center justify-center">
        <HomeIcon className="h-4 w-4 mr-1" />
        {statLogin ? (
          <a href="/dashboard">Kembali ke Dashboard</a>
        ) : (
          <a href="/">Kembali ke Beranda</a>
        )}
      </p>

      <p className="text-[0.9em] text-secondaryBkn text-center font-semibold mb-4 px-4">
        Tabrak 🌕 sebanyak-banyaknya dan hindari menabrak diri sendiri atau
        pembatas! <br />
        Gunakan ↑ ← ↓ → atau WASD untuk bergerak.
      </p>

      <div
        className="relative shadow-lg"
        style={{
          position: "relative",
          width: gridSize * cellSize,
          height: gridSize * cellSize,
          backgroundColor: "#eff2f6",
          borderRadius: "20px",
          border: "2px solid #DF2463",
          overflow: "hidden",
        }}
      >
        <div
          className="absolute inset-0 -mt-12 flex flex-col items-center justify-center  font-extrabold text-primaryBkn opacity-10"
          style={{
            zIndex: 0,
            textAlign: "center",
          }}
        >
          <div className="text-[4em] md:text-[6em]">404</div>
          <div className="text-[1em]">Halaman Tidak Ditemukan</div>
        </div>

        <div style={{ position: "relative", zIndex: 1 }}>
          {renderSnake()}
          {renderFood()}
        </div>

        {gameOver && (
          <div
            className="font-semibold text-[1em] text-white"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              backgroundColor: "rgba(0,0,0,0.5)",
              padding: "10px",
              borderRadius: "10px",
              textAlign: "center",
              zIndex: 2,
            }}
          >
            Game Over!
            <div className="mt-[10px] text-[1em] text-white font-semibold">
              Skor: {score}
            </div>
            <button
              onClick={restartGame}
              className="flex items-center text-[0.8em]"
              style={{
                marginTop: "10px",
                backgroundColor: "#DF2463",
                color: "#fff",
                border: "none",
                padding: "6px 8px",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              <RotateCcwIcon className="mr-1 w-4 h-4" /> Coba Lagi
            </button>
          </div>
        )}
      </div>

      {isMobile && (
        <div
          style={{
            marginTop: "15px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div>
            <button onClick={moveUp} style={controlStyle}>
              ↑
            </button>
          </div>
          <div style={{ marginTop: "5px" }}>
            <button onClick={moveLeft} style={controlStyle}>
              ←
            </button>
            <button onClick={moveDown} style={controlStyle}>
              ↓
            </button>
            <button onClick={moveRight} style={controlStyle}>
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const controlStyle: React.CSSProperties = {
  width: "60px",
  height: "60px",
  margin: "5px",
  fontSize: "24px",
  borderRadius: "10px",
  backgroundColor: "#DF2463",
  color: "white",
  border: "none",
  cursor: "pointer",
  touchAction: "none",
};
