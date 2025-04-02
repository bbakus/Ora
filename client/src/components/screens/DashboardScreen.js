import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AuraVisualization from '../AuraVisualization';
import './DashboardScreen.css';

function DashboardScreen() {
    const { userId } = useParams();
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [darkMode, setDarkMode] = useState(false);

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

    const toggleTheme = () => {
        setDarkMode(!darkMode);
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
        <div className={`dashboard-container ${darkMode ? 'dark-mode' : 'light-mode'}`}>
            <header className="dashboard-header">
                <h1>Hello, {username}</h1>
                <button className="theme-toggle" onClick={toggleTheme}>
                    {darkMode ? 'Light Mode' : 'Dark Mode'}
                </button>
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
                            <div className="map-placeholder">
                                <div className="map-icon">📍</div>
                                <p>Current Location</p>
                            </div>
                        </div>
                    </section>
                </div>
                
                {/* Suggestions Widget */}
                <section className="widget suggestions-widget">
                    <h2>Nearby Locations with Similar Auras</h2>
                    <div className="suggestions-container">
                        <p>Discover places that match your aura's energy.</p>
                        <div className="location-suggestions">
                            {/* This would be populated from the backend */}
                            <div className="location-card">
                                <h3>Serenity Gardens</h3>
                                <p>A peaceful retreat with calming energy</p>
                                <div className="location-aura-match">
                                    <span>Aura match: 87%</span>
                                </div>
                            </div>
                            <div className="location-card">
                                <h3>The Vibrant Café</h3>
                                <p>A lively spot for inspiration and connection</p>
                                <div className="location-aura-match">
                                    <span>Aura match: 75%</span>
                                </div>
                            </div>
                            <div className="location-card">
                                <h3>Moonlight Bookshop</h3>
                                <p>A thoughtful space for reflection</p>
                                <div className="location-aura-match">
                                    <span>Aura match: 68%</span>
                                </div>
                            </div>
                        </div>
                        <button className="action-button">View More Suggestions</button>
                    </div>
                </section>
                
                {/* Collections Widget */}
                <section className="widget collections-widget">
                    <h2>Your Collections</h2>
                    <div className="collections-container">
                        {userData?.collections && userData.collections.length > 0 ? (
                            <ul className="collections-list">
                                {userData.collections.map(collection => (
                                    <li key={collection.id} className="collection-item">
                                        <h3>{collection.name}</h3>
                                        <p>{collection.items?.length || 0} items</p>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p>You haven't created any collections yet.</p>
                        )}
                        <button className="action-button">Create New Collection</button>
                    </div>
                </section>
            </main>
            
            <footer className="dashboard-footer">
                <button className="footer-button">Understanding Auras</button>
            </footer>
        </div>
    );
}

export default DashboardScreen;