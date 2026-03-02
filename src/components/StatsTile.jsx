// src/components/StatsTile.jsx
import React, { useState, useEffect, useRef } from 'react';
import './StatsTile.css';

const StatsTile = ({ icon, label, value, color, glowColor }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const tileRef = useRef(null);
  const animationRef = useRef(null);
  const previousValue = useRef(0);

  // Intersection Observer to trigger animation when tile is visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    if (tileRef.current) {
      observer.observe(tileRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Animate number counting up
  useEffect(() => {
    if (isVisible && value > 0) {
      const duration = 2000; // 2 seconds
      const steps = 60;
      const increment = value / steps;
      let current = 0;
      let step = 0;

      const animate = () => {
        step++;
        current = Math.min(Math.floor(increment * step), value);
        setDisplayValue(current);

        if (step < steps) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setDisplayValue(value);
        }
      };

      animationRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [isVisible, value]);

  // Pulse effect when value changes
  useEffect(() => {
    if (value !== previousValue.current && previousValue.current !== 0) {
      // Value changed - add pulse class
      if (tileRef.current) {
        tileRef.current.classList.add('pulse');
        setTimeout(() => {
          if (tileRef.current) {
            tileRef.current.classList.remove('pulse');
          }
        }, 500);
      }
      
      // Update display value with count up
      setDisplayValue(0);
      setIsVisible(true);
    }
    previousValue.current = value;
  }, [value]);

  return (
    <div 
      ref={tileRef}
      className="stats-tile"
      style={{
        '--tile-glow': glowColor,
        '--tile-color': color
      }}
    >
      <div className="tile-icon" style={{ color: color }}>
        {icon}
      </div>
      <div className="tile-content">
        <h3 className="tile-label">{label}</h3>
        <div className="tile-value-container">
          <span className="tile-value" style={{ color: color }}>
            {displayValue.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default StatsTile;