import React, { useEffect, useRef } from 'react';
import './AuraVisualization.css';

// Gradient class for canvas animations
class Gradient {
    constructor(canvas, colors, speed) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.colors = colors;
        this.speed = speed || 0.0003; // Very slow default speed
        this.size = {
            width: canvas.width,
            height: canvas.height
        };
        
        // Parse colors to RGB for smoother transitions
        this.rgbColors = this.colors.map(color => this.hexToRgb(color));
        
        // Set up animation parameters
        this.time = 0;
        
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }
    
    hexToRgb(hex) {
        // Handle CSS variable format if present
        if (hex.startsWith('var(--')) {
            hex = '#a960ee'; // Fallback color
        }
        
        // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
        let shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, (m, r, g, b) => {
            return r + r + g + g + b + b;
        });
        
        let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }
    
    onWindowResize() {
        this.size = {
            width: this.canvas.width,
            height: this.canvas.height
        };

        // Force a redraw
        this.animate();
    }
    
    animate() {
        const { width, height } = this.size;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, width, height);
        
        // Update time (extremely slow)
        this.time += this.speed;
        
        const centerX = Math.round(width / 2);
        const centerY = Math.round(height / 2);
        const radius = Math.min(width, height) * 0.4;

        // Set clip to ensure we only draw inside the circle
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.clip();
        
        // Calculate gradient parameters based on time
        const angle = this.time % (Math.PI * 2);
        
        // Create point coordinates for gradient based on slow rotation
        const x1 = centerX + Math.cos(angle) * radius * 1.2;
        const y1 = centerY + Math.sin(angle) * radius * 1.2;
        const x2 = centerX + Math.cos(angle + Math.PI) * radius * 1.2;
        const y2 = centerY + Math.sin(angle + Math.PI) * radius * 1.2;
        
        // Create a linear gradient that rotates very slowly
        const gradient = this.ctx.createLinearGradient(x1, y1, x2, y2);
        
        // Add all colors to the gradient with smooth distribution
        if (this.rgbColors.length === 1) {
            // If only one color, create a gradient from color to transparent
            const color = this.rgbColors[0];
            gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`);
            gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0.2)`);
        } else if (this.rgbColors.length === 2) {
            // If two colors, create a simple gradient between them
            const color1 = this.rgbColors[0];
            const color2 = this.rgbColors[1];
            gradient.addColorStop(0, `rgba(${color1.r}, ${color1.g}, ${color1.b}, 0.8)`);
            gradient.addColorStop(1, `rgba(${color2.r}, ${color2.g}, ${color2.b}, 0.8)`);
        } else {
            // For three or more colors, distribute them evenly
            this.rgbColors.forEach((color, i) => {
                const stop = i / (this.rgbColors.length - 1);
                gradient.addColorStop(stop, `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`);
            });
        }
        
        // Apply the gradient
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, width, height);
        
        // Create a radial overlay for a subtle spherical effect
        const radialGradient = this.ctx.createRadialGradient(
            centerX - radius * 0.3, 
            centerY - radius * 0.3,
            0,
            centerX,
            centerY,
            radius * 1.2
        );
        
        // Add very subtle lighting effect
        radialGradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
        radialGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
        radialGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0)');
        radialGradient.addColorStop(0.9, 'rgba(0, 0, 0, 0.02)');
        radialGradient.addColorStop(1, 'rgba(0, 0, 0, 0.05)');
        
        // Apply the radial overlay with a gentle blend mode
        this.ctx.globalCompositeOperation = 'soft-light';
        this.ctx.fillStyle = radialGradient;
        this.ctx.fillRect(0, 0, width, height);
        
        // Reset and apply very subtle glow to the edge
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.restore();
        
        // Add subtle edge glow
        this.ctx.shadowColor = 'rgba(255, 255, 255, 0.2)';
        this.ctx.shadowBlur = 15;
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.stroke();
    }
    
    // We won't need the drawResponseShape method anymore, as we'll use CSS classes instead
}

