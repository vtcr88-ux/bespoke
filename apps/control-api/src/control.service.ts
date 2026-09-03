import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  controlInstanceInputSchema,
  controlOverviewSchema,
  controlReadinessSchema,
  type ControlInstance,
  type ControlInstanceEvent,
  type ControlInstanceInput,
} from "@bespoke/contracts";
import {
  listInstanceTemplates,
  nextAvailableApiPort,
  prepareInstanceTemplate,
} from "@bespoke/instance-kit";
import type { ControlStore } from "./control.store.js";
import { ApiError } from "./shared/api-error.js";

export class ControlService {
  private mutationQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly store: ControlStore,
    private readonly instancesRoot: string,
  ) {}

  async overview() {
    const instances = await this.store.listInstances();
    return controlOverviewSchema.parse({
      total: instances.length,
      draft: instances.filter((item) => item.status === "draft").length,
      prepared: instances.filter((item) => item.status === "prepared").length,
      active: instances.filter((item) => item.status === "active").length,
      attention: instances.filter((item) => ["failed", "suspended"].includes(item.status)).length,
    });
  }

  list() {
    return this.store.listInstances();
  }

  async get(id: string) {
    const instance = await this.store.getInstance(id);
    if (!instance) throw new ApiError(404, "INSTANCE_NOT_FOUND", "Loja nao encontrada.");
    return instance;
  }

  async create(rawInput: ControlInstanceInput) {
    const input = controlInstanceInputSchema.parse(rawInput);
    return this.serialized(async () => {
      const managed = await this.store.listInstances();
      const templates = listInstanceTemplates(this.instancesRoot);
      const existingTemplate = matchingTemplate(input, templates);
      assertMetadataAvailable(input, managed, templates, existingTemplate?.slug);
      const now = new Date().toISOString();
      const instance: ControlInstance = {
        ...input,
        id: randomUUID(),
        apiPort:
          existingTemplate?.port ??
          nextAvailableApiPort([
            ...managed.map((item) => ({ port: item.apiPort })),
            ...templates,
          ]),
        status:
          existingTemplate &&
          preparedFilesExist(
            resolve(this.instancesRoot, "instances", existingTemplate.slug),
          )
            ? "prepared"
            : "draft",
        lastErrorCode: null,
        createdAt: now,
        updatedAt: now,
      };
      try {
        await this.store.createInstance(
          instance,
          event(
            instance.id,
            "created",
            existingTemplate
              ? "Instancia existente vinculada ao Control."
              : "Cadastro operacional criado.",
          ),
        );
      } catch (error) {
        if (isDuplicateError(error)) {
          throw new ApiError(409, "INSTANCE_CONFLICT", "Slug, dominio ou porta ja esta em uso.");
        }
        throw error;
      }
      return instance;
    });
  }

  async prepare(id: string) {
    return this.serialized(async () => {
      const instance = await this.get(id);
      const target = resolve(this.instancesRoot, "instances", instance.slug);
      if (instance.status === "prepared" && existsSync(target)) return instance;
      if (preparedFilesExist(target)) {
        const reconciled = await this.store.updateStatus(
          id,
          "prepared",
          null,
          event(id, "status_changed", "Estado reconciliado com os templates existentes."),
        );
        if (!reconciled) throw new ApiError(404, "INSTANCE_NOT_FOUND", "Loja nao encontrada.");
        return reconciled;
      }
      try {
        prepareInstanceTemplate(this.instancesRoot, {
          slug: instance.slug,
          name: instance.name,
          publicDomain: instance.publicDomain,
          adminDomain: instance.adminDomain,
          apiDomain: instance.apiDomain,
          port: instance.apiPort,
        });
        const updated = await this.store.updateStatus(
          id,
          "prepared",
          null,
          event(id, "prepared", "Templates isolados preparados com sucesso."),
        );
        if (!updated) throw new ApiError(404, "INSTANCE_NOT_FOUND", "Loja nao encontrada.");
        return updated;
      } catch (error) {
        const code = errorCode(error);
        await this.store.updateStatus(
          id,
          "failed",
          code,
          event(id, "preparation_failed", "Falha ao preparar os templates da loja."),
        );
        throw new ApiError(
          409,
          "INSTANCE_PREPARATION_FAILED",
          error instanceof Error ? error.message : "Nao foi possivel preparar a loja.",
          { cause: error },
        );
      }
    });
  }

  async readiness(id: string) {
    const instance = await this.get(id);
    const directory = resolve(this.instancesRoot, "instances", instance.slug);
    const templateReady = [
      ".env.production.example",
      "brand.seed.json",
      "compose.override.yml",
    ].every((name) => existsSync(resolve(directory, name)));
    return controlReadinessSchema.parse({
      instanceId: id,
      readyToProvision: templateReady && instance.status === "prepared",
      items: [
        {
          key: "metadata",
          label: "Cadastro e dominios",
          status: "ready",
          detail: "Identidade, responsavel e dominios foram validados.",
        },
        {
          key: "templates",
          label: "Templates isolados",
          status: templateReady ? "ready" : instance.status === "failed" ? "blocked" : "pending",
          detail: templateReady
            ? "Arquivos de preparo foram gerados sem segredos reais."
            : "Prepare os arquivos antes de provisionar a infraestrutura.",
        },
        {
          key: "secrets",
          label: "Credenciais exclusivas",
          status: "pending",
          detail: "Senhas e tokens reais devem ser inseridos no cofre da implantacao.",
        },
        {
          key: "database",
          label: "Banco exclusivo",
          status: "pending",
          detail: "A criacao do banco permanece uma etapa privilegiada e separada.",
        },
        {
          key: "runtime",
          label: "Dominio, TLS e servico",
          status: "pending",
          detail: "Nginx, certificado e processo da loja ainda precisam ser ativados.",
        },
      ],
    });
  }

  async events(id: string) {
    await this.get(id);
    return this.store.listEvents(id);
  }

  private async serialized<T>(action: () => Promise<T>) {
    const operation = this.mutationQueue.then(action);
    this.mutationQueue = operation.then(() => undefined, () => undefined);
    return operation;
  }
}

