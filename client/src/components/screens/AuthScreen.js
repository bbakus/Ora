import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import './AuthScreen.css';

function AuthScreen() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const response = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    password
                })
            });

            if (response.ok) {
                const userData = await response.json();
                console.log("Login successful, received user data:", userData);
                console.log("User ID from server:", userData.id);
                console.log("User ID (string) from server:", userData.id_str);
                
                localStorage.setItem('user', JSON.stringify(userData));
                
                // Use string ID if available, otherwise fall back to regular ID
                const userId = userData.id_str || userData.id;
                
                const path = `/auth/${userId}/dashboard`;
                console.log("Navigating to:", path);
                navigate(path);
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Invalid email or password');
            }
        } catch (err) {
            setError('Error connecting to server');
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-box">
                <h2>Login</h2>
                {error && <p className="error-message">{error}</p>}
                <form onSubmit={handleSubmit}>
                    <input 
                        type="email" 
                        placeholder="Email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <input 
                        type="password" 
                        placeholder="Password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <button type="submit">Login</button>
                </form>
                <p>Don't have an account? <Link to="/signup">Sign Up</Link></p>
            </div>
            <div className="background-image">
                <img src="assets/images/opening.png" alt="background"/>
            </div>
            <div className="rainbow-background"></div>
        </div>
    );
}

export default AuthScreen;