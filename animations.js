/**
 * Advanced Visual Animations Engine
 * Handles Custom Cursor, Particle System, 3D Tilt, Scroll Observers, and Preloader.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Check if device is touch-based (disable expensive JS animations on mobile)
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);

    /* ══════════════════════════════════════
       1. PAGE PRELOADER & TYPEWRITER
       ══════════════════════════════════════ */
    const preloader = document.getElementById('global-loader');
    
    window.addEventListener('load', () => {
        if (preloader) {
            setTimeout(() => {
                preloader.classList.add('hide-loader');
                setTimeout(() => preloader.style.display = 'none', 800);
                
                // Trigger typewriter after loader fades
                initTypewriter();
            }, 500); // Small delay to let user see loader
        } else {
            initTypewriter();
        }
    });

    function initTypewriter() {
        const twElements = document.querySelectorAll('.typewriter');
        twElements.forEach(el => {
            const text = el.getAttribute('data-text') || el.innerText;
            el.innerText = '';
            el.style.opacity = '1';
            let i = 0;
            function type() {
                if (i < text.length) {
                    el.innerHTML += text.charAt(i);
                    i++;
                    setTimeout(type, 50); // Typing speed
                }
            }
            type();
        });
    }

    /* ══════════════════════════════════════
       2. SCROLL PROGRESS BAR
       ══════════════════════════════════════ */
    const progressBar = document.getElementById('scroll-progress');
    if (progressBar) {
        window.addEventListener('scroll', () => {
            const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrolled = (winScroll / height) * 100;
            progressBar.style.width = scrolled + '%';
        });
    }

    /* ══════════════════════════════════════
       3. INTERSECTION OBSERVER (Scroll Fade)
       ══════════════════════════════════════ */
    const fadeElements = document.querySelectorAll('.fade-up-element');
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const scrollObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    fadeElements.forEach(el => scrollObserver.observe(el));

    // If mobile, stop here. Don't init heavy cursor/particles/tilt.
    if (isTouchDevice) {
        document.body.classList.add('is-mobile');
        return; 
    }

    /* ══════════════════════════════════════
       4. CUSTOM ANIMATED CURSOR
       ══════════════════════════════════════ */
    const cursorDot = document.getElementById('cursor-dot');
    const cursorRing = document.getElementById('cursor-ring');
    
    let mouseX = 0, mouseY = 0;
    let ringX = 0, ringY = 0;

    if (cursorDot && cursorRing) {
        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            
            // Dot follows instantly
            cursorDot.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
        });

        // Smooth Lerp for ring
        const renderCursor = () => {
            ringX += (mouseX - ringX) * 0.15; // Lerp factor
            ringY += (mouseY - ringY) * 0.15;
            cursorRing.style.transform = `translate(${ringX}px, ${ringY}px)`;
            requestAnimationFrame(renderCursor);
        };
        requestAnimationFrame(renderCursor);

        // Hover states
        const interactiveElements = document.querySelectorAll('a, button, .tilt-card, input, textarea, .nav-user');
        interactiveElements.forEach(el => {
            el.addEventListener('mouseenter', () => {
                cursorRing.classList.add('hovered');
            });
            el.addEventListener('mouseleave', () => {
                cursorRing.classList.remove('hovered');
            });
        });

        // Click state
        document.addEventListener('mousedown', () => cursorRing.classList.add('clicked'));
        document.addEventListener('mouseup', () => cursorRing.classList.remove('clicked'));
    }

    /* ══════════════════════════════════════
       5. 3D TILT HOVER EFFECT
       ══════════════════════════════════════ */
    const tiltCards = document.querySelectorAll('.tilt-card');
    tiltCards.forEach(card => {
        card.addEventListener('mousemove', e => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            // Calculate rotation (max 3 degrees for stability)
            const rotateX = ((y - centerY) / centerY) * -3;
            const rotateY = ((x - centerX) / centerX) * 3;

            card.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = `perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
        });
    });

    /* ══════════════════════════════════════
       6. PARTICLE SYSTEM BACKGROUND
       ══════════════════════════════════════ */
    const canvas = document.getElementById('particle-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let particlesArray;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initParticles();
        });

        // Mouse position for particle interaction
        let mouse = { x: null, y: null, radius: 150 };

        document.addEventListener('mousemove', (e) => {
            mouse.x = e.x;
            mouse.y = e.y;
        });

        document.addEventListener('mouseleave', () => {
            mouse.x = undefined;
            mouse.y = undefined;
        });

        // Particle Class
        class Particle {
            constructor(x, y, directionX, directionY, size, color) {
                this.x = x;
                this.y = y;
                this.directionX = directionX;
                this.directionY = directionY;
                this.size = size;
                this.color = color;
                this.baseX = this.x;
                this.baseY = this.y;
            }
            // Method to draw individual particle
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
                ctx.fillStyle = this.color;
                ctx.fill();
            }
            // Method to check particle position, move it, and draw it
            update() {
                // Bounce off edges
                if (this.x > canvas.width || this.x < 0) this.directionX = -this.directionX;
                if (this.y > canvas.height || this.y < 0) this.directionY = -this.directionY;

                // Mouse collision detection (dodge effect)
                let dx = mouse.x - this.x;
                let dy = mouse.y - this.y;
                let distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < mouse.radius + this.size) {
                    if (mouse.x < this.x && this.x < canvas.width - this.size * 10) this.x += 3;
                    if (mouse.x > this.x && this.x > this.size * 10) this.x -= 3;
                    if (mouse.y < this.y && this.y < canvas.height - this.size * 10) this.y += 3;
                    if (mouse.y > this.y && this.y > this.size * 10) this.y -= 3;
                }

                // Move particle
                this.x += this.directionX;
                this.y += this.directionY;

                this.draw();
            }
        }

        function initParticles() {
            particlesArray = [];
            let numberOfParticles = (canvas.height * canvas.width) / 15000;
            for (let i = 0; i < numberOfParticles; i++) {
                let size = (Math.random() * 2) + 1;
                let x = (Math.random() * ((innerWidth - size * 2) - (size * 2)) + size * 2);
                let y = (Math.random() * ((innerHeight - size * 2) - (size * 2)) + size * 2);
                let directionX = (Math.random() * 0.4) - 0.2;
                let directionY = (Math.random() * 0.4) - 0.2;
                let color = 'rgba(124, 58, 237, 0.4)'; // Violet tint

                particlesArray.push(new Particle(x, y, directionX, directionY, size, color));
            }
        }

        // Draw connecting lines
        function connect() {
            let opacityValue = 1;
            for (let a = 0; a < particlesArray.length; a++) {
                for (let b = a; b < particlesArray.length; b++) {
                    let distance = ((particlesArray[a].x - particlesArray[b].x) * (particlesArray[a].x - particlesArray[b].x)) +
                                   ((particlesArray[a].y - particlesArray[b].y) * (particlesArray[a].y - particlesArray[b].y));
                    if (distance < (canvas.width / 7) * (canvas.height / 7)) {
                        opacityValue = 1 - (distance / 15000);
                        ctx.strokeStyle = `rgba(124, 58, 237, ${opacityValue * 0.15})`;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
                        ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
                        ctx.stroke();
                    }
                }
            }
        }

        function animateParticles() {
            requestAnimationFrame(animateParticles);
            ctx.clearRect(0, 0, innerWidth, innerHeight);
            for (let i = 0; i < particlesArray.length; i++) {
                particlesArray[i].update();
            }
            connect();
        }

        // Add burst effect on click
        document.addEventListener('click', (e) => {
            if(!mouse.x) return;
            for(let i = 0; i < 5; i++) {
                let size = (Math.random() * 3) + 1;
                let directionX = (Math.random() * 4) - 2;
                let directionY = (Math.random() * 4) - 2;
                particlesArray.push(new Particle(mouse.x, mouse.y, directionX, directionY, size, 'rgba(6, 182, 212, 0.8)'));
            }
            // Remove extra particles after a while to maintain performance
            if(particlesArray.length > 200) {
                particlesArray.splice(0, 5);
            }
        });

        initParticles();
        animateParticles();
    }
});
