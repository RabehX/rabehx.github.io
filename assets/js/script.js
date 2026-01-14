/**
 * RABEH - Digital Artisan Portfolio
 * Luxury-Inspired Interactive Experience
 */

(function() {
    "use strict";

    // ================================================
    // DOM Elements
    // ================================================
    const header = document.querySelector(".header");
    const navToggle = document.querySelector(".nav__toggle");
    const menu = document.querySelector(".menu");
    const menuLinks = document.querySelectorAll(".menu__link");
    const contactForm = document.getElementById("contactForm");
    
    // ================================================
    // Navigation Toggle
    // ================================================
    function toggleMenu() {
        navToggle.classList.toggle("active");
        menu.classList.toggle("active");
        document.body.style.overflow = menu.classList.contains("active") ? "hidden" : "";
    }

    if (navToggle) {
        navToggle.addEventListener("click", toggleMenu);
    }

    // Close menu when clicking a link
    menuLinks.forEach(link => {
        link.addEventListener("click", () => {
            if (menu.classList.contains("active")) {
                toggleMenu();
            }
        });
    });

    // Close menu with Escape key
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && menu && menu.classList.contains("active")) {
            toggleMenu();
        }
    });

    // ================================================
    // Header Scroll Effect
    // ================================================
    let lastScroll = 0;
    const scrollThreshold = 100;

    function handleScroll() {
        const currentScroll = window.pageYOffset;
        
        // Add/remove scrolled class
        if (header) {
            if (currentScroll > scrollThreshold) {
                header.classList.add("scrolled");
            } else {
                header.classList.remove("scrolled");
            }
        }
        
        lastScroll = currentScroll;
    }

    // Throttle scroll events
    let scrollTicking = false;
    window.addEventListener("scroll", () => {
        if (!scrollTicking) {
            requestAnimationFrame(() => {
                handleScroll();
                scrollTicking = false;
            });
            scrollTicking = true;
        }
    });

    // ================================================
    // Smooth Scroll for Anchor Links
    // ================================================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener("click", function(e) {
            e.preventDefault();
            const targetId = this.getAttribute("href");
            if (targetId === "#") return;
            
            const target = document.querySelector(targetId);
            if (target) {
                const headerOffset = 80;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: "smooth"
                });
            }
        });
    });

    // ================================================
    // Intersection Observer for Fade-in Animations
    // ================================================
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const fadeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("visible");
                fadeObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Add fade-in class to elements and observe them
    function initFadeAnimations() {
        const animateElements = document.querySelectorAll(
            ".works__header, .work-card, .about__header, .about__intro, " +
            ".about__philosophy-item, .contact__header, .contact__form, .contact__info"
        );
        
        animateElements.forEach((el, index) => {
            el.classList.add("fade-in");
            el.style.transitionDelay = (index * 0.1) + "s";
            fadeObserver.observe(el);
        });
    }

    // ================================================
    // Contact Form Handling
    // ================================================
    
    // Custom Select Dropdown
    const customSelect = document.querySelector('.custom-select');
    if (customSelect) {
        const trigger = customSelect.querySelector('.custom-select__trigger');
        const options = customSelect.querySelectorAll('.custom-select__option');
        const valueDisplay = customSelect.querySelector('.custom-select__value');
        const hiddenInput = document.getElementById('project');
        
        // Toggle dropdown
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            customSelect.classList.toggle('open');
        });
        
        // Select option
        options.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // Remove selected class from all options
                options.forEach(opt => opt.classList.remove('selected'));
                
                // Add selected class to clicked option
                option.classList.add('selected');
                
                // Update display and hidden input
                const value = option.getAttribute('data-value');
                const text = option.textContent;
                valueDisplay.textContent = text;
                valueDisplay.classList.remove('placeholder');
                hiddenInput.value = value;
                
                // Close dropdown
                customSelect.classList.remove('open');
            });
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!customSelect.contains(e.target)) {
                customSelect.classList.remove('open');
            }
        });
    }
    
    if (contactForm) {
        contactForm.addEventListener("submit", function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);
            
            // Simulate form submission
            const submitBtn = this.querySelector(".form__submit");
            const originalText = submitBtn.innerHTML;
            
            submitBtn.innerHTML = '<span class="form__submit-text">Sending...</span>';
            submitBtn.disabled = true;
            
            // Simulate API call
            setTimeout(() => {
                submitBtn.innerHTML = '<span class="form__submit-text">Sent Successfully</span>';
                
                // Reset form after delay
                setTimeout(() => {
                    this.reset();
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }, 2000);
            }, 1500);
            
            console.log("Form submitted:", data);
        });
    }

    // ================================================
    // Input Label Animation
    // ================================================
    const formInputs = document.querySelectorAll(".form__input");
    
    formInputs.forEach(input => {
        // Check if input has value on load
        if (input.value) {
            input.classList.add("has-value");
        }
        
        input.addEventListener("focus", () => {
            input.parentElement.classList.add("focused");
        });
        
        input.addEventListener("blur", () => {
            input.parentElement.classList.remove("focused");
            if (input.value) {
                input.classList.add("has-value");
            } else {
                input.classList.remove("has-value");
            }
        });
    });

    // ================================================
    // Work Card Hover Effect
    // ================================================
    const workCards = document.querySelectorAll(".work-card");
    
    workCards.forEach(card => {
        card.addEventListener("mouseenter", function() {
            this.style.transform = "translateY(-8px)";
        });
        
        card.addEventListener("mouseleave", function() {
            this.style.transform = "translateY(0)";
        });
    });

    // ================================================
    // Parallax Effect for Hero
    // ================================================
    const hero = document.querySelector(".hero");
    
    if (hero) {
        window.addEventListener("scroll", () => {
            const scrolled = window.pageYOffset;
            const heroContent = hero.querySelector(".hero__content");
            
            if (heroContent && scrolled < window.innerHeight) {
                heroContent.style.transform = "translateY(" + (scrolled * 0.3) + "px)";
                heroContent.style.opacity = 1 - (scrolled / window.innerHeight) * 0.5;
            }
        });
    }

    // ================================================
    // Custom Cursor (Premium Feel)
    // ================================================
    function initCustomCursor() {
        const cursor = document.createElement("div");
        cursor.className = "custom-cursor";
        cursor.innerHTML = '<div class="cursor-dot"></div><div class="cursor-ring"></div>';
        document.body.appendChild(cursor);
        
        const dot = cursor.querySelector(".cursor-dot");
        const ring = cursor.querySelector(".cursor-ring");
        
        let mouseX = 0, mouseY = 0;
        let ringX = 0, ringY = 0;
        
        document.addEventListener("mousemove", (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            
            dot.style.left = mouseX + "px";
            dot.style.top = mouseY + "px";
        });
        
        function animateRing() {
            ringX += (mouseX - ringX) * 0.15;
            ringY += (mouseY - ringY) * 0.15;
            
            ring.style.left = ringX + "px";
            ring.style.top = ringY + "px";
            
            requestAnimationFrame(animateRing);
        }
        animateRing();
        
        // Scale effect on interactive elements
        const interactiveElements = document.querySelectorAll("a, button, .work-card");
        interactiveElements.forEach(el => {
            el.addEventListener("mouseenter", () => {
                ring.style.transform = "translate(-50%, -50%) scale(1.5)";
                ring.style.borderColor = "transparent";
                ring.style.backgroundColor = "rgba(10, 10, 10, 0.1)";
            });
            el.addEventListener("mouseleave", () => {
                ring.style.transform = "translate(-50%, -50%) scale(1)";
                ring.style.borderColor = "#0a0a0a";
                ring.style.backgroundColor = "transparent";
            });
        });
        
        // Add cursor styles dynamically
        const style = document.createElement("style");
        style.textContent = [
            ".custom-cursor {",
            "    pointer-events: none;",
            "    position: fixed;",
            "    z-index: 9999;",
            "    mix-blend-mode: difference;",
            "}",
            ".cursor-dot {",
            "    position: fixed;",
            "    width: 6px;",
            "    height: 6px;",
            "    background-color: #0a0a0a;",
            "    border-radius: 50%;",
            "    transform: translate(-50%, -50%);",
            "    transition: width 0.2s, height 0.2s;",
            "}",
            ".cursor-ring {",
            "    position: fixed;",
            "    width: 40px;",
            "    height: 40px;",
            "    border: 1px solid #0a0a0a;",
            "    border-radius: 50%;",
            "    transform: translate(-50%, -50%);",
            "    transition: transform 0.3s, border-color 0.3s, background-color 0.3s;",
            "}",
            "@media (max-width: 1024px) {",
            "    .custom-cursor { display: none; }",
            "}"
        ].join("\n");
        document.head.appendChild(style);
        
        // Hide default cursor
        document.body.style.cursor = "none";
        interactiveElements.forEach(el => {
            el.style.cursor = "none";
        });
    }

    // ================================================
    // Page Load Animation
    // ================================================
    function initPageLoad() {
        const loadingScreen = document.querySelector('.loading-screen');
        
        window.addEventListener('load', () => {
            setTimeout(() => {
                if (loadingScreen) {
                    loadingScreen.classList.add('hide');
                    setTimeout(() => {
                        loadingScreen.style.display = 'none';
                    }, 500);
                }
                document.body.classList.remove('loading');
                initFadeAnimations();
                
                // Enable custom cursor on desktop (uncomment to activate)
                // if (window.innerWidth > 1024) {
                //     initCustomCursor();
                // }
            }, 2000); // Show loading for 2 seconds
        });
    }

    // ================================================
    // Stats Counter Animation
    // ================================================
    function animateStats() {
        const statsNumbers = document.querySelectorAll('.stats__number[data-target]');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const target = parseInt(entry.target.getAttribute('data-target'));
                    let current = 0;
                    const increment = target / 50;
                    
                    const timer = setInterval(() => {
                        current += increment;
                        if (current >= target) {
                            entry.target.textContent = target + '+';
                            clearInterval(timer);
                        } else {
                            entry.target.textContent = Math.ceil(current);
                        }
                    }, 30);
                    
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });
        
        statsNumbers.forEach(num => observer.observe(num));
    }

    // ================================================
    // Year Auto-Update
    // ================================================
    function updateYear() {
        const yearElements = document.querySelectorAll("[data-year]");
        const currentYear = new Date().getFullYear();
        
        yearElements.forEach(el => {
            el.textContent = currentYear;
        });
    }

    // ================================================
    // Initialize
    // ================================================
    initPageLoad();
    updateYear();
    animateStats();

})();
