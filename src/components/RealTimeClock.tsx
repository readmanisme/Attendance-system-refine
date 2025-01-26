import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';

const RealTimeClock = () => {
  const [currentTime, setCurrentTime] = useState(dayjs().format('YYYY-MM-DD HH:mm:ss'));

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(dayjs().format('YYYY-MM-DD HH:mm:ss'));
    }, 1000);

    return () => clearInterval(intervalId); // 清除定时器
  }, []);

  return <div>{currentTime}</div>;
};

export default RealTimeClock;
