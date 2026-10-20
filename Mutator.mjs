
import "soba://computer/R2";

import {
    DeleteRow,
    Message,
} from "https://sobamail.com/module/base/v1?sha224=FT31A9Ojcmu_lm2HSbwlKpw5FDVqfP2ESNjmrg";
import {
    AddRole,
    AddRoleHolder,
    AddRoleRequest,
    RevokeRole,
    RevokeRoleRequest
} from "https://sobamail.com/module/dept/identity/v1?sha224=HrTTN33wHquFcBvq4HwsnOW6eS4u2GeW4x02ig";
import {
    AddFilter,
    AddFilterActionDelete,
    AddFilterActionFileinto,
    AddFilterAttr,
    AddFilterCond,
    Filter,
    RemoveFilter,
} from "https://sobamail.com/module/user/filter/v1?sha224=sY6YBM9UVeGRruJYgtq2EIVfsKGoQR7AM_cLew";
import {
    AddIdentity,
    SetAttrIdentity,
} from "https://sobamail.com/module/user/identity/v1?sha224=CMNk8vqh_KtA1oVOM1eTEiV0avAG2IK18AoBXA";
/* clang-format off */
import {
    InitializeFolders,
    InitializeMessages,

    SetAttr,
    UnsetAttr,

    CreateFolder,
    InsertFolder,
    DeleteFolder,
    SetAttrFolder,
    UnsetAttrFolder,

    AddMessage,
    RemoveMessage,
    SetAttrMessage,
    UnsetAttrMessage,

    MessageTask,
    DeliverMessage,

    LimitsGet,
    LimitsPut,

    QSTR_GET_FOLDERS,
} from "https://sobamail.com/module/mailboxmanager/v1?sha224=BPPBHDgFB4O6XNQNDG989qNrzgWcssJZvPJiEg";
import {
    SetAttrMessageMember,
    UnsetAttrMessageMember,

    DeptInfoGet,
    DeptInfoPut,

    ROLE_DEPT_ADMIN,
} from "https://sobamail.com/module/mailboxmanager/dept/v1?sha224=jLqjFaSaEumpwz7gcFS5yRjRBSj4kOEabMSgcg";
/* clang-format on */

const NS_BASE = "https://sobamail.com/module/base/v1";
const NS_MBMGR = "https://sobamail.com/module/mailboxmanager/v1";

// Infrastructure senders whose gated objects always pass the admin gate (the
// api's role events arrive signed from here)
const TRUSTED_SENDERS = [ "mbmgr@api.sobamail.com" ];

export default class DeptMailboxManager {
    static id = "dept.mailboxmanager.core.app.sobamail.com";
    static name = "Department Mailbox Manager";
    static version = "1.0.0.0"; // read from apps.db/instances table
    static schema = 2;
    static objects = new Map([
        [ Message.KEY, false ],
        [ MessageTask.KEY, false ],

        [ DeleteRow.KEY, false ],

        [ InitializeFolders.KEY, false ],
        [ InitializeMessages.KEY, false ],

        [ SetAttr.KEY, false ],
        [ UnsetAttr.KEY, false ],

        [ InsertFolder.KEY, false ],
        [ CreateFolder.KEY, false ],
        [ DeleteFolder.KEY, false ],
        [ SetAttrFolder.KEY, false ],
        [ UnsetAttrFolder.KEY, false ],

        [ AddMessage.KEY, false ],
        [ RemoveMessage.KEY, false ],
        [ SetAttrMessage.KEY, false ],
        [ UnsetAttrMessage.KEY, false ],

        [ DeliverMessage.KEY, false ],

        [ AddIdentity.KEY, false ],
        [ SetAttrIdentity.KEY, false ],

        [ AddFilter.KEY, false ],
        [ AddFilterAttr.KEY, false ],
        [ AddFilterCond.KEY, false ],
        [ AddFilterActionFileinto.KEY, false ],
        [ AddFilterActionDelete.KEY, false ],
        [ RemoveFilter.KEY, false ],

        [ AddRoleHolder.KEY, false ],

        [ AddRole.KEY, false ],
        [ AddRoleRequest.KEY, false ],
        [ RevokeRole.KEY, false ],
        [ RevokeRoleRequest.KEY, false ],

        [ SetAttrMessageMember.KEY, false ],
        [ UnsetAttrMessageMember.KEY, false ],

        [ DeptInfoGet.KEY, false ],
        [ DeptInfoPut.KEY, false ],

        [ LimitsGet.KEY, false ],
        [ LimitsPut.KEY, false ],
    ]);

