import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import './AuthScreen.css';
import API_BASE_URL from '../../config/api';

function SignupScreen() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        
        setLoading(true);
        setError('');
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: formData.username,
                    email: formData.email,
                    password: formData.password
                })
            });
            
            if (response.ok) {
                const userData = await response.json();
                console.log("Signup successful, received user data:", userData);
                
                localStorage.setItem('user', JSON.stringify(userData));
                
                navigate(`/auth/${userData.id}/questionnaire`);
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Signup failed');
            }
        } catch (err) {
            console.error('Signup error:', err);
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-box">
                <h2>Sign Up</h2>
                {error && <p className="error-message">{error}</p>}
                <form onSubmit={handleSubmit}>
                    <input 
                        type="text" 
                        name="username"
                        placeholder="Username" 
                        value={formData.username}
                        onChange={handleChange}
                        required
                    />
                    <input 
                        type="email" 
                        name="email"
                        placeholder="Email" 
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />
                    <input 
                        type="password" 
                        name="password"
                        placeholder="Password" 
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />
                    <input 
                        type="password" 
                        name="confirmPassword"
                        placeholder="Confirm Password" 
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                    />
                    <button type="submit" disabled={loading}>Sign Up</button>
                </form>
                <p>Already have an account? <Link to="/auth">Login</Link></p>
            </div>
            <div className="background-image">
                <img src="assets/images/opening.png" alt="background"/>
            </div>
            <div className="rainbow-background"></div>
        </div>
    );
}

export default SignupScreen; 