import { useState, useEffect } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { useLocation } from 'react-router-dom';
import {
  dashboardTourSteps,
  activityTourSteps,
  alertsTourSteps,
  deviceTourSteps,
  navigationTourSteps,
  trackingTourSteps,
  dataSharingTourSteps,
} from '@/data/tour-steps.tsx';

interface OnboardingTourProps {
  runTour?: boolean;
  onComplete?: () => void;
}

const TOUR_STORAGE_KEY = 'symbiot-tour-completed';
const TOUR_SKIPPED_KEY = 'symbiot-tour-skipped';

export const OnboardingTour = ({ runTour = false, onComplete }: OnboardingTourProps) => {
  const location = useLocation();
  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);

  // Check if tour has been completed or skipped
  const isTourCompleted = () => {
    return localStorage.getItem(TOUR_STORAGE_KEY) === 'true';
  };

  const isTourSkipped = () => {
    return localStorage.getItem(TOUR_SKIPPED_KEY) === 'true';
  };

  const markTourCompleted = () => {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    localStorage.removeItem(TOUR_SKIPPED_KEY);
  };

  const markTourSkipped = () => {
    localStorage.setItem(TOUR_SKIPPED_KEY, 'true');
  };

  // Reset tour (for restart functionality)
  useEffect(() => {
    if (runTour) {
      localStorage.removeItem(TOUR_STORAGE_KEY);
      localStorage.removeItem(TOUR_SKIPPED_KEY);
      setHasShownWelcome(false);
    }
  }, [runTour]);

  // Load appropriate tour steps based on current route
  useEffect(() => {
    const path = location.pathname;
    let tourSteps: Step[] = [];

    // First-time users get navigation tour first
    if (!hasShownWelcome && !isTourCompleted() && !isTourSkipped()) {
      tourSteps = [...navigationTourSteps];
      setHasShownWelcome(true);
    } else if (runTour) {
      // Manual restart - show page-specific tour
      if (path === '/' || path === '/dashboard') {
        tourSteps = dashboardTourSteps;
      } else if (path === '/movement-dashboard') {
        tourSteps = activityTourSteps;
      } else if (path === '/alerts') {
        tourSteps = alertsTourSteps;
      } else if (path === '/devices' || path === '/device-status') {
        tourSteps = deviceTourSteps;
      } else if (path === '/tracking') {
        tourSteps = trackingTourSteps;
      } else if (path === '/data-sharing') {
        tourSteps = dataSharingTourSteps;
      }
    } else {
      // Auto-run for first-time users on specific pages
      if (!isTourCompleted() && !isTourSkipped()) {
        if (path === '/' || path === '/dashboard') {
          tourSteps = dashboardTourSteps;
        } else if (path === '/movement-dashboard') {
          tourSteps = activityTourSteps;
        } else if (path === '/alerts') {
          tourSteps = alertsTourSteps;
        } else if (path === '/devices' || path === '/device-status') {
          tourSteps = deviceTourSteps;
        } else if (path === '/tracking') {
          tourSteps = trackingTourSteps;
        } else if (path === '/data-sharing') {
          tourSteps = dataSharingTourSteps;
        }
      }
    }

    if (tourSteps.length > 0) {
      setSteps(tourSteps);
      setRun(true);
    } else {
      setRun(false);
    }
  }, [location.pathname, runTour, hasShownWelcome]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, action } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);

      if (status === STATUS.FINISHED) {
        markTourCompleted();
      } else if (status === STATUS.SKIPPED) {
        markTourSkipped();
      }

      if (onComplete) {
        onComplete();
      }
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: 'hsl(var(--primary))',
          textColor: 'hsl(var(--foreground))',
          backgroundColor: 'hsl(var(--card))',
          arrowColor: 'hsl(var(--card))',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: '0.5rem',
          padding: '1rem',
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        buttonNext: {
          backgroundColor: 'hsl(var(--primary))',
          borderRadius: '0.375rem',
          padding: '0.5rem 1rem',
          fontSize: '0.875rem',
        },
        buttonBack: {
          color: 'hsl(var(--muted-foreground))',
          marginRight: '0.5rem',
        },
        buttonSkip: {
          color: 'hsl(var(--muted-foreground))',
          fontSize: '0.875rem',
        },
        spotlight: {
          borderRadius: '0.5rem',
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Finish',
        next: 'Next',
        skip: 'Skip Tour',
      }}
      floaterProps={{
        disableAnimation: false,
      }}
      disableOverlayClose
      spotlightClicks
    />
  );
};

// Hook to check if user should see the tour
export const useShouldShowTour = (): boolean => {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    const tourCompleted = localStorage.getItem(TOUR_STORAGE_KEY) === 'true';
    const tourSkipped = localStorage.getItem(TOUR_SKIPPED_KEY) === 'true';
    setShouldShow(!tourCompleted && !tourSkipped);
  }, []);

  return shouldShow;
};

// Function to restart tour (call from profile/settings)
export const restartTour = () => {
  localStorage.removeItem(TOUR_STORAGE_KEY);
  localStorage.removeItem(TOUR_SKIPPED_KEY);
  window.location.reload();
};
