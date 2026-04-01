import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { summarizeStorageDriver } from "@/lib/runtime-config";

export type PersistedUpload = {
  provider: string;
  key: string;
  url: string;
};

export type StorageProvider = {
  driver: string;
  save(input: {
    fileName: string;
    directory: string;
    buffer: Buffer;
  }): Promise<PersistedUpload>;
};

class LocalPublicStorageProvider implements StorageProvider {
  driver = "local-public";

  async save(input: { fileName: string; directory: string; buffer: Buffer }) {
    const relativeDirectory = input.directory
      .split(/[\\/]+/)
      .filter(Boolean)
      .join("/");
    const relativePath = path.posix.join("/", relativeDirectory, input.fileName);
    const targetDirectory = path.join(process.cwd(), "public", ...relativeDirectory.split("/"));
    const targetFile = path.join(targetDirectory, input.fileName);

    await mkdir(targetDirectory, {
      recursive: true
    });
    await writeFile(targetFile, input.buffer);

    return {
      provider: this.driver,
      key: path.posix.join(relativeDirectory, input.fileName),
      url: relativePath
    };
  }
}

export function getStorageProvider() {
  const driver = summarizeStorageDriver();

  if (driver === "local") {
    return new LocalPublicStorageProvider();
  }

  throw new Error(
    `STORAGE_DRIVER=${driver} ainda não possui adapter implementado nesta rodada. Use STORAGE_DRIVER=local ou adicione um provider externo compatível.`
  );
}
