import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './DailyMoodQuestionnaire.css';

// Default questions to use if API fails completely
const DEFAULT_QUESTIONS = [
  {
    question: "Which setting feels most inviting right now?",
    options: [
      { text: "A busy downtown plaza filled with activity", color: "RED" },
      { text: "A tranquil garden with soft sounds of nature", color: "GREEN" },
      { text: "A quiet library with warm lighting", color: "BLUE" }
    ]
  },
  {
    question: "What type of melody would resonate with you today?",
    options: [
      { text: "An energetic rhythm with driving beats", color: "RED" },
      { text: "A familiar tune that brings back memories", color: "ORANGE" },
      { text: "A gentle, flowing instrumental piece", color: "BLUE" }
    ]
  },
  {
    question: "Which natural element speaks to you most?",
    options: [
      { text: "A crackling fire dancing in a hearth", color: "RED" },
      { text: "A steady mountain stream over smooth stones", color: "CYAN" },
      { text: "A gentle breeze through autumn leaves", color: "GREEN" }
    ]
  },
  {
    question: "If today were a texture, what would it be?",
    options: [
      { text: "Smooth, polished marble", color: "PURPLE" },
      { text: "Soft, well-worn leather", color: "ORANGE" },
      { text: "Light, billowing silk", color: "CYAN" }
    ]
  },
  {
    question: "Which path would you prefer to walk?",
    options: [
      { text: "A winding trail with unexpected views", color: "YELLOW" },
      { text: "A direct route through familiar territory", color: "BLUE" },
      { text: "A scenic detour with interesting landmarks", color: "GREEN" }
    ]
  },
  {
    question: "What kind of light appeals to you now?",
    options: [
      { text: "Bright, direct sunlight", color: "YELLOW" },
      { text: "Soft, diffused glow through curtains", color: "PURPLE" },
      { text: "Cool, blue twilight just after sunset", color: "BLUE" }
    ]
  }
];

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
    const [retryCount, setRetryCount] = useState(0);
    const [showColorEffect, setShowColorEffect] = useState(false);
    const [selectedColor, setSelectedColor] = useState(null);
    const [colorButtonIndex, setColorButtonIndex] = useState(null);
    
    // Add a color map with hex values for each color - UPDATED to match AuraQuestionnaire.js
    const colorMap = {
        'RED': '#FF0000',     // energy
        'ORANGE': '#FFA500',  // warmth
        'YELLOW': '#FFFF00',  // using standard yellow
        'GREEN': '#00FF00',   // casual
        'BLUE': '#0000FF',    // calmness
        'PURPLE': '#800080',  // elegance
        'CYAN': '#00FFFF'     // freshness
    };
    
    // Add button refs to store direct references to option buttons
    const buttonRefs = useRef([]);
    
    // Fetch AI-generated questions when component mounts
    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                setLoading(true);
                setError(null);
                console.log(`Fetching daily mood questions for user: ${userId}`);
                
                // Last retry - use default questions
                if (retryCount >= 3) {
                    console.log("Maximum retries reached. Using default questions.");
                    setQuestions(DEFAULT_QUESTIONS);
                    setSelectedOptions(new Array(DEFAULT_QUESTIONS.length).fill(-1));
                    setLoading(false);
                    setQuestionStartTime(Date.now());
                    return;
                }
                
                const response = await fetch(`http://localhost:5001/api/users/${userId}/daily-mood/questions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ userId }),
                    timeout: 60000 // 60 second timeout
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
                
                // Last retry attempt failed - use default questions
                if (retryCount >= 2) {
                    console.log("All retries failed. Using default questions as fallback.");
                    setQuestions(DEFAULT_QUESTIONS);
                    setSelectedOptions(new Array(DEFAULT_QUESTIONS.length).fill(-1));
                    setLoading(false);
                    setQuestionStartTime(Date.now());
                    return;
                }
                
                setError(`Failed to load questions: ${err.message}. Please try again.`);
                setLoading(false);
                
                // Auto-retry after a delay, up to 3 times
                const nextRetry = retryCount + 1;
                setError(`Failed to load questions. Retrying (${nextRetry}/3)...`);
                setRetryCount(nextRetry);
                setTimeout(() => {
                    fetchQuestions();
                }, 3000); // 3 second delay between retries
            }
        };
        
        fetchQuestions();
    }, [userId, retryCount]);
    
    // Function to skip the questionnaire and go back to dashboard
    const handleSkipQuestionnaire = () => {
        navigate(`/auth/${userId}/dashboard`);
    };
    
    // Update useEffect to initialize button refs for the current question
    useEffect(() => {
        // Reset button refs array when question changes
        if (questions.length > 0) {
            buttonRefs.current = buttonRefs.current.slice(0, questions[currentQuestion]?.options.length || 0);
        }
    }, [currentQuestion, questions]);
    
    const handleOptionSelect = (optionIndex) => {
        // Record response time before updating state
        const endTime = Date.now();
        const responseTime = endTime - questionStartTime;
        console.log(`Question ${currentQuestion + 1} response time: ${responseTime}ms`);
        
        // Update response times array
        const updatedResponseTimes = [...responseTimes, responseTime];
        setResponseTimes(updatedResponseTimes);
        
        // Update selected option state
        const newSelectedOptions = [...selectedOptions];
        newSelectedOptions[currentQuestion] = optionIndex;
        setSelectedOptions(newSelectedOptions);
        
        // Get the selected color for the visual effect
        const selectedOption = questions[currentQuestion].options[optionIndex];
        const color = selectedOption?.color || 'BLUE';
        setSelectedColor(color);
        console.log(`Selected color: ${color}`);
        
        // Don't need to set showColorEffect state flag anymore since we're using direct DOM manipulation
        setColorButtonIndex(optionIndex);
        
        // Direct DOM manipulation like in AuraQuestionnaire.js
        const button = buttonRefs.current[optionIndex];
        if (button) {
            // Get hex color from the color map
            const hexColor = colorMap[color] || colorMap['BLUE'];
            console.log(`Applying animation with color: ${hexColor}`);
            
            // Create a gradient of this color (light to dark)
            button.style.background = `linear-gradient(90deg, ${hexColor}44, ${hexColor}88, ${hexColor}cc, ${hexColor})`;
            button.style.backgroundSize = '300% 100%';
            button.style.border = '3px solid white';
            button.style.boxShadow = `0 0 20px ${hexColor}`;
            
            // Create animation manually
            let start = null;
            const duration = 800; // 800ms duration
            
            function animate(timestamp) {
                if (!start) start = timestamp;
                const progress = timestamp - start;
                
                // Calculate background position based on progress
                const position = (progress / duration) * 100;
                button.style.backgroundPosition = `${position}% 0%`;
                
                if (progress < duration) {
                    window.requestAnimationFrame(animate);
                }
            }
            
            window.requestAnimationFrame(animate);
            console.log('Animation started');
        } else {
            console.warn(`Button reference not found for index ${optionIndex}`);
        }
        
        // Wait for animation to complete before moving to next question
        setTimeout(() => {
            // Reset the button styles before advancing
            const button = buttonRefs.current[optionIndex];
            if (button) {
                button.style.background = '';
                button.style.backgroundSize = '';
                button.style.backgroundPosition = '';
                button.style.border = '';
                button.style.boxShadow = '';
            }
            
            // After showing the color effect, move to next question or submit
            if (currentQuestion < questions.length - 1) {
                // Move to next question
                setCurrentQuestion(currentQuestion + 1);
                // Reset timer for the next question
                setQuestionStartTime(Date.now());
            } else {
                // This was the last question, submit the responses
                // We need to pass the updated selectedOptions since state updates are async
                handleSubmit(newSelectedOptions, updatedResponseTimes);
            }
        }, 800); // Show color for 800ms
    };
    
    // Update the calculateAuraShape function to align with the user's requirements
    const calculateAuraShape = (times = null) => {
        // If test mode is enabled, use the selected shape type
        if (useCustomShape) {
            const forcedShape = SHAPE_TYPES[forcedShapeIndex];
            console.log(`USING FORCED SHAPE: ${forcedShape}`);
            return forcedShape;
        }
        
        const timeValues = times || responseTimes;
        
        if (timeValues.length === 0) return 'balanced';
        
        console.log("All response times (ms):", timeValues);
        const avgResponseTime = timeValues.reduce((a, b) => a + b, 0) / timeValues.length;
        console.log("Average response time:", avgResponseTime);
        
        // Define thresholds (in milliseconds) - UPDATED per request
        const FAST_THRESHOLD = 2000;      // 2 seconds - sparkling (fast)
        const MEDIUM_THRESHOLD = 3500;    // 3.5 seconds - flowing (medium)
        const SLOW_THRESHOLD = 5000;      // 5 seconds - pulsing (slow)
        // everything > SLOW_THRESHOLD is balanced (very slow)
        
        console.log("Threshold comparison:", {
            avgResponseTime,
            FAST_THRESHOLD,
            MEDIUM_THRESHOLD,
            SLOW_THRESHOLD,
            "is < FAST_THRESHOLD": avgResponseTime < FAST_THRESHOLD,
            "is < MEDIUM_THRESHOLD": avgResponseTime < MEDIUM_THRESHOLD,
            "is < SLOW_THRESHOLD": avgResponseTime < SLOW_THRESHOLD
        });

        if (avgResponseTime < FAST_THRESHOLD) {
            console.log("Shape: sparkling (FAST)");
            return 'sparkling';  // Fast, energetic responses
        } else if (avgResponseTime < MEDIUM_THRESHOLD) {
            console.log("Shape: flowing (MEDIUM)");
            return 'flowing';    // Medium responses
        } else if (avgResponseTime < SLOW_THRESHOLD) {
            console.log("Shape: pulsing (SLOW)");
            return 'pulsing';    // Slow responses
        } else {
            console.log("Shape: balanced (VERY SLOW)");
            return 'balanced';   // Very slow, thoughtful responses
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
    
    const handleSubmit = async (updatedOptions = null, updatedTimes = null) => {
        try {
            setSubmitting(true);
            setError(null);
            
            // Use the passed options array if provided, otherwise use the state
            const optionsToUse = updatedOptions || selectedOptions;
            // Use updated times if provided
            const timesToUse = updatedTimes || responseTimes;
            
            // Check if all questions have been answered
            if (optionsToUse.some(option => option === -1)) {
                setError('Please answer all questions before submitting.');
                setSubmitting(false);
                return;
            }
            
            // Create an array of responses (the selected option for each question)
            const responseTexts = questions.map((question, index) => {
                const selectedOptionIndex = optionsToUse[index];
                const selectedOption = question.options[selectedOptionIndex];
                return selectedOption.text || selectedOption; // Handle both new and old format
            });
            
            // Calculate aura shape based on response times
            const auraShape = calculateAuraShape(timesToUse);
            console.log('Calculated aura shape for server:', auraShape);
            
            console.log('Submitting responses for analysis:', {
                responses: responseTexts.length,
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
            const responseSpeed = calculateResponseSpeed();

            try {
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
                console.error('Error updating user aura:', err);
                setError(`Aura analysis complete, but failed to update your profile: ${err.message}`);
                setSubmitting(false);
            }
            
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
                    {error && <p className="error-message">{error}</p>}
                    <button 
                        onClick={() => setRetryCount(retryCount + 1)}
                        className="retry-button"
                    >
                        Retry Now
                    </button>
                    <button 
                        onClick={handleSkipQuestionnaire}
                        className="skip-button"
                    >
                        Skip for Today
                    </button>
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
                    <p className="error-message">{error || "No questions available. Please try again."}</p>
                    <div className="button-group">
                        <button 
                            onClick={() => {setRetryCount(0); window.location.reload();}}
                            className="submit-button"
                        >
                            Reload
                        </button>
                        <button 
                            onClick={handleSkipQuestionnaire} 
                            className="skip-button"
                        >
                            Skip for Today
                        </button>
                    </div>
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
                            
                            return (
                                <button
                                    key={index}
                                    className={`option-button ${selectedOptions[currentQuestion] === index ? 'selected' : ''}`}
                                    onClick={() => handleOptionSelect(index)}
                                    disabled={submitting}
                                    ref={(el) => {
                                        buttonRefs.current[index] = el;
                                    }}
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