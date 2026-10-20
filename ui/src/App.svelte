<script lang="ts">
    import Department from "./component/Department.svelte";
    import Members from "./component/Members.svelte";
    import Limits from "./component/Limits.svelte";
    import { onMount } from "svelte";
    import { encode } from "@msgpack/msgpack";
    import { ResponseCompact } from "./lib/Response";

    // Per-address identity attributes (name, homepage, …). The backend keys
    // these by email address (see dept mailboxmanager read_aliases()).
    type Identity = {
        name?: string;
        homepage?: string;
    };

    // A scoped role held by a member. `name` is the role; `domain`/`user`
    // scope what it applies over (null means "any").
    type MemberRole = {
        name: string;
        domain: string | null;
        user: string | null;
    };

    type Member = {
        address: string;
        role: "regular" | "admin";
        roles: MemberRole[];
    };

    type DeptInfoGetResponse = {
        account: string;
        aliases: Record<string, Identity>;
        members: Member[];
        name: string | null;
        homepage: string | null;
    };

    let activeMenu: "dept" | "members" | "limits" = $state("dept");
    let dept: Department | null = $state(null);
    let limits: Limits | null = $state(null);
    let navCollapsed: boolean = $state(false);
    let theme: "system" | "light" | "dark" = $state("system");

    const themeOptions: Array<"system" | "light" | "dark"> = [
        "system",
        "light",
        "dark",
    ];

    // properties coming from DeptInfoGet
    let account: string = $state("");
    let name: string = $state("");
    let homepage: string = $state("");
    let aliases: string[] = $state([]);
    let members: Member[] = $state([]);

    async function fetchDeptInfo() {
        let buffer;
        try {
            const response = await fetch("/api/v2/object", {
                method: "POST",
                headers: { "Content-Type": "application/msgpack" },
                body: encode({
                    namespace:
                        "https://sobamail.com/module/mailboxmanager/dept/v1",
                    name: "DeptInfoGet",
                    content: [0],
                }) as BodyInit,
            });

            buffer = await response.arrayBuffer();
        } catch (error) {
            console.error("Failed to fetch department info:", error);
        }

        if (!buffer) {
            return;
        }

        const object = new ResponseCompact(buffer);
        if (!object.content) {
            return;
        }

        const content = object.content as DeptInfoGetResponse;

        // account
        account = content.account;

        // identities are keyed by address: pull the department's display
        // name + homepage, and expose every other address as an alias.
        const idents = content.aliases || {};
        for (const [address, attrs] of Object.entries(idents)) {
            if (address !== account) {
                continue;
            }

            if (attrs && attrs.name) {
                name = attrs.name;
            }

            if (attrs && attrs.homepage) {
                homepage = attrs.homepage;
            }
        }
        aliases = Object.keys(idents).filter((address) => address !== account);

        // members
        members = content.members || [];

        // name
        if (content.name) {
            name = content.name;
        }

        // homepage
        if (content.homepage) {
            homepage = content.homepage;
        }
    }

    onMount(async () => {
        await fetchDeptInfo();
    });

    function handleSave() {
        if (dept && activeMenu == "dept") {
            dept.saveDeptInfo();
        }
        if (limits && activeMenu == "limits") {
            limits.saveLimits();
        }
    }

    onMount(() => {
        if (window && window.localStorage) {
            {
                const v = window.localStorage.getItem("navCollapsed");
                if (v !== null) {
                    navCollapsed = v !== "0";
                }
            }
            {
                const v = window.localStorage.getItem("activeMenu");
                if (v === "dept" || v === "members" || v === "limits") {
                    activeMenu = v;
                }
            }
        }
    });

    $effect(() => {
        if (window && window.localStorage) {
            window.localStorage.setItem(
                "navCollapsed",
                navCollapsed ? "1" : "0",
            );
        }
    });

    $effect(() => {
        if (window && window.localStorage) {
            window.localStorage.setItem("activeMenu", activeMenu);
        }
    });

    // ---- Theme (design-system dark mode via data-theme on <html>) ----
    function applyTheme() {
        if (typeof document === "undefined") {
            return;
        }
        const dark =
            theme === "dark" ||
            (theme === "system" &&
                window.matchMedia("(prefers-color-scheme: dark)").matches);
        document.documentElement.setAttribute(
            "data-theme",
            dark ? "dark" : "light",
        );
    }

    // Load the saved preference (default: follow the OS).
    onMount(() => {
        const v = window.localStorage?.getItem("theme");
        if (v === "system" || v === "light" || v === "dark") {
            theme = v;
        }
    });

    // Apply + persist whenever the preference changes.
    $effect(() => {
        applyTheme();
        window.localStorage?.setItem("theme", theme);
    });

    // Re-resolve live when the OS setting flips and we're following it.
    $effect(() => {
        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        const onChange = () => {
            if (theme === "system") {
                applyTheme();
            }
        };
        mq.addEventListener("change", onChange);
        return () => mq.removeEventListener("change", onChange);
    });