const AuraVisualization = ({ auraColor, auraShape, responseSpeed }) => {
    const canvasRef = useRef(null);
    const gradientInstance = useRef(null);
    
    // Extract colors from the aura gradient - use only top 3 colors
    const extractColorsFromGradient = (gradientString) => {
        if (!gradientString) return [];
        
        const colorRegex = /(#[a-f\d]{6}|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\))/gi;
        let colors = gradientString.match(colorRegex);
        
        if (!colors || colors.length === 0) {
            return [];
        }
        
        // Only use the top three colors (or less if fewer are available)
        colors = colors.slice(0, 3);
        
        // If we have less than 2 colors, duplicate the first one
        if (colors.length === 1) {
            colors.push(colors[0]);
        }
        
        return colors;
    };
    
    // Use ONLY the colors from the user's aura
    const colors = extractColorsFromGradient(auraColor);
    
    // Map response speed to shape and animation type
    let speedClass = '';
    let animationType = '';
    
    // Determine animation type based on auraShape
    if (auraShape === 'sparkling') {
        animationType = 'sparkling';
    } else if (auraShape === 'flowing') {
        animationType = 'flowing';
    } else if (auraShape === 'pulsing') {
        animationType = 'pulsing';
    } else {
        animationType = 'balanced';
    }
    
    // Determine speed class based on responseSpeed
    if (responseSpeed === 'very_fast' || responseSpeed === 'fast') {
        speedClass = 'fast';
    } else if (responseSpeed === 'medium_fast') {
        speedClass = 'medium-fast';
    } else if (responseSpeed === 'medium') {
        speedClass = 'medium';
    } else if (responseSpeed === 'medium_slow') {
        speedClass = 'medium-slow';
    } else if (responseSpeed === 'slow' || responseSpeed === 'very_slow') {
        speedClass = 'slow';
    } else {
        // Default to balanced speed if nothing provided
        speedClass = 'medium';
    }
    
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        // Adjust the canvas to be square and fit the container
        const parent = canvas.parentElement;
        const size = Math.min(parent.offsetWidth, parent.offsetHeight);
        canvas.width = size;
        canvas.height = size;
        
        // Use ONLY the colors from the aura, with no defaults
        const gradientColors = extractColorsFromGradient(auraColor);
        
        // If no colors are found, use a default color to ensure visibility
        if (gradientColors.length === 0) {
            gradientColors.push('#8864fe'); // Default purple
        }
        
        // Animation speed multiplier based on response speed
        let speedMultiplier = 1.0; // Default normal speed
        switch(speedClass) {
            case 'fast':
                speedMultiplier = 1.5;
                break;
            case 'medium-fast':
                speedMultiplier = 1.2;
                break;
            case 'medium-slow':
                speedMultiplier = 0.8;
                break;
            case 'slow':
                speedMultiplier = 0.5;
                break;
            default: // medium or balanced
                speedMultiplier = 1.0;
        }
        
        // Create the gradient instance
        gradientInstance.current = new Gradient(canvas, gradientColors, 0.001 * speedMultiplier);
        
        // Animation frame
        let animationId;
        
        // Animation loop
        const animate = () => {
            if (gradientInstance.current) {
                gradientInstance.current.animate();
            }
            animationId = requestAnimationFrame(animate);
        };
        
        // Start animation
        animate();
        
        // Handle window resize
        const handleResize = () => {
            const newSize = Math.min(parent.offsetWidth, parent.offsetHeight);
            canvas.width = newSize;
            canvas.height = newSize;
            if (gradientInstance.current) {
                gradientInstance.current.onWindowResize();
            }
        };
        
        window.addEventListener('resize', handleResize);
        
        // Force an initial render after a short delay to ensure all elements are properly sized
        setTimeout(handleResize, 100);
        
        // Cleanup
        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('resize', handleResize);
        };
    }, [auraColor, auraShape, speedClass, colors]);
    
    // Combine animation type and speed class for the full animation effect
    const containerClassName = `aura-visualization-container aura-shape-${animationType} aura-shape-${speedClass}`;
    
    return (
        <div className={containerClassName} 
            style={{
                minWidth: '300px', 
                minHeight: '300px',
                position: 'relative',
                zIndex: 10,
                margin: '0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%',
                boxSizing: 'border-box',
                padding: 0
            }}>
            <canvas ref={canvasRef} className="gradient-canvas" style={{marginTop: '-35px'}}></canvas>
        </div>
    );
};

export default AuraVisualization;
