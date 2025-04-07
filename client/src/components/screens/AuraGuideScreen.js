import React from 'react';
import { useNavigate } from 'react-router-dom';
import './AuraGuideScreen.css';

function AuraGuideScreen() {
    const navigate = useNavigate();

    const handleBack = () => {
        navigate(-1); // Go back to previous page
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
                    <button className='red-button'/>
                    <button className='blue-button'/>
                    <button className='green-button'/>
                    <button className='purple-button'/>
                    <button className='teal-button'/>
                    <button className='yellow-button'/>
                    <button className='orange-button'/>
                </div>
            </main>
        </div>
    );
}

export default AuraGuideScreen; 