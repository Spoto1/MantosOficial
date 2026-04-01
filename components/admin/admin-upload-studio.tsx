"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useTransition } from "react";

type AdminUploadStudioProps = {
  assets: Array<{
    id: string;
    label: string;
    originalName: string;
    storageProvider: string;
    url: string;
    createdAt: Date;
  }>;
};

export function AdminUploadStudio({ assets }: AdminUploadStudioProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isUploading, startUpload] = useTransition();

  return (
    <div className="space-y-5">
      <div className="rounded-[1.7rem] border border-black/5 bg-white p-4">
        <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
          <div className="space-y-4">
            <label className="space-y-2">
              <span className="text-sm font-medium text-ink">Arquivo</span>
              <input
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="field-input field-input-compact"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setSelectedFile(file);
                  setFeedback(null);

                  if (file) {
                    setPreviewUrl(URL.createObjectURL(file));
                    setLabel(file.name.replace(/\.[^.]+$/, ""));
                  }
                }}
                type="file"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-ink">Label</span>
              <input
                className="field-input field-input-compact"
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Hero campanha copa"
                type="text"
                value={label}
              />
            </label>
            <button
              className="button-primary button-compact justify-center"
              disabled={!selectedFile || isUploading}
              onClick={() => {
                if (!selectedFile) {
                  return;
                }

                startUpload(async () => {
                  const formData = new FormData();
                  formData.set("image", selectedFile);
                  formData.set("label", label);

                  const response = await fetch("/api/admin/uploads", {
                    method: "POST",
                    body: formData
                  });
                  const result = (await response.json()) as { ok: boolean; message: string };

                  setFeedback(result.message);

                  if (response.ok && result.ok) {
                    window.location.reload();
                  }
                });
              }}
              type="button"
            >
              {isUploading ? "Enviando..." : "Enviar imagem"}
            </button>
            {feedback ? <p className="text-sm text-slate">{feedback}</p> : null}
          </div>

          <div className="rounded-[1.45rem] border border-black/5 bg-black/5 p-3.5">
            {previewUrl ? (
              <img
                alt="Preview do upload"
                className="aspect-video w-full rounded-[1.1rem] object-contain"
                src={previewUrl}
              />
            ) : (
              <div className="grid aspect-video place-items-center rounded-[1.1rem] border border-dashed border-black/10 bg-white text-sm text-slate">
                Preview do upload
              </div>
            )}
          </div>
        </div>
      </div>

      {assets.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {assets.map((asset) => (
            <article className="rounded-[1.2rem] border border-black/5 bg-white p-3.5 shadow-soft" key={asset.id}>
              <img alt={asset.label} className="aspect-video w-full rounded-[1.2rem] object-cover" src={asset.url} />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <h3 className="text-[0.96rem] font-semibold text-ink">{asset.label}</h3>
                <span className="inline-flex items-center rounded-full border border-black/10 bg-black/5 px-2 py-1 text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-slate">
                  {asset.storageProvider}
                </span>
              </div>
              <p className="mt-1 text-[0.84rem] text-slate">{asset.originalName}</p>
              <p className="mt-2 text-[0.66rem] uppercase tracking-[0.16em] text-slate">
                {asset.createdAt.toLocaleString("pt-BR")}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-[1.45rem] border border-dashed border-black/10 bg-black/[0.03] px-4 py-5 text-[0.88rem] leading-6 text-slate">
          Nenhum asset operacional foi enviado ainda. Assim que novas imagens forem publicadas,
          elas aparecem aqui para uso no admin.
        </div>
      )}
    </div>
  );
}
