import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AuraVisualization from '../AuraVisualization';
import './DashboardScreen.css';

function DashboardScreen() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [darkMode, setDarkMode] = useState(true); // Always dark mode

    console.log("DashboardScreen mounted with userId param:", userId);
    console.log("userId type:", typeof userId);
    
    // Also check localStorage for user data
    const storedUser = localStorage.getItem('user');
    console.log("User data in localStorage:", storedUser);
    
    if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        console.log("Parsed localStorage user:", parsedUser);
    }

    useEffect(() => {
        // Fetch user data including aura information
        const fetchUserData = async () => {
            try {
                console.log("Fetching user data for ID:", userId);
                
                // Try to get from local storage first
                const storedUser = localStorage.getItem('user');
                let storedUserData = null;
                
                if (storedUser) {
                    storedUserData = JSON.parse(storedUser);
                    console.log("User data from localStorage:", storedUserData);
                    
                    // If the stored user already has aura data, use it directly
                    if (storedUserData.aura_color || storedUserData.auraColor) {
                        console.log("Using user data with aura from localStorage");
                        const processedData = {
                            ...storedUserData,
                            username: storedUserData.username || "User",
                            aura_color: storedUserData.aura_color || storedUserData.auraColor || 'linear-gradient(to right, #6d4aff, #9e8aff)',
                            aura_shape: storedUserData.aura_shape || storedUserData.auraShape || determineAuraShape(5),
                            response_speed: storedUserData.response_speed || storedUserData.responseSpeed || 'medium'
                        };
                        setUserData(processedData);
                        setLoading(false);
                        return;
                    }
                }
                
                // If no stored user with aura or no stored user at all, fetch from API
                // Log the API URL for debugging
                const apiUrl = `http://localhost:5000/api/users/${userId}`;
                console.log("API URL:", apiUrl);
                
                const response = await fetch(apiUrl);
                
                console.log("API Response status:", response.status);
                
                if (!response.ok) {
                    // If API call fails, use localStorage data if available
                    if (storedUserData) {
                        console.log("Using localStorage data as fallback");
                        const processedData = {
                            ...storedUserData,
                            // Handle username data
                            username: storedUserData.username || "User",
                            // Handle aura color data
                            aura_color: storedUserData.aura_color || storedUserData.auraColor || 'linear-gradient(to right, #6d4aff, #9e8aff)',
                            // Handle aura shape data
                            aura_shape: storedUserData.aura_shape || storedUserData.auraShape || determineAuraShape(5),
                            // Handle response speed data
                            response_speed: storedUserData.response_speed || storedUserData.responseSpeed || 'medium'
                        };
                        setUserData(processedData);
                        setLoading(false);
                        return;
                    }
                    throw new Error(`Failed to fetch user data: ${response.status}`);
                }
                
                const data = await response.json();
                console.log("User data received:", data);
                console.log("Data properties:", Object.keys(data));
                
                // Process data with minimal data transformation
                const processedData = {
                    ...data,
                    // Use data directly from API
                    username: data.username || "User",
                    aura_color: data.aura_color || 'linear-gradient(to right, #6d4aff, #9e8aff)',
                    aura_shape: data.aura_shape || 'balanced',
                    response_speed: data.response_speed || 'medium'
                };
                
                setUserData(processedData);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching user data:', error);
                // Set some fallback data for testing
                setUserData({
                    username: "Test User",
                    aura_color: "linear-gradient(to right, #6d4aff, #9e8aff)",
                    aura_shape: "balanced",
                    answer_speed: 5, // Default middle speed
                    response_speed: "medium" // Default response speed
                });
                setLoading(false);
            }
        };

        if (userId) {
            fetchUserData();
        }
    }, [userId]);
    
    // Function to determine aura shape based on answer speed
    const determineAuraShape = (speed) => {
        if (!speed) return "balanced"; // Default if no speed data
        
        // Map speed ranges to shape types
        if (speed < 3) { // Very fast answers
            return "sparkling"; // Energetic sparkle shape
        } else if (speed < 5) { // Medium-fast answers
            return "pulsing"; // Pulsing aura
        } else if (speed < 7) { // Medium-slow answers
            return "flowing"; // Flowing ripple circle
        } else if (speed >= 7) { // Slow, thoughtful answers
            return "balanced"; // Balanced shape
        } else {
            return "balanced"; // Default balanced shape
        }
    };

    // Function to determine response speed for animation
    const determineResponseSpeed = (speed) => {
        if (!speed) return "medium"; // Default if no speed data
        
        // Map speed ranges to animation speeds
        if (speed < 3) { // Very fast answers
            return "fast"; 
        } else if (speed < 5) { // Medium-fast answers
            return "medium-fast"; 
        } else if (speed < 7) { // Medium-slow answers
            return "medium-slow"; 
        } else if (speed >= 7) { // Slow, thoughtful answers
            return "slow"; 
        } else {
            return "medium"; // Default medium speed
        }
    };

    if (loading) {
        return <div className="loading">Loading your aura...</div>;
    }

    // Check if we have actual user data
    const username = userData?.username || "User";
    console.log("Rendering with username:", username);
    
    // Get aura shape from userData or calculate it
    const auraShape = userData?.aura_shape || determineAuraShape(userData?.answer_speed);

    return (
        <div className="dashboard-container dark-mode">
            <header className="dashboard-header">
                <h1>Hello, {username}</h1>
            </header>
            
            <main className="dashboard-content">
                {/* Top widgets row: Aura + Discover */}
                <div className="top-widgets">
                    {/* Square Aura Widget without title */}
                    <section className="widget aura-widget square-widget">
                        <div className="aura-visualization">
                            <AuraVisualization 
                                auraColor={userData?.aura_color} 
                                auraShape={userData?.aura_shape}
                                responseSpeed={userData?.response_speed}
                            />
                        </div>
                    </section>
                    
                    {/* Discover Widget with Map */}
                    <section className="widget discover-widget">
                        <h2>Discover</h2>
                        <div className="map-container">
                            {/* Map placeholder */}
                            <div className="map-placeholder" onClick={() => navigate(`/discover/${userId}`)}>
                                <div className="map-icon">📍</div>
                                <p>Current Location</p>
                            </div>
                        </div>
                    </section>
                </div>
                
                {/* Suggestions Widget */}
                <section className="widget suggestions-widget">
                    <h2>Auras Nearby</h2>
                    <div className="suggestions-container">
                        <div className="location-suggestions">
                            {/* This would be populated from the backend */}
                            <div className="location-card">
                                <div className="location-card-content">
                                    <h3>Serenity Gardens</h3>
                                </div>
                                <div className="location-aura-placeholder"></div>
                            </div>
                            <div className="location-card">
                                <div className="location-card-content">
                                    <h3>The Vibrant Café</h3>
                                </div>
                                <div className="location-aura-placeholder"></div>
                            </div>
                        </div>
                        <button className="action-button" onClick={() => navigate(`/discover/${userId}`)}>View More</button>
                    </div>
                </section>
                
                {/* Collections Widget */}
                <section className="widget collections-widget">
                    <div className="collections-container">
                        <div className="collections-grid">
                            {/* Base Collections - Left Column */}
                            <div className="collections-column base-collections">
                                <h3 className="column-title">Recents</h3>
                                <div className="collection-card">
                                    <div className="collection-content">
                                        <h3>Serenity Gardens</h3>
                                    </div>
                                    <div className="collection-aura-placeholder"></div>
                                </div>
                                <div className="collection-card">
                                    <div className="collection-content">
                                        <h3>The Vibrant Café</h3>
                                    </div>
                                    <div className="collection-aura-placeholder"></div>
                                </div>
                                <div className="collection-card">
                                    <div className="collection-content">
                                        <h3>Moonlight Bookshop</h3>
                                    </div>
                                    <div className="collection-aura-placeholder"></div>
                                </div>
                            </div>
                            
                            {/* Saved Collections - Right Column */}
                            <div className="collections-column saved-collections">
                                <h3 className="column-title">Saved Collections</h3>
                                <div className="collection-card">
                                    <div className="collection-content">
                                        <h3>Coffee Shops</h3>
                                        <p>5 items</p>
                                    </div>
                                    <div className="collection-aura-placeholder"></div>
                                </div>
                                <div className="collection-card">
                                    <div className="collection-content">
                                        <h3>Weekend Getaways</h3>
                                        <p>3 items</p>
                                    </div>
                                    <div className="collection-aura-placeholder"></div>
                                </div>
                                <div className="collection-card">
                                    <div className="collection-content">
                                        <h3>Meditation Spots</h3>
                                        <p>4 items</p>
                                    </div>
                                    <div className="collection-aura-placeholder"></div>
                                </div>
                            </div>
                        </div>
                        <button className="action-button">Create New Collection</button>
                    </div>
                </section>
            </main>
            
            <footer className="dashboard-footer">
                <button className="footer-button">Aura Guide</button>
            </footer>
        </div>
    );
}

export default DashboardScreen;