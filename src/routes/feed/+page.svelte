<script lang="ts">
    import { onMount } from "svelte";

    onMount(() => {
        // Force reload of Instagram embeds when component mounts
        const w = window as any;
        if (w.instgrm) {
            w.instgrm.Embeds.process();
        } else {
            // If script hasn't loaded yet, it will process automatically when it does
            const script = document.createElement("script");
            script.src = "//www.instagram.com/embed.js";
            script.async = true;
            document.body.appendChild(script);
        }
    });

    const socialMedia = [
        {
            name: "Instagram",
            url: "https://www.instagram.com/srh_university_international/",
            icon: "📷",
        },
        {
            name: "Facebook",
            url: "http://facebook.com/srhuniversityinternational",
            icon: "📘",
        },
        {
            name: "TikTok",
            url: "https://www.tiktok.com/@srhuniversity",
            icon: "🎵",
        },
        {
            name: "YouTube",
            url: "https://www.youtube.com/@srhuniversity",
            icon: "📺",
        },
        {
            name: "LinkedIn",
            url: "https://www.linkedin.com/school/srh-university/posts/",
            icon: "🔗",
        },
    ];
</script>

<svelte:head>
    <title>Campus News | Campusweb</title>
</svelte:head>

<div class="feed-container">
    <header class="page-header">
        <h1>Campus News</h1>
        <p>Latest updates from SRH University</p>
        <div class="header-actions">
            <a
                href="/viewer?url=https://www.srh-university.de/en/events/"
                class="action-button events-button"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"
                    ></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                Events
            </a>
            <a
                href="/viewer?url=https://www.srh-university.de/en/news/"
                class="action-button news-button"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path
                        d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2z"
                    ></path>
                    <path d="M16 2v4"></path>
                    <path d="M8 2v4"></path>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                News
            </a>
        </div>
    </header>

    <div class="instagram-feeds-container">
        <blockquote
            class="instagram-media"
            data-instgrm-permalink="https://www.instagram.com/srh.students/"
            data-instgrm-version="14"
            style="background:#FFF; border:0; border-radius:8px; box-shadow:0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15); margin: 1px; max-width:48%; min-width:326px; padding:0; width:99.375%; width:-webkit-calc(100% - 2px); width:calc(100% - 2px);"
        ></blockquote>
        <blockquote
            class="instagram-media"
            data-instgrm-permalink="https://www.instagram.com/srh_university_international/"
            data-instgrm-version="14"
            style="background:#FFF; border:0; border-radius:8px; box-shadow:0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15); margin: 1px; max-width:48%; min-width:326px; padding:0; width:99.375%; width:-webkit-calc(100% - 2px); width:calc(100% - 2px);"
        ></blockquote>
    </div>

    <section class="social-media-section">
        <h2>Follow SRH Official Channels</h2>
        <div class="social-grid">
            {#each socialMedia as platform}
                <a
                    href={platform.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="social-link"
                >
                    <span class="social-icon">{platform.icon}</span>
                    <span class="social-name">{platform.name}</span>
                </a>
            {/each}
        </div>
    </section>

    <section class="contact-section">
        <h2>📞 SRH Contact Information</h2>
        <div class="contact-card">
            <div class="contact-item">
                <span class="contact-icon">📞</span>
                <div class="contact-details">
                    <span class="contact-label">Phone</span>
                    <a href="tel:+493051565020" class="contact-value"
                        >+49 30 515650 200</a
                    >
                </div>
            </div>
            <div class="contact-item">
                <span class="contact-icon">📧</span>
                <div class="contact-details">
                    <span class="contact-label">Email</span>
                    <a href="mailto:info.hsg@srh.de" class="contact-value"
                        >info.hsg@srh.de</a
                    >
                </div>
            </div>
            <div class="contact-item">
                <span class="contact-icon">🏢</span>
                <div class="contact-details">
                    <span class="contact-label">Address</span>
                    <span class="contact-value"
                        >Ludwig Guttmann Str. 6<br />69123 Heidelberg, Germany</span
                    >
                </div>
            </div>
            <div class="contact-item">
                <span class="contact-icon">🛒</span>
                <div class="contact-details">
                    <span class="contact-label">Brand Store</span>
                    <a
                        href="/viewer?url=https://srh-store.de/employees/bildung.html&title=Brand Store"
                        class="contact-value">Official Merchandise</a
                    >
                </div>
            </div>
        </div>
    </section>
</div>

<style>
    .feed-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: var(--spacing-lg) var(--spacing-md) 100px; /* Bottom padding for nav */
    }

    .page-header {
        margin-bottom: var(--spacing-xl);
        text-align: center;
    }

    .page-header h1 {
        font-size: 2rem;
        margin-bottom: var(--spacing-xs);
        background: linear-gradient(
            135deg,
            var(--primary-color),
            var(--secondary-color)
        );
        background-clip: text;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }

    .page-header p {
        color: var(--text-color-secondary);
    }

    .header-actions {
        margin-top: var(--spacing-md);
        display: flex;
        gap: var(--spacing-sm);
        justify-content: center;
        flex-direction: column;
        flex-wrap: wrap;
    }

    .action-button {
        display: inline-flex;
        align-items: center;
        gap: var(--spacing-xs);
        padding: var(--spacing-sm) var(--spacing-md);
        background-color: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-full);
        color: var(--text-color);
        text-decoration: none;
        font-size: 0.9rem;
        font-weight: 500;
        transition: all 0.2s ease;
    }

    .action-button:hover {
        background-color: var(--hover-bg);
        border-color: var(--primary-color);
        color: var(--primary-color);
        transform: translateY(-1px);
    }

    .instagram-feeds-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--spacing-lg);
        margin-bottom: var(--spacing-xl);
    }

    .social-media-section,
    .contact-section {
        margin-bottom: var(--spacing-xl);
        padding: var(--spacing-lg);
        background: var(--card-bg);
        border-radius: var(--radius-lg);
        border: 1px solid var(--border-color);
    }

    .social-media-section h2,
    .contact-section h2 {
        font-size: 1.3rem;
        margin-bottom: var(--spacing-md);
        color: var(--text-color);
    }

    .social-grid {
        display: grid;
        gap: var(--spacing-sm);
    }

    .social-link {
        display: flex;
        margin-bottom: var(--spacing-xl);
        padding: var(--spacing-lg);
        background: var(--card-bg);
        border-radius: var(--radius-lg);
        border: 1px solid var(--border-color);
        flex-direction: column;
        align-items: center;
        flex-wrap: wrap;
        max-width: stretch;
    }

    .social-link:hover {
        background: rgba(212, 68, 7, 0.05);
        border-color: var(--primary-color);
        transform: translateY(-2px);
    }

    .social-icon {
        font-size: 1.5rem;
    }

    .social-name {
        font-weight: 500;
    }

    .contact-card {
        display: grid;
        gap: var(--spacing-md);
    }

    .contact-item {
        display: flex;
        align-items: flex-start;
        gap: var(--spacing-md);
        padding: var(--spacing-md);
        background: var(--hover-bg);
        border-radius: var(--radius-md);
    }

    .contact-icon {
        font-size: 1.5rem;
        flex-shrink: 0;
    }

    .contact-details {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xs);
    }

    .contact-label {
        font-size: 0.85rem;
        font-weight: 600;
        text-transform: uppercase;
        color: var(--text-color-secondary);
    }

    .contact-value {
        font-size: 0.95rem;
        color: var(--text-color);
        text-decoration: none;
    }

    .contact-value:hover {
        color: var(--primary-color);
    }

    a.contact-value {
        text-decoration: underline;
        text-decoration-color: transparent;
        transition: text-decoration-color 0.2s;
    }

    a.contact-value:hover {
        text-decoration-color: var(--primary-color);
    }
</style>
