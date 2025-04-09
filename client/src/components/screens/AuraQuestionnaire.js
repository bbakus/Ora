import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './AuraQuestionnaire.css';

function AuraQuestionnaire() {
    const navigate = useNavigate();
    const { userId } = useParams();
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState({});
    const [selectedOption, setSelectedOption] = useState(null);
    const [rainbowStyle, setRainbowStyle] = useState(null);
    const [animatingIndex, setAnimatingIndex] = useState(null);
    const [questionStartTime, setQuestionStartTime] = useState(Date.now());
    const [responseTimes, setResponseTimes] = useState([]);
    const buttonRefs = useRef([]);

    

    const colorMap = {
        'red': '#FF0000',      // energy
        'blue': '#0000FF',     // calmness
        'orange': '#FFA500',   // warmth
        'purple': '#800080',   // elegance
        'green': '#00FF00',    // casual
        'cyan': '#00FFFF',     // freshness
        'gold': '#FFD700'      // authenticity
    };

    const questions = [
        {
            id: 1,
            question: "How would you describe your energy level?",
            options: [
                { text: "Very high - I'm always on the go", value: "red" },
                { text: "Moderate - I have a good balance", value: "green" },
                { text: "Low - I prefer a slower pace", value: "blue" }
            ]
        },
        {
            id: 2,
            question: "What's your preferred social setting?",
            options: [
                { text: "Large groups and parties", value: "red" },
                { text: "Small gatherings with close friends", value: "orange" },
                { text: "One-on-one or alone time", value: "blue" }
            ]
        },
        {
            id: 3,
            question: "Do you prefer a bright place, or dimly lit place?",
            options: [
                { text: "Bright and vibrant", value: "cyan" },
                { text: "Just enough to see your face", value: "orange" },
                { text: "Candle light and red lamps", value: "blue" }
            ]
        },
        {
            id: 4,
            question: "Your ideal bedsheet fabric",
            options: [
                {text: "Sateen", value: "purple"},
                {text: "Linen", value: "cyan"},
                {text: "Cotton", value: "orange"}
            ]
        },
        {
            id: 5,
            question: "If you could learn a language overnight.",
            options: [
                {text: 'Spanish', value: "gold"},
                {text: 'French', value: "purple"},
                {text: 'German', value: 'red'}
            ]
        },
        {
            id: 6,
            question: 'How often do you shower?',
            options: [
                {text: 'Daily', value: 'cyan'},
                {text: 'Every other day', value: 'green'},
                {text: 'Whenever', value: 'gold'}
            ]
        },
        {
            id: 7,
            question: 'How often do you wear a suit or formal dress?',
            options: [
                {text: 'Everyday', value: 'purple'},
                {text: 'Once in a while', value: 'cyan'},
                {text: 'Very rarely', value: 'green'}
            ]
        },
        {
            id: 8,
            question: `It's Friday night, do you:`,
            options: [
                {text: 'Hit the club', value: 'red'},
                {text: 'Call a friend and go out', value: 'orange'},
                {text: 'Stay home and snuggle up', value: 'blue'}
            ]
        },
        {
            id: 9,
            question: 'A friend passes you the boof, do you:',
            options: [
                {text: 'Blaze it', value: 'green'},
                {text: 'Politely decline', value: 'blue'},
                {text: `Say: 'Dude you're about to meet my mom wtf.`, value: 'gold'}
            ]
        },
        {
            id: 10,
            question: `What is, or was, the color of your mother's eyes?`,
            options: [
                {text: 'Green', value: 'cyan'},
                {text: 'Blue', value: 'purple'},
                {text: 'Brown or other', value: 'gold'}
            ]
        },
        {
            id: 11,
            question: 'How does someone earn your trust?',
            options: [
                {text: 'Gradually, over time.', value: 'gold'},
                {text: 'I feel known, understood.', value: 'orange'},
                {text: 'I hardly trust anyone.', value: 'purple'}
            ]
        },
        {
            id: 12,
            question: 'Your trip is paid for, where do you go?',
            options: [
                {text: 'Mountains', value: 'green'},
                {text: 'Beach', value: 'cyan'},
                {text: 'Somewhere new', value: 'red'}
            ]
        },
        {
            id: 13,
            question: 'Your landlord decides to not charge you rent.',
            options: [
                {text: 'Throw a rager', value: 'red'},
                {text: 'Buy something nice for myself.', value: 'purple'},
                {text: 'Put it in savings.', value: 'blue'}
            ]
        },
        {
            id: 14,
            question: `You find a tortoise lying on it's back, do you...`,
            options: [
                {text: 'Flip it over.', value: 'gold'},
                {text: 'Keep walking.', value: 'purple'},
                {text: 'Take a selfie with it.', value: 'red'}
            ]
        },
        {
            id: 15,
            question: 'You are home from work do you:',
            options: [
                {text: 'Sit on the couch with a beer.', value: 'green'},
                {text: 'Going out with the homies!', value: 'red'},
                {text: 'Call your mom.', value: 'gold'}
            ]
        }
    ];

    // Set up the button refs
    useEffect(() => {
        buttonRefs.current = buttonRefs.current.slice(0, questions[currentQuestion].options.length);
    }, [currentQuestion]);

    const handleOptionSelect = (option, index) => {
        if (animatingIndex !== null) return;
        
        const responseTime = Date.now() - questionStartTime;
        setResponseTimes([...responseTimes, responseTime]);
        setSelectedOption(option);
        setAnimatingIndex(index);
        
        // Direct DOM manipulation for maximum compatibility
        const button = buttonRefs.current[index];
        if (button) {
            // Get the color from the option value
            const colorValue = option.value;
            const hexColor = colorMap[colorValue];
            
            // Create a gradient of this color (light to dark)
            button.style.background = `linear-gradient(90deg, ${hexColor}44, ${hexColor}88, ${hexColor}cc, ${hexColor})`;
            button.style.backgroundSize = '300% 100%';
            button.style.border = '3px solid white';
            button.style.boxShadow = `0 0 20px ${hexColor}`;
            
            // Create animation manually
            let start = null;
            const duration = 1000; // 1 second
            
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
        }
        
        setAnswers({
            ...answers,
            [currentQuestion]: option.value
        });
        
        // Delay to allow animation to complete before advancing
        setTimeout(() => {
            // Reset the button styles before advancing
            const button = buttonRefs.current[index];
            if (button) {
                button.style.background = '';
                button.style.backgroundSize = '';
                button.style.backgroundPosition = '';
                button.style.border = '';
                button.style.boxShadow = '';
                button.style.color = '';
                button.style.fontWeight = '';
            }
            
            if (currentQuestion < questions.length - 1) {
                setCurrentQuestion(currentQuestion + 1);
                setSelectedOption(null);
                setAnimatingIndex(null);
                setQuestionStartTime(Date.now()); // Reset timer for next question
            } else {
                calculateAura()
                    .then(() => {
                        // Get stored user to ensure consistent ID usage
                        const storedUser = localStorage.getItem('user');
                        let routeUserId = userId;
                        
                        if (storedUser) {
                            const userData = JSON.parse(storedUser);
                            // Prefer the stored ID if available
                            routeUserId = userData.id_str || userData.id || userId;
                        }
                        
                        const path = `/auth/${routeUserId}/dashboard`;
                        console.log("Questionnaire complete, navigating to:", path);
                        navigate(path);
                    })
                    .catch(error => console.error('Error completing questionnaire:', error));
            }
        }, 1000); // Matches the 1s animation duration
    };

    const calculateAuraShape = () => {
        if (responseTimes.length === 0) return 'balanced';

        const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        console.log("Average response time:", avgResponseTime); // Debug log
        
        const fastestResponse = Math.min(...responseTimes);
        const slowestResponse = Math.max(...responseTimes);
        const timeRange = slowestResponse - fastestResponse;

        // Define thresholds (in milliseconds)
        const QUICK_THRESHOLD = 2000;  // 2 seconds
        const SLOW_THRESHOLD = 3500;   // Reduced to 3.5 seconds
        
        // Force flowing shape for testing
        const forceShape = localStorage.getItem('forceAuraShape');
        if (forceShape) {
            console.log("Forcing aura shape:", forceShape);
            return forceShape;
        }

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

    const calculateAura = async () => {
        // Count frequency of each color
        const colorCounts = {};
        Object.values(answers).forEach(color => {
            colorCounts[color] = (colorCounts[color] || 0) + 1;
        });

        // Sort colors by frequency (highest first)
        const sortedColors = Object.entries(colorCounts)
            .sort((a, b) => b[1] - a[1]);
        
        // Get the top 3 colors
        let topColors = [];
        
        // First add the definite top colors (1st and 2nd)
        for (let i = 0; i < Math.min(2, sortedColors.length); i++) {
            topColors.push(sortedColors[i][0]);
        }
        
        // Handle the case where we need to decide on the 3rd color
        if (sortedColors.length > 2) {
            // Get all colors tied for 3rd place
            const thirdPlaceCount = sortedColors[2][1];
            const tiedColors = sortedColors
                .slice(2)
                .filter(entry => entry[1] === thirdPlaceCount)
                .map(entry => entry[0]);
                
            // If there's only one, add it
            if (tiedColors.length === 1) {
                topColors.push(tiedColors[0]);
            } 
            // If there are multiple tied, randomly select one
            else if (tiedColors.length > 1) {
                const randomIndex = Math.floor(Math.random() * tiedColors.length);
                topColors.push(tiedColors[randomIndex]);
            }
        }
        
        // Ensure we have exactly 3 colors (or fewer if there aren't enough)
        topColors = topColors.slice(0, 3);
        
        // Create simple gradient with exactly the top 3 colors
        const gradientColors = topColors.map(color => colorMap[color]);
        
        // Create a clean linear gradient with exactly the top 3 colors
        const gradient = `linear-gradient(to right, ${gradientColors.join(', ')})`;

        console.log("Selected top colors:", topColors);
        console.log("Generated gradient:", gradient);

        // Calculate aura shape based on response times
        const auraShape = calculateAuraShape();
        
        // Calculate response speed for animation
        const responseSpeed = calculateResponseSpeed();

        // Create data object that matches database columns exactly
        const auraData = {
            aura_color: gradient, // The gradient string for the color
            aura_shape: auraShape, // The shape (balanced, sparkling, flowing, pulsing)
            response_speed: responseSpeed // Speed (fast, medium-fast, medium, medium-slow, slow)
        };

        console.log("Saving aura data:", auraData);
        console.log("For user ID:", userId);

        try {
            // Make the API call with the full URL
            const apiUrl = `http://localhost:5001/api/users/${userId}/aura`;
            console.log("Posting to API URL:", apiUrl);
            
            // Save the aura to the database with better error logging
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(auraData),
            });
            
            console.log("API response status:", response.status);
            
            if (!response.ok) {
                throw new Error(`Failed to save aura: ${response.status}`);
            }
            
            console.log("Aura saved successfully");
            
            // Update stored user data with new aura
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                const userData = JSON.parse(storedUser);
                const updatedUserData = {
                    ...userData,
                    aura_color: auraData.aura_color,
                    aura_shape: auraData.aura_shape,
                    response_speed: auraData.response_speed
                };
                localStorage.setItem('user', JSON.stringify(updatedUserData));
                console.log("Updated localStorage with new aura data");
            }
            
            return gradient;
        } catch (error) {
            console.error('Error saving aura:', error);
            throw error;
        }
    };

    const progress = ((currentQuestion + 1) / questions.length) * 100;

    return (
        <div className="questionnaire-container">
            <div className="questionnaire-box">
                <h2>Discover Your Aura</h2>
                <div className="progress-bar">
                    <div 
                        className="progress-fill" 
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
                <div className="question-container">
                    <h3 className="question-text">
                        {questions[currentQuestion].question}
                    </h3>
                    <div className="options-container">
                        {questions[currentQuestion].options.map((option, index) => (
                            <button
                                key={index}
                                ref={el => buttonRefs.current[index] = el}
                                className={`option-button ${selectedOption === option ? 'selected' : ''}`}
                                onClick={() => handleOptionSelect(option, index)}
                                disabled={animatingIndex !== null}
                            >
                                {option.text}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <div className="background-image">
                <img src="/assets/images/opening.png" alt="background"/>
            </div>
            <div className="rainbow-background"></div>
        </div>
    );
}

export default AuraQuestionnaire;