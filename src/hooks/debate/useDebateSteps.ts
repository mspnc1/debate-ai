/**
 * Hook for managing debate setup step navigation
 * Handles step progression, validation, and progress tracking
 */

import { useState } from 'react';
import { DebateStep, UseDebateStepsReturn } from '../../types/debate';

const STEPS: DebateStep[] = ['topic', 'ai', 'personality', 'review'];

export const useDebateSteps = (
  initialStep: DebateStep = 'topic'
): UseDebateStepsReturn => {
  const [currentStep, setCurrentStep] = useState<DebateStep>(initialStep);
  const [completedSteps, setCompletedSteps] = useState<DebateStep[]>([]);

  // Step navigation functions
  const goToStep = (step: DebateStep) => {
    if (STEPS.includes(step)) {
      setCurrentStep(step);
    }
  };

  const nextStep = () => {
    const currentIndex = STEPS.indexOf(currentStep);
    if (currentIndex < STEPS.length - 1) {
      const nextStepValue = STEPS[currentIndex + 1];
      setCurrentStep(nextStepValue);
      
      // Mark current step as completed
      if (!completedSteps.includes(currentStep)) {
        setCompletedSteps(prev => [...prev, currentStep]);
      }
    }
  };

  const previousStep = () => {
    const currentIndex = STEPS.indexOf(currentStep);
    if (currentIndex > 0) {
      const previousStepValue = STEPS[currentIndex - 1];
      setCurrentStep(previousStepValue);
    }
  };

  // Computed properties
  const currentStepIndex = STEPS.indexOf(currentStep);
  const totalSteps = STEPS.length;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;
  const stepProgress = ((currentStepIndex + 1) / totalSteps) * 100;

  // Validation function for step completion
  const canProceedToStep = (step: DebateStep): boolean => {
    const stepIndex = STEPS.indexOf(step);
    const currentIndex = STEPS.indexOf(currentStep);
    
    // Can always go back or to current step
    if (stepIndex <= currentIndex) {
      return true;
    }
    
    // Can only proceed if previous steps are completed
    for (let i = 0; i < stepIndex; i++) {
      if (!completedSteps.includes(STEPS[i])) {
        return false;
      }
    }
    
    return true;
  };

  // Helper function to mark step as completed
  const markStepCompleted = (step: DebateStep) => {
    if (!completedSteps.includes(step)) {
      setCompletedSteps(prev => [...prev, step]);
    }
  };

  // Helper function to reset progress
  const resetSteps = () => {
    setCurrentStep('topic');
    setCompletedSteps([]);
  };

  // Get step label
  const getStepLabel = (step: DebateStep): string => {
    const labels: Record<DebateStep, string> = {
      topic: 'Topic',
      ai: 'Debaters',
      personality: 'Personalities',
      review: 'Review',
    };
    return labels[step];
  };

  return {
    currentStep,
    totalSteps,
    goToStep,
    nextStep,
    previousStep,
    isFirstStep,
    isLastStep,
    stepProgress,
    completedSteps,
    canProceedToStep,
    markStepCompleted,
    resetSteps,
    getStepLabel,
  };
};