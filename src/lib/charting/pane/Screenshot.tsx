import { useEffect, useMemo, useRef, useState } from "react";

export const Screenshot = ({ canvas }: { canvas: HTMLCanvasElement }) => {

    // Calculate the dataURL during render, not after.
    // This only re-calculates if the 'canvas' object changes.
    const imgSrc = useMemo(() => {
        return canvas ? canvas.toDataURL("image/png") : "";
    }, [canvas]);

    if (!imgSrc) return null;

    return (
        <div className="screenshot-container">
            <a href={imgSrc} download={`vibetrader-chart-${formatDate(new Date())}.png`}>
                <img
                    src={imgSrc}
                    alt="Screenshot"
                    title={`vibetrader-chart-${formatDate(new Date())}.png`}
                    style={{ width: '100%', height: '100%' }}
                />
            </a>
        </div>
    );
}

const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-11
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}${month}${day}_${hours}${minutes}`;
}