import React, { useState, useEffect, useCallback, useRef } from 'react';
import './styles/Community_Guide.css';

export interface GuideStep {
  targetId: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

interface CommunityGuideProps {
  isOpen: boolean;
  steps: GuideStep[]; // <-- The architecture fix: receive steps dynamically
  onComplete: () => void;
  onSkip: () => void;
}

const Community_Guide: React.FC<CommunityGuideProps> = ({ isOpen, steps, onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [windowDimensions, setWindowDimensions] = useState({ width: 0, height: 0 });
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Helper to find element, considering mobile fallbacks
  const findTargetElement = useCallback((stepTargetId: string) => {
    let el = document.getElementById(stepTargetId);
    if (!el) el = document.getElementById(`${stepTargetId}-mobile`);
    if (!el && stepTargetId === 'guide-add-btn') {
      const addBtns = document.getElementsByClassName('BTN_ADD');
      if (addBtns.length > 0) el = addBtns[0] as HTMLElement;
    }
    return el;
  }, []);

  const updateTargetPosition = useCallback(() => {
    if (!isOpen || !steps || steps.length === 0 || currentStep >= steps.length) return;

    const currentTargetId = steps[currentStep].targetId;

    const checkElement = () => {
      const el = findTargetElement(currentTargetId);

      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        setTimeout(() => setTargetRect(el.getBoundingClientRect()), 300);
      } else {
        setTargetRect(null);
        pollTimer.current = setTimeout(checkElement, 500);
      }
    };

    checkElement();

    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [isOpen, currentStep, steps, findTargetElement]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWindowDimensions({ width: window.innerWidth, height: window.innerHeight });
    }
    const handleResize = () => {
      setWindowDimensions({ width: window.innerWidth, height: window.innerHeight });
      updateTargetPosition();
    };
    window.addEventListener('resize', handleResize);
    updateTargetPosition();

    return () => window.removeEventListener('resize', handleResize);
  }, [updateTargetPosition]);

  useEffect(() => {
    if (!isOpen || !steps || currentStep >= steps.length || !targetRect) return;

    const targetElement = findTargetElement(steps[currentStep].targetId);

    const handleTargetClick = (e: Event) => {
      e.stopPropagation();
      setTimeout(() => {
        if (currentStep < steps.length - 1) {
          setCurrentStep(prev => prev + 1);
        } else {
          setCurrentStep(0);
          onComplete();
        }
      }, 200);
    };

    if (targetElement) {
      targetElement.addEventListener('click', handleTargetClick);
      targetElement.style.position = targetElement.style.position === 'static' || !targetElement.style.position ? 'relative' : targetElement.style.position;
      targetElement.style.zIndex = '99999';
    }

    return () => {
      if (targetElement) {
        targetElement.removeEventListener('click', handleTargetClick);
        targetElement.style.zIndex = ''; 
      }
    };
  }, [isOpen, currentStep, targetRect, steps, onComplete, findTargetElement]);

  // Reset step counter if guide closes or steps array changes completely
  useEffect(() => {
    if (!isOpen) setCurrentStep(0);
  }, [isOpen, steps]);

  if (!isOpen || !steps || steps.length === 0 || currentStep >= steps.length) return null;

  if (!targetRect) {
    return <div className="guide-overlay waiting" style={{ pointerEvents: 'none' }}></div>;
  }

  const currentGuide = steps[currentStep];
  const tooltipWidth = 280; 
  const tooltipHeight = 120; 

  let tooltipTop = targetRect.bottom + 15;
  let tooltipLeft = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);

  if (currentGuide.position === 'top') {
    tooltipTop = targetRect.top - tooltipHeight - 15;
  } else if (currentGuide.position === 'left') {
    tooltipTop = targetRect.top + (targetRect.height / 2) - (tooltipHeight / 2);
    tooltipLeft = targetRect.left - tooltipWidth - 15;
  } else if (currentGuide.position === 'right') {
    tooltipTop = targetRect.top + (targetRect.height / 2) - (tooltipHeight / 2);
    tooltipLeft = targetRect.right + 15;
  }

  if (tooltipLeft < 10) tooltipLeft = 10;
  if (tooltipLeft + tooltipWidth > windowDimensions.width - 10) tooltipLeft = windowDimensions.width - tooltipWidth - 10;
  if (tooltipTop < 10) tooltipTop = targetRect.bottom + 15; 
  if (tooltipTop + tooltipHeight > windowDimensions.height - 10) tooltipTop = targetRect.top - tooltipHeight - 15; 

  return (
    <>
      <div className="guide-overlay" style={{ pointerEvents: 'none' }}></div>
      <div 
        className="guide-spotlight"
        style={{
          top: targetRect.top - 6, left: targetRect.left - 6,
          width: targetRect.width + 12, height: targetRect.height + 12,
          position: 'fixed', borderRadius: '8px',
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75)', pointerEvents: 'none',
          zIndex: 99998, transition: 'all 0.3s ease-in-out'
        }}
      ></div>
      <div 
        className="guide-tooltip"
        style={{ 
          top: tooltipTop, left: tooltipLeft, position: 'fixed', zIndex: 99999,
          width: '280px', backgroundColor: '#fff', padding: '16px', borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)', transition: 'all 0.3s ease-in-out'
        }}
      >
        <h4 className="guide-title" style={{ margin: '0 0 8px 0', color: '#1a56db' }}>
          <i className="fas fa-info-circle"></i> {currentGuide.title}
        </h4>
        <p className="guide-content" style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: '#333' }}>
          {currentGuide.content}
        </p>
        <div className="guide-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="guide-step-count" style={{ fontSize: '0.8rem', color: '#666' }}>
            Step {currentStep + 1} of {steps.length}
          </span>
          <button 
            className="guide-skip-btn" 
            onClick={() => { setCurrentStep(0); onSkip(); }}
            style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Skip Tour
          </button>
        </div>
      </div>
    </>
  );
};

export default Community_Guide;