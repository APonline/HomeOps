import horizontalLogo from "../assets/brand/homeops-logo-horizontal-600x200.png";
import stackedLogo from "../assets/brand/homeops-logo-stack-512.png";

export default function WelcomeLoader({ exiting = false }) {
    return (
        <div className={exiting ? "welcome-loader is-exiting" : "welcome-loader"}>
            <div className="welcome-loader__orb welcome-loader__orb--cyan" />
            <div className="welcome-loader__orb welcome-loader__orb--violet" />

            <section className="welcome-loader__card" aria-label="Loading HomeOps">
                <div className="welcome-loader__logo-wrap">
                    <img
                        className="welcome-loader__logo welcome-loader__logo--desktop"
                        src={horizontalLogo}
                        alt="HomeOps"
                    />

                    <img
                        className="welcome-loader__logo welcome-loader__logo--mobile"
                        src={stackedLogo}
                        alt="HomeOps"
                    />
                </div>

                <div className="welcome-loader__copy">
                    <span>Owner mode</span>
                    <strong>Bringing the house online</strong>
                </div>

                <div className="welcome-loader__progress" aria-hidden="true">
                    <i />
                </div>
            </section>
        </div>
    );
}
