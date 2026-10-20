<script lang="ts">
    import { encode } from "@msgpack/msgpack";
    import { ResponseCompact } from "../lib/Response";

    let {
        account,
        name = $bindable(""),
        homepage = $bindable(""),
        aliases,
    } = $props();

    type DeptInfoPutResponse = {
        result: string;
    };

    export async function saveDeptInfo() {
        let buffer;
        try {
            const response = await fetch("/api/v2/object", {
                method: "POST",
                headers: { "Content-Type": "application/msgpack" },
                body: encode({
                    namespace:
                        "https://sobamail.com/module/mailboxmanager/dept/v1",
                    name: "DeptInfoPut",
                    content: {
                        name,
                        homepage,
                    },
                }) as BodyInit,
            });

            buffer = await response.arrayBuffer();
        } catch (error) {
            console.error("Failed to put department info:", error);
        }

        if (buffer) {
            const object = new ResponseCompact(buffer);
            console.log(JSON.stringify(object));

            if (object.content) {
                const content = object.content as DeptInfoPutResponse;
                console.log(`Put result: ${JSON.stringify(content)}`);
            }
        }
    }
</script>

<div class="card-content">
    <h2>Department Settings</h2>

    <div class="form-section">
        <div class="form-group">
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label>Email Address</label>
            <div class="email-display">
                <img class="mail-icon" src="/mail.svg" alt="mail icon" />
                <span>{account}</span>
            </div>
            <p class="help-text">
                This is the department's address. Members send and receive
                mail on its behalf.
            </p>
        </div>

        <div class="form-group">
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label>Additional Addresses</label>
            {#each aliases as alias}
                <div class="email-display">
                    <span>{alias}</span>
                </div>
            {/each}
            <p class="help-text">
                The department can receive and send email as these addresses.
            </p>
        </div>

        <div class="form-group">
            <label for="name">Display Name:</label>
            <input
                type="text"
                id="name"
                bind:value={name}
                placeholder="Enter the department's display name"
            />
        </div>

        <div class="form-group">
            <label for="url">Homepage:</label>
            <input
                type="url"
                id="url"
                bind:value={homepage}
                placeholder="https://example.com/"
            />
        </div>
    </div>
</div>
