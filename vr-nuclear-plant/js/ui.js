// Replace the old Vanilla Three.js ui.js with A-Frame specific bridge logic

document.addEventListener('DOMContentLoaded', () => {

    const uiLayer = document.getElementById('ui-layer');
    const overviewPage = document.getElementById('overview-page');
    const inGameUI = document.getElementById('ingame-ui');
    const btnExplore2D = document.getElementById('btn-explore-2d');
    const btnExit3D = document.getElementById('btn-exit-3d');
    const aScene = document.querySelector('a-scene');

    // Hide A-frame canvas initially via CSS opacity rather than breaking the render loop
    const canvasContainer = document.getElementById('app-canvas-container');

    // Tour Elements
    const btnPrevTour = document.getElementById('btn-prev-tour');
    const btnNextTour = document.getElementById('btn-next-tour');
    const tourInstruction = document.getElementById('tour-instruction');
    const mapNodes = document.querySelectorAll('.map-node');

    // Define Waypoints for the Tour (now compatible with A-Frame camera rig)
    const tourWaypoints = [
        { id: 'reactor', text: "Welcome to the Reactor Core. Inside this containment vessel, uranium atoms split to generate immense heat.", cameraPos: "-5 1.6 0" },
        { id: 'turbine', text: "The Turbine Hall. High-pressure steam from the reactor spins these massive blades to turn a generator.", cameraPos: "5 1.6 -4" },
        { id: 'cooling', text: "Cooling systems. After passing the turbine, steam is cooled back into water to be reused in the reactor.", cameraPos: "15 1.6 -5" },
        { id: 'control', text: "The Control Room. Operators monitor all temperatures, pressures, and radiation levels 24/7.", cameraPos: "-15 1.6 5" }
    ];

    let currentWaypointIndex = 0;

    // TTS
    const synth = window.speechSynthesis;
    function speakText(text) {
        if (synth) {
            synth.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.9;
            utterance.pitch = 1;
            synth.speak(utterance);
        }
    }

    function applyTourStep() {
        if (currentWaypointIndex < 0) currentWaypointIndex = 0;
        if (currentWaypointIndex >= tourWaypoints.length) currentWaypointIndex = tourWaypoints.length - 1;

        const wp = tourWaypoints[currentWaypointIndex];

        tourInstruction.innerText = wp.text;
        speakText(wp.text);

        mapNodes.forEach(node => node.classList.remove('active'));
        const activeNode = document.querySelector(`.map-node[data-location="${wp.id}"]`);
        if (activeNode) activeNode.classList.add('active');

        // Move Camera Rig (unless in VR, where we don't force teleporting as intensely)
        if (!aScene.is('vr-mode')) {
            const rig = document.getElementById('rig');
            if (rig) rig.setAttribute('position', wp.cameraPos);
        }
    }

    btnNextTour.addEventListener('click', () => { currentWaypointIndex++; applyTourStep(); });
    btnPrevTour.addEventListener('click', () => { currentWaypointIndex--; applyTourStep(); });

    // Landing screen transition handlers
    btnExplore2D.addEventListener('click', () => {
        uiLayer.classList.remove('active');
        overviewPage.classList.add('hidden');
        inGameUI.classList.remove('hidden');

        canvasContainer.classList.remove('hidden'); // Reveal 3D

        initAmbientSound();
        applyTourStep(); // Start tour!
    });

    btnExit3D.addEventListener('click', () => {
        uiLayer.classList.add('active');
        overviewPage.classList.remove('hidden');
        inGameUI.classList.add('hidden');

        canvasContainer.classList.add('hidden'); // Hide 3D
        synth.cancel(); // Mute tour
    });

    // A-Frame VR Mode Entry/Exit Handlers
    aScene.addEventListener('enter-vr', function () {
        // A-Frame handles the native VR entry, we just hide our 2D DOM
        overviewPage.classList.add('hidden');
    });

    aScene.addEventListener('exit-vr', function () {
        // Return to landing page
        btnExit3D.click();
    });

    // --- Spatial HTML Overlay Logic Bridged to A-Frame ---
    const spatialPanel = document.getElementById('spatial-panel');
    let activeHotspotPosition = null;

    spatialPanel.querySelector('#sp-close').addEventListener('click', () => {
        spatialPanel.classList.add('hidden');
        activeHotspotPosition = null;
    });

    // Expose this globally so `components.js` can call it on click!
    window.showInfoPanel = (title, desc, vector3Pos) => {
        document.getElementById('sp-title').innerText = title;
        document.getElementById('sp-desc').innerText = desc;
        spatialPanel.classList.remove('hidden');
        activeHotspotPosition = vector3Pos; // THREE.Vector3 from A-Frame world
    };

    // A-Frame custom render loop hook to update 2D panel screen coordinates!
    aScene.addEventListener('render-target-loaded', function () {
        const _vec = new THREE.Vector3();
        const originalRender = aScene.renderer.render;

        aScene.renderer.render = function (scene, camera, renderTarget, forceClear) {

            // Note: In VR mode, drawing standard DOM on top doesn't work well over the headset. 
            // The spatial panel will only show easily on the desktop fallback.
            if (activeHotspotPosition && !aScene.is('vr-mode')) {
                _vec.copy(activeHotspotPosition);
                _vec.project(camera); // Requires camera attached to renderer

                // Convert normalized device coords to screen pixels
                const x = (_vec.x * .5 + .5) * window.innerWidth;
                const y = (_vec.y * -.5 + .5) * window.innerHeight;

                spatialPanel.style.transform = `translate(-50%, -50%) translate(${x}px,${y}px)`;
                spatialPanel.style.position = 'absolute';
                spatialPanel.style.top = '0';
                spatialPanel.style.left = '0';
                spatialPanel.style.zIndex = '100';
            }

            originalRender.call(aScene.renderer, scene, camera, renderTarget, forceClear);
        };
    });

    // Synthetic Ambient Sound Generator
    let audioCtx;
    function initAmbientSound() {
        if (audioCtx) return;
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(50, audioCtx.currentTime); // Deep hum
            gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
        } catch (e) {
            console.error("Web Audio API not supported", e);
        }
    }
});
