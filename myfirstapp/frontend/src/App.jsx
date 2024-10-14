import React, { useRef, useState, useEffect } from 'react';
import Draggable from 'react-draggable';
import './CustomScrollbar.css'; // Assuming you have custom scrollbar styling

const Button = ({ onClick, className, children }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 rounded-md font-semibold ${className}`}
    >
        {children}
    </button>
);

const ColorPicker = ({ colors, activeColor, onColorSelect }) => (
    <div className="flex space-x-2">
        {colors.map((color) => (
            <div
                key={color}
                onClick={() => onColorSelect(color)}
                className="w-6 h-6 cursor-pointer rounded-full"
                style={{
                    backgroundColor: color,
                    border: activeColor === color ? '2px solid #fff' : 'none',
                }}
            />
        ))}
    </div>
);

const EraserTool = ({ size, onSizeChange, isActive, onToggle }) => (
    <div className="flex items-center space-x-2">
        <input
            type="range"
            min="5"
            max="100"
            value={size}
            onChange={(e) => onSizeChange(Number(e.target.value))}
            className="w-32"
        />
        <span className="text-white">Eraser: {size}px</span>
        <Button
            onClick={onToggle}
            className={isActive ? 'bg-yellow-500 text-white' : 'bg-gray-700 text-white'}
        >
            {isActive ? 'Eraser Active' : 'Activate Eraser'}
        </Button>
    </div>
);

export default function App() {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('white');
    const [latexExpression, setLatexExpression] = useState('');
    const [latexPosition, setLatexPosition] = useState({ x: 10, y: 200 });
    const [eraserSize, setEraserSize] = useState(10);
    const [isEraserActive, setIsEraserActive] = useState(false);
    const [canvasSize, setCanvasSize] = useState({
        width: window.innerWidth,
        height: window.innerHeight - 100,
    });

    // Handle resizing of canvas
    useEffect(() => {
        const handleResize = () => {
            setCanvasSize({
                width: Math.max(window.innerWidth, containerRef.current.scrollWidth),
                height: Math.max(window.innerHeight - 100, containerRef.current.scrollHeight),
            });
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Prevent pull-to-refresh gesture on mobile devices
    useEffect(() => {
        const preventPullToRefresh = (e) => {
            if (e.touches.length > 1) e.preventDefault();
        };

        document.addEventListener('touchmove', preventPullToRefresh, { passive: false });

        return () => {
            document.removeEventListener('touchmove', preventPullToRefresh);
        };
    }, []);

    // Set up canvas and MathJax
    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            canvas.width = canvasSize.width;
            canvas.height = canvasSize.height;
            ctx.lineCap = 'round';
            ctx.lineWidth = 3;
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-MML-AM_CHTML';
        script.async = true;
        document.head.appendChild(script);

        script.onload = () => {
            window.MathJax.Hub.Config({
                tex2jax: { inlineMath: [['$', '$'], ['\\(', '\\)']] },
            });
        };

        return () => {
            document.head.removeChild(script);
        };
    }, [canvasSize]);

    // Update MathJax expression
    useEffect(() => {
        if (latexExpression && window.MathJax) {
            setTimeout(() => {
                window.MathJax.Hub.Queue(['Typeset', window.MathJax.Hub]);
            }, 0);
        }
    }, [latexExpression]);

    const startDrawing = (x, y) => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
    };

    const draw = (x, y) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (isEraserActive) {
            ctx.clearRect(
                x - eraserSize / 2,
                y - eraserSize / 2,
                eraserSize,
                eraserSize
            );
        } else {
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.lineTo(x, y);
            ctx.stroke();
        }
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    // Mouse events for drawing
    const handleMouseDown = (e) => {
        startDrawing(e.nativeEvent.offsetX + containerRef.current.scrollLeft, e.nativeEvent.offsetY + containerRef.current.scrollTop);
    };

    const handleMouseMove = (e) => {
        draw(e.nativeEvent.offsetX + containerRef.current.scrollLeft, e.nativeEvent.offsetY + containerRef.current.scrollTop);
    };

    // Touch events for drawing
    const handleTouchStart = (e) => {
        const touch = e.touches[0];
        const rect = canvasRef.current.getBoundingClientRect();
        startDrawing(touch.clientX - rect.left + containerRef.current.scrollLeft, touch.clientY - rect.top + containerRef.current.scrollTop);
    };

    const handleTouchMove = (e) => {
        const touch = e.touches[0];
        const rect = canvasRef.current.getBoundingClientRect();
        draw(touch.clientX - rect.left + containerRef.current.scrollLeft, touch.clientY - rect.top + containerRef.current.scrollTop);
    };

    const resetCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setLatexExpression('');
    };

    const processImage = async () => {
        const canvas = canvasRef.current;
        const imageDataUrl = canvas.toDataURL('image/png');

        try {
            const response = await fetch('http://localhost:5000/process-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ imageDataUrl }),
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            setLatexExpression(data.latexExpression);
        } catch (error) {
            console.error('Error processing image:', error);
            setLatexExpression('Error processing image');
        }
    };

    const handleDragStop = (e, data) => {
        const canvas = canvasRef.current;
        const newX = Math.max(0, Math.min(data.x, canvas.width - 300));
        const newY = Math.max(0, Math.min(data.y, canvas.height - 150));
        setLatexPosition({ x: newX, y: newY });
    };

    const handleScroll = () => {
        const container = containerRef.current;
        const newWidth = Math.max(window.innerWidth, container.scrollLeft + container.clientWidth + 200);
        const newHeight = Math.max(window.innerHeight - 100, container.scrollTop + container.clientHeight + 200);

        if (newWidth > canvasSize.width || newHeight > canvasSize.height) {
            setCanvasSize({ width: newWidth, height: newHeight });
        }
    };

    return (
        <div className="relative w-full h-screen bg-gray-900 overflow-hidden">
            <div className="absolute top-0 left-0 z-10 p-4 space-y-4">
                <div className="flex space-x-4 items-center">
                    <Button onClick={resetCanvas} className="bg-red-500 text-white">
                        Reset
                    </Button>
                    <Button onClick={processImage} className="bg-green-500 text-white">
                        Calculate
                    </Button>
                    <ColorPicker
                        colors={['white', 'red', 'green', 'blue', 'yellow', 'purple']}
                        activeColor={color}
                        onColorSelect={(newColor) => {
                            setColor(newColor);
                            setIsEraserActive(false);
                        }}
                    />
                </div>
                <EraserTool
                    size={eraserSize}
                    onSizeChange={setEraserSize}
                    isActive={isEraserActive}
                    onToggle={() => setIsEraserActive(!isEraserActive)}
                />
            </div>

            <div
                ref={containerRef}
                className="absolute top-0 left-0 w-full h-full overflow-auto custom-scrollbar"
                onScroll={handleScroll}
            >
                <canvas
                    ref={canvasRef}
                    className="cursor-crosshair"
                    style={{ width: canvasSize.width, height: canvasSize.height }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={stopDrawing}
                    onMouseOut={stopDrawing}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={stopDrawing}
                />
            </div>

            {latexExpression && (
                <Draggable
                    position={latexPosition}
                    onStop={handleDragStop}
                    bounds="parent"
                >
                    <div
                        className="absolute p-4 bg-white rounded shadow-lg overflow-auto"
                        style={{ maxWidth: '80%', maxHeight: '50%' }}
                    >
                        <div className="latex-content" style={{ whiteSpace: 'pre-wrap' }}>
                            {latexExpression}
                        </div>
                    </div>
                </Draggable>
            )}
        </div>
    );
}