    // The objects the department takes by mail that only a holder of its Admin
    // role may send: the role requests and revokes, a filter's removal, the
    // department's info.
    //
    // A mailbox event -- the mailboxmanager module's objects: the messages, the
    // folders, their attributes, the department's own attributes and limits --
    // is never taken by mail at all: process() ignores it there (the owner,
    // 2026-09-30), and as a local task it carries no sender, so it has no place
    // here.
    //
    // The replicated ones among what is taken by mail -- AddRole, AddRoleHolder,
    // the filter inserts -- are ungated by ruling: while the runtime runs a
    // replicated object it refuses soba.app.account() and soba.db.exec() alike,
    // so authorize() can not read the roles there.
    static ADMIN_ONLY = new Set([
        AddRoleRequest.KEY,
        RevokeRole.KEY,
        RevokeRoleRequest.KEY,

        RemoveFilter.KEY,

        DeptInfoPut.KEY,
    ]);

    static handlers = new Map([
        [ SetAttr.KEY, (content) => (new SetAttr(content)).process() ],
        [ UnsetAttr.KEY, (content) => (new UnsetAttr(content)).process() ],

        [ InsertFolder.KEY, (content) => (new InsertFolder(content)).process() ],
        [ CreateFolder.KEY, (content) => (new CreateFolder(content)).process() ],
        [ DeleteFolder.KEY, (content) => (new DeleteFolder(content)).process() ],
        [ SetAttrFolder.KEY, (content) => (new SetAttrFolder(content)).process() ],
        [ UnsetAttrFolder.KEY, (content) => (new UnsetAttrFolder(content)).process() ],

        [ AddMessage.KEY, (content) => (new AddMessage(content)).process() ],
        [ RemoveMessage.KEY, (content) => (new RemoveMessage(content)).process() ],
        [ SetAttrMessage.KEY, (content) => (new SetAttrMessage(content)).process() ],
        [ UnsetAttrMessage.KEY, (content) => (new UnsetAttrMessage(content)).process() ],

        [ DeliverMessage.KEY, (content) => (new DeliverMessage(content)).process() ],

        [
            InitializeFolders.KEY,
            () => soba.task.emit(new InitializeFolders({schema : DeptMailboxManager.schema}))
        ],
        [
            InitializeMessages.KEY,
            () => soba.task.emit(new InitializeMessages({schema : DeptMailboxManager.schema}))
        ],

        [ AddRole.KEY, (content) => (new AddRole(content)).process() ],
        [ AddRoleHolder.KEY, (content) => (new AddRoleHolder(content)).process() ],
        [ AddRoleRequest.KEY, (content) => (new AddRoleRequest(content)).process() ],
        [ RevokeRole.KEY, (content) => (new RevokeRole(content)).process() ],
        [ RevokeRoleRequest.KEY, (content) => (new RevokeRoleRequest(content)).process() ],

        [ AddIdentity.KEY, (content) => (new AddIdentity(content)).process() ],
        [ SetAttrIdentity.KEY, (content) => (new SetAttrIdentity(content)).process() ],

        [ AddFilter.KEY, (content) => (new AddFilter(content)).process() ],
        [ AddFilterAttr.KEY, (content) => (new AddFilterAttr(content)).process() ],
        [ AddFilterCond.KEY, (content) => (new AddFilterCond(content)).process() ],
        [
            AddFilterActionFileinto.KEY,
            (content) => (new AddFilterActionFileinto(content)).process()
        ],
        [ AddFilterActionDelete.KEY, (content) => (new AddFilterActionDelete(content)).process() ],
        [ RemoveFilter.KEY, (content) => (new RemoveFilter(content)).process() ],

        [ SetAttrMessageMember.KEY, (content) => (new SetAttrMessageMember(content)).process() ],
        [
            UnsetAttrMessageMember.KEY, (content) => (new UnsetAttrMessageMember(content)).process()
        ],

        [ DeptInfoGet.KEY, (content) => (new DeptInfoGet(content)).process() ],
        [ DeptInfoPut.KEY, (content) => (new DeptInfoPut(content)).process() ],

        [ LimitsGet.KEY, (content) => (new LimitsGet(content)).process() ],
        [ LimitsPut.KEY, (content) => (new LimitsPut(content)).process() ],
    ]);

