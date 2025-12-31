pc.script.createLoadingScreen((app) => {
    const createCss = () => {
        const css = `
            body {
                background-color: #1a0000;
            }

            #application-splash-wrapper {
                position: absolute;
                top: 0;
                left: 0;
                height: 100%;
                width: 100%;
                background-color: #1a0000;
            }

            #application-splash {
                position: absolute;
                top: calc(50% - 60px);
                width: 400px;
                left: calc(50% - 200px);
            }

            #application-splash-title {
                font-family: 'Courier New', monospace;
                font-size: 32px;
                font-weight: bold;
                color: #ff0000;
                text-align: center;
                text-transform: uppercase;
                letter-spacing: 4px;
                text-shadow: 0 0 20px rgba(255, 0, 0, 0.8), 0 0 40px rgba(255, 0, 0, 0.5);
                animation: pulse 2s ease-in-out infinite;
            }

            @keyframes pulse {
                0%, 100% {
                    opacity: 1;
                    text-shadow: 0 0 20px rgba(255, 0, 0, 0.8), 0 0 40px rgba(255, 0, 0, 0.5);
                }
                50% {
                    opacity: 0.7;
                    text-shadow: 0 0 10px rgba(255, 0, 0, 0.6), 0 0 20px rgba(255, 0, 0, 0.3);
                }
            }

            #progress-bar-container {
                margin: 30px auto 0 auto;
                height: 4px;
                width: 100%;
                background-color: #330000;
                border: 1px solid #660000;
                box-shadow: 0 0 10px rgba(255, 0, 0, 0.3);
            }

            #progress-bar {
                width: 0%;
                height: 100%;
                background-color: #ff0000;
                box-shadow: 0 0 10px rgba(255, 0, 0, 0.8);
                transition: width 0.3s ease;
            }

            @media (max-width: 480px) {
                #application-splash {
                    width: 300px;
                    left: calc(50% - 150px);
                }
                #application-splash-title {
                    font-size: 24px;
                    letter-spacing: 2px;
                }
            }
        `;

        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
    };

    const showSplash = () => {
        const wrapper = document.createElement('div');
        wrapper.id = 'application-splash-wrapper';
        document.body.appendChild(wrapper);

        const splash = document.createElement('div');
        splash.id = 'application-splash';
        wrapper.appendChild(splash);

        const title = document.createElement('div');
        title.id = 'application-splash-title';
        title.textContent = 'CRITICAL MIGRATION';
        splash.appendChild(title);

        const container = document.createElement('div');
        container.id = 'progress-bar-container';
        splash.appendChild(container);

        const bar = document.createElement('div');
        bar.id = 'progress-bar';
        container.appendChild(bar);
    };

    const setProgress = (value) => {
        const bar = document.getElementById('progress-bar');
        if (bar) {
            value = Math.min(1, Math.max(0, value));
            bar.style.width = `${value * 100}%`;
        }
    };

    const hideSplash = () => {
        document.getElementById('application-splash-wrapper').remove();
    };

    createCss();
    showSplash();

    app.on('preload:end', () => {
        app.off('preload:progress');
    });
    app.on('preload:progress', setProgress);
    app.on('start', hideSplash);
});
