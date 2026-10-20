
export const namespace = "https://sobamail.com/module/mailboxmanager/dept/v1";

import "soba://computer/R2";

export const ROLE_REGULAR = "regular";
export const ROLE_ADMIN = "admin";

// The server's department admin role, spelled as soba-web/api's `authz.ts`
// puts it on the wire (ROLE_DEPT_ADMIN there). A holder carrying it is this
// department's admin; everyone else holding any role at all is a regular
// member.
export const ROLE_DEPT_ADMIN = "{dept.mailboxmanager.core.app.sobamail.com}Admin";

// Membership in a department IS holding a role on it, so the department's
// members are the rows of `role_holder` and nothing else -- there is no
// members table of its own.
export const QSTR_GET_MEMBERS = `SELECT userName FROM role_holder ORDER BY userName`;

// Per-member message state (read/seen flags etc.). Department mail is shared,
// so message attributes like 'read' are kept separately for each member.
export class SetAttrMessageMember {
    static KEY = `{${namespace}}${this.name}`;

    constructor({message = null, folder = null, userName = null, key = null, value = null}) {
        this.message = message;
        this.folder = folder;
        this.userName = userName;
        this.key = key;
        this.value = value;
    }

    process() {
        // FIXME: wait -- are we validating here? if so this is pathetic
        if (! this.key) {
            throw new Error("empty key");
        }

        return soba.data.insert("message_attr_member", this);
    }

    asText(locale) {
        return `Set state in folder ${this.folder} for message ${this.message} member ${
                this.userName} key '${this.key}' value '${this.value}'`;
    }

    toString() {
        return `SetAttrMessageMember(${this.folder}, ${this.message}, ${this.userName}, ${
                this.key}, ${this.value})`;
    }
}

export class UnsetAttrMessageMember {
    static KEY = `{${namespace}}${this.name}`;

    constructor({message = null, folder = null, userName = null, key = null}) {
        this.message = message;
        this.folder = folder;
        this.userName = userName;
        this.key = key;
    }

    process() {
        if (! this.key) {
            throw new Error("empty key");
        }

        let parent = soba.data
                             .find("message_attr_member", {
                                 message : this.message,
                                 folder : this.folder,
                                 userName : this.userName,
                                 key : this.key,
                             })
                             .hash;
        return soba.data.delete("message_attr_member", parent);
    }

    asText(locale) {
        return `Unset state in folder ${this.folder} for message ${this.message} member ${
                this.userName} key '${this.key}'`;
    }

    toString() {
        return `UnsetAttrMessageMember(${this.folder}, ${this.message}, ${this.userName}, ${
                this.key})`;
    }
}

export class DeptInfoGet {
    static KEY = `{${namespace}}${this.name}`;
    process() { soba.task.respond(new DeptInfoGetResponse()); }
}

export class DeptInfoGetResponse {
    static KEY = `{${namespace}}${this.name}`;
    constructor() {
        this.account = soba.app.account();
        this.aliases = this.read_aliases();
        this.domains = this.read_domains();
        this.members = this.read_members();
        this.name = this.read_name();
        this.homepage = this.read_homepage();
    }

    read_aliases() {
        const ret = soba.db.exec("select address,key,value from iden_attr order by address");
        if (ret.code != 0) {
            throw new Error(`Database error ${ret.code}`);
        }

        let aliases = {};
        for (const row of ret.data) {
            if (! aliases[row[0]]) {
                aliases[row[0]] = {};
            }

            aliases[row[0]][row[1]] = row[2];
        }

        return aliases;
    }

    read_domains() {
        const ret = soba.db.exec("SELECT name FROM domains ORDER BY name");
        if (ret.code != 0) {
            throw new Error(`Database error ${ret.code}`);
        }

        let domains = [];
        for (const row of ret.data) {
            domains.push({name : row[0]});
        }

        return domains;
    }

    // The department's members are its role holders. `role` stays the
    // two-valued flag the department's own page reads -- `admin` for a holder
    // whose grants include the server's department admin role, `regular` for
    // every other holder -- and `roles` carries what they actually hold.
    read_members() {
        const ret = soba.db.exec(QSTR_GET_MEMBERS);
        if (ret.code != 0) {
            throw new Error(`Database error ${ret.code}`);
        }

        const roles = this.read_roles();

        let members = [];
        for (const row of ret.data) {
            const address = row[0];
            const held = roles[address] || [];
            members.push({
                address : address,
                role : held.some((r) => r.name == ROLE_DEPT_ADMIN) ? ROLE_ADMIN : ROLE_REGULAR,
                roles : held,
            });
        }

        return members;
    }

    // Scoped roles held by the department's members, grouped by the holder's
    // userName. `name` is the role; `domain`/`user` scope what it applies
    // over, not who holds it.
    read_roles() {
        const ret = soba.db.exec(
                "SELECT userName,name,domain,user FROM role_defn ORDER BY userName,name");
        if (ret.code != 0) {
            throw new Error(`Database error ${ret.code}`);
        }

        let byMember = {};
        for (const row of ret.data) {
            const member = row[0];
            if (! byMember[member]) {
                byMember[member] = [];
            }

            byMember[member].push({name : row[1], domain : row[2], user : row[3]});
        }

        return byMember;
    }

    read_name() {
        const ret = soba.db.exec("SELECT value FROM attr WHERE key='name'");
        if (ret.code != 0) {
            throw new Error(`Database error ${ret.code}`);
        }

        let retval = null;
        for (const row of ret.data) {
            retval = row[0];
            break;
        }

        return retval;
    }

    read_homepage() {
        const ret = soba.db.exec("SELECT value FROM attr WHERE key='homepage'");
        if (ret.code != 0) {
            throw new Error(`Database error ${ret.code}`);
        }

        let retval = null;
        for (const row of ret.data) {
            retval = row[0];
            break;
        }

        return retval;
    }
}

export class DeptInfoPut {
    static KEY = `{${namespace}}${this.name}`;

    constructor({name, homepage, aliases = null} = {}) {
        this.name = name;
        this.homepage = homepage;
        this.aliases = aliases;
    }

    process() {
        soba.data.insert("attr", {key : "name", value : this.name});
        soba.data.insert("attr", {key : "homepage", value : this.homepage});

        if (this.aliases !== null) {
            for (const [alias, attrs] of Object.entries(this.aliases)) {
                if (alias != soba.app.account()) {
                    continue;
                }

                soba.data.insert("iden", {address : alias});
                for (const [key, val] of Object.entries(attrs)) {
                    soba.data.insert("iden_attr", {address : alias, key : key, value : val});
                }
            }
        }

        soba.task.respond(new DeptInfoPutResponse({result : "OK!"}));
    }
}

export class DeptInfoPutResponse {
    static KEY = `{${namespace}}${this.name}`;

    constructor({result = null} = {}) { this.result = result; }
}