    constructor() {
        soba.schema.table({
            name : "attr",
            insertEvent : SetAttr,
            deleteEvent : DeleteRow,
            columns : [
                {
                    name : "key",
                    checks : [
                        {op : "!=", value : null},
                        {op : "typeof", value : "text"},
                        {op : "lww", value : true},
                        {op : "regexp", value : "^[a-zA-Z0-9_-]+$"},
                    ],
                },
                {
                    name : "value",
                    checks : [],
                },
            ],
        });

        /*
         * Roles
         *
         * Membership in a department IS holding a role on it, so the holder
         * comes first: `role_holder` carries ONE row per user who holds any
         * role here, and it is the row the rest of the department points at
         * — `message_attr_member.userName` above all, which needs a unique
         * target column to hang its foreign key on.
         */
        soba.schema.table({
            name : "role_holder",
            insertEvent : AddRoleHolder,
            deleteEvent : DeleteRow,
            columns : [
                {
                    // Unique by its own last-write-wins constraint, which is
                    // what lets another table's fk name it.
                    name : "userName",
                    checks : [
                        {op : "!=", value : null},
                        {op : "typeof", value : "text"},
                        {op : "lww", value : true},
                        {op : "regexp", value : soba.type.userName.pattern},
                    ],
                },
            ],
        });

        /*
         * A user can hold any number of roles on this department. `domain`
         * and `user` scope what the role applies over; they are not the
         * holder's identity — `userName` is, and it names the holder row.
         */
        soba.schema.table({
            name : "role_defn",
            insertEvent : AddRole,
            deleteEvent : DeleteRow,
            columns : [
                {
                    name : "userName",
                    checks : [
                        {op : "!=", value : null},
                        {op : "fk", table : "role_holder", column : "userName"},
                    ],
                },
                {
                    name : "name",
                    checks : [
                        {op : "!=", value : ""},
                        {op : "!=", value : null},
                        {op : "typeof", value : "text"},
                    ],
                },
                {
                    // null is valid here: a role with no domain applies globally
                    name : "domain",
                    checks : [
                        {op : "regexp", value : soba.type.domainName.pattern},
                    ],
                },
                {
                    // null is valid here: a role with no user applies to the whole domain
                    name : "user",
                    checks : [
                        {op : "regexp", value : soba.type.userName.pattern},
                    ],
                },
                {
                    // null is valid here: a role with no uuid does not narrow the existing context
                    name : "uuid",
                    checks : [
                        {op : "regexp", value : soba.type.uuid.pattern},
                    ],
                },
            ],
            checks : [
                {
                    columns : [ "userName", "name", "domain", "user" ],
                    op : "lww",
                    value : true,
                },
            ],
        });

        /*
         * Identities
         */

        soba.schema.table({
            name : "iden",
            insertEvent : AddIdentity,
            deleteEvent : DeleteRow,
            columns : [
                {
                    name : "address",
                    checks : [
                        {op : "!=", value : null},
                        {op : "typeof", value : "text"},
                        {op : "lww", value : true},
                        {op : "regexp", value : soba.type.address.pattern},
                    ],
                },
            ],
        });

        soba.schema.table({
            name : "iden_attr",
            insertEvent : SetAttrIdentity,
            deleteEvent : DeleteRow,
            columns : [
                {
                    name : "address",
                    checks : [
                        {op : "!=", value : null},
                        {op : "fk", table : "iden", column : "address"},
                    ],
                },
                {
                    name : "key",
                    checks : [
                        {op : "!=", value : null},
                        {op : "typeof", value : "text"},
                        {op : "regexp", value : "^[a-zA-Z0-9_-]+$"},
                    ],
                },
                {
                    name : "value",
                    checks : [],
                },
            ],
            checks : [
                {
                    columns : [ "address", "key" ],
                    op : "lww",
                    value : true,
                },
            ],
        });

        /*
         * folders
         */
        soba.schema.table({
            name : "folders",
            insertEvent : InsertFolder,
            deleteEvent : DeleteRow,
            columns : [
                {
                    name : "uuid",
                    checks : [
                        {op : "!=", value : null},
                        {op : "typeof", value : "text"},
                        {op : "lww", value : true},
                        {op : "regexp", value : soba.type.uuid.pattern},
                    ],
                },
                {
                    name : "mirror",
                    checks : [
                        {op : "!=", value : null},
                        {op : "in", value : [ 1, 0 ]},
                    ]
                },
            ],
        });

        soba.schema.table({
            name : "folder_attr",
            insertEvent : SetAttrFolder,
            deleteEvent : DeleteRow,
            columns : [
                {
                    name : "folder",
                    checks : [
                        {op : "!=", value : null},
                        {op : "fk", table : "folders", column : "uuid"},
                    ],
                },
                {
                    name : "key",
                    checks : [
                        {op : "!=", value : null},
                        {op : "typeof", value : "text"},
                        {op : "regexp", value : "^[a-zA-Z0-9_-]+$"},
                    ],
                },
                {
                    name : "value",
                    checks : [],
                },
                {
                    name : "mirror",
                    checks : [
                        {op : "!=", value : null},
                        {op : "in", value : [ 1, 0 ]},
                    ]
                },
            ],
            checks : [
                {
                    columns : [ "folder", "key" ],
                    op : "lww",
                    value : true,
                },
            ],
        });

        /*
         * messages
         */
        soba.schema.table({
            name : "messages",
            insertEvent : AddMessage,
            deleteEvent : DeleteRow,
            columns : [
                {
                    name : "folder",
                    checks : [
                        {op : "!=", value : null},
                        {op : "fk", table : "folders", column : "uuid"},
                    ],
                },
                {
                    name : "message",
                    checks : [
                        {op : "!=", value : null},
                        {op : "typeof", value : "text"},
                        {op : "regexp", value : soba.type.uuid.pattern},
                    ],
                },
                {
                    name : "mirror",
                    checks : [
                        {op : "!=", value : null},
                        {op : "in", value : [ 1, 0 ]},
                    ]
                },
            ],
            checks : [
                {
                    columns : [ "message", "folder" ],
                    op : "lww",
                    value : true,
                },
            ],
        });

        // Message-scoped state: the keys that describe the MESSAGE rather than
        // a member's relation to it belong to the whole department, so they
        // live in the same shared table a personal mailbox keeps, written by
        // the same mailbox-wide SetAttrMessage.
        soba.schema.table({
            name : "message_attr",
            insertEvent : SetAttrMessage,
            deleteEvent : DeleteRow,
            columns : [
                {
                    name : "message",
                    checks : [
                        {op : "!=", value : null},
                        {op : "typeof", value : "text"},
                        {op : "regexp", value : soba.type.uuid.pattern},
                    ],
                },
                {
                    name : "folder",
                    checks : [
                        {op : "!=", value : null},
                        {op : "typeof", value : "text"},
                        {op : "regexp", value : soba.type.uuid.pattern},
                    ],
                },
                {
                    name : "key",
                    checks : [
                        {op : "!=", value : null},
                        {op : "typeof", value : "text"},
                        {op : "regexp", value : "^[a-zA-Z0-9_-]+$"},
                    ],
                },
                {
                    name : "value",
                    checks : [],
                },
                {
                    name : "mirror",
                    checks : [
                        {op : "!=", value : null},
                        {op : "in", value : [ 1, 0 ]},
                    ]
                },
            ],
            checks : [
                {
                    columns : [ "message", "folder", "key" ],
                    op : "lww",
                    value : true,
                },
                {
                    columns : {message : "message", folder : "folder"},
                    op : "fk",
                    table : "messages",
                },
            ],
        });

        // Per-member message state: department mail is shared, so flags like
        // 'read' are tracked for each member separately.
        soba.schema.table({
            name : "message_attr_member",
            insertEvent : SetAttrMessageMember,
            deleteEvent : DeleteRow,
            columns : [
                {
                    name : "message",
                    checks : [
                        {op : "!=", value : null},
                        {op : "typeof", value : "text"},
                        {op : "regexp", value : soba.type.uuid.pattern},
                    ],
                },
                {
                    name : "folder",
                    checks : [
                        {op : "!=", value : null},
                        {op : "typeof", value : "text"},
                        {op : "regexp", value : soba.type.uuid.pattern},
                    ],
                },
                {
                    name : "userName",
                    checks : [
                        {op : "!=", value : null},
                        {op : "fk", table : "role_holder", column : "userName"},
                    ],
                },
                {
                    name : "key",
                    checks : [
                        {op : "!=", value : null},
                        {op : "typeof", value : "text"},
                        {op : "regexp", value : "^[a-zA-Z0-9_-]+$"},
                    ],
                },
                {
                    name : "value",
                    checks : [],
                },
            ],
            checks : [
                {
                    columns : [ "message", "folder", "userName", "key" ],
                    op : "lww",
                    value : true,
                },
                {
                    columns : {message : "message", folder : "folder"},
                    op : "fk",
                    table : "messages",
                },
            ],
        });

        // Initialize the filtering subsystem
        this.filter = new Filter();
    }

