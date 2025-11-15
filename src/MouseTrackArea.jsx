import React, { useState } from 'react';

const MouseTrackerArea = () => {
  // State to store the current mouse position (optional for display)
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // Event handler for the onMouseMove event
  const handleMouseMove = (event) => {
    // Get the position relative to the browser viewport
    const { clientX, clientY } = event;

    // Log the position to the console as required
    console.log(`Mouse position: X=${clientX}, Y=${clientY}`);

    // Update the component state to display the coordinates on screen
    setPosition({ x: clientX, y: clientY });
  };

  // Define styles for the area to make it visible
  const areaStyle = {
    width: '400px',
    height: '200px',
    border: '2px solid red',
    backgroundColor: '#f0f0f0',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'crosshair',
  };

  return (
    <div style={areaStyle} onMouseMove={handleMouseMove}>
      <h3>Move your mouse here</h3>
      <p>
        Current position (X, Y): {position.x}, {position.y}
      </p>
    </div>
  );
};

export default MouseTrackerArea;