</script>

<div class="app-container">
    <!-- Header -->
    <div class="header">
        <div class="header-content">
            <h1>Department Settings</h1>
            <div class="theme-toggle" role="group" aria-label="Appearance">
                {#each themeOptions as opt}
                    <button
                        class:active={theme === opt}
                        aria-pressed={theme === opt}
                        onclick={() => (theme = opt)}
                    >
                        {opt[0].toUpperCase() + opt.slice(1)}
                    </button>
                {/each}
            </div>
        </div>
    </div>

    <div class="main-content">
        <div class="content-wrapper">
            <!-- Left Sidebar Menu -->
            <div class="sidebar" class:collapsed={navCollapsed}>
                <nav>
                    <!-- collapse button in the margin between nav and content -->
                    <button
                        class="nav-toggle"
                        onclick={() => (navCollapsed = !navCollapsed)}
                        aria-label="Toggle icon text"
                        title="Toggle icon text"
                    >
                        {#if navCollapsed}
                            <span class="arrow">▶</span>
                        {:else}
                            <span class="arrow">◀</span>
                        {/if}
                    </button>

                    <button
                        class="nav-item"
                        class:active={activeMenu === "dept"}
                        onclick={() => (activeMenu = "dept")}
                    >
                        <svg
                            class="nav-icon"
                            height="480"
                            viewBox="0 0 127 127"
                            width="480"
                            xmlns="http://www.w3.org/2000/svg"
                            xmlns:xlink="http://www.w3.org/1999/xlink"
                            ><linearGradient
                                id="a"
                                gradientUnits="userSpaceOnUse"
                                x1="63.72385"
                                x2="63.874599"
                                y1="64.059652"
                                y2="127.446232"
                                ><stop offset="0" stop-color="#e1faff" /><stop
                                    offset=".69760984"
                                    stop-color="#e1faff"
                                /><stop
                                    offset="1"
                                    stop-color="#e1faff"
                                    stop-opacity="0"
                                /></linearGradient
                            ><circle
                                cx="63.5"
                                cy="38.100002"
                                r="25.4"
                                style="fill:#e1faff;fill-rule:evenodd;stroke:currentColor;stroke-width:12.7;stroke-linecap:round;stroke-linejoin:bevel"
                            /><circle
                                cx="63.873089"
                                cy="114.83726"
                                fill="url(#a)"
                                fill-rule="evenodd"
                                opacity=".821317"
                                r="45.508335"
                            /><path
                                d="m12.760174 114.14918a50.80397 50.722179 0 0 1 50.803971-50.72218 50.80397 50.722179 0 0 1 50.803965 50.72218"
                                fill="none"
                                stroke="currentColor"
                                stroke-linecap="round"
                                stroke-linejoin="bevel"
                                stroke-width="12.7"
                            /></svg
                        >
                        <span class="nav-text"> Department </span>
                        {#if activeMenu === "dept"}
                            <img
                                class="chevron"
                                src="/arrow.svg"
                                alt="selected"
                            />
                        {/if}
                    </button>

                    <button
                        class="nav-item"
                        class:active={activeMenu === "members"}
                        onclick={() => (activeMenu = "members")}
                    >
                        <svg
                            class="nav-icon"
                            fill="none"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                            ><g
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                ><circle cx="9" cy="7" r="4" /><path
                                    d="m2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2"
                                /><path d="m16 3.13a4 4 0 0 1 0 7.75" /><path
                                    d="m22 21v-2a4 4 0 0 0-3-3.85"
                                /></g
                            ></svg
                        >
                        <span class="nav-text"> Members </span>
                        {#if activeMenu === "members"}
                            <img
                                class="chevron"
                                src="arrow.svg"
                                alt="selected"
                            />
                        {/if}
                    </button>

                    <button
                        class="nav-item"
                        class:active={activeMenu === "limits"}
                        onclick={() => (activeMenu = "limits")}
                    >
                        <svg
                            class="nav-icon"
                            fill="none"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                            ><g
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                ><ellipse cx="12" cy="5" rx="9" ry="3" /><path
                                    d="m21 12c0 1.66-4 3-9 3s-9-1.34-9-3"
                                /><path
                                    d="m3 5v14c0 1.66 4 3 9 3s9-1.34 9-3v-14"
                                /></g
                            ></svg
                        >
                        <span class="nav-text"> Mailbox Limits </span>
                        {#if activeMenu === "limits"}
                            <img
                                class="chevron"
                                src="arrow.svg"
                                alt="selected"
                            />
                        {/if}
                    </button>
                </nav>
            </div>

            <!-- Main Content Area -->
            <div class="content-area">
                <div class="card">
                    {#if activeMenu === "dept"}
                        <Department
                            bind:this={dept}
                            {account}
                            bind:name
                            bind:homepage
                            {aliases}
                        />
                    {:else if activeMenu === "members"}
                        <Members {members} />
                    {:else}
                        <Limits bind:this={limits} />
                    {/if}

                    <!-- Footer with Save Button; the members pane is read-only -->
                    {#if activeMenu !== "members"}
                        <div class="card-footer">
                            <button class="form-button" onclick={handleSave}>
                                Save Changes
                            </button>
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    </div>
</div>

<style>
    /* ---------------- App shell ---------------- */
    .app-container {
        min-height: 100vh;
        width: 100%;
        background-color: var(--surface-app);
    }

    .header {
        background-color: var(--surface-panel);
        border-bottom: var(--bw-hair) solid var(--border-subtle);
    }

    .header-content {
        max-width: 1280px;
        margin: 0 auto;
        padding: var(--space-7) var(--space-8);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-6);
    }

    /* ---------------- Theme toggle ---------------- */
    .theme-toggle {
        display: inline-flex;
        gap: var(--space-1);
        padding: var(--space-1);
        background-color: var(--surface-sunken);
        border: var(--bw-hair) solid var(--border-subtle);
        border-radius: var(--radius-md);
        flex: none;
    }

    .theme-toggle button {
        font-family: var(--font-ui);
        font-size: var(--text-sm);
        line-height: 1;
        padding: var(--space-2) var(--space-4);
        border: none;
        border-radius: var(--radius-sm);
        background: transparent;
        color: var(--text-secondary);
        cursor: pointer;
        transition:
            background var(--dur-fast) var(--ease-standard),
            color var(--dur-fast) var(--ease-standard);
    }

    .theme-toggle button:hover {
        color: var(--text-primary);
        background-color: var(--surface-hover);
    }

    .theme-toggle button.active {
        background-color: var(--blue-500);
        color: var(--color-on-primary);
    }

    .theme-toggle button:focus-visible {
        outline: none;
        box-shadow: var(--focus-ring);
    }

    h1 {
        margin: 0;
        font-size: var(--text-2xl);
        font-weight: var(--weight-medium);
        color: var(--text-primary);
    }

    .main-content {
        max-width: 1280px;
        margin: 0 auto;
        padding: var(--space-8);
    }

    .content-wrapper {
        display: flex;
        position: relative;
        gap: var(--space-8);
    }

    /* ---------------- Sidebar / nav ---------------- */
    .sidebar {
        --sidebar-width: var(--sidebar-w);
        width: var(--sidebar-width);
        flex-shrink: 0;
        transition: width var(--dur-base) var(--ease-standard);
    }

    .sidebar.collapsed {
        --sidebar-width: 3.25rem;
    }

    .sidebar.collapsed .nav-text {
        display: none;
    }

    .sidebar.collapsed .nav-item {
        justify-content: center;
        padding-left: var(--space-4);
        padding-right: var(--space-4);
    }

    .sidebar.collapsed .chevron {
        display: none;
    }

    nav {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
        transform: translateY(-1rem);
    }

    .nav-item {
        width: 100%;
        display: flex;
        align-items: center;
        gap: var(--space-4);
        padding: var(--space-4) var(--space-5);
        font-family: var(--font-ui);
        font-size: var(--text-base);
        font-weight: var(--weight-regular);
        border-radius: var(--radius-sm);
        border: var(--bw-base) solid transparent;
        background: none;
        cursor: pointer;
        color: var(--text-primary);
        transition:
            background var(--dur-fast) var(--ease-standard),
            color var(--dur-fast) var(--ease-standard);
    }

    .nav-icon {
        width: 20px;
        height: 20px;
        flex: none;
    }

    .nav-text {
        display: inline-flex;
        align-items: center;
        gap: var(--space-4);
    }

    .nav-item:hover {
        background-color: var(--surface-hover);
    }

    /* Selected section = the loudest state: solid brand blue, white text
       (mirrors FolderItem--active in the design system). */
    .nav-item.active {
        background-color: var(--blue-500);
        color: var(--color-on-primary);
        border-color: transparent;
    }

    .chevron {
        width: 16px;
        height: 16px;
        margin-left: auto;
    }

    /* arrow.svg ships black; invert it to white on the solid-blue active row */
    .nav-item.active .chevron {
        filter: brightness(0) invert(1);
    }

    /* Dark: active text is near-black, so the chevron follows (no invert) */
    :global([data-theme="dark"]) .nav-item.active .chevron {
        filter: brightness(0);
    }

    .nav-toggle {
        display: flex;
        width: 3.25rem;
        height: 1.25rem;
        padding: var(--space-6);
        border: transparent;
        background: transparent;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        align-self: start;
        color: var(--text-muted);
        font-size: var(--text-sm);
    }

    .nav-toggle:hover {
        color: var(--text-secondary);
    }

    .nav-toggle .arrow {
        display: inline-block;
        line-height: 1;
    }

    /* ---------------- Content card ---------------- */
    .content-area {
        flex: 1;
        margin-top: -1rem;
    }

    .card {
        background-color: var(--surface-raised);
        border: var(--bw-hair) solid var(--border-subtle);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-sm);
        width: 100%;
        max-width: 32rem;
    }

    .card-footer {
        display: flex;
        justify-content: flex-end;
        border-top: var(--bw-hair) solid var(--border-subtle);
        padding: var(--space-5) var(--space-8);
        background-color: var(--surface-app);
        border-radius: 0 0 var(--radius-md) var(--radius-md);
    }

    /* Save = confirm/"go" action -> the design system's green go button */
    .form-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-3);
        padding: 9px 16px;
        font-family: var(--font-ui);
        font-size: var(--text-base);
        line-height: 1;
        border-radius: var(--radius-sm);
        border: var(--bw-bold) solid transparent;
        background-color: var(--color-go);
        color: var(--color-on-go);
        cursor: pointer;
        white-space: nowrap;
        user-select: none;
        transition:
            background var(--dur-fast) var(--ease-standard),
            filter var(--dur-fast) var(--ease-standard);
    }

    .form-button:hover {
        background-color: var(--color-go-hover);
    }

    .form-button:active {
        background-color: var(--color-go-hover);
    }

    .form-button:focus-visible {
        outline: none;
        box-shadow: var(--focus-ring);
    }

    .form-button:disabled {
        opacity: 0.45;
        cursor: not-allowed;
    }
</style>