    process(message, meta) {
        // Delivery shortcut
        if (meta.location == "limbo") {
            if (meta.type == "message") {
                // This message has not been delivered yet (it's in limbo). Deliver it first
                this.on_email(message);
                return;
            }

            throw new Error(`Request type '${meta.type}' can not be in limbo`);
        }

        // Local task shortcut
        if (meta.type == "task" || meta.type == "task-replay") {
            // This is a task.
            // A task only has the content, so it's safe to just pass it to the dispatch function.
            // Tasks originate from the local replica, so they carry no remote sender.
            this.on_structured(message, null);
            return;
        }

        if (meta.type == "message" && message.bodyObject) {
            // This is a structured message. We need to do some digging to get to the content object
            let content = message.bodyObject.content;
            if (content === undefined) {
                soba.log.error(
                        `Discarding SMessage ${message.uuid}: unable to read message content`);
                return; // silently discards the message by marking it as processed
            }

            // The message was deserialized successfully, now let's validate the object
            if (! this.checkContentObject(content, message.uuid, "")) {
                return; // silently discards the message by marking it as processed
            }

            // The sender is the one a signature names, and nothing else: the From
            // header is what the client wrote, so an unsigned object is attributed
            // to nobody and passes like a local task.
            let sender = null;

            // If this is a signed and/or encrypted message, it will be wrapped
            // in an Envelope object, so let's dig further if that's the case.
            if (content.name == "Envelope" && content.namespace == NS_BASE) {
                let envelope = content.content;
                if (envelope === undefined) {
                    soba.log.error(`Discarding SMessage ${message.uuid}: Envelope is empty`);
                    return; // silently discards the message by marking it as processed
                }

                // The runtime refuses a signed envelope whose signature does not
                // verify against the From before the app runs, so a signature here
                // backs the sender field. Without one, that field is data.
                if (DeptMailboxManager.is_signed(envelope) && envelope.sender) {
                    sender = envelope.sender;
                }

                // Envelope payload is our actual content, so replace it
                content = envelope.content;
                if (! content) {
                    soba.log.error(`Discarding SMessage ${
                            message.uuid}: Envelope content could not be read`);
                    return; // silently discards the message by marking it as processed
                }

                if (! this.checkContentObject(content, message.uuid, "Envelope ")) {
                    return; // silently discards the message by marking it as processed
                }
            }

            // A mailbox event is this replica's own operation: it reaches the app as a
            // local task, or replayed as a mutation, never by mail. One that arrives
            // inside a structured message -- bare or in an Envelope, signed or not,
            // whoever the sender -- is ignored (the owner, 2026-09-30).
            if (DeptMailboxManager.is_mailbox_event(content)) {
                soba.log.warning(`Ignoring SMessage ${message.uuid}: mailbox event '${
                        content.name}' arrived inside a structured message`);
                return; // silently discards the message by marking it as processed
            }

            // Finally we have the content, let's process it
            this.on_structured(content, sender);

            return;
        }

        // we have no idea what this is, so deliver it
        this.on_email(message);
    }

