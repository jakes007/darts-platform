// src/components/StatsTile.jsx (UPDATED - Circle design)
import React, { useState, useEffect, useRef } from 'react';
import './StatsTile.css';

const StatsTile = ({ number, label, accent = 'blue', delay = 0 }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const tileRef = useRef(null);
  const animationRef = useRef(null);
  const previousValue = useRef(0);

  // Determine which accent color to use
  const accentClass = accent === 'pink' ? 'pink' : accent === 'purple' ? 'purple' : 'blue';
  
  // Apply delay class
  const delayClass = delay > 0 ? `delay-${delay}` : '';

  // Intersection Observer to trigger animation when tile is visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setIsVisible(true);
          setHasAnimated(true);
        }
      },
      { threshold: 0.3, rootMargin: '50px' }
    );

    if (tileRef.current) {
      observer.observe(tileRef.current);
    }

    return () => {
      if (tileRef.current) {
        observer.unobserve(tileRef.current);
      }
    };
  }, [hasAnimated]);

  // Animate number counting up
  useEffect(() => {
    if (isVisible && number > 0) {
      const duration = 2000; // 2 seconds
      const steps = 60;
      const increment = number / steps;
      let current = 0;
      let step = 0;

      const animate = () => {
        step++;
        current = Math.min(Math.floor(increment * step), number);
        setDisplayValue(current);

        if (step < steps) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setDisplayValue(number);
        }
      };

      animationRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    } else if (isVisible && number === 0) {
      setDisplayValue(0);
    }
  }, [isVisible, number]);

  // Pulse effect when value changes
  useEffect(() => {
    if (number !== previousValue.current && previousValue.current !== 0 && hasAnimated) {
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
    previousValue.current = number;
  }, [number, hasAnimated]);

  return (
    <div className={`stats-tile-container ${delayClass}`}>
      <div 
        ref={tileRef}
        className={`stats-tile ${accentClass}`}
      >
        <span className="stats-number">
          {displayValue.toLocaleString()}
        </span>
        <span className="stats-label">
          {label}
        </span>
      </div>
    </div>
  );
};

export default StatsTile;