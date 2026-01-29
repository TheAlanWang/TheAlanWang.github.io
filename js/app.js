(function () {
    'use strict';

    const { createApp, ref, onMounted } = Vue;

    const profileData = {
        name: "Alan Wang",
        title: "Full-Stack Engineer Cloud & DevOps API-Driven Microservices",
        resumeLink: "/resume.pdf",
        photo: "/assets/photo/photo.jpeg",
        photoPosition: "80% center",
        universityLogos: {
            northeastern: "/assets/logos/universities/NEU.png",
            sydney: "/assets/logos/universities/USDY.png",
            macquarie: "/assets/logos/universities/Macquarie.png"
        },
        about: {
            intro: "I'm a Master of Computer Science student at Northeastern University with a passion for building full-stack applications and solving complex technical challenges. With experience as a Project Manager, I've led the development of 20+ enterprise applications.",
            yearsOfExperience: 5,
            location: "San Francisco Bay Area, CA, US",
            education: "Master of Computer Science Align at Northeastern University | GPA: 4.0/4.0"
        },
        projects: [
            {
                title: "AI Document Assistant",
                tech: "FastAPI, React, PostgreSQL, OpenAI API, AWS",
                gif: "/assets/demos/demo_doc_ass.gif",
                description: "AI-powered document assistant with intelligent parsing and context-aware Q&A. Features secure JWT authentication and AWS deployment.",
                github: "https://github.com/TheAlanWang/docs-assistant"
            },
            {
                title: "Thinkbot",
                tech: "MERN Stack, Redis, TailwindCSS",
                gif: "/assets/demos/demo_MERN.gif",
                description: "Real-time collaborative note-taking platform with live updates, responsive UI, and optimized performance.",
                github: "https://github.com/TheAlanWang/thinkboard-mern"
            },
            {
                title: "InterviewForum",
                tech: "Java 17, Swing, MVC, JUnit 5",
                gif: "/assets/demos/demo_interviewforum.gif",
                description: "Java desktop forum for LeetCode, system design, and behavioral interview discussions, built with MVC architecture and comprehensive JUnit tests.",
                github: "https://github.com/TheAlanWang/interviewforum"
            },
            {
                title: "LeetMate",
                tech: "Spring Boot, React, PostgreSQL, JWT",
                gif: "/assets/demos/demo_LeetMate.gif",
                description: "Group-based mentor-mentee platform that turns solo LeetCode practice into an interactive, community-driven experience with AI code reviews and group discussions.",
                github: "https://github.com/TheAlanWang/leetmate"
            },
            {
                title: "CalmCube",
                tech: "Next.js 14, TypeScript, Tailwind CSS",
                gif: "/assets/demos/demo_calmCube.gif",
                description: "Vibe-coded hackathon MVP: a heart-rate responsive relaxation assistant with adaptive calming modes including guided breathing, ambient soundscapes, and AI chat support.",
                github: "https://github.com/TheAlanWang/calmcube-mvp"
            }
        ],
        experience: [
            {
                title: "Teaching Assistant - Part time",
                company: "Northeastern University",
                companyLogo: "/assets/logos/universities/NEU.png",
                date: "2024 – Present",
                details: [
                    "Support course instruction, <span class='highlight'>grading</span>, and <span class='highlight'>office hours</span> for CS courses",
                    "Tutor students on <span class='highlight'>algorithms</span>, <span class='highlight'>data structures</span>, and programming concepts",
                    "Assist with lab sessions and <span class='highlight'>code reviews</span>"
                ]
            },
            {
                title: "Tech Project Manager (Software Engineer)",
                company: "Shanghai Securities",
                companyLogo: "/assets/logos/companies/com_shanghaisecurities.png",
                date: "Apr. 2022 - Dec. 2024",
                details: [
                    "Led SDLC of 20+ <span class='highlight'>enterprise applications</span>, coordinating vendors and infrastructure teams",
                    "Promoted <span class='highlight'>Agile practices</span> within 100+ member tech department",
                    "Drove platform upgrade by auditing and consolidating <span class='highlight'>REST APIs</span>",
                    "Led <span class='highlight'>monolith-to-microservices</span> modernization, cutting deployment time by 40%"
                ]
            },
            {
                title: "Consultant (Data Engineering & Modeling)",
                company: "Deloitte",
                companyLogo: "/assets/logos/companies/demo_deloitte.png",
                date: "Dec. 2021 - Apr. 2022",
                details: [
                    "Built <span class='highlight'>risk rating model</span> using <span class='highlight'>SQL</span> and <span class='highlight'>Python</span>",
                    "Achieved ~5% improvement through <span class='highlight'>data analytics</span> and optimization",
                    "Developed <span class='highlight'>automated reporting pipelines</span>, reducing processing time by 60%"
                ]
            },
            {
                title: "Tech Consultant",
                company: "Cubewise",
                companyLogo: "/assets/logos/companies/com_cubewise.png",
                date: "Feb. 2020 - Dec. 2021",
                details: [
                    "Delivered <span class='highlight'>enterprise planning solutions</span> on IBM TM1 for clients including Alibaba",
                    "Led <span class='highlight'>architecture design</span> and authored 20+ technical documents",
                    "Optimized <span class='highlight'>database queries</span>, improving performance by 35%"
                ]
            }
        ],
        education: [
            {
                school: "Macquarie University",
                degree: "Bachelor of Commerce, Professional Accounting",
                period: "2014 – 2018",
                gpa: "",
                schoolLogo: "/assets/logos/universities/Macquarie.png",
                details: [],
                studied: ["Commerce", "Information Systems", "Statistics", "Economics"]
            },
            {
                school: "University of Sydney",
                degree: "Master of Commmerce, Finance & Big Data",
                period: "2017 – 2019",
                gpa: "",
                schoolLogo: "/assets/logos/universities/USDY.png",
                details: [],
                studied: ["Machine Learning", "Data Structure", "Algorithm", "Python", "Linear Algebra", "Calculus", "Probability and Statistics"]
            },
            {
                school: "Northeastern University",
                degree: "Master of Science in Computer Science",
                period: "2024 – Present",
                gpa: "4.0",
                schoolLogo: "/assets/logos/universities/NEU.png",
                details: [],
                studied: ["Data Structures & Algorithms", "Operating Systems", "Database Systems", "Software Engineering", "Computer Networks", "Distributed Systems", "Machine Learning", "Web Development", "Computer Architecture", "Programming Languages"]
            }
        ],
        skills: {
            languages: [
                { name: "Python", icon: "python" },
                { name: "Java", icon: "java" },
                { name: "JavaScript", icon: "javascript" },
                { name: "TypeScript", icon: "typescript" },
                { name: "SQL", icon: "postgresql" },
                { name: "Go", icon: "go" },
                { name: "C/C++", icon: "cplusplus" }
            ],
            frameworks: [
                { name: "React", icon: "react" },
                { name: "Next.js", icon: "nextdotjs" },
                { name: "Node.js", icon: "nodedotjs" },
                { name: "Express.js", icon: "express" },
                { name: "FastAPI", icon: "fastapi" },
                { name: "Spring Boot", icon: "spring" },
                { name: "Django", icon: "django" }
            ],
            tools: [
                { name: "PostgreSQL", icon: "postgresql" },
                { name: "MongoDB", icon: "mongodb" },
                { name: "Redis", icon: "redis" },
                { name: "AWS", icon: "amazonaws" },
                { name: "Docker", icon: "docker" },
                { name: "Kubernetes", icon: "kubernetes" },
                { name: "GitHub Actions", icon: "githubactions" },
                { name: "Linux", icon: "linux" },
                { name: "Nginx", icon: "nginx" }
            ]
        },
        contact: {
            links: [
                { label: "Gmail", url: "mailto:alanwang166@gmail.com", icon: "gmail", external: false },
                { label: "GitHub", url: "https://github.com/TheAlanWang", icon: "github", external: true },
                { label: "LinkedIn", url: "https://www.linkedin.com/in/alanwang166", icon: "linkedin", external: true }
            ]
        }
    };

    createApp({
        setup() {
            const mobileMenuOpen = ref(false);
            const heroTitle = ref(null);
            const heroSubtitle = ref(null);
            const heroImage = ref(null);
            const projectCards = ref([]);
            const timelineItems = ref([]);
            const contactLinks = ref([]);
            const subtitleWordRef = ref(null);
            const cursorRef = ref(null);
            const currentTitle = ref("");
            const showCursor = ref(true);
            const skillTags = ref([]);

            const titleWords = [
                "Full-Stack Engineer",
                "Cloud & DevOps",
                "API-Driven Microservices"
            ];

            const toggleMobileMenu = () => { mobileMenuOpen.value = !mobileMenuOpen.value; };
            const closeMobileMenu = () => { mobileMenuOpen.value = false; };
            const handleLogoError = (e) => { e.target.style.display = 'none'; };
            const handleIconError = (e) => { e.target.style.display = 'none'; };

            onMounted(() => {
                gsap.registerPlugin(ScrollTrigger);

                gsap.from(heroTitle.value, { x: -50, opacity: 0, duration: 1, ease: "power4.out" });

                const animateTitleSequence = () => {
                    let currentIndex = 0;
                    const showNextTitle = () => {
                        if (currentIndex >= titleWords.length) currentIndex = 0;
                        const wordEl = subtitleWordRef.value;
                        const cursorEl = cursorRef.value;
                        if (!wordEl) return;
                        showCursor.value = true;
                        currentTitle.value = titleWords[currentIndex];
                        void wordEl.offsetWidth;
                        const tempSpan = document.createElement('span');
                        tempSpan.style.cssText = 'visibility: hidden; position: absolute; white-space: nowrap; font-size: inherit; font-family: inherit; font-weight: inherit;';
                        tempSpan.textContent = currentTitle.value;
                        wordEl.parentElement.appendChild(tempSpan);
                        const naturalWidth = tempSpan.scrollWidth;
                        wordEl.parentElement.removeChild(tempSpan);
                        wordEl.innerHTML = `<span style="color: #7DD3FC;">${currentTitle.value}</span>`;
                        wordEl.style.willChange = 'width, opacity';
                        gsap.set(wordEl, { width: 0, opacity: 0, overflow: 'hidden' });
                        if (cursorEl) gsap.set(cursorEl, { opacity: 0 });
                        gsap.to(wordEl, {
                            width: naturalWidth + 'px',
                            opacity: 1,
                            duration: 0.7,
                            ease: "power2.out",
                            onUpdate: () => { if (cursorEl) gsap.set(cursorEl, { opacity: 1 }); },
                            onComplete: () => {
                                wordEl.style.overflow = 'visible';
                                wordEl.style.willChange = 'auto';
                                if (cursorEl) gsap.set(cursorEl, { opacity: 1 });
                                setTimeout(() => {
                                    wordEl.style.overflow = 'hidden';
                                    wordEl.style.willChange = 'width, opacity';
                                    if (cursorEl) gsap.to(cursorEl, { opacity: 0, duration: 0.15 });
                                    gsap.to(wordEl, {
                                        width: 0,
                                        opacity: 0,
                                        duration: 0.5,
                                        ease: "power2.in",
                                        onComplete: () => {
                                            wordEl.style.willChange = 'auto';
                                            showCursor.value = false;
                                            currentIndex++;
                                            setTimeout(showNextTitle, 100);
                                        }
                                    });
                                }, 2000);
                            }
                        });
                    };
                    setTimeout(showNextTitle, 500);
                };
                animateTitleSequence();

                gsap.from(heroImage.value, { scale: 0.8, opacity: 0, duration: 1, delay: 0.4, ease: "power3.out" });

                document.querySelectorAll('.skill-tag-modern').forEach((tag, index) => {
                    gsap.from(tag, {
                        opacity: 0, y: 30, scale: 0.8,
                        duration: 0.6, delay: index * 0.05, ease: "back.out(1.7)",
                        scrollTrigger: { trigger: tag, start: "top 85%", toggleActions: "play none none none" }
                    });
                });

                gsap.utils.toArray('.bento-card').forEach((card, i) => {
                    gsap.from(card, {
                        scrollTrigger: { trigger: card, start: "top 80%" },
                        y: 50, opacity: 0, duration: 0.8, delay: i * 0.1, ease: "power3.out"
                    });
                });

                gsap.utils.toArray('.timeline-item').forEach((item, i) => {
                    const content = item.querySelector('.experience-header');
                    if (content) {
                        gsap.from(content, {
                            scrollTrigger: { trigger: item, start: "top 80%" },
                            x: -30, opacity: 0, duration: 0.6, delay: i * 0.1
                        });
                    }
                    const ul = item.querySelector('ul');
                    if (ul) {
                        gsap.from(ul, {
                            scrollTrigger: { trigger: item, start: "top 80%" },
                            x: -30, opacity: 0, duration: 0.6, delay: i * 0.1 + 0.2
                        });
                    }
                });

                gsap.registerPlugin(ScrollToPlugin);
                document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                    anchor.addEventListener('click', function (e) {
                        e.preventDefault();
                        const target = document.querySelector(this.getAttribute('href'));
                        if (target) {
                            gsap.to(window, {
                                duration: 1,
                                scrollTo: { y: target, offsetY: 80 },
                                ease: "power2.inOut"
                            });
                        }
                    });
                });

                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const id = entry.target.getAttribute('id');
                            document.querySelectorAll('.nav-link').forEach(link => {
                                link.classList.remove('active');
                                if (link.getAttribute('href') === `#${id}`) link.classList.add('active');
                            });
                        }
                    });
                }, { root: null, rootMargin: '-20% 0px -70% 0px', threshold: 0 });
                document.querySelectorAll('section[id]').forEach(section => observer.observe(section));
            });

            return {
                profileData,
                mobileMenuOpen,
                currentTitle,
                showCursor,
                toggleMobileMenu,
                closeMobileMenu,
                handleLogoError,
                handleIconError,
                skillTags,
                heroTitle,
                heroSubtitle,
                heroImage,
                subtitleWordRef,
                cursorRef,
                projectCards,
                timelineItems,
                contactLinks
            };
        }
    }).mount('#app');
})();
