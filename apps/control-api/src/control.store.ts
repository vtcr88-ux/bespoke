import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  controlInstanceEventSchema,
  controlInstanceSchema,
  type ControlInstance,
  type ControlInstanceEvent,
  type ControlInstanceStatus,
} from "@bespoke/contracts";
import mysql, { type Pool, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";

export interface ControlStore {
  setup(): Promise<void>;
  ping(): Promise<void>;
  close(): Promise<void>;
  listInstances(): Promise<ControlInstance[]>;
  getInstance(id: string): Promise<ControlInstance | null>;
  createInstance(instance: ControlInstance, event: ControlInstanceEvent): Promise<void>;
  updateStatus(
    id: string,
    status: ControlInstanceStatus,
    lastErrorCode: string | null,
    event: ControlInstanceEvent,
  ): Promise<ControlInstance | null>;
  listEvents(instanceId: string): Promise<ControlInstanceEvent[]>;
}

type FileState = {
  instances: ControlInstance[];
  events: ControlInstanceEvent[];
};

const emptyState = (): FileState => ({ instances: [], events: [] });

export class FileControlStore implements ControlStore {
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly file: string) {}

  async setup() {
    await mkdir(dirname(this.file), { recursive: true });
    if (!existsSync(this.file)) await this.writeState(emptyState());
    await this.readState();
  }

  async ping() {
    await this.readState();
  }

  async close() {
    await this.queue;
  }

  async listInstances() {
    return (await this.readState()).instances.sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }

  async getInstance(id: string) {
    return (await this.readState()).instances.find((item) => item.id === id) ?? null;
  }

  async createInstance(instance: ControlInstance, event: ControlInstanceEvent) {
    await this.mutate((state) => {
      assertUniqueInstance(instance, state.instances);
      state.instances.push(controlInstanceSchema.parse(instance));
      state.events.push(controlInstanceEventSchema.parse(event));
    });
  }

  async updateStatus(
    id: string,
    status: ControlInstanceStatus,
    lastErrorCode: string | null,
    event: ControlInstanceEvent,
  ) {
    let updated: ControlInstance | null = null;
    await this.mutate((state) => {
      const index = state.instances.findIndex((item) => item.id === id);
      const current = state.instances[index];
      if (!current) return;
      updated = controlInstanceSchema.parse({
        ...current,
        status,
        lastErrorCode,
        updatedAt: event.createdAt,
      });
      state.instances[index] = updated;
      state.events.push(controlInstanceEventSchema.parse(event));
    });
    return updated;
  }

  async listEvents(instanceId: string) {
    return (await this.readState()).events
      .filter((event) => event.instanceId === instanceId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  private async mutate(action: (state: FileState) => void) {
    const operation = this.queue.then(async () => {
      const state = await this.readState();
      action(state);
      await this.writeState(state);
    });
    this.queue = operation.catch(() => undefined);
    return operation;
  }

  private async readState(): Promise<FileState> {
    const raw = JSON.parse(await readFile(this.file, "utf8")) as FileState;
    return {
      instances: (raw.instances ?? []).map((item) => controlInstanceSchema.parse(item)),
      events: (raw.events ?? []).map((item) => controlInstanceEventSchema.parse(item)),
    };
  }

  private async writeState(state: FileState) {
    const temporary = `${this.file}.${process.pid}.${randomUUID()}.tmp`;
    await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    await rename(temporary, this.file);
  }
}

type InstanceRow = RowDataPacket & {
  id: string;
  slug: string;
  name: string;
  public_domain: string;
  admin_domain: string;
  api_domain: string;
  api_port: number;
  owner_email: string;
  whatsapp_phone: string;
  notes: string;
  status: ControlInstanceStatus;
  last_error_code: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type EventRow = RowDataPacket & {
  id: string;
  instance_id: string;
  type: ControlInstanceEvent["type"];
  message: string;
  created_at: Date | string;
};

export class MySqlControlStore implements ControlStore {
  private constructor(private readonly pool: Pool) {}

  static fromUrl(url: string) {
    return new MySqlControlStore(
      mysql.createPool({ uri: url, connectionLimit: 6, dateStrings: true }),
    );
  }

  async setup() {
    await this.pool.execute(`CREATE TABLE IF NOT EXISTS control_instances (
      id CHAR(36) PRIMARY KEY,
      slug VARCHAR(63) NOT NULL UNIQUE,
      name VARCHAR(120) NOT NULL,
      public_domain VARCHAR(253) NOT NULL UNIQUE,
      admin_domain VARCHAR(253) NOT NULL UNIQUE,
      api_domain VARCHAR(253) NOT NULL UNIQUE,
      api_port SMALLINT UNSIGNED NOT NULL UNIQUE,
      owner_email VARCHAR(254) NOT NULL,
      whatsapp_phone VARCHAR(15) NOT NULL DEFAULT '',
      notes VARCHAR(500) NOT NULL DEFAULT '',
      status ENUM('draft','prepared','provisioning','active','failed','suspended') NOT NULL,
      last_error_code VARCHAR(80) NULL,
      created_at DATETIME(3) NOT NULL,
      updated_at DATETIME(3) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await this.pool.execute(`CREATE TABLE IF NOT EXISTS control_instance_events (
      id CHAR(36) PRIMARY KEY,
      instance_id CHAR(36) NOT NULL,
      type ENUM('created','prepared','status_changed','preparation_failed') NOT NULL,
      message VARCHAR(240) NOT NULL,
      created_at DATETIME(3) NOT NULL,
      INDEX idx_control_events_instance_created (instance_id, created_at),
      CONSTRAINT fk_control_events_instance FOREIGN KEY (instance_id)
        REFERENCES control_instances(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }

  async ping() {
    await this.pool.query("SELECT 1");
  }

  async close() {
    await this.pool.end();
  }

  async listInstances() {
    const [rows] = await this.pool.query<InstanceRow[]>(
      "SELECT * FROM control_instances ORDER BY created_at DESC",
    );
    return rows.map(mapInstance);
  }

  async getInstance(id: string) {
    const [rows] = await this.pool.execute<InstanceRow[]>(
      "SELECT * FROM control_instances WHERE id = ? LIMIT 1",
      [id],
    );
    return rows[0] ? mapInstance(rows[0]) : null;
  }

  async createInstance(instance: ControlInstance, event: ControlInstanceEvent) {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(
        `INSERT INTO control_instances
          (id, slug, name, public_domain, admin_domain, api_domain, api_port,
           owner_email, whatsapp_phone, notes, status, last_error_code, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        instanceValues(instance),
      );
      await insertEvent(connection, event);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateStatus(
    id: string,
    status: ControlInstanceStatus,
    lastErrorCode: string | null,
    event: ControlInstanceEvent,
  ) {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.execute<ResultSetHeader>(
        "UPDATE control_instances SET status = ?, last_error_code = ?, updated_at = ? WHERE id = ?",
        [status, lastErrorCode, mysqlDate(event.createdAt), id],
      );
      if (!result.affectedRows) {
        await connection.rollback();
        return null;
      }
      await insertEvent(connection, event);
      await connection.commit();
      return this.getInstance(id);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async listEvents(instanceId: string) {
    const [rows] = await this.pool.execute<EventRow[]>(
      "SELECT * FROM control_instance_events WHERE instance_id = ? ORDER BY created_at DESC",
      [instanceId],
    );
    return rows.map(mapEvent);
  }
}

function assertUniqueInstance(candidate: ControlInstance, instances: ControlInstance[]) {
  const conflict = instances.find(
    (item) =>
      item.slug === candidate.slug ||
      item.apiPort === candidate.apiPort ||
      [item.publicDomain, item.adminDomain, item.apiDomain].some((domain) =>
        [candidate.publicDomain, candidate.adminDomain, candidate.apiDomain].includes(domain),
      ),
  );
  if (conflict) throw Object.assign(new Error("Instance metadata already exists."), { code: "ER_DUP_ENTRY" });
}

function mapInstance(row: InstanceRow) {
  return controlInstanceSchema.parse({
    id: row.id,
    slug: row.slug,
    name: row.name,
    publicDomain: row.public_domain,
    adminDomain: row.admin_domain,
    apiDomain: row.api_domain,
    apiPort: Number(row.api_port),
    ownerEmail: row.owner_email,
    whatsappPhone: row.whatsapp_phone,
    notes: row.notes,
    status: row.status,
    lastErrorCode: row.last_error_code,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  });
}

function mapEvent(row: EventRow) {
  return controlInstanceEventSchema.parse({
    id: row.id,
    instanceId: row.instance_id,
    type: row.type,
    message: row.message,
    createdAt: iso(row.created_at),
  });
}

function instanceValues(instance: ControlInstance) {
  return [
    instance.id,
    instance.slug,
    instance.name,
    instance.publicDomain,
    instance.adminDomain,
    instance.apiDomain,
    instance.apiPort,
    instance.ownerEmail,
    instance.whatsappPhone,
    instance.notes,
    instance.status,
    instance.lastErrorCode,
    mysqlDate(instance.createdAt),
    mysqlDate(instance.updatedAt),
  ];
}

async function insertEvent(
  connection: Awaited<ReturnType<Pool["getConnection"]>>,
  event: ControlInstanceEvent,
) {
  await connection.execute(
    "INSERT INTO control_instance_events (id, instance_id, type, message, created_at) VALUES (?, ?, ?, ?, ?)",
    [event.id, event.instanceId, event.type, event.message, mysqlDate(event.createdAt)],
  );
}

function iso(value: Date | string) {
  return new Date(value).toISOString();
}

function mysqlDate(value: string) {
  return value.slice(0, 23).replace("T", " ");
}
