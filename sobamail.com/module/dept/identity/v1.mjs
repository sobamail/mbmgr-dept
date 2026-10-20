
export const namespace = "https://sobamail.com/module/dept/identity/v1";

import "soba://computer/R2";

import {
    Message,
} from "https://sobamail.com/module/base/v1?sha224=FT31A9Ojcmu_lm2HSbwlKpw5FDVqfP2ESNjmrg";

const NS_IDEN_USER = "https://sobamail.com/module/user/identity/v1";

class RoleEvent {
    revoke_role() {
        const key = {
            userName : this.userName,
            name : this.name,
            domain : this.domain,
            user : this.user,
        };

        const parent = soba.data.find("role_defn", key).hash;
        return soba.data.delete("role_defn", parent);
    }

    propagate(name) {
        let message = new Message();
        message.from = [ {address : soba.app.account()} ];
        message.to = [ {address : this.userName} ];
        message.bodyObject = {
            contentId : message.nextContentId(),
            type : "application/json",
            content : {
                namespace : NS_IDEN_USER,
                name : name,
                content : {
                    name : this.name,
                    domain : this.domain,
                    user : this.user,
                    uuid : this.uuid,
                },
            },
        };

        soba.mail.send(message);
    }
};

export class AddRoleHolder {
    static KEY = `{${namespace}}${this.name}`;

    constructor({userName}) { this.userName = userName; }

    process() { return soba.data.insert("role_holder", {userName : this.userName}); }
}

export class AddRole extends RoleEvent {
    static KEY = `{${namespace}}${this.name}`;

    constructor({userName, name, domain = null, user = null, uuid = null} = {}) {
        super();

        this.userName = userName;
        this.name = name;
        this.domain = domain;
        this.user = user;
        this.uuid = uuid;
    }

    process() { return soba.data.insert("role_defn", this); }
}

// non-replicated idempotency hack. if we propagate roles on AddRole, every replica would propagate
// roles to every user, only to be reduced to noop by deduplication. Not incorrect yet quite noisy.
// This message is processed then deleted so it's a much lower probability of {user}AddRole
// propagation due to {dept}AddRole replication. Note that this *is* still racy, but doesn't seem to
// be a problem even on localhost
export class AddRoleRequest extends RoleEvent {
    static KEY = `{${namespace}}${this.name}`;

    constructor({userName, name, domain = null, user = null, uuid = null} = {}) {
        super();

        this.userName = userName;
        this.name = name;
        this.domain = domain;
        this.user = user;
        this.uuid = uuid;
    }

    process() {
        soba.data.insert("role_holder", {userName : this.userName});
        const retval = soba.data.insert("role_defn", this);
        if (retval.inserted) {
            this.propagate("AddRole");
        }
        return retval;
    }
}

export class RevokeRole extends RoleEvent {
    static KEY = `{${namespace}}${this.name}`;

    constructor({userName, name, domain = null, user = null, uuid = null} = {}) {
        super();

        this.userName = userName;
        this.name = name;
        this.domain = domain;
        this.user = user;
        this.uuid = uuid;
    }

    process() { return this.revoke_role(); }
}

export class RevokeRoleRequest extends RoleEvent {
    static KEY = `{${namespace}}${this.name}`;

    constructor({userName, name, domain = null, user = null, uuid = null} = {}) {
        super();

        this.userName = userName;
        this.name = name;
        this.domain = domain;
        this.user = user;
        this.uuid = uuid;
    }

    process() {
        const num_deleted_rows = this.revoke_role();
        if (num_deleted_rows > 0) {
            this.propagate("RevokeRole");
        }
        return num_deleted_rows;
    }
}
