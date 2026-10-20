<script lang="ts">
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

    let { members = [] }: { members: Member[] } = $props();
</script>

<div class="card-content">
    <h2>Members</h2>

    <div class="form-section">
        <div class="form-group">
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label>Department Members</label>
            {#if members.length > 0}
                <table>
                    <thead>
                        <tr>
                            <th>Address</th>
                            <th>Role</th>
                            <th>Roles</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each members as member (member.address)}
                            <tr>
                                <td>{member.address}</td>
                                <td>
                                    {member.role === "admin"
                                        ? "Admin"
                                        : "Regular"}
                                </td>
                                <td class="roles-cell">
                                    {#if member.roles && member.roles.length > 0}
                                        <ul class="role-list">
                                            {#each member.roles as role}
                                                <li class="role-item">
                                                    <span class="role-name"
                                                        >{role.name}</span
                                                    >
                                                    <span class="role-scope"
                                                        >{role.domain ??
                                                            "*"}/{role.user ??
                                                            "*"}</span
                                                    >
                                                </li>
                                            {/each}
                                        </ul>
                                    {:else}
                                        <span class="role-empty">—</span>
                                    {/if}
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            {:else}
                <p class="help-text">This department has no members yet.</p>
            {/if}
            <p class="help-text">
                A member is whoever holds a role on this department. All
                members can send mail on behalf of the department and receive
                its mail. Each member keeps their own read state. Only admins
                can delete messages.
            </p>
        </div>
    </div>
</div>

<style>
    .roles-cell {
        vertical-align: middle;
    }

    .role-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
    }

    .role-item {
        display: inline-flex;
        align-items: baseline;
        gap: var(--space-2);
        white-space: nowrap;
    }

    .role-name {
        font-size: var(--text-sm);
        font-weight: 600;
        color: var(--text-primary);
    }

    .role-scope {
        font-family: var(--font-mono, monospace);
        font-size: var(--text-xs);
        color: var(--text-secondary);
    }

    .role-empty {
        color: var(--text-secondary);
    }
</style>
