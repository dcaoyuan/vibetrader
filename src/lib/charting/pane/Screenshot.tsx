import { formatDateForFileName } from "../../utils";

export const Screenshot = ({ imgSrc }: { imgSrc: string }) => {
    if (!imgSrc) return undefined;

    return (
        <div className="screenshot-container" style={{ paddingTop: 8 }}>
            <a href={imgSrc} download={`vibetrader-chart-${formatDateForFileName(new Date())}.png`}>
                <img
                    src={imgSrc}
                    alt="Screenshot"
                    title={`vibetrader-chart-${formatDateForFileName(new Date())}.png`}
                    style={{ width: '100%', height: '100%' }}
                />
            </a>
        </div>
    );
}

