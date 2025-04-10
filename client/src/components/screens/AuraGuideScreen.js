import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AuraGuideScreen.css';

function AuraGuideScreen() {
    const navigate = useNavigate();
    const [modalOpen, setModalOpen] = useState(false);
    const [activeColor, setActiveColor] = useState(null);
    const [shapeModalOpen, setShapeModalOpen] = useState(false);
    const [activeShape, setActiveShape] = useState(null);

    const colorInfo = {
        red: {
            name: "Red",
            description: "Associated with energy, passion, and intensity. In the app, red auras indicate high energy levels and active engagement with the world around you. Users with red auras often prefer stimulating environments and social settings.",
            hexColor: "#FF0000"
        },
        blue: {
            name: "Blue",
            description: "Represents calmness, tranquility, and introspection. Blue auras in the app suggest a preference for peaceful environments and thoughtful interactions. Users with blue auras often enjoy quiet spaces for reflection.",
            hexColor: "#0000FF"
        },
        green: {
            name: "Green",
            description: "Symbolizes growth, balance, and a casual approach to life. Green auras indicate a grounded nature and easy-going attitude. Users with green auras typically enjoy natural settings and relaxed atmospheres.",
            hexColor: "#00FF00"
        },
        purple: {
            name: "Purple",
            description: "Associated with elegance, creativity, and spiritual awareness. Purple auras suggest a refined taste and appreciation for aesthetics. Users with purple auras often prefer formal or sophisticated environments.",
            hexColor: "#800080"
        },
        teal: {
            name: "Cyan",
            description: "Represents freshness, clarity, and new perspectives. Cyan auras indicate an openness to novelty and change. Users with cyan auras typically enjoy modern, innovative spaces with unique characteristics.",
            hexColor: "#00FFFF"
        },
        yellow: {
            name: "Yellow",
            description: "Symbolizes optimism, curiosity, and authenticity. Yellow auras suggest an open mind and interest in learning. Users with yellow auras often enjoy bright, stimulating environments and diverse experiences.",
            hexColor: "#FFFF00"
        },
        orange: {
            name: "Orange",
            description: "Associated with warmth, sociability, and comfort. Orange auras indicate a friendly disposition and appreciation for familiar settings. Users with orange auras typically enjoy cozy, welcoming spaces with a sense of nostalgia.",
            hexColor: "#FFA500"
        }
    };

    const shapeInfo = {
        sparkling: {
            name: "Sparkling",
            description: "The Sparkling aura shape represents high energy and quick responses. In the app, sparkling auras indicate an enthusiastic and dynamic personality. Users with sparkling auras tend to have rapid, instinctive reactions to their environment and make quick decisions.",
            gradient: "linear-gradient(to left, white, #121212)"
        },
        flowing: {
            name: "Flowing",
            description: "The Flowing aura shape symbolizes adaptability and movement. Users with flowing auras in the app typically navigate smoothly between different emotional states and social situations. This shape suggests someone who is flexible, creative, and embraces change.",
            gradient: "linear-gradient(to left, white, #121212)"
        },
        pulsing: {
            name: "Pulsing",
            description: "The Pulsing aura shape indicates a rhythmic, cyclical nature. In the app, pulsing auras belong to users who experience defined phases of focus and rest, with steady patterns in their emotional responses. This shape suggests someone who is dependable and consistent.",
            gradient: "linear-gradient(to left, white, #121212)"
        },
        balanced: {
            name: "Balanced",
            description: "The Balanced aura shape represents harmony and stability. Users with balanced auras in the app tend to maintain emotional equilibrium and thoughtful responses. This shape indicates someone who is grounded, composed, and brings a sense of calm to different environments.",
            gradient: "linear-gradient(to left, white, #121212)"
        }
    };

    const handleBack = () => {
        navigate(-1); // Go back to previous page
    };

    const handleColorClick = (color) => {
        setActiveColor(color);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setActiveColor(null);
    };

    const handleShapeClick = (shape) => {
        setActiveShape(shape);
        setShapeModalOpen(true);
    };

    const closeShapeModal = () => {
        setShapeModalOpen(false);
        setActiveShape(null);
    };

    return (
        <div className="aura-guide-container">
            <header className="aura-guide-header">
                <button className="back-button" onClick={handleBack}>
                    <span className="material-icons">arrow_back</span>
                </button>
                <h1>Aura Guide</h1>
            </header>
            
            <main className="aura-guide-content">
                <div className="guide-image-container">
                    <img 
                        src="/assets/images/image.png" 
                        alt="Aura Guide" 
                        className="guide-image" 
                    />
                </div>
                <div className='aura-guide-colors'>
                    <button className='red-button' onClick={() => handleColorClick('red')}/>
                    <button className='blue-button' onClick={() => handleColorClick('blue')}/>
                    <button className='green-button' onClick={() => handleColorClick('green')}/>
                    <button className='purple-button' onClick={() => handleColorClick('purple')}/>
                    <button className='teal-button' onClick={() => handleColorClick('teal')}/>
                    <button className='yellow-button' onClick={() => handleColorClick('yellow')}/>
                    <button className='orange-button' onClick={() => handleColorClick('orange')}/>
                </div>

                {/* Aura Shapes Grid */}
                <div className="aura-shapes-grid">
                    <div 
                        className="shape-card aura-guide-sparkle-shape"
                        onClick={() => handleShapeClick('sparkling')}
                    >
                        <div className="shape-animation">
                            <div className="aura-decoration aura-guide-aura-decoration-sparkling">
                                <div className="sparkle aura-guide-sparkle-1"></div>
                                <div className="sparkle aura-guide-sparkle-2"></div>
                                <div className="sparkle aura-guide-sparkle-3"></div>
                                <div className="sparkle aura-guide-sparkle-4"></div>
                                <div className="sparkle aura-guide-sparkle-5"></div>
                                <div className="sparkle aura-guide-sparkle-6"></div>
                                <div className="sparkle aura-guide-sparkle-7"></div>
                                <div className="sparkle aura-guide-sparkle-8"></div>
                                <div className="sparkle aura-guide-sparkle-9"></div>
                                <div className="sparkle aura-guide-sparkle-10"></div>
                            </div>
                        </div>
                    </div>

                    <div 
                        className="shape-card flowing-shape"
                        onClick={() => handleShapeClick('flowing')}
                    >
                        <div className="shape-animation">
                            <div className="aura-decoration aura-guide-aura-decoration-flowing">
                                <div className="orbit-container-aura-guide">
                                    <div className="flow-circle-aura-guide"></div>
                                    <div className="flow-circle-aura-guide"></div>
                                    <div className="flow-circle-aura-guide"></div>
                                    <div className="flow-circle-aura-guide"></div>
                                    <div className="flow-circle-aura-guide"></div>
                                    <div className="flow-circle-aura-guide"></div>
                                    <div className="flow-circle-aura-guide"></div>
                                    <div className="flow-circle-aura-guide"></div>
                                    <div className="flow-circle-aura-guide"></div>
                                    <div className="flow-circle-aura-guide"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div 
                        className="shape-card aura-guide-pulsing-shape"
                        onClick={() => handleShapeClick('pulsing')}
                    >
                        <div className="shape-animation">
                            <div className="aura-decoration-aura-guide aura-decoration-aura-guide-pulsing">
                                <div className="pulse-ring-aura-guide"></div>
                                
                            </div>
                        </div>
                    </div>

                    <div 
                        className="shape-card balanced-shape"
                        onClick={() => handleShapeClick('balanced')}
                    >
                        <div className="shape-animation">
                            <div className="aura-decoration-aura-guide aura-decoration-aura-guide-balanced">
                                <div className="balanced-glow-aura-guide"></div>
                                
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Color Information Modal */}
            {modalOpen && activeColor && (
                <div className="color-modal-overlay" onClick={closeModal}>
                    <div className="color-modal" onClick={e => e.stopPropagation()}>
                        <div 
                            className="color-modal-header" 
                            style={{ '--header-color': colorInfo[activeColor].hexColor }}
                        >
                            <h2 className="color-modal-title">{colorInfo[activeColor].name}</h2>
                            <button className="modal-close-button" onClick={closeModal}>
                                <span className="material-icons">close</span>
                            </button>
                        </div>
                        <div className="color-modal-content">
                            <p>{colorInfo[activeColor].description}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Shape Information Modal */}
            {shapeModalOpen && activeShape && (
                <div className="color-modal-overlay" onClick={closeShapeModal}>
                    <div className="color-modal" onClick={e => e.stopPropagation()}>
                        <div 
                            className="color-modal-header" 
                            style={{ background: shapeInfo[activeShape].gradient }}
                        >
                            <h2 className="color-modal-title">{shapeInfo[activeShape].name}</h2>
                            <button className="modal-close-button" onClick={closeShapeModal}>
                                <span className="material-icons">close</span>
                            </button>
                        </div>
                        <div className="color-modal-content">
                            <p>{shapeInfo[activeShape].description}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AuraGuideScreen; 