    // True when `content` is an object of the mailboxmanager module: the messages, the folders,
    // their attributes, the department's own attributes and limits.
    static is_mailbox_event(content) { return content.namespace == NS_MBMGR; }

    // True when `envelope` carries a signature.
    static is_signed(envelope) {
        const signature = envelope.signature;
        if (signature === undefined || signature === null) {
            return false;
        }

        if (signature instanceof ArrayBuffer || ArrayBuffer.isView(signature)) {
            return signature.byteLength > 0;
        }

        return signature.length > 0;
    }

    checkContentObject(content, uuid, where) {
        if (content instanceof ArrayBuffer) { // The data content could not be parsed correctly
            soba.log.error(`Discarding SMessage ${uuid}: ${where}contents were not recognized`);
            return false;
        }

        if (! content.namespace) {
            soba.log.error(`Discarding SMessage ${uuid}: ${where}content ${
                    JSON.stringify(content)} null or empty namespace`);
            return false;
        }

        if (! content.name) {
            soba.log.error(`Discarding SMessage ${uuid}: ${where}content ${
                    JSON.stringify(content)} null or empty name`);
            return false;
        }

        if (content.name == "MessageTask" && content.namespace == NS_MBMGR) {
            soba.log.error(`Discarding SMessage ${
                    uuid}: A MessageTask is not supposed to reach this point`);
            return false;
        }

        return true;
    }

