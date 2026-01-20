import { useEffect, useRef } from "react";

export const Screenshot = ({ canvas }: { canvas: HTMLCanvasElement }) => {
    const containerRef = useRef(null);

    useEffect(() => {
        const container = containerRef.current;

        if (container && canvas) {
            // Clear the container just in case of re-renders
            container.innerHTML = '';

            // Append the existing canvas element to your div
            container.appendChild(canvas);
        }

        // Optional: Cleanup if the component unmounts
        return () => {
            if (container) {
                container.innerHTML = '';
            }
        };

    }, [canvas]);

    return (
        <div
            ref={containerRef}
            className="screenshot-container"
            style={{ width: '100%', height: '100%' }}
        />
    );
}
