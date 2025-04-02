import React, { useEffect, useRef } from 'react';
import './AuraVisualization.css';

const AuraVisualization = ({ auraColor = "#8864fe", auraShape = "balanced", responseSpeed = "medium" }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Ensure the canvas has proper dimensions
        const setCanvasDimensions = () => {
            const parent = canvas.parentElement;
            if (!parent) return;
            
            // Make canvas fill the container, with device pixel ratio for clarity
            const dpr = window.devicePixelRatio || 1;
            canvas.width = parent.clientWidth * dpr;
            canvas.height = parent.clientHeight * dpr;
            
            // Set display size
            canvas.style.width = `${parent.clientWidth}px`;
            canvas.style.height = `${parent.clientHeight}px`;
            
            drawAura();
        };

        // Draw the aura visualization
        const drawAura = () => {
            const ctx = canvas.getContext('2d');
            const width = canvas.width;
            const height = canvas.height;
            
            // Clear the canvas completely first
            ctx.clearRect(0, 0, width, height);
            
            // Calculate center and radius
            const centerX = width / 2;
            const centerY = height / 2;
            const radius = Math.min(width, height) / 2;
            
            // Create a circle shape for the aura
            ctx.globalCompositeOperation = 'source-over';
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2, false);
            ctx.closePath();
            
            // DEFENSIVE: Ensure auraColor is not null/undefined
            const safeAuraColor = auraColor || "#8864fe";
            console.log("Using aura color:", safeAuraColor);
            
            // Extract colors from gradient if needed
            let colors = [];
            if (typeof safeAuraColor === 'string' && safeAuraColor.includes('gradient')) {
                // Parse the gradient colors
                const matches = safeAuraColor.match(/#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/g);
                if (matches && matches.length > 0) {
                    console.log('Extracted colors:', matches);
                    colors = matches;
                } else {
                    console.log('No colors extracted, using default');
                    colors = ['#8864fe', '#b68efe'];
                }
            } else {
                // Use the single color with a lighter version
                colors = [safeAuraColor, lightenColor(safeAuraColor, 30)];
            }
            
            // Create a radial gradient that fills the entire circle
            const gradient = ctx.createRadialGradient(
                centerX, centerY, 0,      // Inner circle at center
                centerX, centerY, radius  // Outer circle at radius
            );
            
            // Add color stops to create smooth gradient
            colors.forEach((color, index) => {
                const stop = index / Math.max(1, colors.length - 1); // Avoid division by zero
                gradient.addColorStop(stop, color);
                console.log(`Added color stop: ${stop}, ${color}`);
            });
            
            // Apply gradient as fill
            ctx.fillStyle = gradient;
            ctx.fill();
            
            // Add subtle glow effect
            ctx.shadowBlur = 15;
            ctx.shadowColor = colors[0];
            ctx.fill();
            
            console.log(`Canvas dimensions: ${width}x${height}, Radius: ${radius}`);
            console.log(`Drawing aura with color: ${safeAuraColor}, Shape: ${auraShape || 'balanced'}`);
        };
        
        // Helper to lighten a color
        const lightenColor = (color, percent) => {
            try {
                if (!color || typeof color !== 'string' || !color.startsWith('#')) {
                    return '#b68efe'; // Default light purple
                }
                
                const num = parseInt(color.replace('#', ''), 16);
                const amt = Math.round(2.55 * percent);
                const R = (num >> 16) + amt;
                const G = (num >> 8 & 0x00FF) + amt;
                const B = (num & 0x0000FF) + amt;
                
                return '#' + (
                    0x1000000 +
                    (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
                    (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
                    (B < 255 ? (B < 1 ? 0 : B) : 255)
                ).toString(16).slice(1);
            } catch (e) {
                console.error("Error in lightenColor:", e);
                return '#b68efe'; // Default light purple
            }
        };

        // Initial draw
        setCanvasDimensions();
        
        // Redraw on resize
        window.addEventListener('resize', setCanvasDimensions);
        
        // Clean up
        return () => {
            window.removeEventListener('resize', setCanvasDimensions);
        };
    }, [auraColor, auraShape, responseSpeed]);

    return (
        <div className="aura-visualization-container" 
            style={{
                minWidth: '300px', 
                minHeight: '300px',
                position: 'relative',
                margin: '0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                overflow: 'hidden'
            }}>
            <canvas ref={canvasRef} className={`gradient-canvas aura-shape-${auraShape || 'balanced'}`} 
                style={{
                    borderRadius: '50%'
                }}
            />
        </div>
    );
};

// Static method for consistent aura color processing
AuraVisualization.processAuraColor = (auraColor) => {
    if (!auraColor) return '#8864fe';
    
    if (typeof auraColor === 'string' && auraColor.includes('gradient')) {
        const match = auraColor.match(/#[0-9A-Fa-f]{6}/);
        return match ? match[0] : '#8864fe';
    }
    
    return auraColor;
};

export default AuraVisualization;
