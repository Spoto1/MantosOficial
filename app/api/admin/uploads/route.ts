import path from "node:path";

import { AssetKind } from "@prisma/client";
import { NextResponse } from "next/server";

import { adminHasPermission, getAdminSession } from "@/lib/auth/admin";
import { createActivityLog } from "@/lib/repositories/activity-logs";
import { createMediaAsset } from "@/lib/repositories/uploads";
import { getStorageProvider } from "@/lib/storage/provider";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml"
]);

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

function resolveExtension(fileName: string, mimeType: string) {
  const normalizedExtension = path.extname(fileName).toLowerCase();

  if (normalizedExtension) {
    return normalizedExtension;
  }

  if (mimeType === "image/jpeg") {
    return ".jpg";
  }

  if (mimeType === "image/png") {
    return ".png";
  }

  if (mimeType === "image/webp") {
    return ".webp";
  }

  if (mimeType === "image/svg+xml") {
    return ".svg";
  }

  return "";
}

export async function POST(request: Request) {
  const session = await getAdminSession();

  if (!session || !adminHasPermission(session, "uploads")) {
    return NextResponse.json(
      {
        ok: false,
        message: "Sessão administrativa inválida para upload."
      },
      {
        status: 401
      }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("image");
    const label = String(formData.get("label") ?? "").trim();

    if (!(file instanceof File)) {
      throw new Error("Selecione uma imagem válida.");
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      throw new Error("Formato inválido. Use JPG, PNG, WEBP ou SVG.");
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error("Arquivo acima do limite de 5 MB.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const extension = resolveExtension(file.name, file.type);
    const baseName = slugify(path.basename(file.name, path.extname(file.name))) || "asset";
    const fileName = `${Date.now()}-${baseName}${extension}`;
    const storage = await getStorageProvider().save({
      fileName,
      directory: "uploads/admin",
      buffer
    });

    const asset = await createMediaAsset({
      label: label || baseName,
      originalName: file.name,
      fileName,
      mimeType: file.type,
      sizeBytes: file.size,
      url: storage.url,
      storageProvider: storage.provider,
      storageKey: storage.key,
      kind: AssetKind.CAMPAIGN_IMAGE,
      uploadedById: session.adminId ?? null
    });

    await createActivityLog({
      type: "upload.created",
      entityType: "UPLOAD",
      entityId: asset.id,
      actor: session,
      description: `Upload ${asset.label} enviado para o acervo administrativo.`
    });

    return NextResponse.json({
      ok: true,
      message: "Upload concluído com sucesso.",
      assetId: asset.id,
      url: asset.url,
      label: asset.label
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Não foi possível concluir o upload."
      },
      {
        status: 400
      }
    );
  }
}
