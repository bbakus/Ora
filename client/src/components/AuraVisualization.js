import React, { useRef, useEffect } from 'react';
import './AuraVisualization.css';

const AuraVisualization = ({ auraColor, auraShape, responseSpeed }) => {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const animationTimeRef = useRef(0);

    useEffect(() => {
        console.log('Props changed:', { auraColor, auraShape, responseSpeed });
        
        // Check if canvas exists before proceeding
        if (!canvasRef.current) {
            console.warn('Canvas reference is null, skipping animation setup');
            return;
        }
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        // Set canvas dimensions
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        
        // Clear previous animation
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }
        
        // Start new animation
        startAnimation();
        
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [auraColor, responseSpeed]);

    const startAnimation = () => {
        // Check if canvas exists before proceeding
        if (!canvasRef.current) {
            console.warn('Canvas reference is null, skipping animation start');
            return;
        }
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        const animate = () => {
            // Check if canvas still exists before drawing
            if (!canvasRef.current) {
                console.warn('Canvas reference is null, stopping animation');
                return;
            }
            
            // Increment animation time - slightly faster now
            animationTimeRef.current += 0.01;
            drawAura(ctx);
            animationRef.current = requestAnimationFrame(animate);
        };
        
        animate();
    };

    const drawAura = (ctx) => {
        // Check if canvas exists before proceeding
        if (!canvasRef.current) {
            console.warn('Canvas reference is null, skipping aura drawing');
            return;
        }
        
        const canvas = canvasRef.current;
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Calculate center and radius
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2;
        
        // Extract colors from gradient string
        const colors = auraColor.match(/#[0-9a-f]{6}/gi) || ['#ffffff'];
        
        // Create animated diagonal gradient
        const period = 8; // Slightly faster animation cycle (8 seconds)
        
        // Use sine wave for smooth oscillation instead of resetting
        const oscillation = Math.sin(animationTimeRef.current / period * Math.PI * 2);
        const progress = (oscillation + 1) / 2; // Convert from -1 to 1 range to 0 to 1 range
        
        // Calculate gradient angle (45 degrees)
        const angle = Math.PI / 4;
        const distance = radius * 4; // Increased distance for full spectrum movement
        
        // Calculate gradient positions with full movement
        const startX = centerX - Math.cos(angle) * distance * (1 - progress);
        const startY = centerY - Math.sin(angle) * distance * (1 - progress);
        const endX = centerX + Math.cos(angle) * distance * progress;
        const endY = centerY + Math.sin(angle) * distance * progress;
        
        // Create gradient
        const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
        
        // Add color stops with smoother transitions
        colors.forEach((color, index) => {
            const position = index / (colors.length - 1);
            gradient.addColorStop(position, color);
            
            // Add intermediate color stops for smoother transitions
            if (index < colors.length - 1) {
                const nextColor = colors[index + 1];
                const midPosition = position + (1 / (colors.length - 1)) / 2;
                const midColor = blendColors(color, nextColor, 0.5);
                gradient.addColorStop(midPosition, midColor);
            }
        });
        
        // Draw aura with smoother edges
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
    };

    return (
        <div className="aura-container">
            <div className="aura-circle">
                <canvas
                    ref={canvasRef}
                    className="gradient-canvas"
                />
                <div className={`aura-decoration aura-decoration-${auraShape}`}>
                    {auraShape === 'balanced' && (
                        <>
                            <div className="balanced-glow" />
                            <div className="balanced-glow-inner" />
                        </>
                    )}
                    {auraShape === 'sparkling' && (
                        <>
                            <div className="sparkle sparkle-1" />
                            <div className="sparkle sparkle-2" />
                            <div className="sparkle sparkle-3" />
                            <div className="sparkle sparkle-4" />
                            <div className="sparkle sparkle-5" />
                            <div className="sparkle sparkle-6" />
                            <div className="sparkle sparkle-7" />
                            <div className="sparkle sparkle-8" />
                            <div className="sparkle sparkle-9" />
                            <div className="sparkle sparkle-10" />
                        </>
                    )}
                    {auraShape === 'pulsing' && (
                        <>
                            <div className="pulse-ring" />
                            <div className="pulse-ring pulse-ring-2" />
                            <div className="pulse-ring pulse-ring-3" />
                        </>
                    )}
                    {auraShape === 'flowing' && (
                        <div className="orbit-container">
                            <div className="flow-circle" />
                            <div className="flow-circle" />
                            <div className="flow-circle" />
                            <div className="flow-circle" />
                            <div className="flow-circle" />
                            <div className="flow-circle" />
                            <div className="flow-circle" />
                            <div className="flow-circle" />
                            <div className="flow-circle" />
                            <div className="flow-circle" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const blendColors = (color1, color2, ratio) => {
    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);
    
    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);
    
    const r = Math.round(r1 * (1 - ratio) + r2 * ratio);
    const g = Math.round(g1 * (1 - ratio) + g2 * ratio);
    const b = Math.round(b1 * (1 - ratio) + b2 * ratio);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

export default AuraVisualization;
