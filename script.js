// Mobile Navigation Toggle
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
});

// Close mobile menu when clicking on a link
document.querySelectorAll('.nav-link').forEach(n => n.addEventListener('click', () => {
    hamburger.classList.remove('active');
    navMenu.classList.remove('active');
}));

// Smooth scrolling for navigation links (only for hash links)
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Navbar background change on scroll
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 100) {
        navbar.style.background = 'rgba(12, 5, 19, 0.95)';
        navbar.style.boxShadow = '0 2px 20px rgba(199, 112, 240, 0.3)';
    } else {
        navbar.style.background = 'rgba(12, 5, 19, 0.9)';
        navbar.style.boxShadow = 'none';
    }
});

// Typing Animation (only initialize if element exists)
document.addEventListener('DOMContentLoaded', function() {
    const typedElement = document.getElementById('typed-element');
    if (typedElement && typeof Typed !== 'undefined') {
        const typed = new Typed('#typed-element', {
            strings: [
                'Full Stack Developer',
                'Software Engineer',
                'Problem Solver',
                'Tech Enthusiast',
                'Code Architect'
            ],
            typeSpeed: 50,
            backSpeed: 30,
            backDelay: 2000,
            loop: true,
            showCursor: true,
            cursorChar: '|'
        });
    }
});

// Enhanced Intersection Observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('show');
            
            // Add staggered animation for cards
            if (entry.target.classList.contains('project-card') || 
                entry.target.classList.contains('stack-item') ||
                entry.target.classList.contains('tool-item')) {
                const cards = entry.target.parentElement.children;
                const index = Array.from(cards).indexOf(entry.target);
                entry.target.style.animationDelay = `${index * 0.1}s`;
            }
        }
    });
}, observerOptions);

// Observe elements for animation
document.addEventListener('DOMContentLoaded', () => {
    const animateElements = document.querySelectorAll(
        '.project-card, .stack-item, .tool-item, .about-text, .avatar-container, .resume-block, .achievement-item'
    );
    
    animateElements.forEach(el => {
        el.classList.add('fadeInUp');
        observer.observe(el);
    });
});

// Active navigation link highlighting
window.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');
    
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (scrollY >= sectionTop - 200) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        // Check if it's a hash link and matches current section
        const href = link.getAttribute('href');
        if (href.startsWith('#') && href.substring(1) === current) {
            link.classList.add('active');
        }
        // Handle resume page active state
        if (href === 'resume.html' && window.location.pathname.includes('resume.html')) {
            link.classList.add('active');
        }
    });
});

// Enhanced particle system
function createParticles() {
    const particlesContainer = document.querySelector('.particles-container');
    if (!particlesContainer) return;
    
    const particleCount = window.innerWidth > 768 ? 25 : 15;
    
    // Clear existing particles
    particlesContainer.innerHTML = '';
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        const size = Math.random() * 4 + 2;
        const left = Math.random() * 100;
        const animationDuration = Math.random() * 4 + 4;
        const animationDelay = Math.random() * 2;
        const opacity = Math.random() * 0.5 + 0.3;
        
        particle.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            background: #c770f0;
            border-radius: 50%;
            left: ${left}%;
            top: ${Math.random() * 100}%;
            animation: float ${animationDuration}s ease-in-out infinite;
            animation-delay: ${animationDelay}s;
            opacity: ${opacity};
            pointer-events: none;
        `;
        
        particlesContainer.appendChild(particle);
    }
}

// Initialize particles when DOM is loaded
document.addEventListener('DOMContentLoaded', createParticles);

// Recreate particles on resize
window.addEventListener('resize', createParticles);

// Enhanced mouse move effect for hero section
document.addEventListener('mousemove', (e) => {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    
    const rect = hero.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const deltaX = (x - centerX) / centerX;
    const deltaY = (y - centerY) / centerY;
    
    const codingAnimation = document.querySelector('.coding-animation');
    if (codingAnimation) {
        codingAnimation.style.transform = `translate(${deltaX * 15}px, ${deltaY * 15}px)`;
    }
    
    // Move particles slightly
    const particles = document.querySelectorAll('.particle');
    particles.forEach((particle, index) => {
        const factor = (index % 3 + 1) * 2;
        particle.style.transform = `translate(${deltaX * factor}px, ${deltaY * factor}px)`;
    });
});

// Scroll progress indicator
function updateScrollProgress() {
    let scrollProgress = document.querySelector('.scroll-progress');
    if (!scrollProgress) {
        scrollProgress = document.createElement('div');
        scrollProgress.className = 'scroll-progress';
        scrollProgress.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 0%;
            height: 3px;
            background: linear-gradient(90deg, #c770f0, #9c4dd6);
            z-index: 9999;
            transition: width 0.3s ease;
        `;
        document.body.appendChild(scrollProgress);
    }
    
    const scrolled = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
    scrollProgress.style.width = Math.min(scrolled, 100) + '%';
}

window.addEventListener('scroll', updateScrollProgress);

// Card hover sound effect (optional)
function addCardSoundEffects() {
    const cards = document.querySelectorAll('.project-card, .stack-item, .tool-item');
    
    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            // You can add a subtle sound effect here if desired
            card.style.transform = card.style.transform || '';
        });
    });
}

// Initialize card effects
document.addEventListener('DOMContentLoaded', addCardSoundEffects);

// Smooth reveal animation for resume items
function initResumeAnimations() {
    const resumeItems = document.querySelectorAll('.resume-item, .achievement-item');
    
    resumeItems.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(30px)';
        item.style.transition = 'all 0.6s ease';
        item.style.transitionDelay = `${index * 0.1}s`;
        
        setTimeout(() => {
            item.style.opacity = '1';
            item.style.transform = 'translateY(0)';
        }, 100);
    });
}

// Initialize resume animations if on resume page
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('resume.html')) {
        setTimeout(initResumeAnimations, 500);
    }
});

// Add enhanced CSS animations
const style = document.createElement('style');
style.textContent = `
    .hamburger.active .bar:nth-child(2) {
        opacity: 0;
    }
    
    .hamburger.active .bar:nth-child(1) {
        transform: translateY(8px) rotate(45deg);
    }
    
    .hamburger.active .bar:nth-child(3) {
        transform: translateY(-8px) rotate(-45deg);
    }
    
    .fadeInUp {
        animation: fadeInUp 0.8s ease forwards;
    }
    
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .project-card {
        animation: cardFloat 6s ease-in-out infinite;
    }
    
    .project-card:nth-child(even) {
        animation-delay: -3s;
    }
    
    @keyframes cardFloat {
        0%, 100% {
            transform: translateY(0px);
        }
        50% {
            transform: translateY(-5px);
        }
    }
`;
document.head.appendChild(style);
