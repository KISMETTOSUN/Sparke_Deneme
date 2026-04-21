document.addEventListener("DOMContentLoaded", () => {
    // --- Selectors ---
    const sidebar = document.getElementById("sidebar");
    const mobileToggle = document.getElementById("mobileToggle");
    const mobileClose = document.getElementById("mobileClose");
    const navLinks = document.querySelectorAll(".nav-links li");
    const pageTitle = document.getElementById("pageTitle");
    const pageSubtitle = document.getElementById("pageSubtitle");

    // --- Mobile Sidebar Toggle ---
    const toggleSidebar = () => {
        sidebar.classList.toggle("open");
    };

    if (mobileToggle) mobileToggle.addEventListener("click", toggleSidebar);
    if (mobileClose) mobileClose.addEventListener("click", toggleSidebar);

    // --- Navigation ---
    const viewMeta = {
        dashboard: {
            title: "Dashboard",
            subtitle: "Overview of your robot fleet."
        },
        robots: {
            title: "Robots",
            subtitle: "Manage and configure your mobile robots."
        },
        runs: {
            title: "Runs",
            subtitle: "History and status of all robot tasks."
        },
        schedules: {
            title: "Schedules",
            subtitle: "Automate your robot fleet activities."
        }
    };

    navLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            // Prevent default link behavior
            e.preventDefault();

            // Clear previous active state
            navLinks.forEach(l => l.classList.remove("active"));

            // Set new active state
            link.classList.add("active");

            // Update Page Title and Subtitle based on data-view
            const viewKey = link.getAttribute("data-view");
            if (viewMeta[viewKey]) {
                pageTitle.innerText = viewMeta[viewKey].title;
                pageSubtitle.innerText = viewMeta[viewKey].subtitle;
            }

            // Close sidebar on mobile after navigating
            if (window.innerWidth <= 850) {
                sidebar.classList.remove("open");
            }
        });
    });

    // --- Trigger Button Interaction ---
    const triggerButtons = document.querySelectorAll(".trigger-btn");
    triggerButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const originalText = btn.innerHTML;
            btn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Starting...`;
            lucide.createIcons();
            
            btn.disabled = true;
            btn.style.opacity = "0.7";

            setTimeout(() => {
                btn.innerHTML = `<i data-lucide="check"></i> Started`;
                lucide.createIcons();
                
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    lucide.createIcons();
                    btn.disabled = false;
                    btn.style.opacity = "1";
                }, 2000);
            }, 1000);
        });
    });
});

// Add extra CSS for the loading spinner
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    .spin {
        animation: spin 1s linear infinite;
    }
`;
document.head.appendChild(style);