function assertMetadataAvailable(
  input: ControlInstanceInput,
  managed: ControlInstance[],
  templates: ReturnType<typeof listInstanceTemplates>,
  allowedTemplateSlug?: string,
) {
  const requestedDomains = [input.publicDomain, input.adminDomain, input.apiDomain];
  const conflict = [
    ...managed,
    ...templates.filter((item) => item.slug !== allowedTemplateSlug),
  ].find(
    (item) =>
      item.slug === input.slug ||
      [item.publicDomain, item.adminDomain, item.apiDomain].some((domain) =>
        requestedDomains.includes(domain),
      ),
  );
  if (conflict) {
    throw new ApiError(409, "INSTANCE_CONFLICT", `O identificador ou um dominio ja pertence a '${conflict.slug}'.`);
  }
}

function matchingTemplate(
  input: ControlInstanceInput,
  templates: ReturnType<typeof listInstanceTemplates>,
) {
  const template = templates.find((item) => item.slug === input.slug);
  if (!template) return undefined;
  const domainsMatch =
    template.publicDomain === input.publicDomain &&
    template.adminDomain === input.adminDomain &&
    template.apiDomain === input.apiDomain;
  if (!domainsMatch) {
    throw new ApiError(
      409,
      "INSTANCE_TEMPLATE_MISMATCH",
      "A instancia existente usa dominios diferentes dos informados.",
    );
  }
  return template;
}

function event(
  instanceId: string,
  type: ControlInstanceEvent["type"],
  message: string,
): ControlInstanceEvent {
  return { id: randomUUID(), instanceId, type, message, createdAt: new Date().toISOString() };
}

function isDuplicateError(error: unknown) {
  return typeof error === "object" && error != null && "code" in error && error.code === "ER_DUP_ENTRY";
}

function errorCode(error: unknown) {
  if (error instanceof ApiError) return error.code;
  return "TEMPLATE_PREPARATION_FAILED";
}

function preparedFilesExist(directory: string) {
  return [".env.production.example", "brand.seed.json", "compose.override.yml"].every(
    (name) => existsSync(resolve(directory, name)),
  );
}
