// Custom A-Frame component registry

AFRAME.registerComponent('reactor-sim', {
    init: function () {
        this.timeElapsed = 0;
        this.rods = this.el.children;
        this.core = document.getElementById('reactor-core');
    },
    tick: function (time, timeDelta) {
        this.timeElapsed += timeDelta / 1000;

        // Move control rods
        const yOffset = Math.sin(this.timeElapsed) * 0.2;
        this.el.object3D.position.y = 3 + yOffset;

        // Pulse base material of sibling
        if (this.core) {
            const temp = Math.sin(this.timeElapsed * 0.5) * 50 + 50;
            const newIntensity = 1 + (temp / 100) * 4;
            // Update A-Frame material attribute
            this.core.setAttribute('material', `emissive: #0ea5e9; emissiveIntensity: ${newIntensity}; roughness: 0.1`);

            // Globally expose temp for other components to read (like alert-screen)
            window.reactorTemp = temp;
        }
    }
});

AFRAME.registerComponent('turbine-sim', {
    init: function () {
        this.rotationZ = 0;
    },
    tick: function (time, timeDelta) {
        // Read global temp
        const temp = window.reactorTemp || 0;
        const speed = (temp / 100) * 5; // max 5 rad/s

        this.rotationZ -= (speed * timeDelta) / 1000;
        this.el.object3D.rotation.z = this.rotationZ;
    }
});

AFRAME.registerComponent('steam-sim', {
    init: function () {
        const particleCount = 50;
        const geom = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        this.velocities = [];

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 4;
            positions[i * 3 + 1] = Math.random() * 5;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 4;
            this.velocities.push({
                y: 1 + Math.random() * 2,
                x: (Math.random() - 0.5) * 0.5,
                z: (Math.random() - 0.5) * 0.5
            });
        }
        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const mat = new THREE.PointsMaterial({
            color: 0xcccccc,
            size: 1.5,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.steamParticles = new THREE.Points(geom, mat);
        this.el.setObject3D('mesh', this.steamParticles);
    },
    tick: function (time, timeDelta) {
        if (!this.steamParticles) return;
        const delta = timeDelta / 1000;
        const positions = this.steamParticles.geometry.attributes.position.array;

        for (let i = 0; i < this.velocities.length; i++) {
            positions[i * 3 + 1] += this.velocities[i].y * delta;
            positions[i * 3] += this.velocities[i].x * delta;
            positions[i * 3 + 2] += this.velocities[i].z * delta;

            if (positions[i * 3 + 1] > 15) {
                positions[i * 3 + 1] = 0;
                positions[i * 3] = (Math.random() - 0.5) * 4;
                positions[i * 3 + 2] = (Math.random() - 0.5) * 4;
            }
        }
        this.steamParticles.geometry.attributes.position.needsUpdate = true;
    }
});

AFRAME.registerComponent('alert-sim', {
    init: function () {
        this.timeElapsed = 0;
    },
    tick: function (time, timeDelta) {
        this.timeElapsed += timeDelta / 1000;
        const temp = window.reactorTemp || 0;

        if (temp > 90) {
            const blink = Math.sin(this.timeElapsed * 10) * 0.5 + 0.5;
            this.el.setAttribute('material', `emissive: #ef4444; emissiveIntensity: ${blink}`);
        } else {
            this.el.setAttribute('material', `emissive: #ef4444; emissiveIntensity: 0.2`);
        }
    }
});

// Component to handle Hotspot Clicks
AFRAME.registerComponent('hotspot-panel', {
    schema: {
        title: { type: 'string', default: 'Info' },
        desc: { type: 'string', default: 'Description' }
    },
    init: function () {
        this.el.addEventListener('click', () => {
            // Re-use logic from our ui.js handler
            if (window.showInfoPanel) {
                // Pass a THREE.Vector3 world position
                const worldPos = new THREE.Vector3();
                this.el.object3D.getWorldPosition(worldPos);
                window.showInfoPanel(this.data.title, this.data.desc, worldPos);
            }
        });

        // Add hover reactions
        this.el.addEventListener('mouseenter', () => {
            this.el.setAttribute('scale', '1.2 1.2 1.2');
        });
        this.el.addEventListener('mouseleave', () => {
            this.el.setAttribute('scale', '1 1 1');
        });
    }
});
