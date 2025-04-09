import React, {useState, useEffect} from "react";
import './LandingScreen.css';
import { Link } from "react-router-dom";

function LandingScreen(){
    return (
        <div className="landing-container">
            <div className='ora-title'>
                <img src='assets/images/ORA-TITLE.png' />
            </div>
            <Link to="/auth" className="enter-button" style={{ textDecoration: 'none' }}>ENTER</Link>
            <div className="background-image">
                <img src="assets/images/opening.png"/>
            </div>
            <div className='rainbow-background-1'></div>
        </div>
    )
}

export default LandingScreen