    on_email(message) {
        const folders = this.filter.evaluate_filters(message);

        for (const fname of folders) {
            const rows = soba.db.exec(QSTR_GET_FOLDERS, fname, null).data;
            if (rows.length < 1) {
                soba.log.warning(`on_email: target folder '${fname}' not found, skipping`);
                continue;
            }
            for (const row of rows) {
                soba.data.insert("messages", {folder : row[0], message : message.uuid, mirror : 0});
            }
        }
    }

    // True when `key` is one of the department's gated objects (ADMIN_ONLY) -- an
    // admin's.
    is_admin_only(key) { return DeptMailboxManager.ADMIN_ONLY.has(key); }

    // True when `sender` holds this department's Admin role. A read error
    // answers non-admin.
    is_dept_admin(sender) {
        const ret = soba.db.exec("SELECT count(*) FROM role_defn WHERE userName=? AND name=?",
                                 sender, ROLE_DEPT_ADMIN);
        if (ret.code != 0 || ret.data.length != 1) {
            soba.log.error(`Unable to read the roles of '${sender}': code ${ret.code}`);
            return false;
        }

        return ret.data[0][0] > 0;
    }

    // Decides whether `sender` may emit the object identified by `key`.
    //
    // Only the gated objects are asked about, and only for a SIGNED sender:
    // sender == null is the local replica's own task, or an unsigned arrival,
    // which is attributed to nobody. The infrastructure senders and the account
    // itself pass; everyone else needs the department's Admin role, which the
    // api's signed AddRole grants. This binds a signed sender on the message
    // path and nothing more: the rows it reads are replicated state.
    authorize(key, sender) {
        if (! this.is_admin_only(key)) {
            return true;
        }

        if (sender === null || sender === undefined) {
            return true;
        }

        if (TRUSTED_SENDERS.includes(sender)) {
            return true;
        }

        if (sender == soba.app.account()) {
            return true;
        }

        if (this.is_dept_admin(sender)) {
            return true;
        }

        soba.log.warning(`Consuming '${key}' from '${
                sender}' unapplied: it needs the department's admin role`);
        return false;
    }

    // The department applies what reaches it, save a gated object from a sender
    // who is not its admin (authorize() above): that one is CONSUMED -- the
    // handler is not called and the object retires, because a rejected or
    // thrown object would be retried forever. The other refusal is a member
    // object naming a user who holds no role on this department --
    // `message_attr_member`'s foreign key into `role_holder`. A mailbox event
    // never gets here by mail (process() above); as a local task it comes with
    // no sender.
    on_structured(message, sender) {
        if (! message.namespace) {
            throw new Error(`Message has no namespace: ${JSON.stringify(message)}`);
        }

        if (! message.name) {
            throw new Error(`Message has no name: ${JSON.stringify(message)}`);
        }

        const key = `{${message.namespace}}${message.name}`;
        const handler = DeptMailboxManager.handlers.get(key);
        if (! handler) {
            throw new Error(`No handler found for object '${key}'`);
        }

        if (! this.authorize(key, sender)) {
            return; // silently discards the event by marking it as processed
        }

        return handler(message.content);
    }
}
