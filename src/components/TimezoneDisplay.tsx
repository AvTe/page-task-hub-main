import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { getUserTimezone, formatTimeWithTimezone, TimezoneInfo } from '../utils/timezone';

interface TimezoneDisplayProps {
  className?: string;
  showLocation?: boolean;
  showIcon?: boolean;
  format?: 'full' | 'time-only' | 'compact';
}

const TimezoneDisplay: React.FC<TimezoneDisplayProps> = ({ 
  className = '', 
  showLocation = true,
  showIcon = true,
  format = 'full'
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timezoneInfo, setTimezoneInfo] = useState<TimezoneInfo | null>(null);
  
  useEffect(() => {
    setTimezoneInfo(getUserTimezone());
    
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  if (!timezoneInfo) return null;

  const getFormattedTime = () => {
    switch (format) {
      case 'time-only':
        return formatTimeWithTimezone(currentTime, false);
      case 'compact':
        return currentTime.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      default:
        return formatTimeWithTimezone(currentTime, true);
    }
  };
  
  return (
    <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
      {showIcon && <Clock className="h-4 w-4" />}
      <span className="font-mono">{getFormattedTime()}</span>
      {showLocation && format !== 'compact' && (
        <span className="text-xs opacity-75">({timezoneInfo.location})</span>
      )}
    </div>
  );
};

export default TimezoneDisplay;
