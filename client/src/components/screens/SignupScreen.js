import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import './AuthScreen.css';

function SignupScreen() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        try {
            const response = await fetch('http://localhost:5000/api/auth/signup', {
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
                console.log("User ID from server:", userData.id);
                console.log("User ID (string) from server:", userData.id_str);
                
                localStorage.setItem('user', JSON.stringify(userData));
                
                const userId = userData.id_str || userData.id;
                
                navigate(`/auth/${userId}/questionnaire`);
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Error creating account');
            }
        } catch (err) {
            setError('Error connecting to server');
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
                    <button type="submit">Sign Up</button>
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