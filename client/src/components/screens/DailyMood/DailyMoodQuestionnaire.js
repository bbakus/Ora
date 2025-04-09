import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './DailyMoodQuestionnaire.css';

function DailyMoodQuestionnaire() {
    const navigate = useNavigate();
    const { userId } = useParams();
    const [questions, setQuestions] = useState([]);
    const [responses, setResponses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [selectedOptions, setSelectedOptions] = useState([]);
    const [questionStartTime, setQuestionStartTime] = useState(Date.now());
    const [responseTimes, setResponseTimes] = useState([]);
    
    // Fetch AI-generated questions when component mounts
    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                setLoading(true);
                console.log(`Fetching daily mood questions for user: ${userId}`);
                
                const response = await fetch(`http://localhost:5001/api/users/${userId}/daily-mood/questions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ userId })
                });
                
                if (!response.ok) {
                    throw new Error(`Failed to fetch questions: ${response.status}`);
                }
                
                const data = await response.json();
                console.log('Received data from server:', data);
                
                if (data.status !== 'success') {
                    throw new Error(`API returned error: ${data.message || 'Unknown error'}`);
                }
                
                // Parse the questions if they're returned as a string
                let parsedQuestions;
                try {
                    parsedQuestions = typeof data.questions === 'string' 
                        ? JSON.parse(data.questions) 
                        : data.questions;
                        
                    // Validate that we got an array of questions
                    if (!Array.isArray(parsedQuestions) || parsedQuestions.length < 1) {
                        throw new Error('Invalid question format received from server');
                    }
                    
                    console.log('Parsed questions:', parsedQuestions);
                    setQuestions(parsedQuestions);
                    // Initialize selectedOptions array with -1 for each question (nothing selected)
                    setSelectedOptions(new Array(parsedQuestions.length).fill(-1));
                    setLoading(false);
                    
                    // Start tracking time for the first question
                    setQuestionStartTime(Date.now());
                } catch (e) {
                    console.error('Error parsing questions:', e);
                    throw new Error(`Failed to parse questions: ${e.message}`);
                }
            } catch (err) {
                console.error('Error fetching questions:', err);
                setError(`Failed to load questions: ${err.message}`);
                setLoading(false);
            }
        };
        
        fetchQuestions();
    }, [userId]);
    
    // Function to skip the questionnaire and go back to dashboard
    const handleSkipQuestionnaire = () => {
        navigate(`/auth/${userId}/dashboard`);
    };
    
    const handleOptionSelect = (optionIndex) => {
        // Record response time before updating state
        const endTime = Date.now();
        const responseTime = endTime - questionStartTime;
        console.log(`Question ${currentQuestion + 1} response time: ${responseTime}ms`);
        
        // Update response times array
        setResponseTimes([...responseTimes, responseTime]);
        
        const newSelectedOptions = [...selectedOptions];
        newSelectedOptions[currentQuestion] = optionIndex;
        setSelectedOptions(newSelectedOptions);
        
        // Automatically move to the next question or submit if this is the last question
        if (currentQuestion < questions.length - 1) {
            // Move to next question
            setCurrentQuestion(currentQuestion + 1);
            // Reset timer for the next question
            setQuestionStartTime(Date.now());
        } else {
            // This was the last question, submit the responses
            handleSubmit();
        }
    };
    
    // Function to calculate aura shape based on response times (like in AuraQuestionnaire)
    const calculateAuraShape = () => {
        if (responseTimes.length === 0) return 'balanced';

        const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        console.log("Average response time:", avgResponseTime); // Debug log
        
        const fastestResponse = Math.min(...responseTimes);
        const slowestResponse = Math.max(...responseTimes);
        const timeRange = slowestResponse - fastestResponse;

        // Define thresholds (in milliseconds)
        const QUICK_THRESHOLD = 2000;  // 2 seconds
        const SLOW_THRESHOLD = 3500;   // 3.5 seconds

        if (avgResponseTime < QUICK_THRESHOLD) {
            console.log("Shape: sparkling");
            return 'sparkling';  // Quick, energetic responses
        } else if (avgResponseTime > SLOW_THRESHOLD) {
            console.log("Shape: flowing");
            return 'flowing';    // Slow, thoughtful responses
        } else if (timeRange > 3000) {  // High variance in response times
            console.log("Shape: pulsing");
            return 'pulsing';    // Variable, dynamic responses
        } else {
            console.log("Shape: balanced");
            return 'balanced';   // Consistent, moderate responses
        }
    };
    
    // Function to calculate response speed (for animations)
    const calculateResponseSpeed = () => {
        if (responseTimes.length === 0) return 'medium';
        
        const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        
        // Define thresholds for response speeds (in milliseconds)
        const FAST_THRESHOLD = 1500;     // 1.5 seconds
        const MEDIUM_FAST_THRESHOLD = 3000;   // 3 seconds
        const MEDIUM_SLOW_THRESHOLD = 5000;   // 5 seconds
        const SLOW_THRESHOLD = 8000;     // 8 seconds
        
        if (avgResponseTime < FAST_THRESHOLD) {
            return 'fast';
        } else if (avgResponseTime < MEDIUM_FAST_THRESHOLD) {
            return 'medium-fast';
        } else if (avgResponseTime < MEDIUM_SLOW_THRESHOLD) {
            return 'medium';
        } else if (avgResponseTime < SLOW_THRESHOLD) {
            return 'medium-slow';
        } else {
            return 'slow';
        }
    };
    
    const handleSubmit = async () => {
        try {
            setSubmitting(true);
            setError(null);
            
            // Check if all questions have been answered
            if (selectedOptions.some(option => option === -1)) {
                setError('Please answer all questions before submitting.');
                setSubmitting(false);
                return;
            }
            
            // Create an array of responses (the selected option for each question)
            const responseTexts = questions.map((question, index) => {
                const selectedOptionIndex = selectedOptions[index];
                const selectedOption = question.options[selectedOptionIndex];
                return selectedOption.text || selectedOption; // Handle both new and old format
            });
            
            // Calculate aura shape based on response times
            const auraShape = calculateAuraShape();
            console.log('Calculated aura shape for server:', auraShape);
            
            console.log('Submitting responses for analysis:', {
                questions: questions,
                responses: responseTexts,
                aura_shape: auraShape,
                userId
            });
            
            // Send responses to the server for analysis
            const response = await fetch(`http://localhost:5001/api/users/${userId}/daily-mood/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    questions: questions,
                    responses: responseTexts,
                    aura_shape: auraShape,
                    userId
                })
            });
            
            if (!response.ok) {
                throw new Error(`Failed to analyze responses: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Received analysis from server:', data);
            
            if (data.status !== 'success') {
                throw new Error(`API returned error: ${data.message || 'Unknown error'}`);
            }
            
            // Parse the analysis if it's returned as a string
            let auraData;
            try {
                auraData = typeof data.analysis === 'string' 
                    ? JSON.parse(data.analysis) 
                    : data.analysis;
                    
                console.log('Parsed aura data:', auraData);
                
                // Validate required fields with fallbacks if missing
                if (!auraData.aura_color) {
                    console.error('Missing aura_color in response');
                    auraData.aura_color = 'linear-gradient(45deg, #054f7d, #00a7cf, #efe348)';
                }
                
                // Override the server-determined shape with the one based on response time
                // (Note: this should be redundant as we sent it to the server, but kept for safety)
                if (auraData.aura_shape !== auraShape) {
                    console.log('Server returned different shape, using local calculation:', auraShape);
                    auraData.aura_shape = auraShape;
                }
                
                // Calculate response speed for animations
                const responseSpeed = calculateResponseSpeed();
                console.log('Calculated response speed:', responseSpeed);
            } catch (e) {
                console.error('Error parsing analysis:', e);
                throw new Error(`Failed to parse analysis: ${e.message}`);
            }
            
            // Update the user's aura in the database
            console.log('Sending aura update with data:', {
                aura_color: auraData.aura_color,
                aura_shape: auraData.aura_shape
            });

            // Extract individual colors from the gradient string if available
            let aura_color1, aura_color2, aura_color3;
            if (auraData.aura_color && auraData.aura_color.includes('gradient')) {
                // Extract hex colors from the gradient string - look for exactly #RRGGBB format
                const colorMatches = auraData.aura_color.match(/#[0-9A-Fa-f]{6}/g) || [];
                console.log('Extracted color matches:', colorMatches);
                
                if (colorMatches.length >= 3) {
                    aura_color1 = colorMatches[0];
                    aura_color2 = colorMatches[1];
                    aura_color3 = colorMatches[2];
                } else if (colorMatches.length === 2) {
                    aura_color1 = colorMatches[0];
                    aura_color2 = colorMatches[1];
                    aura_color3 = colorMatches[1]; // Duplicate last color
                } else if (colorMatches.length === 1) {
                    aura_color1 = colorMatches[0];
                    aura_color2 = colorMatches[0];
                    aura_color3 = colorMatches[0];
                } else {
                    // Fallback to default colors if none found
                    console.warn('No valid colors found in gradient, using defaults');
                    aura_color1 = '#0000FF'; // BLUE
                    aura_color2 = '#800080'; // PURPLE
                    aura_color3 = '#00FF00'; // GREEN
                }
                
                // If any color is missing, use fallbacks
                if (!aura_color1) aura_color1 = '#0000FF';
                if (!aura_color2) aura_color2 = '#800080';
                if (!aura_color3) aura_color3 = '#00FF00';
                
                console.log('Final extracted colors:', { aura_color1, aura_color2, aura_color3 });
                
                // Regenerate gradient to ensure consistency
                auraData.aura_color = `linear-gradient(45deg, ${aura_color1}, ${aura_color2}, ${aura_color3})`;
                console.log('Regenerated gradient:', auraData.aura_color);
            } else {
                // Create a default gradient if none exists
                aura_color1 = '#0000FF'; // BLUE
                aura_color2 = '#800080'; // PURPLE
                aura_color3 = '#00FF00'; // GREEN
                auraData.aura_color = `linear-gradient(45deg, ${aura_color1}, ${aura_color2}, ${aura_color3})`;
            }

            // Make sure we have a valid shape
            if (!auraData.aura_shape || !['sparkling', 'flowing', 'pulsing', 'balanced'].includes(auraData.aura_shape)) {
                console.warn('Invalid aura shape detected, using calculated:', auraShape);
                auraData.aura_shape = auraShape;
            }

            // Calculate response speed
            const responseSpeed = 'medium'; // Always use medium speed

            const updateResponse = await fetch(`http://localhost:5001/api/users/${userId}/aura`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    aura_color: auraData.aura_color,
                    aura_shape: auraData.aura_shape,
                    aura_color1: aura_color1,
                    aura_color2: aura_color2,
                    aura_color3: aura_color3,
                    response_speed: responseSpeed
                })
            });
            
            if (!updateResponse.ok) {
                throw new Error(`Failed to update aura: ${updateResponse.status}`);
            }
            
            console.log('Successfully updated user aura');
            
            // Update localStorage with new aura data
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                const userData = JSON.parse(storedUser);
                const updatedUserData = {
                    ...userData,
                    aura_color: auraData.aura_color,
                    aura_shape: auraData.aura_shape,
                    mood_summary: auraData.mood_summary,
                    aura_color1: aura_color1,
                    aura_color2: aura_color2, 
                    aura_color3: aura_color3,
                    response_speed: responseSpeed
                };
                localStorage.setItem('user', JSON.stringify(updatedUserData));
                console.log('Updated localStorage with new aura data');
            }
            
            setSubmitting(false);
            
            // Navigate to dashboard after successful submission
            navigate(`/auth/${userId}/dashboard`);
            
        } catch (err) {
            console.error('Error submitting responses:', err);
            setError(`Failed to process your responses: ${err.message}`);
            setSubmitting(false);
        }
    };
    
    // Calculate progress percentage
    const progress = ((currentQuestion + 1) / questions.length) * 100;
    
    if (loading) {
        return (
            <div className="daily-mood-container">
                <div className="daily-mood-box">
                    <h2>Daily Mood Check</h2>
                    <div className="loading-spinner"></div>
                    <p>Loading your daily questions...</p>
                </div>
                <div className='image-background'>
                    <img src='/assets/images/opening.png' alt="background"/>
                </div>
                <div className="rainbow-background"></div>
            </div>
        );
    }
    
    if (questions.length === 0) {
        return (
            <div className="daily-mood-container">
                <div className="daily-mood-box">
                    <h2>Daily Mood Check</h2>
                    <p className="error-message">{error || "No questions available. Please try again later."}</p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="submit-button"
                    >
                        Reload
                    </button>
                </div>
                <div className='image-background'>
                    <img src='/assets/images/opening.png' alt="background"/>
                </div>
                <div className="rainbow-background"></div>
            </div>
        );
    }
    
    return (
        <div className="daily-mood-container">
            <div className="daily-mood-box">
                <h2>Daily Mood Check</h2>
                
                {/* Skip button - only show at the beginning */}
                {currentQuestion === 0 && (
                    <button 
                        className="skip-button"
                        onClick={handleSkipQuestionnaire}
                        disabled={submitting}
                    >
                        Skip Questionnaire
                    </button>
                )}
                
                <div className="progress-container">
                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                    </div>
                    <div className="question-counter">
                        Question {currentQuestion + 1} of {questions.length}
                    </div>
                </div>
                
                <div className="question-section">
                    <h3 className="question-text">{questions[currentQuestion]?.question}</h3>
                    
                    <div className="options-container">
                        {questions[currentQuestion]?.options.map((option, index) => {
                            // Handle both legacy format (string options) and new format (object with text and color)
                            const optionText = typeof option === 'object' ? option.text : option;
                            // We're not showing color borders anymore
                            return (
                                <button
                                    key={index}
                                    className={`option-button ${selectedOptions[currentQuestion] === index ? 'selected' : ''}`}
                                    onClick={() => handleOptionSelect(index)}
                                    disabled={submitting}
                                >
                                    {optionText}
                                </button>
                            );
                        })}
                    </div>
                </div>
                
                {error && <p className="error-message">{error}</p>}
                
                {submitting && (
                    <div className="submitting-message">
                        <div className="loading-spinner"></div>
                        <p>Processing your responses...</p>
                    </div>
                )}
            </div>
            <div className='image-background'>
                <img src='/assets/images/opening.png' alt="background"/>
            </div>
            <div className="rainbow-background"></div>
        </div>
    );
}

export default DailyMoodQuestionnaire; 