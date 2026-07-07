'use client';

function SpiralSVG({ id }: { id: string }) {
    return (
        <svg viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id={`gradA-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--spiral-color-a)" />
                    <stop offset="100%" stopColor="var(--spiral-color-b)" />
                </linearGradient>
                <linearGradient id={`gradB-${id}`} x1="100%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="var(--spiral-color-b)" />
                    <stop offset="100%" stopColor="var(--spiral-color-a)" />
                </linearGradient>
                <filter id={`blur-${id}`} x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" />
                </filter>
            </defs>

            <path
                className="spiral-arm-a"
                d="M504.0 500.0 L507.6 502.5 L509.7 507.1 L509.4 513.0 L506.2 519.1 L500.0 524.1 L491.3 526.8 L481.1 526.0 L470.7 521.3 L461.8 512.4 L455.8 500.0 L454.1 485.1 L457.7 469.3 L466.9 454.5 L481.4 442.7 L500.0 435.7 L521.1 435.0 L542.5 441.5 L561.8 455.1 L576.5 475.2 L584.4 500.0 L584.1 527.3 L574.8 554.4 L556.7 578.1 L531.1 595.6 L500.0 604.5 L466.5 603.2 L433.8 591.1 L405.7 568.5 L385.3 537.3 L375.4 500.0 L377.6 460.2 L392.7 422.0 L419.6 389.4 L456.5 366.2 L500.0 355.3 L546.0 358.5 L589.8 376.4 L626.9 407.8 L653.0 450.3 L664.8 500.0 L660.6 552.2 L639.9 601.6 L604.0 643.1 L555.9 672.1 L500.0 685.0 L441.6 679.7 L386.6 656.1 L340.6 615.8 L308.8 562.1 L294.9 500.0 L301.2 435.4 L327.6 374.7 L372.4 324.3 L431.7 289.7 L500.0 274.8 L570.8 282.0 L637.1 311.3 L691.9 360.6 L729.4 425.4 L745.3 500.0 L737.1 577.0 L704.9 648.9 L651.3 708.2 L580.8 748.6 L500.0 765.4 L416.8 756.2 L339.3 721.2 L275.5 663.1 L232.3 587.0 L214.5 500.0 L224.7 410.5 L262.5 327.5 L325.1 259.3 L406.8 213.2 L500.0 194.4 L595.7 205.5 L684.4 246.3 L757.0 313.3 L805.9 400.6 L825.7 500.0"
                fill="none"
                stroke={`url(#gradA-${id})`}
                strokeWidth="2"
                strokeLinecap="round"
                filter={`url(#blur-${id})`}
            />

            <path
                className="spiral-arm-b"
                d="M496.0 500.0 L492.6 502.4 L490.7 506.7 L491.1 512.3 L494.1 518.0 L500.0 522.7 L508.2 525.1 L517.7 524.4 L527.4 519.9 L535.8 511.6 L541.4 500.0 L542.9 486.1 L539.5 471.3 L530.9 457.4 L517.4 446.4 L500.0 439.9 L480.3 439.3 L460.3 445.3 L442.3 458.1 L428.6 476.8 L421.2 500.0 L421.5 525.5 L430.2 550.7 L447.1 572.8 L471.0 589.1 L500.0 597.5 L531.3 596.2 L561.7 584.9 L587.9 563.9 L606.9 534.7 L616.2 500.0 L614.0 463.0 L600.0 427.3 L574.9 397.0 L540.5 375.3 L500.0 365.2 L457.2 368.2 L416.3 384.9 L381.8 414.1 L357.5 453.7 L346.5 500.0 L350.4 548.6 L369.7 594.6 L403.2 633.3 L447.9 660.2 L500.0 672.2 L554.4 667.4 L605.6 645.4 L648.4 607.8 L678.0 557.8 L690.9 500.0 L685.1 439.8 L660.5 383.4 L618.8 336.5 L563.6 304.2 L500.0 290.4 L434.1 297.1 L372.4 324.4 L321.3 370.2 L286.4 430.6 L271.7 500.0 L279.3 571.7 L309.2 638.6 L359.2 693.8 L424.8 731.4 L500.0 747.0 L577.5 738.5 L649.6 705.9 L708.9 651.8 L749.1 580.9 L765.7 500.0"
                fill="none"
                stroke={`url(#gradB-${id})`}
                strokeWidth="1.4"
                strokeLinecap="round"
                filter={`url(#blur-${id})`}
            />
        </svg>
    );
}

export default function SpiralBackground() {
    return (
        <div className="spiral-backdrop" aria-hidden="true">
            <div className="spiral-orb top-right">
                <SpiralSVG id="a" />
            </div>
            <div className="spiral-orb bottom-left">
                <SpiralSVG id="b" />
            </div>
        </div>
    );
}