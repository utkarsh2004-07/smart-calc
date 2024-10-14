import React, { useRef, useState, useEffect } from 'react';
import Draggable from 'react-draggable';
import { GoogleGenerativeAI } from '@google/generative-ai';

const Button = ({ onClick, className, children }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 rounded-md font-semibold ${className}`}
    >
        {children}
    </button>
);

const DrawingApp = () => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('white');
    const [latexExpression, setLatexExpression] = useState('');
    const [latexPosition, setLatexPosition] = useState({ x: 10, y: 200 });
    const [eraserSize, setEraserSize] = useState(10);
    const [isEraserActive, setIsEraserActive] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight - 100;
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
    }, []);

    // Mobile touch gesture prevention for pull-to-refresh
    useEffect(() => {
        let startY;

        const handleTouchStart = (e) => {
            startY = e.touches[0].pageY;
        };

        const handleTouchMove = (e) => {
            const y = e.touches[0].pageY;
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

            if (scrollTop === 0 && y > startY) {
                e.preventDefault();  // Disable pull-to-refresh
            }
        };

        document.addEventListener('touchstart', handleTouchStart, { passive: false });
        document.addEventListener('touchmove', handleTouchMove, { passive: false });

        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchmove', handleTouchMove);
        };
    }, []);

    const startDrawing = (e) => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.beginPath();
        const offsetX = e.nativeEvent.offsetX || e.touches[0].clientX - canvas.getBoundingClientRect().left;
        const offsetY = e.nativeEvent.offsetY || e.touches[0].clientY - canvas.getBoundingClientRect().top;
        ctx.moveTo(offsetX, offsetY);
        setIsDrawing(true);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const offsetX = e.nativeEvent.offsetX || e.touches[0].clientX - canvas.getBoundingClientRect().left;
        const offsetY = e.nativeEvent.offsetY || e.touches[0].clientY - canvas.getBoundingClientRect().top;

        if (isEraserActive) {
            ctx.clearRect(offsetX - eraserSize / 2, offsetY - eraserSize / 2, eraserSize, eraserSize);
        } else {
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.lineTo(offsetX, offsetY);
            ctx.stroke();
        }
    };

    const stopDrawing = () => {
        setIsDrawing(false);
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
            const genAI = new GoogleGenerativeAI(process.env.GEMIN_KEY); // Replace with your API key
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            const result = await model.generateContent([ /* ... */ ]);

            const response = await result.response;
            const text = await response.text();
            setLatexExpression(` (${text} )`); // Set LaTeX expression for rendering
        } catch (error) {
            console.error('Error processing image:', error);
            setLatexExpression('Error processing image');
        }
    };

    const selectColor = (newColor) => {
        setColor(newColor);
        setIsEraserActive(false); // Deactivate eraser when selecting a color
    };

    const handleDragStop = (e, data) => {
        const canvas = canvasRef.current;
        if (data.x + 300 > canvas.width) {
            setLatexPosition({ x: canvas.width - 300, y: data.y });
        } else if (data.x < 0) {
            setLatexPosition({ x: 0, y: data.y });
        } else if (data.y + 150 > canvas.height) {
            setLatexPosition({ x: data.x, y: canvas.height - 150 });
        } else if (data.y < 0) {
            setLatexPosition({ x: data.x, y: 0 });
        } else {
            setLatexPosition({ x: data.x, y: data.y });
        }
    };

    return (
        <div className="relative w-full h-screen bg-gray-900">
            <div className="absolute top-0 left-0 z-10 p-4 space-x-4 flex flex-wrap items-center">
                <Button onClick={resetCanvas} className="bg-red-500 text-white">
                    Reset
                </Button>
                <Button onClick={processImage} className="bg-green-500 text-white">
                    Process
                </Button>
            </div>

            {/* Color palette and controls */}
            <div className="absolute top-16 left-0 z-10 p-4 space-x-4 flex flex-col md:flex-row items-center">
                {/* Color palette for selecting the color */}
                <div className="flex space-x-2 overflow-x-auto">
                    {['white', 'red', 'green', 'blue', 'yellow', 'purple'].map((clr) => (
                        <div
                            key={clr}
                            onClick={() => selectColor(clr)}
                            className="w-6 h-6 cursor-pointer"
                            style={{ backgroundColor: clr, border: color === clr ? '2px solid #fff' : 'none' }}
                        />
                    ))}
                </div>

                {/* Range input for eraser size */}
                <div className="flex items-center mt-2 md:mt-0">
                    <input
                        type="range"
                        min="5"
                        max="100"
                        value={eraserSize}
                        onChange={(e) => setEraserSize(e.target.value)}
                        className="mx-2"
                    />
                    <span className="text-white">Eraser Size: {eraserSize}px</span>
                </div>

                {/* Button to activate the eraser */}
                <Button
                    onClick={() => {
                        setIsEraserActive(!isEraserActive);
                    }}
                    className={isEraserActive ? "bg-yellow-500 text-white" : "bg-gray-700 text-white"}
                >
                    {isEraserActive ? "Eraser Active" : "Activate Eraser"}
                </Button>
            </div>

            <canvas
                ref={canvasRef}
                className="absolute top-0 w-full cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseOut={stopDrawing}
                onTouchStart={startDrawing} // Add touch events
                onTouchMove={draw}          // Add touch events
                onTouchEnd={stopDrawing}    // Add touch events
            />

            {latexExpression && (
                <Draggable
                    defaultPosition={latexPosition}
                    onStop={handleDragStop}
                >
                    <div
                        className="absolute p-4 bg-white rounded shadow-lg max-w-md break-words overflow-auto"
                        style={{ wordWrap: 'break-word', maxWidth: '1400px', maxHeight: '300px' }}
                    >
                        <div className="latex-content" style={{ whiteSpace: 'pre-wrap' }}>
                            {latexExpression}
                        </div>
                    </div>
                </Draggable>
            )}
        </div>
    );
};

export default DrawingApp;
